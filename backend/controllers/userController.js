const User = require('../models/User');

// 1. Saare users fetch karna (Original)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .populate('assignedDistributor', 'name phone')
            .sort({ createdAt: -1 });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 2. Role switch karna (Original)
exports.updateRole = async (req, res) => {
    try {
        const { userId, newRole } = req.body;
        const validRoles = ['Admin', 'Distributor', 'Customer', 'Staff'];

        if (!validRoles.includes(newRole)) {
            return res.status(400).json({ message: 'Invalid role provided' });
        }

        const user = await User.findByIdAndUpdate(
            userId, 
            { role: newRole }, 
            { new: true }
        ).select('-password');

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.status(200).json({ message: `Role updated to ${newRole} successfully!`, user });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 3. Customer Token Balance / Quota Recharge (Original)
exports.rechargeTokens = async (req, res) => {
    try {
        const { customerId, tokens } = req.body;
        const user = await User.findById(customerId);

        if (!user) return res.status(404).json({ message: 'Customer not found' });

        const countToAdd = Number(tokens) || 0;
        user.tokenBalance = (user.tokenBalance || 0) + countToAdd;
        user.prepaidJarBalance = (user.prepaidJarBalance || 0) + countToAdd;
        await user.save();

        res.status(200).json({ 
            message: 'Tokens recharged successfully!', 
            newBalance: user.prepaidJarBalance || user.tokenBalance 
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 4. Permissions Save (Original Logic Preserved + markModified for single permission save)
exports.updatePermissions = async (req, res) => {
    try {
        const { userId, permissions, role } = req.body;
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ message: 'User not found' });

        user.permissions = Array.isArray(permissions) ? permissions : (permissions || []);
        if (role) user.role = role;

        // Force Mongoose to acknowledge modified array on single/partial changes
        user.markModified('permissions');

        await user.save();

        res.status(200).json({ 
            message: `Permissions updated successfully for ${user.name}!`, 
            permissions: user.permissions,
            role: user.role
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 5. Admin Create User (Email Required + Phone Optional Fixed - Original)
exports.createUserByAdmin = async (req, res) => {
    try {
        const { name, email, phone, role, initialTokens } = req.body;

        // Email aur Name required hain
        if (!name || !name.trim() || !email || !email.trim()) {
            return res.status(400).json({ message: 'Name and Email are required!' });
        }

        const cleanEmail = email.trim().toLowerCase();

        // Check if email already registered
        const existingEmail = await User.findOne({ email: cleanEmail });
        if (existingEmail) {
            return res.status(400).json({ message: 'Email already registered with another user!' });
        }

        // Phone check sirf tabhi hoga agar non-empty phone diya gaya ho
        let cleanPhone = null;
        if (phone && phone.trim() !== '') {
            cleanPhone = phone.trim();
            const existingPhone = await User.findOne({ phone: cleanPhone });
            if (existingPhone) {
                return res.status(400).json({ message: 'Phone number already registered!' });
            }
        }

        const quotaCount = Number(initialTokens) || 0;

        // Clean user payload bina undefined/null phone field ke
        const userPayload = {
            name: name.trim(),
            email: cleanEmail,
            role: role || 'Customer',
            tokenBalance: quotaCount,
            prepaidJarBalance: quotaCount,
            permissions: role === 'Admin' ? [
                'orders.approve', 
                'orders.verify_qr', 
                'orders.instant_onspot', 
                'orders.direct_override', 
                'orders.cancel', 
                'wallet.recharge', 
                'settings.role_management'
            ] : []
        };

        // Phone tabhi add karein jab user ne provide kiya ho
        if (cleanPhone) {
            userPayload.phone = cleanPhone;
        }

        const newUser = await User.create(userPayload);

        res.status(201).json({ 
            message: `${role || 'Customer'} account created successfully!`, 
            user: newUser 
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server Error" });
    }
};