const express = require('express');
const router = express.Router();
const axios = require('axios');

const WEBHOOK_URL = 'https://discord.com/api/webhooks/1404603666467524699/mLTpSP1YoAq5ypeg3RpavmW-i2Z3zNPOIy3M2hNlJJrsEQAJbV7Y2c_S-zu-ZkxdRjXu';

router.post('/order', async (req, res) => {
    try {
        const order = req.body;
        const embed = {
            title: '🚀 New Order Received',
            color: 0x6755f0,
            fields: [
                { name: '📋 Order ID', value: order.id, inline: true },
                { name: '🎮 Username', value: order.username, inline: true },
                { name: '💬 Discord', value: order.discord, inline: true },
                { name: '📈 Current Rank', value: order.currentRank, inline: true },
                { name: '🏆 Desired Rank', value: order.desiredRank, inline: true },
                { name: '👤 Booster', value: order.booster, inline: true },
                { name: '💰 Total Price', value: `£${order.totalPrice}`, inline: true },
                { name: '⚡ Priority', value: order.priority ? 'Yes (+£5)' : 'No', inline: true },
                { name: '🧾 Invoice ID', value: order.invoiceId, inline: true },
                { name: '➕ Add-ons', value: order.addons.length > 0 ? order.addons.join(', ') : 'None', inline: false }
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'Phantom Services' }
        };

        await axios.post(WEBHOOK_URL, { embeds: [embed] });
        res.json({ success: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ success: false, error: 'Failed to send webhook' });
    }
});


module.exports = router;
