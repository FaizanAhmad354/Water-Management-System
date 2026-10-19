import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QrScanner = ({ onScanSuccess }) => {
    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                rememberLastUsedCamera: true
            },
            false
        );

        scanner.render(
            (decodedText) => {
                scanner.clear(); // Scan hote hi camera band kar do
                onScanSuccess(decodedText);
            },
            (error) => {
                // Scanning errors ko ignore karo (frame-by-frame normal hota hai)
            }
        );

        return () => {
            scanner.clear().catch((err) => console.error("Scanner clear error", err));
        };
    }, [onScanSuccess]);

    return (
        <div style={{
            background: '#ffffff',
            border: '2px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px',
            marginTop: '15px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
        }}>
            {/* CSS to override default ugly html5-qrcode styles */}
            <style>{`
                #reader {
                    border: none !important;
                }
                #reader__dashboard_section_csr span, 
                #reader__dashboard_section_swaplink {
                    color: #475569 !important;
                    font-family: system-ui, -apple-system, sans-serif !important;
                    font-size: 13px !important;
                    text-decoration: none !important;
                }
                #reader button {
                    background-color: #0284c7 !important;
                    color: #ffffff !important;
                    border: none !important;
                    padding: 8px 16px !important;
                    border-radius: 8px !important;
                    font-weight: bold !important;
                    cursor: pointer !important;
                    margin: 6px !important;
                    font-family: system-ui, -apple-system, sans-serif !important;
                    transition: background-color 0.2s !important;
                }
                #reader button:hover {
                    background-color: #0369a1 !important;
                }
                #reader select {
                    padding: 8px !important;
                    border-radius: 8px !important;
                    border: 1px solid #cbd5e1 !important;
                    margin: 6px !important;
                    font-family: system-ui, -apple-system, sans-serif !important;
                    color: #0f172a !important;
                    font-weight: 600 !important;
                }
                #reader__scan_region {
                    background: #f8fafc !important;
                    border-radius: 12px !important;
                    overflow: hidden !important;
                }
            `}</style>

            <h4 style={{ margin: '0 0 12px 0', color: '#0f172a', textAlign: 'center', fontSize: '14px' }}>
                Align QR Code within the frame
            </h4>
            
            <div id="reader" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden' }}></div>
        </div>
    );
};

export default QrScanner;