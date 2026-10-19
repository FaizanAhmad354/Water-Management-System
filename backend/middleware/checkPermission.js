const User = require('../models/User');

const checkPermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            const operatorId = req.body.operatorId || req.headers['x-operator-id'];
            
            if (!operatorId) {
                return res.status(400).json({ message: "Operator ID required to verify permissions." });
            }

            const operator = await User.findById(operatorId);
            if (!operator) {
                return res.status(404).json({ message: "Operator not found." });
            }

            // Admin ko by-default all permissions allowed hain
            if (operator.role === 'Admin') {
                return next();
            }

            // Specific permission check
            if (operator.permissions && operator.permissions.includes(requiredPermission)) {
                return next();
            }

            return res.status(403).json({ 
                message: `Access Denied: You do not have permission to execute '${requiredPermission}'.` 
            });
        } catch (err) {
            return res.status(500).json({ message: "Permission verification error", error: err.message });
        }
    };
};

module.exports = checkPermission;