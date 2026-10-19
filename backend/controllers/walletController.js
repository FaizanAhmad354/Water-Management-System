const User = require('../models/User');
const WalletLog = require('../models/WalletLog');

// 1. Recharge Token Wallet (wallet.recharge)
exports.rechargeWallet = async (req, res) => {
    try {
        const { customerId, tokens, amountPaid, paymentMode, reason, operatorId } = req.body;

        if (!customerId || !tokens || Number(tokens) <= 0) {
            return res.status(400).json({ message: "Valid Customer ID and Token count (> 0) required." });
        }

        const customer = await User.findById(customerId);
        if (!customer) return res.status(404).json({ message: "Customer not found." });

        const balanceBefore = customer.tokenBalance || 0;
        const balanceAfter = balanceBefore + Number(tokens);

        customer.tokenBalance = balanceAfter;
        await customer.save();

        // Transaction Entry Save
        const log = await WalletLog.create({
            customer: customerId,
            type: 'Recharge',
            tokens: Number(tokens),
            amountPaid: Number(amountPaid) || 0,
            paymentMode: paymentMode || 'Cash',
            balanceBefore,
            balanceAfter,
            reason: reason || 'Customer Wallet Recharge',
            operatorId: operatorId || 'ADMIN'
        });

        res.status(200).json({
            message: `Successfully added ${tokens} tokens! New Balance: ${balanceAfter}`,
            customer: { id: customer._id, name: customer.name, newBalance: balanceAfter },
            transaction: log
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 2. Deduct / Adjust Token Balance (wallet.adjust)
exports.adjustBalance = async (req, res) => {
    try {
        const { customerId, adjustmentType, tokens, reason, operatorId } = req.body; 
        // adjustmentType: 'CREDIT' (+ Add) ya 'DEDUCT' (- Minus)

        if (!customerId || !tokens || Number(tokens) <= 0) {
            return res.status(400).json({ message: "Valid Customer ID and Adjustment token count required." });
        }

        const customer = await User.findById(customerId);
        if (!customer) return res.status(404).json({ message: "Customer not found." });

        const balanceBefore = customer.tokenBalance || 0;
        let balanceAfter;

        if (adjustmentType === 'DEDUCT') {
            if (balanceBefore < Number(tokens)) {
                return res.status(400).json({ message: `Cannot deduct ${tokens} tokens. Available balance is only ${balanceBefore}.` });
            }
            balanceAfter = balanceBefore - Number(tokens);
        } else {
            balanceAfter = balanceBefore + Number(tokens);
        }

        customer.tokenBalance = balanceAfter;
        await customer.save();

        // Transaction Entry Save
        const log = await WalletLog.create({
            customer: customerId,
            type: adjustmentType === 'DEDUCT' ? 'Manual_Deduction' : 'Manual_Credit',
            tokens: adjustmentType === 'DEDUCT' ? -Number(tokens) : Number(tokens),
            amountPaid: 0,
            paymentMode: 'Adjustment',
            balanceBefore,
            balanceAfter,
            reason: reason || 'Admin Manual Balance Adjustment',
            operatorId: operatorId || 'ADMIN'
        });

        res.status(200).json({
            message: `Wallet adjusted successfully! Updated Balance: ${balanceAfter}`,
            customer: { id: customer._id, name: customer.name, newBalance: balanceAfter },
            transaction: log
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 3. View Customer Payment / Transaction Logs (wallet.view_history)
exports.getPaymentLogs = async (req, res) => {
    try {
        const { customerId } = req.query;
        const query = customerId ? { customer: customerId } : {};

        const logs = await WalletLog.find(query)
            .populate('customer', 'name phone')
            .sort({ createdAt: -1 })
            .limit(100);

        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};