import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import {
    DropletIcon,
    PackageIcon,
    CreditCardIcon,
    TruckIcon,
    HistoryIcon,
    UserIcon,
    CheckCircleIcon,
    AlertCircleIcon,
    ZapIcon,
    CalendarIcon,
    LogOutIcon
} from '../../components/common/Icons';

const WATER_MODULES = [
    {
        id: 'orders',
        title: 'Order & Counter Operations',
        permissions: [
            { key: 'orders.approve', label: 'Approve / Reject Water Requests' },
            { key: 'orders.verify_qr', label: 'Verify Deliveries via QR / OTP' },
            { key: 'orders.instant_onspot', label: 'Accept Spot / Instant Handover Requests' },
            { key: 'orders.direct_override', label: 'Direct Delivery Override' },
            { key: 'orders.cancel', label: 'Cancel Active Orders' }
        ]
    },
    {
        id: 'wallet',
        title: 'Customer Quota & Daily Revenue',
        permissions: [
            { key: 'wallet.recharge', label: 'Assign Custom Advance Token Pass' },
            { key: 'wallet.adjust', label: 'Deduct / Adjust Jar Balance' },
            { key: 'wallet.view_history', label: 'View Customer Payment Logs' }
        ]
    },
    {
        id: 'inventory',
        title: 'Plant Inventory & Jar Stock',
        permissions: [
            { key: 'inventory.view_stock', label: 'View Plant Jar Stocks' },
            { key: 'inventory.empty_jar_return', label: 'Record Empty Jar Returns' },
            { key: 'inventory.damaged_jars', label: 'Mark Damaged Jars' }
        ]
    },
    {
        id: 'settings',
        title: 'Master Security & Access',
        permissions: [
            { key: 'settings.role_management', label: 'Manage Roles & Permissions' },
            { key: 'settings.price_config', label: 'Modify Pricing & Water Rates' }
        ]
    }
];

