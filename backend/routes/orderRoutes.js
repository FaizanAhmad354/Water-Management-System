const express = require('express');
const router = express.Router();
const { 
    bookWater, 
    getPendingOrders, 
    approveOrder, 
    deliverWater, 
    getCustomerActiveOrder, 
    getTodayDeliveries,
    directOverride,
    cancelOrder,
    getCustomerHistory,
    getDistributorHistory,
    getAllHistory,
    updateSubscription,
    requestInstantJar,
    acceptInstantSpotOrder,
    getPendingSpotRequests,
    buyPrepaidPack,
    getDailyReconciliation,
    createDirectWalkInSale
} = require('../controllers/orderController');

// 1. Customer: Order booking
router.post('/book', bookWater);

// 2. Admin: Pending orders queue
router.get('/pending', getPendingOrders);

// 3. Admin: Order approve
router.put('/approve/:orderId', approveOrder);

// 4. Driver/Admin: Deliver verify
router.post('/deliver', deliverWater);

// 5. Customer: Active order status
router.get('/customer/:customerId', getCustomerActiveOrder);

// 6. Driver: Today approved list
router.get('/today-list', getTodayDeliveries);

// 7. Admin: Direct Override
router.post('/direct-override', directOverride);

// 8. Admin/Staff: Cancel order
router.put('/cancel/:orderId', cancelOrder);

// 9. History Endpoints
router.get('/history/customer/:customerId', getCustomerHistory);
router.get('/history/distributor/:distributorId', getDistributorHistory);
router.get('/history/all', getAllHistory);

// 10. Routine Subscription
router.put('/subscription', updateSubscription);

// 11. Spot / Instant Handover
router.post('/instant-request', requestInstantJar);
router.post('/instant-accept', acceptInstantSpotOrder);
router.get('/instant-pending', getPendingSpotRequests);

// 12. Advance Prepaid Pass & Daily Reconciliation
router.post('/buy-pack', buyPrepaidPack);
router.get('/daily-reconciliation', getDailyReconciliation);

// 13. ⚡ Quick Walk-in / Direct Sale
router.post('/direct-sale', createDirectWalkInSale);

module.exports = router;