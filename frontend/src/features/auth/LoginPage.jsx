import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';

const LoginPage = () => {
    const navigate = useNavigate();
    
    // Auth Mode: 'mobile' | 'email'
    const [loginType, setLoginType] = useState('email');
    const [identifier, setIdentifier] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Handle Sending OTP
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');
        
        const cleanInput = identifier.trim();
        if (!cleanInput) {
            setErrorMsg(`Please enter your ${loginType === 'mobile' ? 'mobile number' : 'email address'}.`);
            return;
        }

        setLoading(true);
        try {
            // Send multiple standard keys to guarantee backend compatibility
            const payload = {
                identifier: cleanInput,
                phoneOrEmail: cleanInput,
                email: cleanInput,
                phone: cleanInput,
                type: loginType
            };

            const res = await API.post('/auth/send-otp', payload);
            
            setOtpSent(true);
            setSuccessMsg(res.data?.message || '✅ OTP sent successfully!');
        } catch (err) {
            setErrorMsg(err.response?.data?.message || 'Failed to send OTP. Please check your details.');
        } finally {
            setLoading(false);
        }
    };

    // Handle OTP Box Change
    const handleOtpChange = (value, index) => {
        if (/^[0-9]?$/.test(value)) {
            const newOtp = [...otp];
            newOtp[index] = value;
            setOtp(newOtp);

            if (value && index < 3) {
                const nextInput = document.getElementById(`otp-box-${index + 1}`);
                if (nextInput) nextInput.focus();
            }
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-box-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    // Handle Verifying OTP & Login
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');
        
        const fullOtp = otp.join('');
        if (fullOtp.length < 4) {
            setErrorMsg('Please enter the 4-digit OTP.');
            return;
        }

        setLoading(true);
        try {
            const cleanInput = identifier.trim();
            const payload = {
                identifier: cleanInput,
                phoneOrEmail: cleanInput,
                email: cleanInput,
                phone: cleanInput,
                otp: fullOtp
            };

            const res = await API.post('/auth/verify-otp', payload);
            
            const { user, token } = res.data;
            
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('token', token);

            setSuccessMsg('🎉 Login Successful! Redirecting...');

            setTimeout(() => {
                if (user.role === 'Admin') {
                    navigate('/admin');
                } else if (user.role === 'Distributor') {
                    navigate('/distributor');
                } else {
                    navigate('/customer');
                }
            }, 600);

        } catch (err) {
            setErrorMsg(err.response?.data?.message || 'Invalid OTP code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            margin: 0,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at center, #0284c7 0%, #0369a1 45%, #082f49 100%)',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            overflow: 'hidden',
            boxSizing: 'border-box'
        }}>
            <style>{`
                html, body, #root {
                    margin: 0 !important;
                    padding: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    overflow: hidden !important;
                    background-color: #082f49 !important;
                }
            `}</style>
            
            {/* Main Crisp Card */}
            <div style={{
                width: '90%',
                maxWidth: '400px',
                backgroundColor: '#ffffff',
                borderRadius: '18px',
                padding: '32px 28px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
                border: 'none',
                boxSizing: 'border-box',
                textAlign: 'center'
            }}>
                
                {/* Brand Logo & Header */}
                <div style={{
                    width: '56px',
                    height: '56px',
                    margin: '0 auto 12px auto',
                    background: '#e0f2fe',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '26px'
                }}>
                    💧
                </div>

                <h2 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '20px', fontWeight: '800', letterSpacing: '-0.3px' }}>
                    AQUA CONTROL
                </h2>
                <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '12px' }}>
                    OTP Passwordless Authentication
                </p>

                {/* Login Selector Pill */}
                {!otpSent && (
                    <div style={{
                        display: 'flex',
                        backgroundColor: '#f1f5f9',
                        padding: '4px',
                        borderRadius: '10px',
                        marginBottom: '18px'
                    }}>
                        <button
                            type="button"
                            onClick={() => { setLoginType('mobile'); setErrorMsg(''); setIdentifier(''); }}
                            style={{
                                flex: 1,
                                padding: '8px 0',
                                border: 'none',
                                borderRadius: '8px',
                                background: loginType === 'mobile' ? '#ffffff' : 'transparent',
                                color: loginType === 'mobile' ? '#0369a1' : '#64748b',
                                fontWeight: '700',
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: loginType === 'mobile' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none'
                            }}
                        >
                            📱 Mobile OTP
                        </button>
                        <button
                            type="button"
                            onClick={() => { setLoginType('email'); setErrorMsg(''); setIdentifier(''); }}
                            style={{
                                flex: 1,
                                padding: '8px 0',
                                border: 'none',
                                borderRadius: '8px',
                                background: loginType === 'email' ? '#ffffff' : 'transparent',
                                color: loginType === 'email' ? '#0369a1' : '#64748b',
                                fontWeight: '700',
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: loginType === 'email' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none'
                            }}
                        >
                            📧 Email OTP
                        </button>
                    </div>
                )}

                {/* Feedback Alerts */}
                {errorMsg && (
                    <div style={{
                        backgroundColor: '#fef2f2',
                        color: '#b91c1c',
                        border: '1px solid #fecaca',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '500',
                        marginBottom: '14px',
                        textAlign: 'left'
                    }}>
                        ⚠️ {errorMsg}
                    </div>
                )}

                {successMsg && (
                    <div style={{
                        backgroundColor: '#f0fdf4',
                        color: '#15803d',
                        border: '1px solid #bbf7d0',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '500',
                        marginBottom: '14px',
                        textAlign: 'left'
                    }}>
                        ✓ {successMsg}
                    </div>
                )}

                {/* Step 1: Input Identifier Form */}
                {!otpSent ? (
                    <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                                {loginType === 'mobile' ? 'Mobile Number' : 'Registered Email Address'}
                            </label>
                            
                            {loginType === 'mobile' ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{
                                        backgroundColor: '#f8fafc',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px',
                                        padding: '9px 12px',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        color: '#334155',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}>
                                        +91
                                    </div>
                                    <input
                                        type="tel"
                                        maxLength="10"
                                        required
                                        placeholder="10-digit number"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, ''))}
                                        style={{
                                            flex: 1,
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '14px',
                                            fontWeight: '400',
                                            color: '#0f172a',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            ) : (
                                <input
                                    type="email"
                                    required
                                    placeholder="Enter your email address"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '14px',
                                        fontWeight: '400',
                                        color: '#0f172a',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: '#0284c7',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: '700',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                        >
                            {loading ? 'Sending OTP...' : 'Send Login OTP ➔'}
                        </button>
                    </form>
                ) : (
                    /* Step 2: 4-Digit OTP Form */
                    <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                            Code sent to <strong>{identifier}</strong>{' '}
                            <button
                                type="button"
                                onClick={() => { setOtpSent(false); setOtp(['', '', '', '']); setErrorMsg(''); }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#0284c7',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    textDecoration: 'underline'
                                }}
                            >
                                Edit
                            </button>
                        </div>

                        {/* OTP Boxes */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            {otp.map((digit, idx) => (
                                <input
                                    key={idx}
                                    id={`otp-box-${idx}`}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength="1"
                                    value={digit}
                                    onChange={(e) => handleOtpChange(e.target.value, idx)}
                                    onKeyDown={(e) => handleKeyDown(e, idx)}
                                    style={{
                                        width: '46px',
                                        height: '48px',
                                        borderRadius: '8px',
                                        border: digit ? '2px solid #0284c7' : '1px solid #cbd5e1',
                                        backgroundColor: '#ffffff',
                                        fontSize: '18px',
                                        fontWeight: '700',
                                        textAlign: 'center',
                                        color: '#0f172a',
                                        outline: 'none'
                                    }}
                                />
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || otp.join('').length < 4}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: (otp.join('').length < 4 || loading) ? '#94a3b8' : '#16a34a',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: '700',
                                cursor: (otp.join('').length < 4 || loading) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? 'Verifying...' : 'Verify OTP & Continue ➔'}
                        </button>
                    </form>
                )}

                {/* Footer Subtext */}
                <div style={{ marginTop: '22px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: '500' }}>
                        Aqua Plant OS • Unified Access for Admin, Driver & Customer
                    </span>
                </div>

            </div>
        </div>
    );
};

export default LoginPage;