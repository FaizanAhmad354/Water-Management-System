import React, { useState, useEffect } from 'react';
import API from '../../services/api';

// Water Management System ke Specific Modules aur Unke Sub-Permissions
const WATER_SYSTEM_MODULES = [
    {
        id: 'orders',
        title: '📦 Order & Delivery Operations',
        permissions: [
            { key: 'orders.approve', label: 'Approve / Reject Water Requests' },
            { key: 'orders.verify_qr', label: 'Verify Deliveries via QR / OTP' },
            { key: 'orders.direct_override', label: 'Direct Delivery Override (Admin Mode)' },
            { key: 'orders.cancel', label: 'Cancel Active Customer Orders' }
        ]
    },
    {
        id: 'wallet',
        title: '💳 Customer Wallet & Token Recharge',
        permissions: [
            { key: 'wallet.recharge', label: 'Recharge Token Wallet' },
            { key: 'wallet.adjust', label: 'Deduct / Adjust Token Balance' },
            { key: 'wallet.view_history', label: 'View Customer Payment Logs' },
            { key: 'wallet.manage_subscriptions', label: 'Set Recurring Monthly Subscriptions' }
        ]
    },
    {
        id: 'inventory',
        title: '🚰 Plant Inventory & Empty Jar Tracking',
        permissions: [
            { key: 'inventory.view_stock', label: 'View Filled & Empty Jar Stock' },
            { key: 'inventory.empty_jar_return', label: 'Record Empty Jar Returns from Drivers' },
            { key: 'inventory.allocate_van', label: 'Allocate Jar Stock to Delivery Vans' },
            { key: 'inventory.damaged_jars', label: 'Mark Damaged / Lost Jars' }
        ]
    },
    {
        id: 'routes',
        title: '🚚 Distributor & Route Management',
        permissions: [
            { key: 'routes.assign', label: 'Assign Delivery Sectors / Areas' },
            { key: 'routes.live_queue', label: 'View Today Live Delivery Queue' },
            { key: 'routes.driver_payouts', label: 'View Driver Daily Delivery Counts' }
        ]
    },
    {
        id: 'analytics',
        title: '📊 Reports & Analytics',
        permissions: [
            { key: 'reports.daily_summary', label: 'View Daily Dispatch & Sales Summary' },
            { key: 'reports.customer_statement', label: 'Download Customer Ledger / Invoices' },
            { key: 'reports.export_csv', label: 'Export Delivery Reports to Excel/CSV' }
        ]
    },
    {
        id: 'settings',
        title: '⚙️ Security & Master Settings',
        permissions: [
            { key: 'settings.role_management', label: 'Access Role & Permission Management' },
            { key: 'settings.price_config', label: 'Modify Token Rates & Plant Pricing' }
        ]
    }
];

