const express = require('express');
const router = express.Router();
const { 
    getStocks, 
    fillJars,
    recordEmptyReturns, 
    markDamaged 
} = require('../controllers/inventoryController');

router.get('/stocks', getStocks);
router.post('/fill', fillJars);
router.post('/returns', recordEmptyReturns);
router.post('/damaged', markDamaged);

module.exports = router;