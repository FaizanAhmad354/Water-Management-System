import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const QrDisplay = ({ order }) => {
    if (!order) return null;

    return (
        <div style={{
            background: 'linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%)',
            border: '2px dashed #0284c7',
            borderRadius: '16px',
            padding: '24px 20px',
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(2, 132, 199, 0.08)'
        }}>
            {/* Status & Header */}
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#dcfce7',
                color: '#15803d',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '700',
                marginBottom: '12px'
            }}>
                <span>●</span> Ready for Delivery ({order.status})
            </div>

            <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '16px', fontWeight: '800' }}>
                Show QR Code to Driver
            </h4>
            <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '12px' }}>
                Driver will scan this code to complete delivery.
            </p>

            {/* QR Code Canvas */}
            <div style={{
                padding: '14px',
                background: '#ffffff',
                display: 'inline-block',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)'
            }}>
                <QRCodeSVG value={order.qrCodeToken || ''} size={180} />
            </div>

            {/* OTP Fallback Card */}
            <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: '12px'
            }}>
                <span style={{ color: '#92400e', fontSize: '12px', fontWeight: '700', display: 'block' }}>
                    Camera not working? Tell Driver this 4-Digit PIN:
                </span>
                <h2 style={{
                    margin: '6px 0 0 0',
                    letterSpacing: '8px',
                    color: '#b45309',
                    fontSize: '28px',
                    fontWeight: '800',
                    fontFamily: 'monospace'
                }}>
                    {order.otp}
                </h2>
            </div>
        </div>
    );
};

export default QrDisplay;