const RoleManagement = () => {
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [selectedRole, setSelectedRole] = useState('Staff');
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState({ type: '', msg: '' });

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await API.get('/users/all');
                setUsers(res.data);
            } catch (err) {
                console.error('Error fetching users:', err);
            }
        };
        fetchUsers();
    }, []);

    const handleUserSelect = (e) => {
        const userId = e.target.value;
        setSelectedUserId(userId);
        const user = users.find(u => u._id === userId);
        if (user) {
            setSelectedPermissions(user.permissions || []);
            setSelectedRole(user.role || 'Staff');
        } else {
            setSelectedPermissions([]);
        }
    };

    const handleTogglePermission = (permKey) => {
        if (!selectedUserId) return;
        setSelectedPermissions(prev =>
            prev.includes(permKey)
                ? prev.filter(k => k !== permKey)
                : [...prev, permKey]
        );
    };

    const handleToggleModuleAll = (module) => {
        if (!selectedUserId) return;
        const moduleKeys = module.permissions.map(p => p.key);
        const isAllEnabled = moduleKeys.every(k => selectedPermissions.includes(k));

        if (isAllEnabled) {
            setSelectedPermissions(prev => prev.filter(k => !moduleKeys.includes(k)));
        } else {
            setSelectedPermissions(prev => Array.from(new Set([...prev, ...moduleKeys])));
        }
    };

    const handleSave = async () => {
        if (!selectedUserId) {
            setNotification({ type: 'error', msg: 'Please choose a staff member first!' });
            return;
        }

        setSaving(true);
        setNotification({ type: '', msg: '' });

        try {
            await API.put('/users/update-permissions', {
                userId: selectedUserId,
                permissions: selectedPermissions,
                role: selectedRole
            });
            setNotification({ type: 'success', msg: '✅ Permissions saved successfully!' });
        } catch (err) {
            setNotification({ type: 'error', msg: '❌ Failed to save permissions' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ maxWidth: '980px', margin: '0 auto', fontFamily: 'Segoe UI, Roboto, sans-serif', color: '#1e293b' }}>
            
            {/* Top Bar Card */}
            <div style={{
                background: '#ffffff',
                padding: '16px 24px',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
                gap: '15px'
            }}>
                <div style={{ flex: 1, maxWidth: '400px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        SELECT STAFF / DRIVER:
                    </label>
                    <select
                        value={selectedUserId}
                        onChange={handleUserSelect}
                        style={{
                            width: '100%',
                            padding: '10px 14px',
                            marginTop: '4px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#334155',
                            outline: 'none',
                            background: '#f8fafc'
                        }}
                    >
                        <option value="">-- Choose Staff Member --</option>
                        {users.map(u => (
                            <option key={u._id} value={u._id}>
                                {u.name} ({u.phone}) - Current Role: {u.role}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>
                        <span style={{ color: '#0284c7', fontSize: '16px' }}>{selectedPermissions.length}</span> Permissions Allowed
                    </span>

                    <button
                        onClick={handleSave}
                        disabled={saving || !selectedUserId}
                        style={{
                            background: '#0f172a',
                            color: '#fbbf24',
                            border: 'none',
                            padding: '12px 28px',
                            borderRadius: '10px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            cursor: (!selectedUserId || saving) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(15,23,42,0.15)'
                        }}
                    >
                        💾 {saving ? 'Saving...' : 'SAVE'}
                    </button>
                </div>
            </div>

            {/* Notification Alert */}
            {notification.msg && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    marginBottom: '16px',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    textAlign: 'center',
                    background: notification.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: notification.type === 'success' ? '#15803d' : '#b91c1c',
                    border: `1px solid ${notification.type === 'success' ? '#bbf7d0' : '#fca5a5'}`
                }}>
                    {notification.msg}
                </div>
            )}

            {/* Permission Module Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {WATER_SYSTEM_MODULES.map((module) => {
                    const moduleKeys = module.permissions.map(p => p.key);
                    const isAllModuleEnabled = selectedUserId && moduleKeys.every(k => selectedPermissions.includes(k));

                    return (
                        <div
                            key={module.id}
                            style={{
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '16px',
                                padding: '20px 24px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                            }}
                        >
                            {/* Card Header with Enable All */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                                <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: '700' }}>
                                    {module.title}
                                </h4>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', letterSpacing: '0.5px' }}>ENABLE ALL</span>
                                    <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px' }}>
                                        <input
                                            type="checkbox"
                                            checked={!!isAllModuleEnabled}
                                            onChange={() => handleToggleModuleAll(module)}
                                            disabled={!selectedUserId}
                                            style={{ opacity: 0, width: 0, height: 0 }}
                                        />
                                        <span style={{
                                            position: 'absolute',
                                            cursor: selectedUserId ? 'pointer' : 'not-allowed',
                                            top: 0, left: 0, right: 0, bottom: 0,
                                            backgroundColor: isAllModuleEnabled ? '#0284c7' : '#cbd5e1',
                                            borderRadius: '22px',
                                            transition: '0.3s'
                                        }}>
                                            <span style={{
                                                position: 'absolute',
                                                content: '""',
                                                height: '16px',
                                                width: '16px',
                                                left: isAllModuleEnabled ? '20px' : '3px',
                                                bottom: '3px',
                                                backgroundColor: 'white',
                                                borderRadius: '50%',
                                                transition: '0.3s'
                                            }}></span>
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Sub-Permission Toggles Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '14px 24px' }}>
                                {module.permissions.map((perm) => {
                                    const isChecked = selectedPermissions.includes(perm.key);
                                    return (
                                        <div
                                            key={perm.key}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '10px 14px',
                                                background: isChecked ? '#f0f9ff' : '#f8fafc',
                                                borderRadius: '10px',
                                                border: `1px solid ${isChecked ? '#bae6fd' : '#e2e8f0'}`
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '13px', opacity: isChecked ? 1 : 0.4 }}>🔒</span>
                                                <span style={{ fontSize: '13px', fontWeight: '600', color: isChecked ? '#0369a1' : '#475569' }}>
                                                    {perm.label}
                                                </span>
                                            </div>

                                            <label style={{ position: 'relative', display: 'inline-block', width: '38px', height: '20px', flexShrink: 0 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleTogglePermission(perm.key)}
                                                    disabled={!selectedUserId}
                                                    style={{ opacity: 0, width: 0, height: 0 }}
                                                />
                                                <span style={{
                                                    position: 'absolute',
                                                    cursor: selectedUserId ? 'pointer' : 'not-allowed',
                                                    top: 0, left: 0, right: 0, bottom: 0,
                                                    backgroundColor: isChecked ? '#0284c7' : '#cbd5e1',
                                                    borderRadius: '20px',
                                                    transition: '0.3s'
                                                }}>
                                                    <span style={{
                                                        position: 'absolute',
                                                        height: '14px',
                                                        width: '14px',
                                                        left: isChecked ? '20px' : '3px',
                                                        bottom: '3px',
                                                        backgroundColor: 'white',
                                                        borderRadius: '50%',
                                                        transition: '0.3s'
                                                    }}></span>
                                                </span>
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RoleManagement;