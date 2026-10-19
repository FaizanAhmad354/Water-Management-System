const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const axios = require('axios');

// ==========================================
// NODEMAILER TRANSPORTER SETUP
// ==========================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Clean Spam-Resistant Transactional Mailer
const sendRoleWiseEmail = async (email, name, role, otp) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('⚠️ EMAIL_USER/EMAIL_PASS missing in .env');
            return;
        }

        let roleLabel = 'Customer Portal';
        let badgeColor = '#0284c7';

        if (role === 'Admin') {
            roleLabel = 'Plant Super Administrator';
            badgeColor = '#dc2626';
        } else if (role === 'Distributor') {
            roleLabel = 'Delivery Partner Terminal';
            badgeColor = '#d97706';
        }

        const mailSubject = `Aqua Control: Your Login Verification Code is ${otp}`;

        await transporter.sendMail({
            from: `"Aqua Control" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: mailSubject,
            text: `Your Aqua Control login verification code is: ${otp}. This code is valid for 5 minutes.`,
            headers: {
                'X-Entity-Ref-ID': `aqua-${Date.now()}`,
                'Auto-Submitted': 'auto-generated'
            },
            html: `
                <!DOCTYPE html>
                <html>
                <body style="font-family: Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                            <td align="center">
                                <table width="460" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 24px;">
                                    <tr>
                                        <td align="center" style="padding-bottom: 16px;">
                                            <h2 style="color: #0284c7; margin: 0; font-size: 20px;">💧 Aqua Control</h2>
                                            <span style="font-size: 11px; background: #e0f2fe; color: ${badgeColor}; padding: 3px 8px; border-radius: 4px; font-weight: bold; display: inline-block; margin-top: 6px;">
                                                ${roleLabel}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="color: #334155; font-size: 14px; line-height: 1.5;">
                                            Hello <strong>${name || 'User'}</strong>,<br/><br/>
                                            Use the verification code below to complete your login:
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="padding: 20px 0;">
                                            <div style="background-color: #f8fafc; border: 2px dashed ${badgeColor}; border-radius: 8px; padding: 14px; display: inline-block; min-width: 180px;">
                                                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0f172a; font-family: monospace;">${otp}</span>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="color: #64748b; font-size: 12px; line-height: 1.4;">
                                            • This OTP is valid for <strong>5 minutes</strong>.<br/>
                                            • Do not share this code with anyone.
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="border-top: 1px solid #f1f5f9; padding-top: 14px; margin-top: 16px; font-size: 11px; color: #94a3b8; text-align: center;">
                                            Aqua Plant OS • Automated Security Service
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `
        });
        console.log(`✅ Verification email sent to: ${email} with OTP: ${otp}`);
    } catch (err) {
        console.error('❌ Nodemailer Dispatch Error:', err.message);
    }
};

const sendRealSms = async (phone, otp) => {
    try {
        if (!process.env.FAST2SMS_API_KEY) return;
        await axios.post('https://www.fast2sms.com/dev/bulkV2', {
            variables_values: otp,
            route: 'otp',
            numbers: phone
        }, {
            headers: { 'authorization': process.env.FAST2SMS_API_KEY }
        });
    } catch (err) {
        console.error('❌ SMS Gateway Error:', err.response?.data || err.message);
    }
};

// ==========================================
// 1. PASSWORD REGISTRATION
// ==========================================
exports.register = async (req, res) => {
    try {
        const { name, phone, email, password, role } = req.body;
        let user = await User.findOne({ phone });
        if (user) return res.status(400).json({ message: "User already exists with this phone number!" });

        let hashedPassword = '';
        if (password) {
            const salt = await bcrypt.genSalt(10);
            hashedPassword = await bcrypt.hash(password, salt);
        }

        user = new User({
            name,
            phone,
            email: email ? email.trim().toLowerCase() : undefined,
            password: hashedPassword || undefined,
            role: role || 'Customer',
            permissions: role === 'Admin' ? [
                'orders.approve', 'orders.verify_qr', 'orders.instant_onspot', 
                'orders.direct_override', 'orders.cancel', 'wallet.recharge', 
                'settings.role_management'
            ] : []
        });

        await user.save();
        res.status(201).json({ message: `${role || 'Customer'} registered successfully!` });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ==========================================
// 2. PASSWORD LOGIN
// ==========================================
exports.login = async (req, res) => {
    try {
        const { identifier, phone, email, password } = req.body;
        const loginId = (identifier || email || phone || '').trim().toLowerCase();

        if (!loginId || !password) return res.status(400).json({ message: "Please provide Phone/Email and password." });

        const isEmail = loginId.includes('@');
        let user = isEmail ? await User.findOne({ email: loginId }) : await User.findOne({ phone: loginId });

        if (!user) return res.status(400).json({ message: "Account not registered by Admin!" });
        if (!user.password) return res.status(400).json({ message: "Password not set. Please login via OTP." });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials." });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'aquasecretkey123', { expiresIn: '7d' });

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                _id: user._id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                role: user.role,
                tokenBalance: user.tokenBalance || 0,
                prepaidJarBalance: user.prepaidJarBalance || 0,
                permissions: user.permissions || []
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ==========================================
// 3. SEND OTP (NO DEBUG OTP IN PAYLOAD)
// ==========================================
exports.sendOtp = async (req, res) => {
    try {
        const { identifier } = req.body;
        if (!identifier || identifier.trim().length === 0) {
            return res.status(400).json({ message: "Please enter a valid Phone Number or Email." });
        }

        const cleanId = identifier.trim().toLowerCase();
        const isEmail = cleanId.includes('@');
        const configuredAdminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

        let user;

        if (isEmail) {
            user = await User.findOne({ email: cleanId });

            if (cleanId === configuredAdminEmail) {
                if (!user) {
                    user = await User.create({
                        name: 'Master Super Admin',
                        email: cleanId,
                        phone: `admin_${Date.now()}`,
                        role: 'Admin',
                        permissions: [
                            'orders.approve', 'orders.verify_qr', 'orders.instant_onspot',
                            'orders.direct_override', 'orders.cancel', 'wallet.recharge',
                            'wallet.adjust', 'wallet.view_history', 'inventory.view_stock',
                            'inventory.empty_jar_return', 'inventory.damaged_jars',
                            'settings.role_management', 'settings.price_config'
                        ]
                    });
                } else if (user.role !== 'Admin') {
                    user.role = 'Admin';
                    await user.save();
                }
            } else {
                if (!user) {
                    return res.status(404).json({ 
                        message: "Unauthorized! This Email is not registered. Please contact Admin." 
                    });
                }
            }
        } else {
            user = await User.findOne({ phone: cleanId });
            if (!user) {
                return res.status(404).json({ 
                    message: "Unauthorized! This Mobile number is not registered. Please contact Admin." 
                });
            }
        }

        // Single Source of Truth: Ek hi OTP generate hoga
        const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        user.currentOtp = generatedOtp;
        user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await user.save();

        if (isEmail) {
            await sendRoleWiseEmail(cleanId, user.name, user.role, generatedOtp);
        } else {
            await sendRealSms(cleanId, generatedOtp);
        }

        // Clean response without OTP leak
        res.status(200).json({
            message: `OTP sent successfully to your registered ${isEmail ? 'Email' : 'Mobile Number'}!`,
            targetType: isEmail ? 'Email' : 'Phone'
        });

    } catch (error) {
        res.status(500).json({ message: "Error sending OTP", error: error.message });
    }
};

// ==========================================
// 4. VERIFY OTP (STRICT EXACT MATCH)
// ==========================================
exports.verifyOtp = async (req, res) => {
    try {
        const { identifier, otp } = req.body;
        if (!identifier || !otp) return res.status(400).json({ message: "Identifier and OTP code are required." });

        const cleanId = identifier.trim().toLowerCase();
        const isEmail = cleanId.includes('@');

        let user = isEmail ? await User.findOne({ email: cleanId }) : await User.findOne({ phone: cleanId });
        if (!user) return res.status(404).json({ message: "User account not found!" });

        // Database me stored exact OTP hi match hoga
        const isMatchedOtp = (user.currentOtp === otp.trim());

        if (!isMatchedOtp) {
            return res.status(400).json({ message: "Invalid OTP code entered. Please check your email." });
        }

        if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
            return res.status(400).json({ message: "OTP code has expired. Please request a new one." });
        }

        user.currentOtp = null;
        user.otpExpiresAt = null;
        await user.save();

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'aquasecretkey123', { expiresIn: '7d' });

        res.status(200).json({
            message: `Login successful! Welcome ${user.name}`,
            token,
            user: {
                _id: user._id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                role: user.role,
                permissions: user.permissions || [],
                prepaidJarBalance: user.prepaidJarBalance || user.tokenBalance || 0
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Error verifying OTP", error: error.message });
    }
};