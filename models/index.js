const mongoose = require('mongoose');

const boosterSchema = new mongoose.Schema({
    id: String,
    name: String,
    rank: String,
    discord_id: String,
    status: String,
    created_at: Date,
    updated_at: Date
}, { collection: 'boosters' });

const orderSchema = new mongoose.Schema({
    id: String,
    currentRank: String,
    desiredRank: String,
    addons: [String],
    username: String,
    discord: String,
    priority: Boolean,
    invoiceId: String,
    booster: String,
    totalPrice: Number,
    status: String,
    timestamp: String
}, { collection: 'orders' });

module.exports = {
    Booster: mongoose.model('Booster', boosterSchema),
    Order: mongoose.model('Order', orderSchema)
};