const AdminDashboard = () => {
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

    // 🛡️ Super Admin Security Check
    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            navigate('/');
            return;
        }

        try {
            const user = JSON.parse(userStr);
            if (user.role !== 'Admin') {
                navigate('/');
                return;
            }
            setCurrentUser(user);
        } catch (error) {
            navigate('/');
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/');
    };

    const [currentRoute, setCurrentRoute] = useState('orders.approvals');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // 📁 Sidebar Expanded State
    const [expandedMenu, setExpandedMenu] = useState(() => {
        try {
            const saved = localStorage.getItem('admin_sidebar_expanded');
            return saved ? JSON.parse(saved) : {
                orders: false,
                wallet: false,
                inventory: false,
                users: false,
                staff: false
            };
        } catch (e) {
            return {
                orders: false,
                wallet: false,
                inventory: false,
                users: false,
                staff: false
            };
        }
    });

    // Data States
    const [pendingOrders, setPendingOrders] = useState([]);
    const [masterHistory, setMasterHistory] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [walletLogs, setWalletLogs] = useState([]);
    const [inventoryStats, setInventoryStats] = useState({ filledJars: 0, emptyJars: 0, damagedJars: 0 });
    const [dailyAudit, setDailyAudit] = useState({ summary: { totalCash: 0, totalUPI: 0, totalPrepaidJars: 0, totalDeliveries: 0 }, driverStats: {} });
    const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);

    // 🚨 Order Rejection Reason Modal States
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectOrderId, setRejectOrderId] = useState(null);
    const [selectedReason, setSelectedReason] = useState('Aaj aapke route par delivery available nahi hai.');
    const [customReason, setCustomReason] = useState('');

    // Form States
    const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', role: 'Customer', initialTokens: 0 });
    const [verifyOtp, setVerifyOtp] = useState('');

    // ⚡ Plant Counter Direct Sale State
    const [counterSaleForm, setCounterSaleForm] = useState({
        guestName: '',
        guestPhone: '',
        quantity: 1,
        amountPaid: 20,
        paymentMethod: 'Cash',
        emptyJarsReceived: 1
    });

    // 📦 Dynamic Advance Token Assignment State
    const [quotaPackForm, setQuotaPackForm] = useState({ 
        userId: '', 
        jarCount: 20, 
        amountPaid: 400, 
        paymentMode: 'UPI' 
    });
    
    const [adjustForm, setAdjustForm] = useState({ userId: '', adjustmentType: 'CREDIT', tokens: 1, reason: 'Correction / Damage Refund' });

    // Inventory Form States
    const [fillCount, setFillCount] = useState(10);
    const [returnCount, setReturnCount] = useState(5);
    const [damageForm, setDamageForm] = useState({ count: 1, fromStatus: 'EMPTY', reason: 'Cracked Base' });

    // Role Matrix States
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [selectedRole, setSelectedRole] = useState('Staff');
    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [savingPermissions, setSavingPermissions] = useState(false);

    // 🔄 Master Data Fetcher
    const loadData = async () => {
        try {
            const [ordersRes, usersRes, logsRes, invRes] = await Promise.all([
                API.get('/orders/pending').catch(() => ({ data: [] })),
                API.get('/users/all').catch(() => ({ data: [] })),
                API.get('/wallet/logs').catch(() => ({ data: [] })),
                API.get('/inventory/stocks').catch(() => ({ data: { filledJars: 0, emptyJars: 0, damagedJars: 0 } }))
            ]);
            setPendingOrders(ordersRes.data || []);
            setUsersList(usersRes.data || []);
            setWalletLogs(logsRes.data || []);
            setInventoryStats(invRes.data || { filledJars: 0, emptyJars: 0, damagedJars: 0 });
        } catch (err) {
            console.error('Error loading admin data:', err);
        }
    };

    // ⚡ 1. LIVE BACKGROUND SYNC
    useEffect(() => {
        loadData();

        const liveInterval = setInterval(() => {
            loadData();
        }, 3000);

        return () => clearInterval(liveInterval);
    }, []);

    // ⚡ 2. Tab Specific Live Fetching
    useEffect(() => {
        const fetchRouteData = () => {
            if (currentRoute === 'orders.history') {
                API.get('/orders/history/all')
                   .then(res => setMasterHistory(res.data || []))
                   .catch(err => console.log(err));
            } else if (currentRoute === 'wallet.reconciliation') {
                API.get('/orders/daily-reconciliation')
                   .then(res => setDailyAudit(res.data || { summary: { totalCash: 0, totalUPI: 0, totalPrepaidJars: 0, totalDeliveries: 0 }, driverStats: {} }))
                   .catch(err => console.log(err));
            }
        };

        fetchRouteData();
        const routeInterval = setInterval(fetchRouteData, 3500);

        return () => clearInterval(routeInterval);
    }, [currentRoute]);

    // Accordion Style Toggle + LocalStorage Preservation
    const toggleSubmenu = (menu) => {
        setExpandedMenu(prev => {
            const updated = {
                orders: false,
                wallet: false,
                inventory: false,
                users: false,
                staff: false,
                [menu]: !prev[menu]
            };
            try {
                localStorage.setItem('admin_sidebar_expanded', JSON.stringify(updated));
            } catch (e) {
                console.error(e);
            }
            return updated;
        });
    };

    const handleRouteChange = (route) => {
        setCurrentRoute(route);
        setIsMobileMenuOpen(false);
    };

    // --- Order Handlers ---
    const handleApprove = async (orderId) => {
        try {
            await API.put(`/orders/approve/${orderId}`);
            setAlertMsg({ type: 'success', text: 'Order approved! QR and OTP unlocked for customer.' });
            loadData();
        } catch (err) {
            setAlertMsg({ type: 'error', text: 'Failed to approve order.' });
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
        try {
            await API.put(`/orders/cancel/${rejectOrderId}`, { reason: finalReason });
            setAlertMsg({ type: 'success', text: `Order rejected successfully! Reason: "${finalReason}"` });
            setRejectModalOpen(false);
            setRejectOrderId(null);
            loadData();
        } catch (err) {
            setAlertMsg({ type: 'error', text: `${err.response?.data?.message || 'Failed to reject order.'}` });
        } finally {
            setLoading(false);
        }
    };

    const handleDirectVerify = async (e) => {
        e.preventDefault();
        try {
            const res = await API.post('/orders/deliver', {
                otp: verifyOtp,
                distributorId: 'ADMIN_SUPER_OVERRIDE'
            });
            setAlertMsg({ type: 'success', text: `Delivered: ${res.data.message}` });
            setVerifyOtp('');
            loadData();
        } catch (err) {
            setAlertMsg({ type: 'error', text: `${err.response?.data?.message || 'Verification failed'}` });
        }
    };

    // ⚡ Plant Counter Direct Sale
    const handleCounterSaleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAlertMsg({ type: '', text: '' });

        try {
            const res = await API.post('/orders/direct-sale', {
                sellerId: currentUser?._id || 'ADMIN_COUNTER',
                guestName: counterSaleForm.guestName || 'Plant Walk-in Customer',
                guestPhone: counterSaleForm.guestPhone || 'N/A',
                quantity: Number(counterSaleForm.quantity) || 1,
                amountPaid: Number(counterSaleForm.amountPaid) || 20,
                paymentMethod: counterSaleForm.paymentMethod,
                emptyJarsReceived: Number(counterSaleForm.emptyJarsReceived) || 0
            });

            setAlertMsg({ type: 'success', text: res.data.message });
            setCounterSaleForm({
                guestName: '',
                guestPhone: '',
                quantity: 1,
                amountPaid: 20,
                paymentMethod: 'Cash',
                emptyJarsReceived: 1
            });
            loadData();
        } catch (err) {
            setAlertMsg({ type: 'error', text: `${err.response?.data?.message || 'Counter sale failed!'}` });
        } finally {
            setLoading(false);
        }
    };

    // --- User Handlers ---
    const handleCreateUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await API.post('/users/create', newUser);
            setAlertMsg({ type: 'success', text: `New ${newUser.role} (${newUser.name}) created successfully!` });
            setNewUser({ name: '', email: '', phone: '', role: 'Customer', initialTokens: 0 });
            loadData();
        } catch (err) {
            setAlertMsg({ type: 'error', text: `${err.response?.data?.message || 'Creation failed'}` });
        } finally {
            setLoading(false);
        }
    };

    // 📦 Dynamic Custom Advance Tokens Assignment
    const handleQuotaPackSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await API.post('/orders/buy-pack', {
                customerId: quotaPackForm.userId,
                jarCount: Number(quotaPackForm.jarCount) || 1,
                amountPaid: Number(quotaPackForm.amountPaid) || 0,
                paymentMode: quotaPackForm.paymentMode,
                rechargeBy: 'ADMIN'
            });
            setAlertMsg({ type: 'success', text: `${res.data.message}` });
            loadData();
        } catch (err) {
            setAlertMsg({ type: 'error', text: `${err.response?.data?.message || 'Failed to assign advance tokens'}` });
        } finally {
            setLoading(false);
        }
    };

    const handleAdjustSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await API.post('/wallet/adjust', {
                customerId: adjustForm.userId,
                adjustmentType: adjustForm.adjustmentType,
                tokens: adjustForm.tokens,
                reason: adjustForm.reason
            });
            setAlertMsg({ type: 'success', text: `${res.data.message}` });
            loadData();
        } catch (err) {
            setAlertMsg({ type: 'error', text: `${err.response?.data?.message || 'Adjustment failed'}` });
        } finally {
            setLoading(false);
        }
    };

    // --- Inventory Handlers ---
    const handleFillJars = async () => {
        setLoading(true);
        try {
            const res = await API.post('/inventory/fill', { count: fillCount });
            setAlertMsg({ type: 'success', text: res.data.message });
            loadData();
        } catch (err) { 
            setAlertMsg({ type: 'error', text: err.response?.data?.message || 'Action failed' }); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleReturnSubmit = async (e) => {
        e.preventDefault(); 
        setLoading(true);
        try {
            const res = await API.post('/inventory/returns', { count: returnCount });
            setAlertMsg({ type: 'success', text: res.data.message });
            setReturnCount(''); 
            loadData();
        } catch (err) { 
            setAlertMsg({ type: 'error', text: 'Failed to record returns' }); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleDamageSubmit = async (e) => {
        e.preventDefault(); 
        setLoading(true);
        try {
            const res = await API.post('/inventory/damaged', damageForm);
            setAlertMsg({ type: 'success', text: res.data.message });
            loadData();
        } catch (err) { 
            setAlertMsg({ type: 'error', text: err.response?.data?.message || 'Action failed' }); 
        } finally { 
            setLoading(false); 
        }
    };

    // --- Permission Handlers ---
    const handleStaffSelect = (e) => {
        const userId = e.target.value;
        setSelectedStaffId(userId);
        const user = usersList.find(u => u._id === userId);
        if (user) {
            setSelectedPermissions(Array.isArray(user.permissions) ? [...user.permissions] : []);
            setSelectedRole(user.role || 'Staff');
        } else {
            setSelectedPermissions([]);
        }
    };

    const handleTogglePermission = (permKey) => {
        if (!selectedStaffId) return;
        setSelectedPermissions(prev => {
            const list = Array.isArray(prev) ? prev : [];
            return list.includes(permKey)
                ? list.filter(k => k !== permKey)
                : [...list, permKey];
        });
    };

    const handleToggleModuleAll = (module) => {
        if (!selectedStaffId) return;
        const moduleKeys = module.permissions.map(p => p.key);
        const currentList = Array.isArray(selectedPermissions) ? selectedPermissions : [];
        const isAllEnabled = moduleKeys.every(k => currentList.includes(k));

        if (isAllEnabled) {
            setSelectedPermissions(currentList.filter(k => !moduleKeys.includes(k)));
        } else {
            setSelectedPermissions(Array.from(new Set([...currentList, ...moduleKeys])));
        }
    };

    const handleSavePermissions = async () => {
        if (!selectedStaffId) return;
        setSavingPermissions(true);
        try {
            await API.put('/users/update-permissions', {
                userId: selectedStaffId,
                permissions: selectedPermissions,
                role: selectedRole
            });
            setAlertMsg({ type: 'success', text: 'Permissions & Role updated successfully!' });
            loadData();
        } catch (err) {
            setAlertMsg({ type: 'error', text: 'Failed to update permissions' });
        } finally {
            setSavingPermissions(false);
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f7ff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <style>{`
                .water-sidebar {
                    width: 260px;
                    background: #09233b;
                    color: #cbd5e1;
                    display: flex;
                    flex-direction: column;
                    flex-shrink: 0;
                    transition: all 0.3s ease-in-out;
                    z-index: 999;
                }
                .mobile-overlay { display: none; }
                .mobile-header-btn { display: none; }
                .responsive-container { padding: 24px 32px; flex: 1; }
                .responsive-table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
                .responsive-grid-two { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
                .responsive-grid-three { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
                @media (max-width: 768px) {
                    .water-sidebar { position: fixed; top: 0; left: -260px; bottom: 0; box-shadow: 4px 0 20px rgba(0,0,0,0.3); }
                    .water-sidebar.open { left: 0; }
                    .mobile-overlay.open { display: block; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); z-index: 998; }
                    .mobile-header-btn { display: flex; }
                    .responsive-container { padding: 16px; }
                }
            `}</style>

            <div className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)} />

            {/* 🌊 SIDEBAR */}
            <div className={`water-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                <div style={{ padding: '16px 14px' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)'
                    }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                            <DropletIcon size={22} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0, color: '#ffffff', fontSize: '14px', fontWeight: '800', letterSpacing: '0.5px' }}>AQUA CONTROL</h4>
                            <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.2)', color: '#e0f2fe', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold' }}>SUPER ADMIN</span>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '0 18px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase', margin: '10px 0 6px 0' }}>
                    System Modules
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
                    {/* Orders Group */}
                    <div>
                        <div onClick={() => toggleSubmenu('orders')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', color: '#e2e8f0', fontSize: '13px', fontWeight: '600' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <PackageIcon size={16} />
                                Orders & Counter
                            </span>
                            <span style={{ fontSize: '10px' }}>{expandedMenu.orders ? '▼' : '▶'}</span>
                        </div>
                        {expandedMenu.orders && (
                            <div style={{ paddingLeft: '20px', borderLeft: '2px solid #0369a1', marginLeft: '16px', margin: '4px 0 8px 16px' }}>
                                <div onClick={() => handleRouteChange('orders.approvals')} style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '8px', background: currentRoute === 'orders.approvals' ? '#0284c7' : 'transparent', color: currentRoute === 'orders.approvals' ? '#ffffff' : '#94a3b8', fontWeight: currentRoute === 'orders.approvals' ? 'bold' : 'normal' }}>
                                    Approvals Queue ({pendingOrders.length})
                                </div>
                                <div onClick={() => handleRouteChange('orders.counterSale')} style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '8px', background: currentRoute === 'orders.counterSale' ? '#0284c7' : 'transparent', color: currentRoute === 'orders.counterSale' ? '#ffffff' : '#94a3b8', fontWeight: currentRoute === 'orders.counterSale' ? 'bold' : 'normal' }}>
                                    Plant Counter Sale
                                </div>
                                <div onClick={() => handleRouteChange('orders.verify')} style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '8px', background: currentRoute === 'orders.verify' ? '#0284c7' : 'transparent', color: currentRoute === 'orders.verify' ? '#ffffff' : '#94a3b8', fontWeight: currentRoute === 'orders.verify' ? 'bold' : 'normal' }}>
                                    Direct OTP Verify
                                </div>
                                <div onClick={() => handleRouteChange('orders.history')} style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '8px', background: currentRoute === 'orders.history' ? '#0284c7' : 'transparent', color: currentRoute === 'orders.history' ? '#ffffff' : '#94a3b8', fontWeight: currentRoute === 'orders.history' ? 'bold' : 'normal' }}>
                                    Order Master History
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Customer Quota & Daily Revenue Group */}
                    <div>
                        <div onClick={() => toggleSubmenu('wallet')} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', color: '#e2e8f0', fontSize: '13px', fontWeight: '600' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <CreditCardIcon size={16} />
                                Quota & Revenue
                            </span>
                            <span style={{ fontSize: '10px' }}>{expandedMenu.wallet ? '▼' : '▶'}</span>
                        </div>
                        {expandedMenu.wallet && (
                            <div style={{ paddingLeft: '20px', borderLeft: '2px solid #0369a1', marginLeft: '16px', margin: '4px 0 8px 16px' }}>
                                <div onClick={() => handleRouteChange('wallet.reconciliation')} style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '8px', background: currentRoute === 'wallet.reconciliation' ? '#0284c7' : 'transparent', color: currentRoute === 'wallet.reconciliation' ? '#ffffff' : '#94a3b8', fontWeight: currentRoute === 'wallet.reconciliation' ? 'bold' : 'normal' }}>
                                    Daily Cash Settlement
                                </div>
                                <div onClick={() => handleRouteChange('wallet.quotaPack')} style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '8px', background: currentRoute === 'wallet.quotaPack' ? '#0284c7' : 'transparent', color: currentRoute === 'wallet.quotaPack' ? '#fff' : '#94a3b8', fontWeight: currentRoute === 'wallet.quotaPack' ? 'bold' : 'normal' }}>
                                    Add Advance Tokens
                                </div>
                                <div onClick={() => handleRouteChange('wallet.adjust')} style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '8px', background: currentRoute === 'wallet.adjust' ? '#0284c7' : 'transparent', color: currentRoute === 'wallet.adjust' ? '#fff' : '#94a3b8', fontWeight: currentRoute === 'wallet.adjust' ? 'bold' : 'normal' }}>
                                    Adjust / Deduct Tokens
                                </div>
                                <div onClick={() => handleRouteChange('wallet.logs')} style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '8px', background: currentRoute === 'wallet.logs' ? '#0284c7' : 'transparent', color: currentRoute === 'wallet.logs' ? '#fff' : '#94a3b8', fontWeight: currentRoute === 'wallet.logs' ? 'bold' : 'normal' }}>
                                    Audit & Payment Logs
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Plant Inventory Group */}
                    <div>
                        <div onClick={() => toggleSubmenu('inventory')} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', color: '#e2e8f0', fontSize: '13px', fontWeight: '600' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <DropletIcon size={16} />
                                Plant Inventory
                            </span>
                            <span style={{ fontSize: '10px' }}>{expandedMenu.inventory ? '▼' : '▶'}</span>
                        </div>
                        {expandedMenu.inventory && (
                            <div style={{ paddingLeft: '20px', borderLeft: '2px solid #0369a1', marginLeft: '16px', margin: '4px 0 8px 16px' }}>
                                <div onClick={() => handleRouteChange('inventory.view')} style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '8px', background: currentRoute === 'inventory.view' ? '#0284c7' : 'transparent', color: currentRoute === 'inventory.view' ? '#fff' : '#94a3b8', fontWeight: currentRoute === 'inventory.view' ? 'bold' : 'normal' }}>
                                    Live Plant Stocks
                                </div>
                                <div onClick={() => handleRouteChange('inventory.returns')} style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '8px', background: currentRoute === 'inventory.returns' ? '#0284c7' : 'transparent', color: currentRoute === 'inventory.returns' ? '#fff' : '#94a3b8', fontWeight: currentRoute === 'inventory.returns' ? 'bold' : 'normal' }}>
                                    Record Empty Returns
                                </div>
                                <div onClick={() => handleRouteChange('inventory.damaged')} style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '8px', background: currentRoute === 'inventory.damaged' ? '#0284c7' : 'transparent', color: currentRoute === 'inventory.damaged' ? '#fff' : '#94a3b8', fontWeight: currentRoute === 'inventory.damaged' ? 'bold' : 'normal' }}>
                                    Mark Damaged Jars
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Users Group */}
                    <div>
                        <div onClick={() => toggleSubmenu('users')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', color: '#e2e8f0', fontSize: '13px', fontWeight: '600' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <UserIcon size={16} />
                                User Accounts
                            </span>
                            <span style={{ fontSize: '10px' }}>{expandedMenu.users ? '▼' : '▶'}</span>
                        </div>
                        {expandedMenu.users && (
                            <div style={{ paddingLeft: '20px', borderLeft: '2px solid #0369a1', marginLeft: '16px', margin: '4px 0 8px 16px' }}>
                                <div onClick={() => handleRouteChange('users.list')} style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '8px', background: currentRoute === 'users.list' ? '#0284c7' : 'transparent', color: currentRoute === 'users.list' ? '#ffffff' : '#94a3b8', fontWeight: currentRoute === 'users.list' ? 'bold' : 'normal' }}>
                                    All Users Directory
                                </div>
                                <div onClick={() => handleRouteChange('users.add')} style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '8px', background: currentRoute === 'users.add' ? '#0284c7' : 'transparent', color: currentRoute === 'users.add' ? '#ffffff' : '#94a3b8', fontWeight: currentRoute === 'users.add' ? 'bold' : 'normal' }}>
                                    + Add New User
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Permissions Group */}
                    <div>
                        <div onClick={() => toggleSubmenu('staff')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', color: '#e2e8f0', fontSize: '13px', fontWeight: '600' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <CheckCircleIcon size={16} />
                                Permissions
                            </span>
                            <span style={{ fontSize: '10px' }}>{expandedMenu.staff ? '▼' : '▶'}</span>
                        </div>
                        {expandedMenu.staff && (
                            <div style={{ paddingLeft: '20px', borderLeft: '2px solid #0369a1', marginLeft: '16px', margin: '4px 0 8px 16px' }}>
                                <div onClick={() => handleRouteChange('staff.roles')} style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '8px', background: currentRoute === 'staff.roles' ? '#0284c7' : 'transparent', color: currentRoute === 'staff.roles' ? '#ffffff' : '#94a3b8', fontWeight: currentRoute === 'staff.roles' ? 'bold' : 'normal' }}>
                                    Roles & Permissions
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 🚀 SIDEBAR BOTTOM */}
                <div style={{ padding: '14px 12px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid #1e3a5f' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Logged in:</span>
                        <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{currentUser?.name?.split(' ')[0] || 'Admin'}</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{ width: '100%', padding: '9px', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        <LogOutIcon size={15} />
                        <span>Logout Session</span>
                    </button>
                </div>
            </div>

            {/* 🖥️ MAIN CANVAS */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
                <div style={{ background: '#ffffff', padding: '14px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button className="mobile-header-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>☰</button>
                        <h3 style={{ margin: 0, color: '#0369a1', fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {currentRoute === 'orders.approvals' && <><PackageIcon size={18} /> Order Approvals Queue</>}
                            {currentRoute === 'orders.counterSale' && <><ZapIcon size={18} /> Plant Counter Direct Sale</>}
                            {currentRoute === 'orders.verify' && <><TruckIcon size={18} /> Direct Delivery Verify</>}
                            {currentRoute === 'orders.history' && <><HistoryIcon size={18} /> Order Master History</>}
                            {currentRoute === 'wallet.reconciliation' && <><CreditCardIcon size={18} /> Daily Plant Cash Settlement & Revenue</>}
                            {currentRoute === 'wallet.quotaPack' && <><PackageIcon size={18} /> Assign Customer Advance Tokens</>}
                            {currentRoute === 'wallet.adjust' && <><PackageIcon size={18} /> Manual Token Adjustment</>}
                            {currentRoute === 'wallet.logs' && <><HistoryIcon size={18} /> Audit & Payment Logs</>}
                            {currentRoute === 'inventory.view' && <><DropletIcon size={18} /> Live Plant Jar Stock & Status</>}
                            {currentRoute === 'inventory.returns' && <><DropletIcon size={18} /> Record Empty Jars Return (From Delivery)</>}
                            {currentRoute === 'inventory.damaged' && <><AlertCircleIcon size={18} /> Mark Jars as Damaged or Unusable</>}
                            {currentRoute === 'users.list' && <><UserIcon size={18} /> User Master Directory</>}
                            {currentRoute === 'users.add' && <><UserIcon size={18} /> Onboard New User</>}
                            {currentRoute === 'staff.roles' && <><CheckCircleIcon size={18} /> Role & Permission Matrix</>}
                        </h3>
                    </div>
                    <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0284c7', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold' }}>● Plant Live (Auto-Sync)</span>
                </div>

                <div className="responsive-container">
                    {alertMsg.text && (
                        <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', background: alertMsg.type === 'success' ? '#dcfce7' : '#fee2e2', color: alertMsg.type === 'success' ? '#15803d' : '#b91c1c', border: `1px solid ${alertMsg.type === 'success' ? '#bbf7d0' : '#fca5a5'}` }}>
                            {alertMsg.type === 'success' ? <CheckCircleIcon size={16} /> : <AlertCircleIcon size={16} />}
                            <span>{alertMsg.text}</span>
                        </div>
                    )}

                    {/* 1. APPROVALS */}
                    {currentRoute === 'orders.approvals' && (
                        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                            {pendingOrders.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8' }}>
                                    <h3>No Pending Orders!</h3>
                                    <p style={{ fontSize: '13px' }}>All water delivery requests have been processed.</p>
                                </div>
                            ) : (
                                pendingOrders.map((ord) => (
                                    <div key={ord._id} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: '14px', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '12px', background: '#f8fafc', gap: '10px' }}>
                                        <div>
                                            <h4 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '15px' }}>{ord.customer?.name}</h4>
                                            <span style={{ fontSize: '13px', color: '#64748b' }}>
                                                Email: {ord.customer?.email || 'N/A'} | Phone: {ord.customer?.phone || 'N/A'} | Adv. Tokens: <strong>{ord.customer?.prepaidJarBalance || 0} Jars</strong> | Qty: <strong>{ord.quantity || 1} Jar(s)</strong> ({ord.orderType})
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => handleApprove(ord._id)} style={{ padding: '9px 18px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <CheckCircleIcon size={15} />
                                                <span>Approve Order</span>
                                            </button>
                                            <button onClick={() => openRejectModal(ord._id)} style={{ padding: '9px 14px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                                ✕ Reject
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* ⚡ 1.5. PLANT COUNTER DIRECT WALK-IN SALE */}
                    {currentRoute === 'orders.counterSale' && (
                        <div style={{ maxWidth: '520px', background: '#ffffff', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ color: '#0f172a', margin: '0 0 6px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ZapIcon size={18} color="#16a34a" />
                                Plant Gate / Counter Walk-in Sale
                            </h4>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0' }}>
                                Direct counter par aane wale temporary customer ke liye bina account ke instant sale record karein.
                            </p>

                            <form onSubmit={handleCounterSaleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Customer Name / Reference (Optional):</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Counter Cash / Guest"
                                        value={counterSaleForm.guestName}
                                        onChange={(e) => setCounterSaleForm({ ...counterSaleForm, guestName: e.target.value })}
                                        style={{ width: '100%', padding: '10px', marginTop: '4px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Quantity (Jars):</label>
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            value={counterSaleForm.quantity}
                                            onChange={(e) => {
                                                const q = Number(e.target.value) || 1;
                                                setCounterSaleForm({ ...counterSaleForm, quantity: q, amountPaid: q * 20, emptyJarsReceived: q });
                                            }}
                                            style={{ width: '100%', padding: '10px', marginTop: '4px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Total Amount (₹):</label>
                                        <input
                                            type="number"
                                            min="0"
                                            required
                                            value={counterSaleForm.amountPaid}
                                            onChange={(e) => setCounterSaleForm({ ...counterSaleForm, amountPaid: e.target.value })}
                                            style={{ width: '100%', padding: '10px', marginTop: '4px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Payment Method:</label>
                                        <select
                                            value={counterSaleForm.paymentMethod}
                                            onChange={(e) => setCounterSaleForm({ ...counterSaleForm, paymentMethod: e.target.value })}
                                            style={{ width: '100%', padding: '10px', marginTop: '4px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
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
                                            value={counterSaleForm.emptyJarsReceived}
                                            onChange={(e) => setCounterSaleForm({ ...counterSaleForm, emptyJarsReceived: e.target.value })}
                                            style={{ width: '100%', padding: '10px', marginTop: '4px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        padding: '13px',
                                        background: '#16a34a',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 'bold',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        marginTop: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <ZapIcon size={16} />
                                    <span>{loading ? 'Processing...' : `Collect ₹${counterSaleForm.amountPaid} & Complete Counter Sale`}</span>
                                </button>
                            </form>
                        </div>
                    )}

                    {/* 2. DIRECT VERIFY */}
                    {currentRoute === 'orders.verify' && (
                        <div style={{ maxWidth: '420px', background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <form onSubmit={handleDirectVerify}>
                                <h4 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>Direct Delivery OTP Confirmation</h4>
                                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>Verify customer delivery using OTP if distributor scanner is unavailable.</p>
                                <input type="text" maxLength="4" placeholder="Enter 4-Digit OTP" value={verifyOtp} onChange={(e) => setVerifyOtp(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '18px', textAlign: 'center', letterSpacing: '4px', border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '14px', boxSizing: 'border-box' }} />
                                <button type="submit" style={{ width: '100%', padding: '12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                    Verify Delivery
                                </button>
                            </form>
                        </div>
                    )}

                    {/* 3. MASTER HISTORY VIEW */}
                    {currentRoute === 'orders.history' && (
                        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                            <div className="responsive-table-wrapper">
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', minWidth: '700px' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                            <th style={{ padding: '12px' }}>Date</th>
                                            <th style={{ padding: '12px' }}>Customer</th>
                                            <th style={{ padding: '12px' }}>Type & Qty</th>
                                            <th style={{ padding: '12px' }}>Status</th>
                                            <th style={{ padding: '12px' }}>Payment Mode</th>
                                            <th style={{ padding: '12px' }}>Distributor</th>
                                            <th style={{ padding: '12px' }}>Delivered Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {masterHistory.length === 0 ? (
                                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No records found.</td></tr>
                                        ) : (
                                            masterHistory.map((log) => (
                                                <tr key={log._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '12px', color: '#64748b' }}>{new Date(log.createdAt).toLocaleDateString()}</td>
                                                    <td style={{ padding: '12px', fontWeight: '600' }}>
                                                        {log.isWalkInCustomer ? `Direct ${log.guestName} (Walk-in)` : (log.customer?.name || 'Customer')} <br/>
                                                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'normal' }}>
                                                            {log.isWalkInCustomer ? log.guestPhone : (log.customer?.email || log.customer?.phone || 'N/A')}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px' }}>{log.orderType} (<strong>{log.quantity || 1} Jar</strong>)</td>
                                                    <td style={{ padding: '12px' }}>
                                                        <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', background: log.status === 'Delivered' ? '#dcfce7' : log.status === 'Cancelled' ? '#fee2e2' : '#e0f2fe', color: log.status === 'Delivered' ? '#15803d' : log.status === 'Cancelled' ? '#b91c1c' : '#0369a1', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            {log.status === 'Delivered' && <CheckCircleIcon size={12} />}
                                                            {log.status === 'Cancelled' && <AlertCircleIcon size={12} />}
                                                            {log.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#0369a1' }}>{log.paymentStatus || 'Pending'}</td>
                                                    <td style={{ padding: '12px', color: '#475569' }}>{log.distributor?.name || (log.isWalkInCustomer ? 'Counter / Direct' : 'Super Admin / Direct')}</td>
                                                    <td style={{ padding: '12px', color: '#64748b', fontSize: '12px' }}>{log.deliveryTimestamp ? new Date(log.deliveryTimestamp).toLocaleString() : '-'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* 4. DAILY CASH RECONCILIATION & REVENUE AUDIT */}
                    {currentRoute === 'wallet.reconciliation' && (
                        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ margin: '0 0 16px 0', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CreditCardIcon size={20} />
                                Today's Plant Revenue & Cash Settlement
                            </h3>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '18px', borderRadius: '12px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#047857' }}>TOTAL CASH COLLECTED</span>
                                    <h2 style={{ margin: '6px 0 0 0', color: '#065f46' }}>₹{dailyAudit.summary.totalCash}</h2>
                                </div>
                                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '18px', borderRadius: '12px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1d4ed8' }}>TOTAL UPI (BANK ACCOUNT)</span>
                                    <h2 style={{ margin: '6px 0 0 0', color: '#1e40af' }}>₹{dailyAudit.summary.totalUPI}</h2>
                                </div>
                                <div style={{ background: '#fdf4ff', border: '1px solid #f0abfc', padding: '18px', borderRadius: '12px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#a21caf' }}>ADVANCE QUOTA DELIVERIES</span>
                                    <h2 style={{ margin: '6px 0 0 0', color: '#86198f' }}>{dailyAudit.summary.totalPrepaidJars} Jars</h2>
                                </div>
                            </div>

                            <h4 style={{ margin: '0 0 12px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <TruckIcon size={18} color="#0284c7" />
                                Driver-wise Cash Deposit & Reconciliation
                            </h4>
                            <div className="responsive-table-wrapper">
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', minWidth: '600px' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                            <th style={{ padding: '10px' }}>Driver Name</th>
                                            <th style={{ padding: '10px' }}>Deliveries Completed</th>
                                            <th style={{ padding: '10px' }}>Cash In Hand (Deposit to Plant)</th>
                                            <th style={{ padding: '10px' }}>UPI Received</th>
                                            <th style={{ padding: '10px' }}>Advance Quota Jars</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.keys(dailyAudit.driverStats || {}).length === 0 ? (
                                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No deliveries recorded today yet.</td></tr>
                                        ) : (
                                            Object.keys(dailyAudit.driverStats).map(driver => (
                                                <tr key={driver} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{driver}</td>
                                                    <td style={{ padding: '10px' }}>{dailyAudit.driverStats[driver].deliveries}</td>
                                                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#dc2626' }}>₹{dailyAudit.driverStats[driver].cashInHand}</td>
                                                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#16a34a' }}>₹{dailyAudit.driverStats[driver].upiDirect}</td>
                                                    <td style={{ padding: '10px' }}>{dailyAudit.driverStats[driver].quotaJars}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* 5. 📦 ASSIGN CUSTOM ADVANCE TOKENS */}
                    {currentRoute === 'wallet.quotaPack' && (
                        <div style={{ maxWidth: '520px', background: '#ffffff', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ margin: '0 0 6px 0', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <PackageIcon size={18} />
                                Assign Customer Advance Tokens
                            </h4>
                            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
                                Customer jitne jars ka advance recharge chahe (e.g. 5, 15, 25, 50 Jars), yahan enter karein.
                            </p>

                            <form onSubmit={handleQuotaPackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Select Customer:</label>
                                    <select value={quotaPackForm.userId} onChange={(e) => setQuotaPackForm({ ...quotaPackForm, userId: e.target.value })} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px' }}>
                                        <option value="">-- Choose Customer --</option>
                                        {usersList.filter(u => u.role === 'Customer').map(u => (
                                            <option key={u._id} value={u._id}>{u.name} ({u.email || u.phone}) - Current Balance: {u.prepaidJarBalance || 0} Jars</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Number of Jars (Custom):</label>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            required 
                                            value={quotaPackForm.jarCount} 
                                            onChange={(e) => {
                                                const count = Number(e.target.value) || 1;
                                                setQuotaPackForm({ 
                                                    ...quotaPackForm, 
                                                    jarCount: count, 
                                                    amountPaid: count * 20 
                                                });
                                            }} 
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} 
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Amount Paid (₹):</label>
                                        <input 
                                            type="number" 
                                            min="0" 
                                            required 
                                            value={quotaPackForm.amountPaid} 
                                            onChange={(e) => setQuotaPackForm({ ...quotaPackForm, amountPaid: e.target.value })} 
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Payment Received Via:</label>
                                    <select value={quotaPackForm.paymentMode} onChange={(e) => setQuotaPackForm({ ...quotaPackForm, paymentMode: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px' }}>
                                        <option value="UPI">UPI / GPay / PhonePe</option>
                                        <option value="Cash">Cash at Plant / Counter</option>
                                        <option value="Online">Online Gateway</option>
                                        <option value="Bank Transfer">Bank Transfer / NEFT</option>
                                    </select>
                                </div>
                                <button type="submit" disabled={loading} style={{ padding: '12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <PackageIcon size={16} />
                                    <span>{loading ? 'Processing...' : `Activate ${quotaPackForm.jarCount || 0} Advance Tokens`}</span>
                                </button>
                            </form>
                        </div>
                    )}

                    {/* 6. ADJUST BALANCE */}
                    {currentRoute === 'wallet.adjust' && (
                        <div style={{ maxWidth: '520px', background: '#ffffff', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                            <form onSubmit={handleAdjustSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Select Customer:</label>
                                    <select value={adjustForm.userId} onChange={(e) => setAdjustForm({ ...adjustForm, userId: e.target.value })} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px' }}>
                                        <option value="">-- Choose Customer --</option>
                                        {usersList.filter(u => u.role === 'Customer').map(u => (
                                            <option key={u._id} value={u._id}>{u.name} ({u.email || u.phone}) - Current Balance: {u.prepaidJarBalance || 0} Jars</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Adjustment Action:</label>
                                    <select value={adjustForm.adjustmentType} onChange={(e) => setAdjustForm({ ...adjustForm, adjustmentType: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px' }}>
                                        <option value="CREDIT">Credit Quota (+ Add Correction Jars)</option>
                                        <option value="DEDUCT">Deduct Quota (- Charge Broken Jar / Penalty)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Number of Jars:</label>
                                    <input type="number" min="1" required value={adjustForm.tokens} onChange={(e) => setAdjustForm({ ...adjustForm, tokens: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Reason for Adjustment:</label>
                                    <input type="text" required placeholder="e.g. Jar Damaged by Customer" value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
                                </div>
                                <button type="submit" disabled={loading} style={{ padding: '12px', background: adjustForm.adjustmentType === 'DEDUCT' ? '#dc2626' : '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                    {loading ? 'Adjusting...' : 'Apply Quota Adjustment'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* 7. PAYMENT & TRANSACTION LOGS */}
                    {currentRoute === 'wallet.logs' && (
                        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                            <div className="responsive-table-wrapper">
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', minWidth: '700px' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                            <th style={{ padding: '12px' }}>Date & Time</th>
                                            <th style={{ padding: '12px' }}>Customer</th>
                                            <th style={{ padding: '12px' }}>Transaction Type</th>
                                            <th style={{ padding: '12px' }}>Jars Count</th>
                                            <th style={{ padding: '12px' }}>Paid (₹)</th>
                                            <th style={{ padding: '12px' }}>Mode</th>
                                            <th style={{ padding: '12px' }}>Balance Change</th>
                                            <th style={{ padding: '12px' }}>Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {walletLogs.length === 0 ? (
                                            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No payment logs recorded yet.</td></tr>
                                        ) : (
                                            walletLogs.map((log) => (
                                                <tr key={log._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '12px', color: '#64748b' }}>{new Date(log.createdAt).toLocaleDateString()} <br/><span style={{fontSize: '11px'}}>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></td>
                                                    <td style={{ padding: '12px', fontWeight: '600' }}>{log.customer?.name || 'Customer'} <br/><span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'normal' }}>{log.customer?.email || log.customer?.phone}</span></td>
                                                    <td style={{ padding: '12px' }}>
                                                        <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', background: log.type === 'Recharge' ? '#dcfce7' : log.type === 'Manual_Deduction' ? '#fee2e2' : '#e0f2fe', color: log.type === 'Recharge' ? '#15803d' : log.type === 'Manual_Deduction' ? '#b91c1c' : '#0369a1' }}>
                                                            {log.type.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px', fontWeight: 'bold', color: log.tokens > 0 ? '#15803d' : '#b91c1c' }}>{log.tokens > 0 ? `+${log.tokens}` : log.tokens}</td>
                                                    <td style={{ padding: '12px', fontWeight: '600' }}>₹{log.amountPaid || 0}</td>
                                                    <td style={{ padding: '12px', color: '#475569', fontWeight: '600' }}>{log.paymentMode}</td>
                                                    <td style={{ padding: '12px' }}>{log.balanceBefore} ➔ <strong>{log.balanceAfter}</strong></td>
                                                    <td style={{ padding: '12px', color: '#64748b', fontSize: '12px' }}>{log.reason}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* 8. INVENTORY 1: VIEW STOCKS */}
                    {currentRoute === 'inventory.view' && (
                        <div>
                            <div className="responsive-grid-three" style={{ marginBottom: '24px' }}>
                                <div style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', padding: '24px', borderRadius: '16px', color: '#fff', boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 'bold', opacity: 0.9, letterSpacing: '1px', marginBottom: '8px' }}>FILLED JARS (READY)</div>
                                    <div style={{ fontSize: '42px', fontWeight: '800' }}>{inventoryStats.filledJars}</div>
                                </div>
                                <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', letterSpacing: '1px', marginBottom: '8px' }}>EMPTY JARS AT PLANT</div>
                                    <div style={{ fontSize: '42px', fontWeight: '800', color: '#0f172a' }}>{inventoryStats.emptyJars}</div>
                                </div>
                                <div style={{ background: '#fef2f2', padding: '24px', borderRadius: '16px', border: '1px solid #fecaca' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#991b1b', letterSpacing: '1px', marginBottom: '8px' }}>DAMAGED / SCRAP</div>
                                    <div style={{ fontSize: '42px', fontWeight: '800', color: '#7f1d1d' }}>{inventoryStats.damagedJars}</div>
                                </div>
                            </div>

                            <div style={{ maxWidth: '400px', background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                                <h4 style={{ margin: '0 0 14px 0', color: '#0f172a' }}>Plant Operation: Fill Jars</h4>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input type="number" min="1" max={inventoryStats.emptyJars} value={fillCount} onChange={(e) => setFillCount(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                    <button onClick={handleFillJars} disabled={loading || inventoryStats.emptyJars < fillCount} style={{ padding: '10px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                        Fill Jars Now
                                    </button>
                                </div>
                                <p style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>Convert empty jars into ready-to-dispatch filled jars.</p>
                            </div>
                        </div>
                    )}

                    {/* 9. INVENTORY 2: RECORD RETURNS */}
                    {currentRoute === 'inventory.returns' && (
                        <div style={{ maxWidth: '440px', background: '#ffffff', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                            <form onSubmit={handleReturnSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Empty Jars Returned to Plant:</label>
                                    <input type="number" min="1" required value={returnCount} onChange={(e) => setReturnCount(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '16px', fontWeight: 'bold' }} />
                                </div>
                                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>This will increase your 'Empty Jars' stock.</p>
                                <button type="submit" disabled={loading} style={{ padding: '12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>
                                    {loading ? 'Processing...' : 'Record Empty Jars Return'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* 10. INVENTORY 3: MARK DAMAGED */}
                    {currentRoute === 'inventory.damaged' && (
                        <div style={{ maxWidth: '440px', background: '#ffffff', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                            <form onSubmit={handleDamageSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Remove From:</label>
                                    <select value={damageForm.fromStatus} onChange={(e) => setDamageForm({ ...damageForm, fromStatus: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px' }}>
                                        <option value="EMPTY">Empty Jars Stock</option>
                                        <option value="FILLED">Filled Jars Stock</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Number of Damaged Jars:</label>
                                    <input type="number" min="1" required value={damageForm.count} onChange={(e) => setDamageForm({ ...damageForm, count: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Reason for Damage:</label>
                                    <input type="text" required placeholder="e.g. Base Leakage, Cap Broken" value={damageForm.reason} onChange={(e) => setDamageForm({ ...damageForm, reason: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                                </div>
                                <button type="submit" disabled={loading} style={{ padding: '12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>
                                    {loading ? 'Processing...' : 'Mark as Damaged/Scrap'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* 11. ONBOARD NEW USER */}
                    {currentRoute === 'users.add' && (
                        <div style={{ maxWidth: '520px', background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Full Name *:</label>
                                    <input type="text" required placeholder="e.g. Ramesh Kumar" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} style={{ width: '100%', padding: '10px', marginTop: '4px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#0284c7' }}>Email Address (Required for OTP Login) *:</label>
                                    <input type="email" required placeholder="e.g. user@aquacontrol.com" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} style={{ width: '100%', padding: '10px', marginTop: '4px', border: '1px solid #0284c7', borderRadius: '8px', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Phone Number (Optional):</label>
                                    <input type="text" placeholder="10-digit phone (optional)" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} style={{ width: '100%', padding: '10px', marginTop: '4px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Role Assignment:</label>
                                    <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} style={{ width: '100%', padding: '10px', marginTop: '4px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                                        <option value="Customer">Customer</option>
                                        <option value="Distributor">Distributor (Delivery Boy)</option>
                                        <option value="Staff">Plant Staff</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </div>
                                <button type="submit" disabled={loading} style={{ padding: '12px', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                    {loading ? 'Creating...' : '+ Create Account'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* 12. USER DIRECTORY */}
                    {currentRoute === 'users.list' && (
                        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                            <div className="responsive-table-wrapper">
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px', minWidth: '600px' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                            <th style={{ padding: '12px' }}>Name & Email</th>
                                            <th style={{ padding: '12px' }}>Phone</th>
                                            <th style={{ padding: '12px' }}>Role</th>
                                            <th style={{ padding: '12px' }}>Adv. Quota</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usersList.map((u) => (
                                            <tr key={u._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '12px', fontWeight: '600' }}>
                                                    {u.name} <br/>
                                                    <span style={{ fontSize: '12px', color: '#0284c7', fontWeight: 'normal' }}>{u.email || 'No email registered'}</span>
                                                </td>
                                                <td style={{ padding: '12px', color: '#64748b' }}>{u.phone || 'N/A'}</td>
                                                <td style={{ padding: '12px' }}>
                                                    <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', background: u.role === 'Admin' ? '#fee2e2' : u.role === 'Distributor' ? '#fef3c7' : '#e0f2fe', color: u.role === 'Admin' ? '#b91c1c' : u.role === 'Distributor' ? '#b45309' : '#0369a1' }}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px', fontWeight: 'bold', color: '#0284c7' }}>{u.prepaidJarBalance || 0} Jars</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* 13. ROLES & PERMISSIONS */}
                    {currentRoute === 'staff.roles' && (
                        <div>
                            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '12px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', flex: 1 }}>
                                    <div style={{ minWidth: '200px', flex: 2 }}>
                                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#0284c7', textTransform: 'uppercase' }}>SELECT USER:</label>
                                        <select value={selectedStaffId} onChange={handleStaffSelect} style={{ width: '100%', padding: '9px', marginTop: '4px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                                            <option value="">-- Choose User --</option>
                                            {usersList.map(u => (
                                                <option key={u._id} value={u._id}>{u.name} ({u.email || u.phone}) - {u.role}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ minWidth: '140px', flex: 1 }}>
                                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>BASE ROLE:</label>
                                        <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} disabled={!selectedStaffId} style={{ width: '100%', padding: '9px', marginTop: '4px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                                            <option value="Customer">Customer</option>
                                            <option value="Distributor">Distributor</option>
                                            <option value="Staff">Staff</option>
                                            <option value="Admin">Admin</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>
                                        <span style={{ color: '#0284c7', fontSize: '15px' }}>{selectedPermissions.length}</span> Allowed
                                    </span>
                                    <button onClick={handleSavePermissions} disabled={savingPermissions || !selectedStaffId} style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: (!selectedStaffId || savingPermissions) ? 'not-allowed' : 'pointer' }}>
                                        {savingPermissions ? 'SAVING...' : 'SAVE'}
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {WATER_MODULES.map((module) => {
                                    const moduleKeys = module.permissions.map(p => p.key);
                                    const isAllModuleEnabled = selectedStaffId && moduleKeys.every(k => selectedPermissions.includes(k));
                                    return (
                                        <div key={module.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                                                <h4 style={{ margin: 0, fontSize: '14px', color: '#0f172a', fontWeight: '700' }}>{module.title}</h4>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>ENABLE ALL</span>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={!!isAllModuleEnabled} 
                                                        onChange={() => handleToggleModuleAll(module)} 
                                                        disabled={!selectedStaffId} 
                                                        style={{ width: '18px', height: '18px', cursor: selectedStaffId ? 'pointer' : 'not-allowed' }} 
                                                    />
                                                </div>
                                            </div>
                                            <div className="responsive-grid-two">
                                                {module.permissions.map((perm) => {
                                                    const isChecked = Array.isArray(selectedPermissions) && selectedPermissions.includes(perm.key);
                                                    return (
                                                        <label 
                                                            key={perm.key} 
                                                            style={{ 
                                                                display: 'flex', 
                                                                justifyContent: 'space-between', 
                                                                alignItems: 'center', 
                                                                padding: '10px 14px', 
                                                                background: isChecked ? '#f0f9ff' : '#f8fafc', 
                                                                borderRadius: '8px', 
                                                                border: `1.5px solid ${isChecked ? '#0284c7' : '#e2e8f0'}`,
                                                                cursor: selectedStaffId ? 'pointer' : 'not-allowed',
                                                                userSelect: 'none',
                                                                transition: 'all 0.15s ease'
                                                            }}
                                                        >
                                                            <span style={{ fontSize: '12px', fontWeight: '600', color: isChecked ? '#0369a1' : '#475569' }}>
                                                                {perm.label}
                                                            </span>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isChecked} 
                                                                onChange={() => handleTogglePermission(perm.key)} 
                                                                disabled={!selectedStaffId} 
                                                                style={{ width: '18px', height: '18px', cursor: selectedStaffId ? 'pointer' : 'not-allowed' }} 
                                                            />
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 🚨 REJECT REASON MODAL POPUP */}
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
                            Reject Order Request
                        </h3>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0' }}>
                            Customer ko batayein ki order kyun cancel/reject kiya ja raha hai.
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
                            <option value="Delivery timings over ho chuki hain.">Aaj ki delivery timings over ho chuki hain</option>
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
                                Cancel
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

export default AdminDashboard;