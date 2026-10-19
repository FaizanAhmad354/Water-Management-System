const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    filledJars: { type: Number, default: 0 },
    emptyJars: { type: Number, default: 0 },
    damagedJars: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Inventory', inventorySchema);