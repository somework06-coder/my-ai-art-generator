import React from 'react';
import Link from 'next/link';

interface AuthGateModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AuthGateModal({ isOpen, onClose }: AuthGateModalProps) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                position: 'relative',
                width: '90%',
                maxWidth: '420px',
                background: 'rgba(20,20,20,0.85)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '24px',
                padding: '40px 32px',
                textAlign: 'center',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)',
                animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'transparent',
                        border: 'none',
                        color: '#666',
                        cursor: 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#666';
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                </button>

                {/* Icon */}
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    boxShadow: '0 0 30px rgba(225,178,69,0.15)',
                }}>
                    <img
                        src="/mossion logo.jpg"
                        alt="Mossion Logo"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>

                {/* Text Content */}
                <h2 style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#fff',
                    marginBottom: '12px',
                    letterSpacing: '-0.5px'
                }}>Sign In Required</h2>

                <p style={{
                    fontSize: '15px',
                    color: '#999',
                    marginBottom: '32px',
                    lineHeight: 1.5
                }}>
                    Create a free account to unlock AI art generation and start creating stunning motion backgrounds.
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Link
                        href="/login?view=signup"
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'var(--accent)',
                            color: '#000',
                            fontWeight: 700,
                            fontSize: '15px',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 15px rgba(225,178,69,0.2)',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
                        Create Free Account
                    </Link>

                    <Link
                        href="/login"
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'rgba(255,255,255,0.05)',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '15px',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>login</span>
                        Sign In
                    </Link>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}} />
        </div>
    );
}
