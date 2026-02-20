"use client";

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface TopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail?: string;
}

const PACKAGES = [
    { price: 10000, credits: 100, label: 'Starter Pack' },
    { price: 25000, credits: 250, label: 'Pro Pack' },
    { price: 50000, credits: 500, label: 'Elite Pack' },
    { price: 100000, credits: 1000, label: 'Ultra Pack' },
];

export default function TopUpModal({ isOpen, onClose, userEmail }: TopUpModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleTopUp = async (amount: number) => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/duitku/topup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: amount,
                    // paymentMethod omitted to allow Open Payment (User selects on Duitku)
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to initiate payment');
            }

            if (data.reference) {
                // Use Duitku "Pop" Embedded Checkout
                // @ts-ignore
                if (typeof checkout !== 'undefined') {
                    console.log('Opening Duitku Pop:', data.reference);
                    // @ts-ignore
                    checkout.process(data.reference, {
                        action: 'payment',
                        successEvent: function (result: any) {
                            console.log('Success:', result);
                            onClose();
                            alert('Payment Successful!');
                            window.location.reload(); // Refresh to update credits
                        },
                        pendingEvent: function (result: any) {
                            console.log('Pending:', result);
                            onClose();
                            alert('Payment Pending. Please complete payment.');
                        },
                        errorEvent: function (result: any) {
                            console.log('Error:', result);
                            alert('Payment Failed');
                        },
                        closeEvent: function (result: any) {
                            console.log('Customer closed the popup');
                        }
                    });
                } else {
                    // Fallback if script not loaded
                    console.warn('Duitku script missing, redirecting...');
                    window.location.href = data.paymentUrl;
                }
            } else {
                throw new Error('No payment reference received');
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }} onClick={onClose}>
            <div style={{
                background: '#111',
                border: '1px solid #333',
                borderRadius: '16px',
                padding: '24px',
                width: '100%',
                maxWidth: '400px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#fff', margin: 0 }}>Top Up Credits</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {error && (
                    <div style={{
                        padding: '10px',
                        background: 'rgba(255,0,0,0.1)',
                        border: '1px solid rgba(255,0,0,0.2)',
                        color: '#ff4444',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        fontSize: '13px'
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {PACKAGES.map((pkg) => (
                        <button
                            key={pkg.price}
                            onClick={() => handleTopUp(pkg.price)}
                            disabled={loading}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '16px',
                                background: '#1a1a1a',
                                border: '1px solid #333',
                                borderRadius: '12px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                color: '#fff',
                                opacity: loading ? 0.6 : 1
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = 'var(--accent)';
                                e.currentTarget.style.background = '#222';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = '#333';
                                e.currentTarget.style.background = '#1a1a1a';
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <span style={{ fontWeight: 600, fontSize: '15px' }}>{pkg.credits} Credits</span>
                                <span style={{ fontSize: '12px', color: '#888' }}>{pkg.label}</span>
                            </div>
                            <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                                Rp {pkg.price.toLocaleString('id-ID')}
                            </span>
                        </button>
                    ))}
                </div>

                <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
                    Secure payment by Duitku
                </div>
            </div>
        </div>
    );
}
