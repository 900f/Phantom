const express = require('express');
const router = express.Router();
const axios = require('axios');
const { Booster, Order } = require('../models');

// Routes
router.get('/boosters', async (req, res) => {
    try {
        const boosters = await Booster.find().lean();
        console.log('API /boosters fetched:', boosters);
        res.json(boosters);
    } catch (error) {
        console.error('Error fetching boosters:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch boosters' });
    }
});

router.post('/boosters/update', async (req, res) => {
    const { name, status } = req.body;
    try {
        const booster = await Booster.findOneAndUpdate(
            { name },
            { status, updated_at: new Date() },
            { new: true }
        );
        if (booster) {
            const boosters = await Booster.find().lean();
            req.app.get('io').emit('boosters_update', boosters);
            console.log('Updated booster status:', booster);
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, error: 'Booster not found' });
        }
    } catch (error) {
        console.error('Error updating booster:', error.message);
        res.status(500).json({ success: false, error: 'Failed to update booster' });
    }
});

router.post('/boosters/add', async (req, res) => {
    const { id, name, rank, discord_id } = req.body;
    try {
        const existingBooster = await Booster.findOne({ $or: [{ id }, { name }] });
        if (existingBooster) {
            return res.status(400).json({ success: false, error: 'Booster already exists' });
        }

        const newBooster = new Booster({
            id,
            name,
            rank,
            discord_id,
            status: 'Available',
            created_at: new Date(),
            updated_at: new Date()
        });

        await newBooster.save();
        const boosters = await Booster.find().lean();
        req.app.get('io').emit('boosters_update', boosters);
        console.log('Added new booster:', newBooster);
        res.json({ success: true, booster: newBooster });
    } catch (error) {
        console.error('Error adding booster:', error.message);
        res.status(500).json({ success: false, error: 'Failed to add booster' });
    }
});

router.post('/submit', async (req, res) => {
    const { currentRank, desiredRank, addons, username, discord, priority, invoiceId, booster } = req.body;

    // Validate required fields
    if (!currentRank || !desiredRank || !username || !discord || !invoiceId || !booster) {
        return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    // Validate booster availability
    const selectedBooster = await Booster.findOne({ name: booster });
    if (!selectedBooster) {
        return res.status(400).json({ success: false, error: 'Selected booster does not exist' });
    }
    if (selectedBooster.status !== 'Available') {
        return res.status(400).json({ success: false, error: 'Selected booster is not available' });
    }

    // Price calculation
    const prices = {
        'Bronze → Champion': 20,
        'Silver → Champion': 20,
        'Gold → Champion': 20,
        'Platinum → Champion': 15,
        'Emerald → Champion': 10,
        'Diamond → Champion': 5
    };

    const rankCombo = `${currentRank} → ${desiredRank}`;
    let totalPrice = prices[rankCombo] || 0;

    if (priority) {
        totalPrice += 5;
    }

    const order = new Order({
        id: Date.now().toString(),
        currentRank,
        desiredRank,
        addons: addons || [],
        username,
        discord,
        priority,
        invoiceId,
        booster,
        totalPrice,
        status: 'Pending',
        timestamp: new Date().toISOString()
    });

    // Save order
    try {
        await order.save();

        // Update booster status to Busy
        await Booster.findOneAndUpdate(
            { name: booster },
            { status: 'Busy', updated_at: new Date() },
            { new: true }
        );

        // Send Discord webhook notification
        const embed = {
            title: '🚀 New Order Received',
            color: 0x6755f0,
            fields: [
                { name: '📋 Order ID', value: order.id, inline: true },
                { name: '🎮 Username', value: username, inline: true },
                { name: '💬 Discord', value: discord, inline: true },
                { name: '📈 Current Rank', value: currentRank, inline: true },
                { name: '🏆 Desired Rank', value: desiredRank, inline: true },
                { name: '👤 Booster', value: booster, inline: true },
                { name: '💰 Total Price', value: `£${totalPrice}`, inline: true },
                { name: '⚡ Priority', value: priority ? 'Yes (+£5)' : 'No', inline: true },
                { name: '🧾 Invoice ID', value: invoiceId, inline: true },
                { name: '➕ Add-ons', value: order.addons.length > 0 ? order.addons.join(', ') : 'None', inline: false }
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'Phantom Services' }
        };

        await axios.post(process.env.WEBHOOK_URL, { embeds: [embed] });
        const boosters = await Booster.find().lean();
        req.app.get('io').emit('boosters_update', boosters);
        res.json({ success: true, orderId: order.id, discordInvite: process.env.DISCORD_INVITE });
    } catch (error) {
        console.error('Failed to process order:', error.message);
        res.status(500).json({ success: false, error: 'Failed to process order' });
    }
});

module.exports = router;