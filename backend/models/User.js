const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, sparse: true, required: false }, // Optional Phone
    password: { type: String, required: false },
    role: { 
        type: String, 
        enum: ['Admin', 'Distributor', 'Customer', 'Staff'], 
        required: true,
        default: 'Customer' 
    },
    // OTP Fields
    currentOtp: { type: String },
    otpExpiresAt: { type: Date },

    // Token Balance / Advance Prepaid Jars
    tokenBalance: { type: Number, default: 0 },
    prepaidJarBalance: { type: Number, default: 0 },
    subscriptionType: { 
        type: String, 
        enum: ['Daily', 'Alternate', 'OnDemand', 'None'], 
        default: 'None' 
    },
    assignedDistributor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    // Dynamic Permissions Matrix
    permissions: { 
        type: [String], 
        default: [] 
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);