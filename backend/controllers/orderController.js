const Order = require('../models/Order');
const User = require('../models/User');
const crypto = require('crypto');

// 1. Customer: Paani Book Karega (COD vs Prepaid Token Auto-detection)
exports.bookWater = async (req, res) => {
    try {
        const { customerId, deliveryDate, orderType, quantity } = req.body;
        const jarCount = Number(quantity) || 1;

        const customer = await User.findById(customerId);
        if (!customer) {
            return res.status(404).json({ message: "Customer not found!" });
        }

        const activeOrder = await Order.findOne({ 
            customer: customerId, 
            status: { $in: ['Pending', 'Approved', 'PendingSpotAcceptance'] } 
        });

        if (activeOrder) {
            return res.status(400).json({ message: "You already have an active request in progress!" });
        }

        const qrCodeToken = crypto.randomBytes(16).toString('hex');
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        const isPrepaid = ((customer.prepaidJarBalance || 0) >= jarCount) || ((customer.tokenBalance || 0) >= jarCount);

        const newOrder = new Order({
            customer: customerId,
            orderType: orderType || 'OnDemand',
            quantity: jarCount,
            deliveryDate: deliveryDate || new Date(),
            qrCodeToken: qrCodeToken,
            otp: otp,
            billingType: isPrepaid ? 'PrepaidQuota' : 'PayOnDelivery',
            paymentStatus: 'Pending',
            status: 'Pending'
        });

        await newOrder.save();
        res.status(201).json({ 
            message: `${orderType === 'Bulk' ? `Bulk Order (${jarCount} Jars)` : 'Order'} requested successfully! Waiting for Admin approval.`, 
            order: newOrder,
            isPrepaid
        });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 2. Admin: Saare Pending Orders Dekhega (Approvals Queue)
exports.getPendingOrders = async (req, res) => {
    try {
        const pendingOrders = await Order.find({ status: 'Pending' })
            .populate('customer', 'name phone tokenBalance prepaidJarBalance email')
            .sort({ createdAt: -1 });

        res.status(200).json(pendingOrders);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 3. Admin/Staff: Order Approve Karega
exports.approveOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found!" });
        }

        order.status = 'Approved';
        await order.save();

        res.status(200).json({ 
            message: "Order approved successfully! Customer can now see QR and OTP.", 
            order 
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 4. Distributor / Admin: Delivery Verify Karega (Doorstep Cash, UPI ya Prepaid Token auto-deduct)
exports.deliverWater = async (req, res) => {
    try {
        const { qrCodeToken, otp, distributorId, paymentMethod, amountPaid } = req.body;

        if (!qrCodeToken && !otp) {
            return res.status(400).json({ message: "Please scan QR code or enter OTP." });
        }

        let searchCondition = { status: 'Approved' };
        if (qrCodeToken) {
            searchCondition.qrCodeToken = qrCodeToken;
        } else if (otp) {
            searchCondition.otp = otp;
        }

        const order = await Order.findOne(searchCondition);
        if (!order) {
            return res.status(400).json({ message: "Invalid/Unapproved OTP or QR Code, or already delivered!" });
        }

        const jarCount = order.quantity || 1;
        const customer = await User.findById(order.customer);

        // Payment status & prepaid quota/token deduction handling
        if (paymentMethod === 'PrepaidQuota' || order.billingType === 'PrepaidQuota') {
            if (customer && (customer.prepaidJarBalance || 0) >= jarCount) {
                customer.prepaidJarBalance -= jarCount;
                if ((customer.tokenBalance || 0) >= jarCount) customer.tokenBalance -= jarCount;
            } else if (customer && (customer.tokenBalance || 0) >= jarCount) {
                customer.tokenBalance -= jarCount;
                if ((customer.prepaidJarBalance || 0) >= jarCount) customer.prepaidJarBalance -= jarCount;
            } else {
                return res.status(400).json({ message: "Insufficient prepaid token balance! Please collect Cash or UPI." });
            }
            order.paymentStatus = 'Prepaid_Quota_Deducted';
            order.amountCollected = 0;
        } else if (paymentMethod === 'UPI') {
            order.paymentStatus = 'Paid_UPI';
            order.amountCollected = Number(amountPaid) >= 0 ? Number(amountPaid) : (jarCount * 20);
        } else {
            order.paymentStatus = 'Paid_Cash';
            order.amountCollected = Number(amountPaid) >= 0 ? Number(amountPaid) : (jarCount * 20);
        }

        if (customer) {
            await customer.save();
        }

        order.status = 'Delivered';
        if (distributorId && distributorId !== 'TEST_DISTRIBUTOR_ID') {
            order.distributor = distributorId;
        }
        order.deliveryTimestamp = new Date();
        await order.save();

        res.status(200).json({ 
            message: `Water delivered successfully! (${order.paymentStatus})`, 
            remainingTokens: customer ? customer.tokenBalance : 0,
            remainingPrepaidJars: customer ? customer.prepaidJarBalance : 0,
            verifiedBy: qrCodeToken ? "QR Scan" : "OTP",
            order
        });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 5. Customer: Active Order Check Karega
exports.getCustomerActiveOrder = async (req, res) => {
    try {
        const { customerId } = req.params;

        const activeOrder = await Order.findOne({ 
            customer: customerId, 
            status: { $in: ['Pending', 'Approved', 'PendingSpotAcceptance'] } 
        }).sort({ createdAt: -1 });

        if (!activeOrder) {
            return res.status(404).json({ message: "No active order found." });
        }

        res.status(200).json(activeOrder);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 6. Distributor / Delivery List
exports.getTodayDeliveries = async (req, res) => {
    try {
        const orders = await Order.find({ status: 'Approved' })
            .populate('customer', 'name phone tokenBalance prepaidJarBalance email')
            .sort({ createdAt: -1 });

        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 7. Admin Direct Override
exports.directOverride = async (req, res) => {
    try {
        const { orderId, distributorId, paymentMethod, amountPaid } = req.body;

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: "Order not found!" });
        if (order.status === 'Delivered') return res.status(400).json({ message: "Order is already delivered!" });

        const jarCount = order.quantity || 1;
        const customer = await User.findById(order.customer);

        if (paymentMethod === 'PrepaidQuota' || order.billingType === 'PrepaidQuota') {
            if (customer && (customer.prepaidJarBalance || 0) >= jarCount) {
                customer.prepaidJarBalance -= jarCount;
                if ((customer.tokenBalance || 0) >= jarCount) customer.tokenBalance -= jarCount;
            } else if (customer && (customer.tokenBalance || 0) >= jarCount) {
                customer.tokenBalance -= jarCount;
                if ((customer.prepaidJarBalance || 0) >= jarCount) customer.prepaidJarBalance -= jarCount;
            }
            order.paymentStatus = 'Prepaid_Quota_Deducted';
            order.amountCollected = 0;
        } else if (paymentMethod === 'UPI') {
            order.paymentStatus = 'Paid_UPI';
            order.amountCollected = Number(amountPaid) >= 0 ? Number(amountPaid) : (jarCount * 20);
        } else {
            order.paymentStatus = 'Paid_Cash';
            order.amountCollected = Number(amountPaid) >= 0 ? Number(amountPaid) : (jarCount * 20);
        }

        if (customer) {
            await customer.save();
        }

        order.status = 'Delivered';
        order.distributor = distributorId || 'ADMIN_SUPER_OVERRIDE';
        order.deliveryTimestamp = new Date();
        await order.save();

        res.status(200).json({ 
            message: `Order forcefully delivered via Admin Override. ${jarCount} Jar(s) recorded.`, 
            order 
        });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 8. Cancel / Reject Order (Updated with cancellationReason support)
exports.cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: "Order not found!" });
        if (order.status === 'Delivered') return res.status(400).json({ message: "Cannot cancel a delivered order!" });

        order.status = 'Cancelled';
        order.cancellationReason = reason ? reason.trim() : 'Order rejected by distributor/admin.';
        await order.save();

        res.status(200).json({ 
            message: "Order cancelled/rejected successfully.",
            cancellationReason: order.cancellationReason,
            order
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 9. Customer: Apna Order History Dekhna
exports.getCustomerHistory = async (req, res) => {
    try {
        const { customerId } = req.params;
        const orders = await Order.find({ customer: customerId })
            .sort({ createdAt: -1 })
            .limit(50);
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 10. Distributor: Apni Delivery History Dekhna
exports.getDistributorHistory = async (req, res) => {
    try {
        const { distributorId } = req.params;
        const orders = await Order.find({ distributor: distributorId, status: 'Delivered' })
            .populate('customer', 'name phone email')
            .sort({ deliveryTimestamp: -1 })
            .limit(100);
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 11. Admin: Sabka Master History Dekhna
exports.getAllHistory = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('customer', 'name phone email')
            .populate('distributor', 'name')
            .sort({ createdAt: -1 })
            .limit(200);
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 12. Customer: Subscription Routine Update
exports.updateSubscription = async (req, res) => {
    try {
        const { customerId, subscriptionType } = req.body;
        const validTypes = ['Daily', 'Alternate', 'None'];

        if (!validTypes.includes(subscriptionType)) {
            return res.status(400).json({ message: "Invalid subscription routine selected." });
        }

        const customer = await User.findById(customerId);
        if (!customer) return res.status(404).json({ message: "Customer not found!" });

        customer.subscriptionType = subscriptionType;
        await customer.save();

        res.status(200).json({ 
            message: `Subscription routine updated to: ${subscriptionType}`, 
            subscriptionType: customer.subscriptionType 
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 13. Customer: Instant On-Spot Extra Jar Request Dalega
exports.requestInstantJar = async (req, res) => {
    try {
        const { customerId, quantity } = req.body;
        const jarCount = Number(quantity) || 1;

        const customer = await User.findById(customerId);
        if (!customer) return res.status(404).json({ message: "Customer not found!" });

        const activeOrder = await Order.findOne({ 
            customer: customerId, 
            status: { $in: ['Pending', 'Approved', 'PendingSpotAcceptance'] } 
        });

        if (activeOrder) {
            return res.status(400).json({ message: "You already have an active order or spot request in progress!" });
        }

        const qrCodeToken = crypto.randomBytes(16).toString('hex');
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const isPrepaid = ((customer.prepaidJarBalance || 0) >= jarCount) || ((customer.tokenBalance || 0) >= jarCount);

        const instantOrder = new Order({
            customer: customerId,
            orderType: 'InstantSpot',
            quantity: jarCount,
            deliveryDate: new Date(),
            qrCodeToken,
            otp,
            billingType: isPrepaid ? 'PrepaidQuota' : 'PayOnDelivery',
            status: 'PendingSpotAcceptance'
        });

        await instantOrder.save();
        res.status(201).json({ 
            message: "Instant request sent to Driver! Waiting for driver to accept on spot.",
            order: instantOrder
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 14. Distributor: Spot Request Accept Karega
exports.acceptInstantSpotOrder = async (req, res) => {
    try {
        const { orderId, distributorId } = req.body;

        const distributor = await User.findById(distributorId);
        if (!distributor) return res.status(404).json({ message: "Distributor not found." });

        if (distributor.role !== 'Admin' && (!distributor.permissions || !distributor.permissions.includes('orders.instant_onspot'))) {
            return res.status(403).json({ message: "Access Denied: Super Admin has not assigned you instant handover permission." });
        }

        const order = await Order.findById(orderId);
        if (!order || order.status !== 'PendingSpotAcceptance') {
            return res.status(400).json({ message: "Order is not waiting for spot acceptance." });
        }

        order.status = 'Approved';
        order.distributor = distributorId;
        await order.save();

        res.status(200).json({ 
            message: "Spot request accepted! Customer QR code is now active for scanning.",
            order
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 15. Distributor: Live Spot Requests List Dekhega
exports.getPendingSpotRequests = async (req, res) => {
    try {
        const spotRequests = await Order.find({ status: 'PendingSpotAcceptance' })
            .populate('customer', 'name phone tokenBalance prepaidJarBalance')
            .sort({ createdAt: -1 });
        res.status(200).json(spotRequests);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 16. 📦 Dynamic Advance Tokens Pass (Admin ya Permission-based Driver Doorstep Recharge)
exports.buyPrepaidPack = async (req, res) => {
    try {
        const { customerId, jarCount, amountPaid, paymentMode, rechargeBy } = req.body;
        const customer = await User.findById(customerId);
        if (!customer) return res.status(404).json({ message: "Customer not found!" });

        // Agar Driver recharge kar raha hai toh permission check karo
        if (rechargeBy && rechargeBy !== 'ADMIN') {
            const driver = await User.findById(rechargeBy);
            if (!driver || (driver.role !== 'Admin' && (!driver.permissions || !driver.permissions.includes('wallet.recharge')))) {
                return res.status(403).json({ message: "Access Denied: You do not have permission to recharge advance tokens." });
            }
        }

        const jarsToAdd = Number(jarCount) || 1;
        customer.prepaidJarBalance = (customer.prepaidJarBalance || 0) + jarsToAdd;
        customer.tokenBalance = (customer.tokenBalance || 0) + jarsToAdd;
        await customer.save();

        res.status(200).json({
            message: `🎉 ${jarsToAdd} Advance Tokens added successfully! Remaining Balance: ${customer.prepaidJarBalance} Jars`,
            prepaidJarBalance: customer.prepaidJarBalance
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 17. 📊 Admin: Daily Cash Settlement & Reconciliation Audit
exports.getDailyReconciliation = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const deliveredOrders = await Order.find({
            status: 'Delivered',
            deliveryTimestamp: { $gte: today }
        }).populate('distributor', 'name phone').populate('customer', 'name phone');

        let totalCash = 0;
        let totalUPI = 0;
        let totalPrepaidJars = 0;

        const driverStats = {};

        deliveredOrders.forEach(o => {
            const driverName = o.distributor?.name || (o.isWalkInCustomer ? 'Plant Counter Sale' : 'Super Admin / Direct');
            if (!driverStats[driverName]) {
                driverStats[driverName] = { cashInHand: 0, upiDirect: 0, quotaJars: 0, deliveries: 0 };
            }

            driverStats[driverName].deliveries += 1;

            if (o.paymentStatus === 'Paid_Cash') {
                totalCash += (o.amountCollected || 0);
                driverStats[driverName].cashInHand += (o.amountCollected || 0);
            } else if (o.paymentStatus === 'Paid_UPI') {
                totalUPI += (o.amountCollected || 0);
                driverStats[driverName].upiDirect += (o.amountCollected || 0);
            } else if (o.paymentStatus === 'Prepaid_Quota_Deducted') {
                totalPrepaidJars += (o.quantity || 1);
                driverStats[driverName].quotaJars += (o.quantity || 1);
            }
        });

        res.status(200).json({
            summary: { totalCash, totalUPI, totalPrepaidJars, totalDeliveries: deliveredOrders.length },
            driverStats
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 18. ⚡ Driver / Admin On-Spot Walk-In Quick Sale (Non-Registered 1-Day Urgent Customer)
exports.createDirectWalkInSale = async (req, res) => {
    try {
        const { 
            sellerId, 
            guestName, 
            guestPhone, 
            quantity, 
            amountPaid, 
            paymentMethod, 
            emptyJarsReceived 
        } = req.body;

        const jarCount = Number(quantity) || 1;
        const totalAmount = Number(amountPaid) >= 0 ? Number(amountPaid) : (jarCount * 20);
        const method = (paymentMethod === 'UPI') ? 'Paid_UPI' : 'Paid_Cash';

        const directSaleOrder = new Order({
            isWalkInCustomer: true,
            guestName: guestName ? guestName.trim() : 'Walk-in Customer',
            guestPhone: guestPhone ? guestPhone.trim() : 'N/A',
            emptyJarsReceived: Number(emptyJarsReceived) || 0,
            orderType: 'WalkInDirect',
            quantity: jarCount,
            deliveryDate: new Date(),
            billingType: 'DirectSale',
            paymentStatus: method,
            amountCollected: totalAmount,
            status: 'Delivered',
            distributor: sellerId || undefined,
            deliveryTimestamp: new Date()
        });

        await directSaleOrder.save();

        res.status(201).json({
            message: `⚡ Quick Direct Sale of ${jarCount} Jar(s) (₹${totalAmount}) recorded successfully!`,
            order: directSaleOrder
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error during quick sale", error: error.message });
    }
};