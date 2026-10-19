import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import QrScanner from './QrScanner';
import {
    TruckIcon,
    DropletIcon,
    PackageIcon,
    HistoryIcon,
    BellIcon,
    UserIcon,
    CreditCardIcon,
    CheckCircleIcon,
    AlertCircleIcon,
    ZapIcon,
    CalendarIcon,
    LogOutIcon
} from '../../components/common/Icons';

const DistributorDashboard = () => {
    const navigate = useNavigate();

    // 🔒 Persistent Logged-in Session Driver Only
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const saved = localStorage.getItem('user');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    });

    const [distributorId, setDistributorId] = useState(() => {
        try {
            const saved = localStorage.getItem('user');
            return saved ? JSON.parse(saved)._id : '';
        } catch (e) {
            return '';
        }
    });

    const [otpInput, setOtpInput] = useState('');
    const [scanMode, setScanMode] = useState(false);
    const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
    
    // View Modes: 'live' | 'approvals' | 'walkin' | 'recharge' | 'adjust' | 'paymentLogs' | 'inventory' | 'history'
    const [viewMode, setViewMode] = useState('live');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [paymentMode, setPaymentMode] = useState('Cash');
    const [amountToCollect, setAmountToCollect] = useState(20);
    const [todayOrders, setTodayOrders] = useState([]);
    const [pendingOrders, setPendingOrders] = useState([]); // 📋 Approvals Queue
    const [spotOrders, setSpotOrders] = useState([]);
    const [historyLogs, setHistoryLogs] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [walletLogs, setWalletLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    // 🚨 Order Rejection Reason Modal States
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectOrderId, setRejectOrderId] = useState(null);
    const [selectedReason, setSelectedReason] = useState('Aaj aapke route par delivery available nahi hai.');
    const [customReason, setCustomReason] = useState('');

    // 🚰 Inventory State for Distributor
    const [inventoryStats, setInventoryStats] = useState({ filledJars: 0, emptyJars: 0, damagedJars: 0 });
    const [returnCount, setReturnCount] = useState(5);
    const [damageForm, setDamageForm] = useState({ count: 1, fromStatus: 'EMPTY', reason: 'Damaged during transit' });

    // ⚡ Walk-in / 1-Day Direct Sale Form State
    const [walkInForm, setWalkInForm] = useState({
        guestName: '',
        guestPhone: '',
        quantity: 1,
        amountPaid: 20,
        paymentMethod: 'Cash',
        emptyJarsReceived: 1
    });

    // 💳 Doorstep Advance Token Recharge Form State
    const [doorstepRechargeForm, setDoorstepRechargeForm] = useState({
        customerId: '',
        jarCount: 10,
        amountPaid: 200,
        paymentMode: 'Cash'
    });

    // ⚖️ Manual Token Adjustment Form State
    const [adjustForm, setAdjustForm] = useState({
        userId: '',
        adjustmentType: 'CREDIT',
        tokens: 1,
        reason: 'Broken Jar / Damage Refund'
    });

    // 🛡️ Distributor Session Guard
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            navigate('/');
            return;
        }

        try {
            const user = JSON.parse(storedUser);
            if (user.role !== 'Distributor' && user.role !== 'Admin') {
                navigate('/');
                return;
            }
            setCurrentUser(user);
            setDistributorId(user._id);
        } catch (err) {
            navigate('/');
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/');
    };

    // 🔄 Live Profile Sync (Bina logout kiye role/permission sync)
    const syncLiveProfile = async () => {
        if (!distributorId) return;
        try {
            const res = await API.get('/users/all');
            const liveUser = (res.data || []).find(u => u._id === distributorId);
            if (liveUser) {
                setCurrentUser(prev => {
                    if (JSON.stringify(prev?.permissions) !== JSON.stringify(liveUser.permissions) || prev?.role !== liveUser.role) {
                        const updated = { ...prev, ...liveUser };
                        localStorage.setItem('user', JSON.stringify(updated));
                        return updated;
                    }
                    return prev;
                });
            }
        } catch (err) {
            console.error('Error syncing live driver profile:', err);
        }
    };

    // Data Fetchers
    const fetchLiveDeliveries = async () => {
        try {
            const res = await API.get('/orders/today-list');
            setTodayOrders(res.data || []);
        } catch (err) {}
    };

    const fetchPendingOrders = async () => {
        try {
            const res = await API.get('/orders/pending');
            setPendingOrders(res.data || []);
        } catch (err) {}
    };

    const fetchSpotOrders = async () => {
        try {
            const res = await API.get('/orders/instant-pending');
            setSpotOrders(res.data || []);
        } catch (err) {}
    };

    const fetchHistory = async (dId) => {
        if (!dId) return;
        try {
            const res = await API.get(`/orders/history/distributor/${dId}`);
            setHistoryLogs(res.data || []);
        } catch (err) {}
    };

    const fetchCustomers = async () => {
        try {
            const res = await API.get('/users/all');
            const custs = (res.data || []).filter(u => u.role === 'Customer');
            setUsersList(custs);
        } catch (err) {}
    };

    const fetchInventory = async () => {
        try {
            const res = await API.get('/inventory/stocks');
            setInventoryStats(res.data || { filledJars: 0, emptyJars: 0, damagedJars: 0 });
        } catch (err) {}
    };

    const fetchWalletLogs = async () => {
        try {
            const res = await API.get('/wallet/logs');
            setWalletLogs(res.data || []);
        } catch (err) {}
    };

    // Background Pollers
    useEffect(() => {
        if (!distributorId) return;

        syncLiveProfile();
        const profileInterval = setInterval(syncLiveProfile, 4000);

        if (viewMode === 'live') {
            fetchLiveDeliveries();
            fetchSpotOrders();
            fetchPendingOrders();
            const interval = setInterval(() => {
                fetchLiveDeliveries();
                fetchSpotOrders();
                fetchPendingOrders();
            }, 3000);
            return () => {
                clearInterval(interval);
                clearInterval(profileInterval);
            };
        } else if (viewMode === 'approvals') {
            fetchPendingOrders();
            const interval = setInterval(fetchPendingOrders, 3000);
            return () => {
                clearInterval(interval);
                clearInterval(profileInterval);
            };
        } else if (viewMode === 'history') {
            fetchHistory(distributorId);
        } else if (viewMode === 'recharge' || viewMode === 'adjust') {
            fetchCustomers();
        } else if (viewMode === 'paymentLogs') {
            fetchWalletLogs();
        } else if (viewMode === 'inventory') {
            fetchInventory();
        }

        return () => clearInterval(profileInterval);
    }, [viewMode, distributorId]);

    const handleTabChange = (tabName) => {
        setViewMode(tabName);
        setIsMobileMenuOpen(false);
        setStatusMessage({ type: '', text: '' });
    };

    // 📋 Order Handlers (Approve & Cancel/Reject)
    const handleApprove = async (orderId) => {
        setLoading(true);
        setStatusMessage({ type: '', text: '' });
        try {
            await API.put(`/orders/approve/${orderId}`);
            setStatusMessage({ type: 'success', text: 'Order approved! Customer unlocked for QR delivery.' });
            fetchPendingOrders();
            fetchLiveDeliveries();
        } catch (err) {
            setStatusMessage({ type: 'error', text: 'Failed to approve order.' });
        } finally {
            setLoading(false);
        }
    };

    // ❌ Modal Open for Rejection Reason
    const openRejectModal = (orderId) => {
        setRejectOrderId(orderId);
        setSelectedReason('Aaj aapke route par delivery available nahi hai.');
        setCustomReason('');
        setRejectModalOpen(true);
    };

    // ❌ Confirm Reject with Selected Reason
    const handleConfirmReject = async () => {
        if (!rejectOrderId) return;
        const finalReason = selectedReason === 'Other' ? customReason.trim() : selectedReason;

        if (!finalReason) {
            alert('Kripya reject karne ka reason likhein ya choose karein.');
            return;
        }

        setLoading(true);
        setStatusMessage({ type: '', text: '' });
        try {
            await API.put(`/orders/cancel/${rejectOrderId}`, { reason: finalReason });
            setStatusMessage({ type: 'success', text: `Order rejected successfully! Reason: "${finalReason}"` });
            setRejectModalOpen(false);
            setRejectOrderId(null);
            fetchPendingOrders();
            fetchLiveDeliveries();
        } catch (err) {
            setStatusMessage({ type: 'error', text: `${err.response?.data?.message || 'Failed to reject order.'}` });
        } finally {
            setLoading(false);
        }
    };

    // Accept Spot Request
    const handleAcceptSpot = async (orderId) => {
        if (!distributorId) {
            setStatusMessage({ type: 'error', text: 'Driver session not found. Please log in again.' });
            return;
        }
        setLoading(true);
        setStatusMessage({ type: '', text: '' });
        try {
            const res = await API.post('/orders/instant-accept', {
                orderId,
                distributorId
            });
            setStatusMessage({ type: 'success', text: `${res.data.message}` });
            fetchSpotOrders();
            fetchLiveDeliveries();
        } catch (err) {
            setStatusMessage({ type: 'error', text: `${err.response?.data?.message || 'Failed to accept spot request'}` });
        } finally {
            setLoading(false);
        }
    };

    // Verify Delivery
    const handleVerifyDelivery = async ({ qrCodeToken, otp }) => {
        if (!distributorId) {
            setStatusMessage({ type: 'error', text: 'Driver session not found. Please log in again.' });
            return;
        }
        setLoading(true);
        setStatusMessage({ type: '', text: '' });

        try {
            const res = await API.post('/orders/deliver', {
                qrCodeToken: qrCodeToken || null,
                otp: otp || null,
                distributorId: distributorId,
                paymentMethod: canHandlePayments ? paymentMode : 'PrepaidQuota',
                amountPaid: canHandlePayments ? amountToCollect : 0
            });

            setStatusMessage({ type: 'success', text: `${res.data.message}` });
            setOtpInput('');
            setScanMode(false);
            fetchLiveDeliveries();
            fetchSpotOrders();
        } catch (err) {
            setStatusMessage({ type: 'error', text: `${err.response?.data?.message || 'Verification failed!'}` });
        } finally {
            setLoading(false);
        }
    };

    // Walk-In Sale
    const handleWalkInSaleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatusMessage({ type: '', text: '' });

        try {
            const res = await API.post('/orders/direct-sale', {
                sellerId: distributorId,
                guestName: walkInForm.guestName || 'Walk-in Customer',
                guestPhone: walkInForm.guestPhone || 'N/A',
                quantity: Number(walkInForm.quantity) || 1,
                amountPaid: Number(walkInForm.amountPaid) || 20,
                paymentMethod: walkInForm.paymentMethod,
                emptyJarsReceived: Number(walkInForm.emptyJarsReceived) || 0
            });

            setStatusMessage({ type: 'success', text: res.data.message });
            setWalkInForm({
                guestName: '', guestPhone: '', quantity: 1, amountPaid: 20, paymentMethod: 'Cash', emptyJarsReceived: 1
            });
            handleTabChange('live');
        } catch (err) {
            setStatusMessage({ type: 'error', text: `${err.response?.data?.message || 'Direct sale failed!'}` });
        } finally {
            setLoading(false);
        }
    };

    // Doorstep Recharge
    const handleDoorstepRechargeSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatusMessage({ type: '', text: '' });

        try {
            const res = await API.post('/orders/buy-pack', {
                customerId: doorstepRechargeForm.customerId,
                jarCount: Number(doorstepRechargeForm.jarCount) || 1,
                amountPaid: Number(doorstepRechargeForm.amountPaid) || 0,
                paymentMode: doorstepRechargeForm.paymentMode,
                rechargeBy: distributorId
            });

            setStatusMessage({ type: 'success', text: `${res.data.message}` });
            setDoorstepRechargeForm({ customerId: '', jarCount: 10, amountPaid: 200, paymentMode: 'Cash' });
            handleTabChange('live');
        } catch (err) {
            setStatusMessage({ type: 'error', text: `${err.response?.data?.message || 'Doorstep recharge failed!'}` });
        } finally {
            setLoading(false);
        }
    };

    // Token Adjustment (wallet.adjust)
    const handleAdjustSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatusMessage({ type: '', text: '' });
        try {
            const res = await API.post('/wallet/adjust', {
                customerId: adjustForm.userId,
                adjustmentType: adjustForm.adjustmentType,
                tokens: adjustForm.tokens,
                reason: adjustForm.reason
            });
            setStatusMessage({ type: 'success', text: `${res.data.message}` });
            fetchCustomers();
        } catch (err) {
            setStatusMessage({ type: 'error', text: `${err.response?.data?.message || 'Adjustment failed'}` });
        } finally {
            setLoading(false);
        }
    };

    // Inventory Handlers
    const handleReturnSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await API.post('/inventory/returns', { count: returnCount });
            setStatusMessage({ type: 'success', text: res.data.message });
            fetchInventory();
        } catch (err) {
            setStatusMessage({ type: 'error', text: 'Failed to record empty jar return' });
        } finally {
            setLoading(false);
        }
    };

    const handleDamageSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await API.post('/inventory/damaged', damageForm);
            setStatusMessage({ type: 'success', text: res.data.message });
            fetchInventory();
        } catch (err) {
            setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to mark damaged jar' });
        } finally {
            setLoading(false);
        }
    };

    // 🔒 Dynamic Permission Checks
    const driverPermissions = currentUser?.permissions || [];
    const isSuperAdmin = currentUser?.role === 'Admin';
    const canHandlePayments = isSuperAdmin || driverPermissions.some(p => p.startsWith('wallet.'));
    
    // 📦 Order & Counter Permissions
    const canApproveOrders = isSuperAdmin || driverPermissions.includes('orders.approve');
    const canCancelOrders = isSuperAdmin || driverPermissions.includes('orders.cancel');
    const canVerifyDelivery = isSuperAdmin || driverPermissions.includes('orders.verify_qr');
    const canAcceptSpot = isSuperAdmin || driverPermissions.includes('orders.instant_onspot');

    // 💳 Quota & Revenue Module Permissions
    const canRechargeTokens = isSuperAdmin || driverPermissions.includes('wallet.recharge');
    const canAdjustTokens = isSuperAdmin || driverPermissions.includes('wallet.adjust');
    const canViewPaymentLogs = isSuperAdmin || driverPermissions.includes('wallet.view_history');
    
    // 🚰 Inventory Permissions
    const canViewInventory = isSuperAdmin || driverPermissions.some(p => p.startsWith('inventory.'));
    const canRecordReturns = isSuperAdmin || driverPermissions.includes('inventory.empty_jar_return');
    const canMarkDamaged = isSuperAdmin || driverPermissions.includes('inventory.damaged_jars');

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <style>{`
                .driver-sidebar {
                    width: 250px;
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
                    padding: 24px 32px;
                    overflow-y: auto;
                    height: 100vh;
                    box-sizing: border-box;
                    display: flex;
                    justify-content: center;
                }
                .feed-container {
                    width: 100%;
                    max-width: 620px;
                }
                .side-link {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    margin: 4px 12px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 600;
                    color: #94a3b8;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .side-link:hover { background: rgba(255,255,255,0.06); color: #ffffff; }
                .side-link.active { background: #0284c7; color: #ffffff; }

                .mobile-header { display: none; }
                .drawer-overlay { display: none; }

                @media (max-width: 768px) {
                    .driver-sidebar {
                        position: fixed;
                        top: 0;
                        left: 0;
                        bottom: 0;
                        transform: translateX(-100%);
                        box-shadow: 4px 0 20px rgba(0,0,0,0.3);
                    }
                    .driver-sidebar.open {
                        transform: translateX(0);
                    }
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
                className={`drawer-overlay ${isMobileMenuOpen ? 'open' : ''}`} 
                onClick={() => setIsMobileMenuOpen(false)} 
            />

            <div className={`driver-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                <div style={{ padding: '22px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #0284c7, #0369a1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                            <TruckIcon size={20} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#ffffff' }}>Aqua Driver</h3>
                            <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '600' }}>Delivery Hub</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsMobileMenuOpen(false)}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer', display: isMobileMenuOpen ? 'block' : 'none' }}
                    >
                        ✕
                    </button>
                </div>

                <div style={{ padding: '0 18px', margin: '8px 0', borderBottom: '1px solid #1e3a5f' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Active Profile</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 0' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>
                            {currentUser?.name?.charAt(0) || 'D'}
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>{currentUser?.name || 'Partner'}</div>
                            <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 'bold' }}>● Online</div>
                        </div>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', paddingTop: '10px' }}>
                    <div className={`side-link ${viewMode === 'live' ? 'active' : ''}`} onClick={() => handleTabChange('live')}>
                        <ZapIcon size={16} />
                        <span>Live Scanner & Queue</span>
                    </div>

                    {/* 📋 Approvals Queue Tab (Guarded by 'orders.approve') */}
                    {canApproveOrders && (
                        <div className={`side-link ${viewMode === 'approvals' ? 'active' : ''}`} onClick={() => handleTabChange('approvals')}>
                            <CheckCircleIcon size={16} />
                            <span>Approvals Queue ({pendingOrders.length})</span>
                        </div>
                    )}

                    <div className={`side-link ${viewMode === 'walkin' ? 'active' : ''}`} onClick={() => handleTabChange('walkin')}>
                        <ZapIcon size={16} />
                        <span>Direct Walk-In Sale</span>
                    </div>
                    
                    {/* Quota & Revenue Module Tabs */}
                    {canRechargeTokens && (
                        <div className={`side-link ${viewMode === 'recharge' ? 'active' : ''}`} onClick={() => handleTabChange('recharge')}>
                            <CreditCardIcon size={16} />
                            <span>Top-Up Advance Pass</span>
                        </div>
                    )}
                    {canAdjustTokens && (
                        <div className={`side-link ${viewMode === 'adjust' ? 'active' : ''}`} onClick={() => handleTabChange('adjust')}>
                            <PackageIcon size={16} />
                            <span>Deduct / Adjust Tokens</span>
                        </div>
                    )}
                    {canViewPaymentLogs && (
                        <div className={`side-link ${viewMode === 'paymentLogs' ? 'active' : ''}`} onClick={() => handleTabChange('paymentLogs')}>
                            <HistoryIcon size={16} />
                            <span>Payment & Audit Logs</span>
                        </div>
                    )}

                    {/* Plant Inventory Tab */}
                    {canViewInventory && (
                        <div className={`side-link ${viewMode === 'inventory' ? 'active' : ''}`} onClick={() => handleTabChange('inventory')}>
                            <DropletIcon size={16} />
                            <span>Plant & Jar Stock</span>
                        </div>
                    )}

                    <div className={`side-link ${viewMode === 'history' ? 'active' : ''}`} onClick={() => handleTabChange('history')}>
                        <HistoryIcon size={16} />
                        <span>My Delivery History</span>
                    </div>
                </div>

                <div style={{ padding: '14px 18px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid #1e3a5f' }}>
                    <button
                        onClick={handleLogout}
                        style={{ width: '100%', padding: '10px', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        <LogOutIcon size={16} />
                        <span>Logout Exit</span>
                    </button>
                </div>
            </div>

            <div className="mobile-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button 
                        onClick={() => setIsMobileMenuOpen(true)}
                        style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '6px 10px', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}
                    >
                        ☰
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <TruckIcon size={20} color="#0284c7" />
                        <strong style={{ fontSize: '15px', color: '#0f172a' }}>Delivery Hub</strong>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', background: '#16a34a', borderRadius: '50%' }}></span>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#16a34a' }}>Online</span>
                </div>
            </div>

            <div className="main-view">
                <div className="feed-container">
                    
                    {statusMessage.text && (
                        <div style={{
                            padding: '12px',
                            borderRadius: '10px',
                            marginBottom: '16px',
                            fontWeight: 'bold',
                            fontSize: '13px',
                            textAlign: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            background: statusMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
                            color: statusMessage.type === 'success' ? '#15803d' : '#b91c1c',
                            border: `1px solid ${statusMessage.type === 'success' ? '#bbf7d0' : '#fca5a5'}`
                        }}>
                            {statusMessage.type === 'success' ? <CheckCircleIcon size={16} /> : <AlertCircleIcon size={16} />}
                            <span>{statusMessage.text}</span>
                        </div>
                    )}

                    {/* 📋 APPROVALS QUEUE VIEW (orders.approve) */}
                    {viewMode === 'approvals' && canApproveOrders && (
                        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ color: '#0f172a', margin: '0 0 16px 0', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircleIcon size={20} color="#0284c7" />
                                Customer Pending Approvals ({pendingOrders.length})
                            </h4>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0' }}>
                                Bulk, Routine ya On-Demand requests ko approve karein taaki customer delivery ke liye unlock ho sake.
                            </p>

                            {pendingOrders.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8' }}>
                                    <h3>No Pending Orders!</h3>
                                    <p style={{ fontSize: '13px' }}>All water delivery requests have been processed.</p>
                                </div>
                            ) : (
                                pendingOrders.map((ord) => (
                                    <div key={ord._id} style={{ display: 'flex', flexDirection: 'column', padding: '14px', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '12px', background: '#f8fafc', gap: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <h4 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '15px' }}>{ord.customer?.name}</h4>
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                                    Phone: {ord.customer?.phone || ord.customer?.email || 'N/A'} <br />
                                                    Tokens: <strong>{ord.customer?.prepaidJarBalance || 0} Jars</strong> | Qty: <strong>{ord.quantity || 1} Jar(s)</strong> ({ord.orderType})
                                                </span>
                                            </div>
                                            <span style={{ padding: '4px 8px', background: '#fef3c7', color: '#b45309', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                                                Pending Approval
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                                            <button 
                                                onClick={() => handleApprove(ord._id)} 
                                                disabled={loading}
                                                style={{ flex: 1, padding: '10px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                            >
                                                <CheckCircleIcon size={15} />
                                                <span>Approve Order</span>
                                            </button>
                                            {canCancelOrders && (
                                                <button 
                                                    onClick={() => openRejectModal(ord._id)} 
                                                    disabled={loading}
                                                    style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                                                >
                                                    ✕ Reject
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* 1. LIVE VIEW */}
                    {viewMode === 'live' && (
                        <>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ZapIcon size={20} color="#0284c7" />
                                Live Order Processing
                            </h3>

                            {canHandlePayments && (
                                <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '10px' }}>Select Doorstep Payment Mode:</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                                        <button onClick={() => setPaymentMode('Cash')} style={{ padding: '10px 4px', borderRadius: '8px', border: `1.5px solid ${paymentMode === 'Cash' ? '#0284c7' : '#cbd5e1'}`, background: paymentMode === 'Cash' ? '#e0f2fe' : '#fff', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', color: paymentMode === 'Cash' ? '#0369a1' : '#475569' }}>Cash</button>
                                        <button onClick={() => setPaymentMode('UPI')} style={{ padding: '10px 4px', borderRadius: '8px', border: `1.5px solid ${paymentMode === 'UPI' ? '#0284c7' : '#cbd5e1'}`, background: paymentMode === 'UPI' ? '#e0f2fe' : '#fff', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', color: paymentMode === 'UPI' ? '#0369a1' : '#475569' }}>UPI</button>
                                        <button onClick={() => setPaymentMode('PrepaidQuota')} style={{ padding: '10px 4px', borderRadius: '8px', border: `1.5px solid ${paymentMode === 'PrepaidQuota' ? '#0284c7' : '#cbd5e1'}`, background: paymentMode === 'PrepaidQuota' ? '#e0f2fe' : '#fff', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', color: paymentMode === 'PrepaidQuota' ? '#0369a1' : '#475569' }}>Pass (₹0)</button>
                                    </div>

                                    {paymentMode !== 'PrepaidQuota' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>Amount (₹):</span>
                                            <input type="number" min="0" value={amountToCollect} onChange={(e) => setAmountToCollect(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold', fontSize: '14px' }} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Spot Handover Requests Queue - Guarded by 'orders.instant_onspot' */}
                            {canAcceptSpot && spotOrders.length > 0 && (
                                <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: '#92400e', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <ZapIcon size={16} />
                                        Customer Spot Handover Requests ({spotOrders.length})
                                    </h4>
                                    {spotOrders.map(order => (
                                        <div key={order._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '12px 14px', borderRadius: '8px', marginBottom: '8px', border: '1px solid #fde68a' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}>{order.customer?.name}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Qty: {order.quantity || 1} Jar | Tokens: {order.customer?.prepaidJarBalance || 0}</div>
                                            </div>
                                            <button
                                                onClick={() => handleAcceptSpot(order._id)}
                                                disabled={loading}
                                                style={{ background: '#16a34a', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(22,163,74,0.2)', display: 'flex', alignItems: 'center', gap: '5px' }}
                                            >
                                                <CheckCircleIcon size={14} />
                                                <span>Accept</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Delivery Verification (QR & PIN) - Guarded by 'orders.verify_qr' */}
                            {canVerifyDelivery ? (
                                <>
                                    <div style={{ marginBottom: '16px' }}>
                                        <button
                                            onClick={() => setScanMode(!scanMode)}
                                            style={{
                                                width: '100%',
                                                padding: '14px',
                                                backgroundColor: scanMode ? '#ef4444' : '#0284c7',
                                                color: '#ffffff',
                                                border: 'none',
                                                borderRadius: '12px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            <PackageIcon size={18} />
                                            <span>{scanMode ? 'Close Camera Scanner' : 'Open Camera to Scan QR'}</span>
                                        </button>

                                        {scanMode && (
                                            <div style={{ marginTop: '12px', borderRadius: '12px', overflow: 'hidden' }}>
                                                <QrScanner onScanSuccess={(scannedToken) => handleVerifyDelivery({ qrCodeToken: scannedToken })} />
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: '#94a3b8' }}>
                                        <div style={{ flex: 1, height: '1px', background: '#cbd5e1' }}></div>
                                        <span style={{ padding: '0 10px', fontSize: '11px', fontWeight: 'bold' }}>OR ENTER 4-DIGIT PIN</span>
                                        <div style={{ flex: 1, height: '1px', background: '#cbd5e1' }}></div>
                                    </div>

                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            if (otpInput.trim()) handleVerifyDelivery({ otp: otpInput.trim() });
                                        }}
                                        style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}
                                    >
                                        <input
                                            type="text"
                                            maxLength="4"
                                            placeholder="Enter PIN"
                                            value={otpInput}
                                            onChange={(e) => setOtpInput(e.target.value)}
                                            style={{
                                                flex: 1,
                                                padding: '12px 14px',
                                                fontSize: '18px',
                                                border: '2px solid #cbd5e1',
                                                borderRadius: '10px',
                                                textAlign: 'center',
                                                letterSpacing: '6px',
                                                fontWeight: 'bold'
                                            }}
                                        />
                                        <button
                                            type="submit"
                                            disabled={loading || otpInput.length < 4}
                                            style={{
                                                padding: '12px 24px',
                                                backgroundColor: '#0284c7',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '10px',
                                                fontWeight: 'bold',
                                                fontSize: '14px',
                                                cursor: (loading || otpInput.length < 4) ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            {loading ? '...' : 'Verify'}
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '13px', textAlign: 'center', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <AlertCircleIcon size={16} />
                                    <span>Delivery QR & OTP verification permission is disabled by admin.</span>
                                </div>
                            )}

                            <div>
                                <h4 style={{ color: '#0f172a', margin: '0 0 12px 0', fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <PackageIcon size={18} color="#0284c7" />
                                    Deliveries Pending Acceptance ({todayOrders.length})
                                </h4>
                                {todayOrders.length === 0 ? (
                                    <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', textAlign: 'center', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '13px' }}>
                                        All deliveries for your route are completed.
                                    </div>
                                ) : (
                                    todayOrders.map((order) => (
                                        <div
                                            key={order._id}
                                            style={{
                                                background: '#ffffff',
                                                padding: '14px 16px',
                                                borderRadius: '12px',
                                                border: '1px solid #e2e8f0',
                                                marginBottom: '10px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                            }}
                                        >
                                            <div>
                                                <h4 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '14px' }}>
                                                    {order.customer?.name || 'Customer'}
                                                </h4>
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                                    Phone: {order.customer?.email || order.customer?.phone || 'N/A'} | Qty: <strong>{order.quantity || 1} Jar(s)</strong>
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{
                                                    fontSize: '11px',
                                                    padding: '6px 10px',
                                                    background: '#f1f5f9',
                                                    color: '#475569',
                                                    borderRadius: '8px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {order.billingType === 'PrepaidQuota' ? '✓ Pass' : 'COD'}
                                                </span>
                                                {canCancelOrders && (
                                                    <button
                                                        onClick={() => openRejectModal(order._id)}
                                                        disabled={loading}
                                                        style={{ padding: '6px 10px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}

                    {/* 2. WALK-IN SALE */}
                    {viewMode === 'walkin' && (
                        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ color: '#0f172a', margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ZapIcon size={20} color="#16a34a" />
                                Direct Walk-in / Urgent Sale
                            </h4>
                            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>
                                Handover water to non-registered or temporary customers on the route.
                            </p>

                            <form onSubmit={handleWalkInSaleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Customer Name / Tag (Optional):</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Shop #4 / Guest"
                                        value={walkInForm.guestName}
                                        onChange={(e) => setWalkInForm({ ...walkInForm, guestName: e.target.value })}
                                        style={{ width: '100%', padding: '12px', marginTop: '6px', border: '1px solid #cbd5e1', borderRadius: '10px', boxSizing: 'border-box' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Quantity (Jars):</label>
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            value={walkInForm.quantity}
                                            onChange={(e) => {
                                                const q = Number(e.target.value) || 1;
                                                setWalkInForm({ ...walkInForm, quantity: q, amountPaid: q * 20, emptyJarsReceived: q });
                                            }}
                                            style={{ width: '100%', padding: '12px', marginTop: '6px', border: '1px solid #cbd5e1', borderRadius: '10px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Total Amount (₹):</label>
                                        <input
                                            type="number"
                                            min="0"
                                            required
                                            value={walkInForm.amountPaid}
                                            onChange={(e) => setWalkInForm({ ...walkInForm, amountPaid: e.target.value })}
                                            style={{ width: '100%', padding: '12px', marginTop: '6px', border: '1px solid #cbd5e1', borderRadius: '10px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Payment Method:</label>
                                        <select
                                            value={walkInForm.paymentMethod}
                                            onChange={(e) => setWalkInForm({ ...walkInForm, paymentMethod: e.target.value })}
                                            style={{ width: '100%', padding: '12px', marginTop: '6px', border: '1px solid #cbd5e1', borderRadius: '10px' }}
                                        >
                                            <option value="Cash">Cash</option>
                                            <option value="UPI">UPI</option>
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Empty Jars Returned:</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={walkInForm.emptyJarsReceived}
                                            onChange={(e) => setWalkInForm({ ...walkInForm, emptyJarsReceived: e.target.value })}
                                            style={{ width: '100%', padding: '12px', marginTop: '6px', border: '1px solid #cbd5e1', borderRadius: '10px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        padding: '14px',
                                        background: '#16a34a',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontWeight: 'bold',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        marginTop: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <ZapIcon size={16} />
                                    <span>{loading ? 'Processing...' : `Collect ₹${walkInForm.amountPaid} & Complete Sale`}</span>
                                </button>
                            </form>
                        </div>
                    )}

                    {/* 3. DOORSTEP RECHARGE */}
                    {viewMode === 'recharge' && canRechargeTokens && (
                        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ color: '#0f172a', margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CreditCardIcon size={20} color="#0284c7" />
                                Doorstep Token Recharge
                            </h4>
                            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>
                                Customer se Cash/UPI collect karke uske account mein advance jars add karein.
                            </p>

                            <form onSubmit={handleDoorstepRechargeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Select Customer:</label>
                                    <select
                                        value={doorstepRechargeForm.customerId}
                                        onChange={(e) => setDoorstepRechargeForm({ ...doorstepRechargeForm, customerId: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '12px', marginTop: '6px', border: '1px solid #cbd5e1', borderRadius: '10px' }}
                                    >
                                        <option value="">-- Choose Customer --</option>
                                        {usersList.map(u => (
                                            <option key={u._id} value={u._id}>
                                                {u.name} ({u.phone || u.email}) - Bal: {u.prepaidJarBalance || 0} Jars
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Number of Jars:</label>
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            value={doorstepRechargeForm.jarCount}
                                            onChange={(e) => {
                                                const cnt = Number(e.target.value) || 1;
                                                setDoorstepRechargeForm({
                                                    ...doorstepRechargeForm,
                                                    jarCount: cnt,
                                                    amountPaid: cnt * 20
                                                });
                                            }}
                                            style={{ width: '100%', padding: '12px', marginTop: '6px', border: '1px solid #cbd5e1', borderRadius: '10px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Amount Collected (₹):</label>
                                        <input
                                            type="number"
                                            min="0"
                                            required
                                            value={doorstepRechargeForm.amountPaid}
                                            onChange={(e) => setDoorstepRechargeForm({ ...doorstepRechargeForm, amountPaid: e.target.value })}
                                            style={{ width: '100%', padding: '12px', marginTop: '6px', border: '1px solid #cbd5e1', borderRadius: '10px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Payment Received Via:</label>
                                    <select
                                        value={doorstepRechargeForm.paymentMode}
                                        onChange={(e) => setDoorstepRechargeForm({ ...doorstepRechargeForm, paymentMode: e.target.value })}
                                        style={{ width: '100%', padding: '12px', marginTop: '6px', border: '1px solid #cbd5e1', borderRadius: '10px' }}
                                    >
                                        <option value="Cash">Cash in Hand</option>
                                        <option value="UPI">UPI Scan</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        padding: '14px',
                                        background: '#0284c7',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontWeight: 'bold',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        marginTop: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <CreditCardIcon size={16} />
                                    <span>{loading ? 'Processing...' : `Collect ₹${doorstepRechargeForm.amountPaid} & Add ${doorstepRechargeForm.jarCount} Tokens`}</span>
                                </button>
                            </form>
                        </div>
                    )}

                    {/* ⚖️ 4. MANUAL TOKEN ADJUSTMENT (wallet.adjust) */}
                    {viewMode === 'adjust' && canAdjustTokens && (
                        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ color: '#0f172a', margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <PackageIcon size={20} color="#0284c7" />
                                Manual Token Adjustment
                            </h4>
                            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>
                                Customer ke account se jar deduct ya credit karein (Broken jar penalty / Refund).
                            </p>

                            <form onSubmit={handleAdjustSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Select Customer:</label>
                                    <select 
                                        value={adjustForm.userId} 
                                        onChange={(e) => setAdjustForm({ ...adjustForm, userId: e.target.value })} 
                                        required 
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                                    >
                                        <option value="">-- Choose Customer --</option>
                                        {usersList.map(u => (
                                            <option key={u._id} value={u._id}>
                                                {u.name} ({u.email || u.phone}) - Current Balance: {u.prepaidJarBalance || 0} Jars
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Adjustment Action:</label>
                                    <select 
                                        value={adjustForm.adjustmentType} 
                                        onChange={(e) => setAdjustForm({ ...adjustForm, adjustmentType: e.target.value })} 
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                                    >
                                        <option value="CREDIT">Credit Quota (+ Add Correction Jars)</option>
                                        <option value="DEDUCT">Deduct Quota (- Charge Broken Jar / Penalty)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Number of Jars:</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        required 
                                        value={adjustForm.tokens} 
                                        onChange={(e) => setAdjustForm({ ...adjustForm, tokens: e.target.value })} 
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} 
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Reason for Adjustment:</label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="e.g. Jar Damaged by Customer" 
                                        value={adjustForm.reason} 
                                        onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} 
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} 
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={loading} 
                                    style={{ 
                                        padding: '14px', 
                                        background: adjustForm.adjustmentType === 'DEDUCT' ? '#dc2626' : '#0284c7', 
                                        color: '#fff', 
                                        border: 'none', 
                                        borderRadius: '10px', 
                                        fontWeight: 'bold', 
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        marginTop: '6px'
                                    }}
                                >
                                    {loading ? 'Adjusting...' : 'Apply Quota Adjustment'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* 📜 5. PAYMENT & AUDIT LOGS (wallet.view_history) */}
                    {viewMode === 'paymentLogs' && canViewPaymentLogs && (
                        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ color: '#0f172a', margin: '0 0 16px 0', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <HistoryIcon size={20} color="#0284c7" />
                                Payment &amp; Audit Logs
                            </h4>
                            {walletLogs.length === 0 ? (
                                <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No payment logs recorded yet.</div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                                <th style={{ padding: '10px' }}>Date</th>
                                                <th style={{ padding: '10px' }}>Customer</th>
                                                <th style={{ padding: '10px' }}>Type</th>
                                                <th style={{ padding: '10px' }}>Jars</th>
                                                <th style={{ padding: '10px' }}>Paid (₹)</th>
                                                <th style={{ padding: '10px' }}>Mode</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {walletLogs.map((log) => (
                                                <tr key={log._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '10px', color: '#64748b' }}>{new Date(log.createdAt).toLocaleDateString()}</td>
                                                    <td style={{ padding: '10px', fontWeight: '600' }}>{log.customer?.name || 'Customer'}</td>
                                                    <td style={{ padding: '10px' }}>
                                                        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', background: log.type === 'Recharge' ? '#dcfce7' : '#fee2e2', color: log.type === 'Recharge' ? '#15803d' : '#b91c1c' }}>
                                                            {log.type}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{log.tokens > 0 ? `+${log.tokens}` : log.tokens}</td>
                                                    <td style={{ padding: '10px' }}>₹{log.amountPaid || 0}</td>
                                                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#0284c7' }}>{log.paymentMode}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 🚰 6. PLANT INVENTORY & JAR STOCK */}
                    {viewMode === 'inventory' && canViewInventory && (
                        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ color: '#0f172a', margin: '0 0 16px 0', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <DropletIcon size={20} color="#0284c7" />
                                Plant Jar Stocks & Returns
                            </h4>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
                                <div style={{ background: '#e0f2fe', padding: '14px 10px', borderRadius: '12px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#0369a1' }}>FILLED</span>
                                    <h3 style={{ margin: '4px 0 0 0', color: '#0369a1', fontSize: '20px' }}>{inventoryStats.filledJars}</h3>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '14px 10px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>EMPTY</span>
                                    <h3 style={{ margin: '4px 0 0 0', color: '#0f172a', fontSize: '20px' }}>{inventoryStats.emptyJars}</h3>
                                </div>
                                <div style={{ background: '#fee2e2', padding: '14px 10px', borderRadius: '12px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#991b1b' }}>DAMAGED</span>
                                    <h3 style={{ margin: '4px 0 0 0', color: '#991b1b', fontSize: '20px' }}>{inventoryStats.damagedJars}</h3>
                                </div>
                            </div>

                            {canRecordReturns && (
                                <form onSubmit={handleReturnSubmit} style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Return Empty Jars from Delivery Route:</label>
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            value={returnCount}
                                            onChange={(e) => setReturnCount(e.target.value)}
                                            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}
                                        />
                                        <button type="submit" disabled={loading} style={{ padding: '10px 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                            Record Return
                                        </button>
                                    </div>
                                </form>
                            )}

                            {canMarkDamaged && (
                                <form onSubmit={handleDamageSubmit} style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <h5 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <AlertCircleIcon size={14} />
                                        Mark Damaged / Broken Jar
                                    </h5>
                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Count:</label>
                                            <input
                                                type="number"
                                                min="1"
                                                required
                                                value={damageForm.count}
                                                onChange={(e) => setDamageForm({ ...damageForm, count: e.target.value })}
                                                style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div style={{ flex: 2 }}>
                                            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Reason:</label>
                                            <input
                                                type="text"
                                                required
                                                value={damageForm.reason}
                                                onChange={(e) => setDamageForm({ ...damageForm, reason: e.target.value })}
                                                style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                        Mark as Damaged
                                    </button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* 7. HISTORY */}
                    {viewMode === 'history' && (
                        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ color: '#0f172a', margin: '0 0 16px 0', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <HistoryIcon size={20} color="#0284c7" />
                                My Delivery History
                            </h4>
                            {historyLogs.length === 0 ? (
                                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                    <p style={{ fontSize: '14px', margin: 0 }}>No past deliveries found for your profile.</p>
                                </div>
                            ) : (
                                historyLogs.map(log => (
                                    <div key={log._id} style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '12px', background: '#f8fafc', fontSize: '13px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'flex-start' }}>
                                            <div>
                                                <strong style={{ color: '#0f172a', fontSize: '14px' }}>
                                                    {log.isWalkInCustomer ? `Direct ${log.guestName} (Walk-in)` : (log.customer?.name || 'Customer')}
                                                </strong>
                                                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                                                    Phone: {log.isWalkInCustomer ? log.guestPhone : (log.customer?.email || log.customer?.phone || 'N/A')}
                                                </div>
                                            </div>
                                            <span style={{ 
                                                padding: '4px 10px', 
                                                borderRadius: '20px', 
                                                fontSize: '11px', 
                                                fontWeight: 'bold', 
                                                background: '#dcfce7', 
                                                color: '#15803d',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}>
                                                <CheckCircleIcon size={12} />
                                                <span>Delivered</span>
                                            </span>
                                        </div>
                                        <div style={{ color: '#475569', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '10px' }}>
                                            <span>Qty: <strong>{log.quantity || 1} Jar(s)</strong> ({log.orderType})</span>
                                            <span style={{ fontWeight: '600', fontSize: '12px' }}>
                                                {log.deliveryTimestamp ? new Date(log.deliveryTimestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                                            </span>
                                        </div>
                                        <div style={{ color: '#0369a1', fontSize: '12px', marginTop: '6px', fontWeight: 'bold' }}>
                                            Payment: {log.paymentStatus || 'Delivered'}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 🚨 REJECT REASON MODAL POPUP FOR DISTRIBUTOR */}
            {rejectModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 10000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
                }}>
                    <div style={{
                        background: '#ffffff', borderRadius: '16px', maxWidth: '440px', width: '100%',
                        padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                    }}>
                        <h3 style={{ margin: '0 0 8px 0', color: '#b91c1c', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircleIcon size={20} color="#b91c1c" />
                            Reject / Cancel Order
                        </h3>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0' }}>
                            Customer ko reason batayein taaki unhe pata chale delivery kyun nahi ho sakti.
                        </p>

                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '6px' }}>
                            Select Reason:
                        </label>
                        <select 
                            value={selectedReason} 
                            onChange={(e) => setSelectedReason(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', marginBottom: '12px' }}
                        >
                            <option value="Aaj aapke route par delivery available nahi hai.">Route par delivery available nahi hai</option>
                            <option value="Plant me filled water jars ka stock khatam ho gaya hai.">Plant jar stock out of stock hai</option>
                            <option value="Delivery timings over ho chuki hain.">Delivery timings over ho chuki hain</option>
                            <option value="Customer unreachable / Phone switch off.">Customer unreachable / phone switch off</option>
                            <option value="Other">Other (Apna reason likhein)</option>
                        </select>

                        {selectedReason === 'Other' && (
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                                    Custom Reason:
                                </label>
                                <textarea 
                                    rows="3"
                                    placeholder="Yahan reject karne ka specific reason likhein..."
                                    value={customReason}
                                    onChange={(e) => setCustomReason(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                            <button 
                                onClick={() => setRejectModalOpen(false)}
                                style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Back
                            </button>
                            <button 
                                onClick={handleConfirmReject}
                                disabled={loading}
                                style={{ flex: 1, padding: '12px', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                {loading ? 'Rejecting...' : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
        </div>
    );
};

export default DistributorDashboard;