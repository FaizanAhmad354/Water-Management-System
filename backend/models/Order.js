const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    // Optional for Walk-In direct cash customers
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    distributor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    // Walk-in / Guest Customer Info (For 1-Day Urgent Non-registered Buyers)
    isWalkInCustomer: { type: Boolean, default: false },
    guestName: { type: String, default: 'Walk-in Customer' },
    guestPhone: { type: String, default: 'N/A' },
    emptyJarsReceived: { type: Number, default: 0 }, // Record empty jars returned on spot

    orderType: { 
        type: String, 
        enum: [
            'Daily', 'Alternate', 'DailyRoutine', 'AlternateRoutine', 
            'OnDemand', 'Bulk', 'Instant', 'InstantSpot', 'WalkInDirect', 'CounterSale'
        ], 
        required: true 
    },
    quantity: { type: Number, default: 1 },
    status: { 
        type: String, 
        enum: ['Pending', 'Approved', 'Delivered', 'Cancelled', 'PendingSpotAcceptance'], 
        default: 'Pending' 
    },
    // 🚨 Rejection / Cancellation Reason field
    cancellationReason: { 
        type: String, 
        default: '' 
    },
    qrCodeToken: { type: String }, // Dynamic QR code data
    otp: { type: String }, // 4-digit PIN fallback
    deliveryDate: { type: Date, required: true },
    
    // Payment & Billing on Delivery
    billingType: { 
        type: String, 
        enum: ['PrepaidQuota', 'PayOnDelivery', 'DirectSale'], 
        default: 'PayOnDelivery' 
    },
    paymentStatus: { 
        type: String, 
        enum: ['Paid_Cash', 'Paid_UPI', 'Prepaid_Quota_Deducted', 'Pending'], 
        default: 'Pending' 
    },
    amountCollected: { type: Number, default: 0 },
    deliveryTimestamp: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);