import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import QrDisplay from './QrDisplay';
import {
    DropletIcon,
    HomeIcon,
    PackageIcon,
    HistoryIcon,
    BellIcon,
    UserIcon,
    LogOutIcon,
    CheckCircleIcon,
    AlertCircleIcon,
    ZapIcon,
    CalendarIcon
} from '../../components/common/Icons';

const CustomerDashboard = () => {
    const navigate = useNavigate();

    // 🔒 Persistent Session State
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const saved = localStorage.getItem('user');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    });

    const [customerId, setCustomerId] = useState(() => {
        try {
            const saved = localStorage.getItem('user');
            return saved ? JSON.parse(saved)._id : '';
        } catch (e) {
            return '';
        }
    });

    const [tokenBalance, setTokenBalance] = useState(0);
    const [prepaidBalance, setPrepaidBalance] = useState(0);
    const [subscriptionType, setSubscriptionType] = useState('None');
    const [activeOrder, setActiveOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // ⚡ Quick Booking Quantity Selector (Counter 1 to 5)
    const [quickQty, setQuickQty] = useState(1);

    // Navigation Menu States
    const [currentTab, setCurrentTab] = useState('dashboard');
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

    // Booking modal / action type
    const [bookingType, setBookingType] = useState('Routine');
    const [bulkQuantity, setBulkQuantity] = useState(5);
    const [historyLogs, setHistoryLogs] = useState([]);

    // 🛡️ Authentication Guard
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            navigate('/');
            return;
        }

        try {
            const user = JSON.parse(storedUser);
            if (user.role !== 'Customer' && user.role !== 'Admin') {
                navigate('/');
                return;
            }
            setCurrentUser(user);
            setCustomerId(user._id);
        } catch (err) {
            navigate('/');
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/');
    };

    const fetchCustomerState = async (id) => {
        if (!id) return;

        try {
            const orderRes = await API.get(`/orders/customer/${id}`);
            setActiveOrder(orderRes.data);
        } catch (err) {
            setActiveOrder(null);
        }

        try {
            const usersRes = await API.get('/users/all');
            const liveUser = usersRes.data.find(u => u._id === id);
            if (liveUser) {
                setTokenBalance(liveUser.tokenBalance ?? 0);
                setPrepaidBalance(liveUser.prepaidJarBalance ?? liveUser.tokenBalance ?? 0);
                setSubscriptionType(liveUser.subscriptionType || 'None');

                // 🔄 LIVE PROFILE SYNC
                setCurrentUser(prev => {
                    const updated = { ...prev, ...liveUser };
                    localStorage.setItem('user', JSON.stringify(updated));
                    return updated;
                });
            }
        } catch (err) {
            console.error('Error syncing balance:', err);
        }
    };

    const fetchHistory = async (id) => {
        if (!id) return;
        try {
            const res = await API.get(`/orders/history/customer/${id}`);
            setHistoryLogs(res.data || []);
        } catch (err) {
            console.error('Error fetching history:', err);
        }
    };

    useEffect(() => {
        if (!customerId) return;
        fetchCustomerState(customerId);
        fetchHistory(customerId);

        const interval = setInterval(() => {
            fetchCustomerState(customerId);
            if (currentTab === 'history' || currentTab === 'dashboard' || currentTab === 'notifications') {
                fetchHistory(customerId);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [customerId, currentTab]);

    const handleTabChange = (tabName) => {
        setCurrentTab(tabName);
        setIsMobileDrawerOpen(false);
    };

    // 1. Regular / Bulk Booking
    const handleBookWater = async (type, qty = 1) => {
        if (!customerId) return;
        setLoading(true);
        setMessage('');
        try {
            const res = await API.post('/orders/book', {
                customerId,
                orderType: type,
                quantity: qty
            });
            setMessage(res.data.message);
            setActiveOrder(res.data.order);
            fetchCustomerState(customerId);
            fetchHistory(customerId);
            setCurrentTab('dashboard');
        } catch (err) {
            setMessage(err.response?.data?.message || 'Booking failed');
        } finally {
            setLoading(false);
        }
    };

    // 2. Instant Spot Handover Request
    const handleInstantRequest = async () => {
        if (!customerId) return;
        setLoading(true);
        setMessage('');
        try {
            const res = await API.post('/orders/instant-request', {
                customerId,
                quantity: 1
            });
            setMessage(res.data.message);
            setActiveOrder(res.data.order);
            fetchCustomerState(customerId);
            setCurrentTab('dashboard');
        } catch (err) {
            setMessage(err.response?.data?.message || 'Spot request failed');
        } finally {
            setLoading(false);
        }
    };

    // 3. Routine Schedule Update
    const handleSetSubscription = async (plan) => {
        setLoading(true);
        setMessage('');
        try {
            const res = await API.put('/orders/subscription', {
                customerId,
                subscriptionType: plan
            });
            setSubscriptionType(plan);
            setMessage(plan === 'None' ? 'Auto-routine stopped. Switched to manual orders.' : res.data.message);
            fetchCustomerState(customerId);
        } catch (err) {
            setMessage(err.response?.data?.message || 'Subscription update failed');
        } finally {
            setLoading(false);
        }
    };

    // 4. Customer: Cancel Active Order / Skip Today
    const handleCustomerCancelActiveOrder = async (orderId) => {
        if (!window.confirm("Kya aap sach me aaj ka paani cancel karna chahte hain?")) return;
        setLoading(true);
        setMessage('');
        try {
            await API.put(`/orders/cancel/${orderId}`, {
                reason: 'Customer cancelled: Aaj paani ki zaroorat nahi hai (Skipped today).'
            });
            setMessage('Aaj ka delivery order successfully cancel kar diya gaya.');
            fetchCustomerState(customerId);
            fetchHistory(customerId);
        } catch (err) {
            setMessage(err.response?.data?.message || 'Cancellation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <style>{`
                .sidebar-wrap {
                    width: 260px;
                    background: #09233b;
                    color: #cbd5e1;
                    display: flex;
                    flex-direction: column;
                    flex-shrink: 0;
                    height: 100vh;
                    position: sticky;
                    top: 0;
                    z-index: 1000;
                    transition: transform 0.3s ease-in-out;
                }
                .main-view {
                    flex: 1;
                    padding: 28px 40px;
                    overflow-y: auto;
                    height: 100vh;
                    box-sizing: border-box;
                    display: flex;
                    justify-content: center;
                }
                .feed-container {
                    width: 100%;
                    max-width: 1080px;
                }
                .side-link {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 11px 16px;
                    margin: 4px 14px;
                    border-radius: 10px;
                    font-size: 13.5px;
                    font-weight: 600;
                    color: #94a3b8;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .side-link:hover { background: rgba(255,255,255,0.06); color: #ffffff; }
                .side-link.active { 
                    background: linear-gradient(135deg, #0284c7, #0369a1); 
                    color: #ffffff; 
                    box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
                }

                .dashboard-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 24px;
                    align-items: start;
                }

                .segmented-wrapper {
                    display: flex;
                    background: #f1f5f9;
                    padding: 4px;
                    border-radius: 14px;
                    gap: 4px;
                }
                .segment-btn {
                    flex: 1;
                    padding: 9px 8px;
                    border: none;
                    background: transparent;
                    color: #64748b;
                    font-size: 12.5px;
                    font-weight: 700;
                    border-radius: 10px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    transition: all 0.2s ease;
                }
                .segment-btn.active {
                    background: #ffffff;
                    color: #0284c7;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.06);
                }

                .pulsing-dot {
                    width: 8px;
                    height: 8px;
                    background: #16a34a;
                    border-radius: 50%;
                    box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7);
                    animation: pulse 1.6s infinite;
                }
                @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
                }

                .mobile-header { display: none; }
                .drawer-overlay { display: none; }

                @media (max-width: 900px) {
                    .dashboard-grid { grid-template-columns: 1fr; gap: 20px; }
                }

                @media (max-width: 768px) {
                    .sidebar-wrap {
                        position: fixed;
                        top: 0; left: 0; bottom: 0;
                        transform: translateX(-100%);
                        box-shadow: 4px 0 20px rgba(0,0,0,0.3);
                    }
                    .sidebar-wrap.open { transform: translateX(0); }
                    .drawer-overlay.open {
                        display: block;
                        position: fixed;
                        top: 0; left: 0; right: 0; bottom: 0;
                        background: rgba(0,0,0,0.5);
                        z-index: 999;
                    }
                    .main-view { padding: 80px 16px 24px 16px; }
                    .mobile-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: #ffffff;
                        padding: 12px 18px;
                        border-bottom: 1px solid #e2e8f0;
                        position: fixed;
                        top: 0; left: 0; right: 0;
                        z-index: 998;
                    }
                }
            `}</style>

            <div 
                className={`drawer-overlay ${isMobileDrawerOpen ? 'open' : ''}`} 
                onClick={() => setIsMobileDrawerOpen(false)} 
            />

            {/* 🖥️ SIDEBAR WITH CLEAN SVG ICONS */}
            <div className={`sidebar-wrap ${isMobileDrawerOpen ? 'open' : ''}`}>
                <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'linear-gradient(135deg, #0284c7, #0369a1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)' }}>
                            <DropletIcon size={20} strokeWidth={2.2} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.4px' }}>Aqua Customer</h3>
                            <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '600' }}>Self-Service Hub</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsMobileDrawerOpen(false)}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer', display: isMobileDrawerOpen ? 'block' : 'none' }}
                    >
                        ✕
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <div className={`side-link ${currentTab === 'dashboard' ? 'active' : ''}`} onClick={() => handleTabChange('dashboard')}>
                        <HomeIcon size={18} />
                        <span>Dashboard</span>
                    </div>
                    <div className={`side-link ${currentTab === 'orders' ? 'active' : ''}`} onClick={() => handleTabChange('orders')}>
                        <PackageIcon size={18} />
                        <span>My Orders</span>
                    </div>
                    <div className={`side-link ${currentTab === 'book' ? 'active' : ''}`} onClick={() => { handleTabChange('dashboard'); setBookingType('Instant'); }}>
                        <DropletIcon size={18} />
                        <span>Book Water</span>
                    </div>
                    <div className={`side-link ${currentTab === 'history' ? 'active' : ''}`} onClick={() => handleTabChange('history')}>
                        <HistoryIcon size={18} />
                        <span>History</span>
                    </div>
                    <div className={`side-link ${currentTab === 'notifications' ? 'active' : ''}`} onClick={() => handleTabChange('notifications')}>
                        <BellIcon size={18} />
                        <span>Notifications</span>
                    </div>
                    <div className={`side-link ${currentTab === 'profile' ? 'active' : ''}`} onClick={() => handleTabChange('profile')}>
                        <UserIcon size={18} />
                        <span>Profile</span>
                    </div>

                    <div style={{ margin: '14px 18px', borderTop: '1px solid #1e3a5f' }} />

                    <div className={`side-link ${currentTab === 'help' ? 'active' : ''}`} onClick={() => handleTabChange('help')}>
                        <AlertCircleIcon size={18} />
                        <span>Help & Support</span>
                    </div>
                    <div className="side-link" onClick={handleLogout} style={{ color: '#f87171' }}>
                        <LogOutIcon size={18} />
                        <span>Logout</span>
                    </div>
                </div>

                <div style={{ padding: '16px 20px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid #1e3a5f' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>{currentUser?.name || 'Customer'}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{currentUser?.phone || currentUser?.email || ''}</div>
                </div>
            </div>

            {/* 📱 MOBILE HEADER */}
            <div className="mobile-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button 
                        onClick={() => setIsMobileDrawerOpen(true)}
                        style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '6px 10px', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}
                    >
                        ☰
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <DropletIcon size={20} color="#0284c7" />
                        <strong style={{ fontSize: '15px', color: '#0f172a' }}>Aqua Customer</strong>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => setCurrentTab('notifications')} style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#475569' }}>
                        <BellIcon size={16} />
                    </button>
                    <button onClick={() => setCurrentTab('profile')} style={{ background: '#e0f2fe', color: '#0284c7', border: 'none', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <UserIcon size={16} />
                    </button>
                </div>
            </div>

            {/* 📄 MAIN FEED CANVAS */}
            <div className="main-view">
                <div className="feed-container">

                    {/* 1. HOME / DASHBOARD TAB */}
                    {currentTab === 'dashboard' && (
                        <div>
                            {/* Header Greeting */}
                            <div style={{ marginBottom: '20px' }}>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Good Day</span>
                                <h2 style={{ margin: '2px 0 0 0', color: '#0f172a', fontSize: '22px', fontWeight: '800' }}>
                                    Welcome, {currentUser?.name || 'Customer'}
                                </h2>
                            </div>

                            {message && (
                                <div style={{ background: message.includes('failed') ? '#fee2e2' : '#dcfce7', color: message.includes('failed') ? '#b91c1c' : '#15803d', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', marginBottom: '20px', border: `1px solid ${message.includes('failed') ? '#fca5a5' : '#86efac'}` }}>
                                    {message}
                                </div>
                            )}

                            {/* 🚀 MODERN 2-COLUMN DASHBOARD GRID */}
                            <div className="dashboard-grid">

                                {/* ⬅️ LEFT COLUMN: Pass & Booking */}
                                <div>
                                    {/* Fintech-Style Token Pass Card */}
                                    <div style={{
                                        position: 'relative',
                                        overflow: 'hidden',
                                        background: prepaidBalance > 0 
                                            ? 'linear-gradient(135deg, #15803d 0%, #16a34a 55%, #15803d 100%)' 
                                            : 'linear-gradient(135deg, #0369a1 0%, #0284c7 55%, #0369a1 100%)',
                                        color: '#ffffff',
                                        padding: '24px 22px',
                                        borderRadius: '20px',
                                        marginBottom: '20px',
                                        boxShadow: prepaidBalance > 0 
                                            ? '0 12px 28px -6px rgba(22, 163, 74, 0.35)' 
                                            : '0 12px 28px -6px rgba(2, 132, 199, 0.35)'
                                    }}>
                                        {/* Background SVG Watermark */}
                                        <div style={{ position: 'absolute', right: '-15px', bottom: '-25px', opacity: 0.1, color: '#ffffff', pointerEvents: 'none' }}>
                                            <PackageIcon size={120} />
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                                            <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', opacity: 0.88, textTransform: 'uppercase' }}>
                                                {prepaidBalance > 0 ? 'AVAILABLE JAR TOKENS' : 'CURRENT BILLING MODE'}
                                            </span>
                                            {/* Empty Jars Pill */}
                                            <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', padding: '3px 10px', borderRadius: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <PackageIcon size={13} />
                                                {(currentUser?.emptyJarsHeld || 0) > 0 ? `${currentUser.emptyJarsHeld} Empty at Home` : '0 Empty Jars'}
                                            </span>
                                        </div>

                                        <div style={{ margin: '14px 0 6px 0', position: 'relative', zIndex: 1 }}>
                                            {prepaidBalance > 0 ? (
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                                    <span style={{ fontSize: '44px', fontWeight: '900', lineHeight: 1 }}>{prepaidBalance}</span>
                                                    <span style={{ fontSize: '16px', fontWeight: '600', opacity: 0.9 }}>Tokens Left</span>
                                                </div>
                                            ) : (
                                                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800' }}>Pay on Delivery (COD)</h2>
                                            )}
                                        </div>

                                        {/* Consumption Estimate */}
                                        {prepaidBalance > 0 && (
                                            <p style={{ margin: '0 0 14px 0', fontSize: '12px', opacity: 0.92, fontWeight: '500', position: 'relative', zIndex: 1 }}>
                                                Daily 1 jar ke hisaab se lagbhag <strong>{prepaidBalance} din</strong> tak chalega.
                                            </p>
                                        )}

                                        <div style={{ fontSize: '11.5px', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)', display: 'inline-block', padding: '4px 12px', borderRadius: '20px', position: 'relative', zIndex: 1 }}>
                                            Schedule: <strong>{subscriptionType === 'None' ? 'Manual Ordering (₹20/Jar)' : `${subscriptionType} Routine`}</strong>
                                        </div>
                                    </div>

                                    {/* Quick Booking with Counter */}
                                    {!activeOrder && (
                                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '18px', marginBottom: '20px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                                <div>
                                                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>Quick Water Booking</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>Select number of jars to order</div>
                                                </div>
                                                {/* Counter [-] [Count] [+] */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '4px 8px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                                                    <button 
                                                        onClick={() => setQuickQty(prev => Math.max(1, prev - 1))}
                                                        style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: '#ffffff', color: '#0284c7', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}
                                                    >
                                                        -
                                                    </button>
                                                    <span style={{ fontSize: '15px', fontWeight: '800', minWidth: '24px', textAlign: 'center', color: '#0f172a' }}>
                                                        {quickQty}
                                                    </span>
                                                    <button 
                                                        onClick={() => setQuickQty(prev => Math.min(5, prev + 1))}
                                                        style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: '#0284c7', color: '#ffffff', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleBookWater('OnDemand', quickQty)}
                                                disabled={loading}
                                                style={{
                                                    width: '100%',
                                                    padding: '14px',
                                                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                                                    color: '#ffffff',
                                                    border: 'none',
                                                    borderRadius: '12px',
                                                    fontSize: '14px',
                                                    fontWeight: '800',
                                                    cursor: loading ? 'not-allowed' : 'pointer',
                                                    boxShadow: '0 6px 16px rgba(2, 132, 199, 0.28)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px'
                                                }}
                                            >
                                                <DropletIcon size={16} />
                                                BOOK {quickQty} JAR{quickQty > 1 ? 'S' : ''} NOW (
                                                {prepaidBalance >= quickQty 
                                                    ? `${quickQty} Token${quickQty > 1 ? 's' : ''}` 
                                                    : `₹${quickQty * 20} COD`
                                                })
                                            </button>
                                        </div>
                                    )}

                                    {/* Segmented Operations Controller */}
                                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '18px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
                                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>
                                            Delivery Modes
                                        </div>

                                        <div className="segmented-wrapper">
                                            <button className={`segment-btn ${bookingType === 'Routine' ? 'active' : ''}`} onClick={() => setBookingType('Routine')}>
                                                <CalendarIcon size={14} /> Routine {subscriptionType !== 'None' ? '●' : ''}
                                            </button>
                                            <button className={`segment-btn ${bookingType === 'Instant' ? 'active' : ''}`} onClick={() => setBookingType('Instant')}>
                                                <ZapIcon size={14} /> Spot Extra
                                            </button>
                                            <button className={`segment-btn ${bookingType === 'Bulk' ? 'active' : ''}`} onClick={() => setBookingType('Bulk')}>
                                                <PackageIcon size={14} /> Bulk (5+)
                                            </button>
                                        </div>

                                        <div style={{ marginTop: '14px' }}>
                                            {bookingType === 'Routine' && (
                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Schedule Auto Routine</span>
                                                        {subscriptionType !== 'None' && (
                                                            <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                                                                ● {subscriptionType} Active
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p style={{ fontSize: '11.5px', color: '#64748b', margin: '0 0 12px 0' }}>
                                                        Paani auto deliver hoga bina roz booking kiye. Jab zaroorat na ho, tab band karein.
                                                    </p>
                                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                                        <button onClick={() => handleSetSubscription('Daily')} style={{ flex: 1, padding: '10px', background: subscriptionType === 'Daily' ? '#16a34a' : '#f8fafc', color: subscriptionType === 'Daily' ? '#fff' : '#334155', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                                                            Daily Schedule
                                                        </button>
                                                        <button onClick={() => handleSetSubscription('Alternate')} style={{ flex: 1, padding: '10px', background: subscriptionType === 'Alternate' ? '#16a34a' : '#f8fafc', color: subscriptionType === 'Alternate' ? '#fff' : '#334155', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                                                            Alternate Days
                                                        </button>
                                                    </div>
                                                    {subscriptionType !== 'None' && (
                                                        <button 
                                                            onClick={() => handleSetSubscription('None')} 
                                                            disabled={loading}
                                                            style={{ width: '100%', padding: '9px', background: '#fee2e2', color: '#b91c1c', border: '1px dashed #fca5a5', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                                                        >
                                                            Turn Off Auto-Delivery (Switch to Manual)
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {bookingType === 'Instant' && (
                                                <div>
                                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Instant Doorstep Handover</span>
                                                    <p style={{ fontSize: '11.5px', color: '#64748b', margin: '4px 0 12px 0' }}>Request extra jar on the spot when driver is at your door.</p>
                                                    <button onClick={handleInstantRequest} disabled={loading} style={{ width: '100%', padding: '10px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
                                                        {loading ? 'Sending...' : 'Request Spot Jar'}
                                                    </button>
                                                </div>
                                            )}

                                            {bookingType === 'Bulk' && (
                                                <div>
                                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Bulk Event Ordering</span>
                                                    <p style={{ fontSize: '11.5px', color: '#64748b', margin: '4px 0 10px 0' }}>Order 5 or more jars for events or functions.</p>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <input type="number" min="5" max="100" value={bulkQuantity} onChange={(e) => setBulkQuantity(Number(e.target.value))} style={{ width: '70px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold', textAlign: 'center' }} />
                                                        <button onClick={() => handleBookWater('Bulk', bulkQuantity)} style={{ flex: 1, padding: '10px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
                                                            Order {bulkQuantity} Jars
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ➡️ RIGHT COLUMN: Live Track & Activity */}
                                <div>
                                    {/* Upcoming & Live Delivery Card */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
                                            Delivery Status
                                        </span>

                                        {activeOrder ? (
                                            <div style={{ background: '#ffffff', border: '1px solid #bae6fd', borderLeft: '5px solid #0284c7', borderRadius: '18px', padding: '20px', boxShadow: '0 4px 14px rgba(2, 132, 199, 0.08)' }}>
                                                {activeOrder.status === 'Pending' && (
                                                    <div style={{ textAlign: 'center' }}>
                                                        <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>● Approval Pending</span>
                                                        <h4 style={{ margin: '10px 0 2px 0', color: '#0f172a', fontSize: '15px' }}>{activeOrder.quantity || 1} Jar Delivery Requested</h4>
                                                        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px 0' }}>Waiting for plant admin/driver verification.</p>
                                                        
                                                        <button 
                                                            onClick={() => handleCustomerCancelActiveOrder(activeOrder._id)}
                                                            disabled={loading}
                                                            style={{ padding: '8px 16px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                                                        >
                                                            Cancel / Skip Today's Jar
                                                        </button>
                                                    </div>
                                                )}

                                                {activeOrder.status === 'PendingSpotAcceptance' && (
                                                    <div style={{ textAlign: 'center' }}>
                                                        <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>● Waiting for Driver Accept</span>
                                                        <h4 style={{ margin: '10px 0 2px 0', color: '#0f172a', fontSize: '15px' }}>Spot Handover in Progress</h4>
                                                        <button 
                                                            onClick={() => handleCustomerCancelActiveOrder(activeOrder._id)}
                                                            disabled={loading}
                                                            style={{ marginTop: '12px', padding: '6px 14px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}
                                                        >
                                                            Cancel Request
                                                        </button>
                                                    </div>
                                                )}

                                                {activeOrder.status === 'Approved' && (
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                                            <div className="pulsing-dot" />
                                                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#16a34a' }}>Approved & Ready for Scan</span>
                                                        </div>
                                                        <QrDisplay order={activeOrder} />
                                                        <div style={{ textAlign: 'center', marginTop: '10px' }}>
                                                            <button 
                                                                onClick={() => handleCustomerCancelActiveOrder(activeOrder._id)}
                                                                disabled={loading}
                                                                style={{ padding: '6px 12px', background: 'transparent', color: '#dc2626', border: 'none', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                                                            >
                                                                Cancel this order
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: subscriptionType !== 'None' ? '5px solid #16a34a' : '5px solid #cbd5e1', borderRadius: '18px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 14px rgba(0,0,0,0.02)' }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {subscriptionType !== 'None' && <div className="pulsing-dot" />}
                                                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Next Automated Delivery</div>
                                                    </div>
                                                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                                                        {subscriptionType === 'None' ? 'No routine schedule active' : `Active Routine: ${subscriptionType}`}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '11px', background: subscriptionType === 'None' ? '#f1f5f9' : '#dcfce7', color: subscriptionType === 'None' ? '#475569' : '#15803d', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold' }}>
                                                        {subscriptionType === 'None' ? 'Manual' : 'Active'}
                                                    </span>
                                                    {subscriptionType !== 'None' && (
                                                        <button 
                                                            onClick={() => handleSetSubscription('None')}
                                                            style={{ padding: '4px 8px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                                                        >
                                                            Stop
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Recent Activity List with Capsule Badges */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Recent Activity</span>
                                            <span onClick={() => handleTabChange('history')} style={{ fontSize: '12px', color: '#0284c7', fontWeight: 'bold', cursor: 'pointer' }}>View All</span>
                                        </div>

                                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '10px 16px', boxShadow: '0 4px 14px rgba(0,0,0,0.02)' }}>
                                            {historyLogs.slice(0, 3).length === 0 ? (
                                                <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '20px 0', margin: 0 }}>No recent delivery activity recorded.</p>
                                            ) : (
                                                historyLogs.slice(0, 3).map((log, idx) => (
                                                    <div key={log._id} style={{ padding: '12px 0', borderBottom: idx !== 2 ? '1px solid #f1f5f9' : 'none' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#f0f9ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <DropletIcon size={16} />
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{log.quantity || 1} Jar ({log.orderType})</div>
                                                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(log.createdAt).toLocaleDateString()}</div>
                                                                </div>
                                                            </div>
                                                            {/* Capsule Badge */}
                                                            <span style={{ 
                                                                fontSize: '11px', 
                                                                fontWeight: 'bold', 
                                                                padding: '4px 10px',
                                                                borderRadius: '20px',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                background: log.status === 'Delivered' ? '#dcfce7' : log.status === 'Cancelled' ? '#fee2e2' : '#fef3c7',
                                                                color: log.status === 'Delivered' ? '#15803d' : log.status === 'Cancelled' ? '#b91c1c' : '#b45309'
                                                            }}>
                                                                {log.status === 'Delivered' && <CheckCircleIcon size={12} />}
                                                                {log.status === 'Cancelled' && <AlertCircleIcon size={12} />}
                                                                {log.status}
                                                            </span>
                                                        </div>

                                                        {log.status === 'Cancelled' && (
                                                            <div style={{ 
                                                                marginTop: '8px', 
                                                                background: '#fff1f2', 
                                                                border: '1px solid #ffe4e6', 
                                                                borderRadius: '8px', 
                                                                padding: '6px 10px', 
                                                                fontSize: '11.5px', 
                                                                color: '#9f1239',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px'
                                                            }}>
                                                                <AlertCircleIcon size={14} color="#9f1239" />
                                                                <span><strong>Reason:</strong> {log.cancellationReason || 'Order rejected by distributor/admin.'}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}

                    {/* 2. MY ORDERS TAB */}
                    {currentTab === 'orders' && (
                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '24px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <PackageIcon size={20} color="#0284c7" />
                                My Live Orders
                            </h3>
                            {activeOrder ? (
                                <div>
                                    <div style={{ background: '#f0f9ff', padding: '16px', borderRadius: '12px', border: '1px solid #bae6fd', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <strong>Active Status: {activeOrder.status}</strong>
                                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Quantity: {activeOrder.quantity || 1} Jar ({activeOrder.orderType})</div>
                                        </div>
                                        <button 
                                            onClick={() => handleCustomerCancelActiveOrder(activeOrder._id)}
                                            style={{ padding: '8px 14px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                    {activeOrder.status === 'Approved' && <QrDisplay order={activeOrder} />}
                                </div>
                            ) : (
                                <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '30px 0' }}>No live orders currently in progress.</p>
                            )}
                        </div>
                    )}

                    {/* 3. HISTORY TAB */}
                    {currentTab === 'history' && (
                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '24px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <HistoryIcon size={20} color="#0284c7" />
                                Complete History
                            </h3>
                            {historyLogs.length === 0 ? (
                                <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '30px 0' }}>No history records found.</p>
                            ) : (
                                historyLogs.map(log => (
                                    <div key={log._id} style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '10px', background: '#f8fafc', fontSize: '12.5px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <strong>{new Date(log.createdAt).toLocaleDateString()}</strong>
                                            <span style={{ 
                                                fontSize: '11px', 
                                                fontWeight: 'bold', 
                                                padding: '3px 9px',
                                                borderRadius: '20px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                background: log.status === 'Delivered' ? '#dcfce7' : log.status === 'Cancelled' ? '#fee2e2' : '#fef3c7',
                                                color: log.status === 'Delivered' ? '#15803d' : log.status === 'Cancelled' ? '#b91c1c' : '#b45309'
                                            }}>
                                                {log.status === 'Delivered' && <CheckCircleIcon size={12} />}
                                                {log.status === 'Cancelled' && <AlertCircleIcon size={12} />}
                                                {log.status}
                                            </span>
                                        </div>
                                        <div style={{ color: '#64748b' }}>Qty: {log.quantity || 1} Jar ({log.orderType}) • Status: {log.paymentStatus || 'Pending'}</div>
                                        {log.status === 'Cancelled' && (
                                            <div style={{ color: '#9f1239', fontWeight: '600', marginTop: '6px', background: '#fff1f2', border: '1px solid #ffe4e6', padding: '6px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <AlertCircleIcon size={13} color="#9f1239" />
                                                <span><strong>Reason:</strong> {log.cancellationReason || 'Rejected by distributor/admin.'}</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* 4. NOTIFICATIONS TAB */}
                    {currentTab === 'notifications' && (
                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '24px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <BellIcon size={20} color="#0284c7" />
                                Notifications
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 14px', borderRadius: '12px', fontSize: '12.5px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CheckCircleIcon size={16} />
                                    <span>Plant is open today and accepting deliveries normally.</span>
                                </div>
                                {prepaidBalance < 3 && (
                                    <div style={{ background: '#fffbeb', border: '1px solid #fef08a', padding: '12px 14px', borderRadius: '12px', fontSize: '12.5px', color: '#854d0e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <AlertCircleIcon size={16} />
                                        <span>Low Token Balance ({prepaidBalance} left). Ask Driver/Plant to add advance tokens to avoid doorstep cash collection.</span>
                                    </div>
                                )}
                                {historyLogs.filter(log => log.status === 'Cancelled').slice(0, 3).map(log => (
                                    <div key={`notif-${log._id}`} style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px 14px', borderRadius: '12px', fontSize: '12.5px', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <AlertCircleIcon size={16} color="#991b1b" />
                                        <span><strong>Order Cancelled ({new Date(log.createdAt).toLocaleDateString()}):</strong> {log.cancellationReason || 'Order rejected by distributor/admin.'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 5. PROFILE TAB */}
                    {currentTab === 'profile' && (
                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '24px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <UserIcon size={20} color="#0284c7" />
                                Customer Profile
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>FULL NAME</span>
                                    <strong>{currentUser?.name || 'N/A'}</strong>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>EMAIL / PHONE</span>
                                    <strong>{currentUser?.email || currentUser?.phone || 'N/A'}</strong>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>USER ROLE</span>
                                    <strong style={{ color: '#0284c7' }}>{currentUser?.role || 'Customer'}</strong>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 6. HELP & SUPPORT TAB */}
                    {currentTab === 'help' && (
                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '24px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertCircleIcon size={20} color="#0284c7" />
                                Help & Support
                            </h3>
                            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 16px 0' }}>Need assistance with jar delivery, advance pass recharge, or damaged bottles?</p>
                            <div style={{ background: 'linear-gradient(135deg, #09233b, #0369a1)', color: '#fff', padding: '18px', borderRadius: '14px', textAlign: 'center' }}>
                                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Plant Counter Helpline</div>
                                <div style={{ fontSize: '18px', fontWeight: '800', marginTop: '4px' }}>+91 98765 43210</div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

        </div>
    );
};

export default CustomerDashboard;