const mongoose = require('mongoose');

const walletLogSchema = new mongoose.Schema({
    customer: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    type: { 
        type: String, 
        enum: ['Recharge', 'Manual_Deduction', 'Manual_Credit', 'Delivery_Deduction', 'Refund'], 
        required: true 
    },
    tokens: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    paymentMode: { 
        type: String, 
        enum: ['Cash', 'UPI', 'Online', 'Bank Transfer', 'Adjustment'], 
        default: 'Cash' 
    },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    reason: { type: String, default: 'Wallet Operation' },
    operatorId: { type: String, default: 'SUPER_ADMIN' }
}, { timestamps: true });

module.exports = mongoose.model('WalletLog', walletLogSchema);