const express = require('express');
const router = express.Router();
const { 
    rechargeWallet, 
    adjustBalance, 
    getPaymentLogs 
} = require('../controllers/walletController');

// 1. Recharge
router.post('/recharge', rechargeWallet);

// 2. Manual Adjust
router.post('/adjust', adjustBalance);

// 3. View Logs / History
router.get('/logs', getPaymentLogs);

module.exports = router;