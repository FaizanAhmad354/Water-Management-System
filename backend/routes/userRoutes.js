const express = require('express');
const router = express.Router();
const { 
    getAllUsers, 
    updateRole, 
    rechargeTokens, 
    updatePermissions,
    createUserByAdmin 
} = require('../controllers/userController');

// All Users
router.get('/all', getAllUsers);

// Role Change
router.put('/update-role', updateRole);

// Token Recharge
router.post('/recharge', rechargeTokens);

// Permissions Matrix
router.put('/update-permissions', updatePermissions);

// Create User by Admin
router.post('/create', createUserByAdmin);

module.exports = router;