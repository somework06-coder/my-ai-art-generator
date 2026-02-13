'use client'

import { login, signup } from './actions'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function LoginPage() {
    const searchParams = useSearchParams()
    const message = searchParams.get('message') ?? undefined
    const error = searchParams.get('error') ?? undefined
    const view = searchParams.get('view') ?? 'login'
    const isLogin = view !== 'signup'

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#050505',
                padding: '80px 16px 48px',
                fontFamily: "'Inter', sans-serif",
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Focus style injection */}
            <style>{`
                .login-input:focus {
                    border-color: var(--accent) !important;
                    box-shadow: 0 0 0 2px rgba(225,178,69,0.15) !important;
                    outline: none;
                }
                .login-input::placeholder { color: #555; }
                .login-btn:hover { filter: brightness(1.1); transform: scale(1.01); }
                .login-btn:active { transform: scale(0.99); }
                .forgot-link:hover { color: var(--accent) !important; }
                .toggle-link:hover { color: var(--accent) !important; }
            `}</style>

            {/* Subtle background glow */}
            <div style={{
                position: 'absolute', top: '25%', left: '30%',
                width: '40vw', height: '40vw',
                background: 'var(--accent)', borderRadius: '50%',
                filter: 'blur(250px)', opacity: 0.04,
                pointerEvents: 'none',
            }} />

            {/* Auth Card */}
            <div
                style={{
                    width: '100%',
                    maxWidth: '420px',
                    background: '#0A0A0A',
                    border: '1px solid #262626',
                    borderRadius: '20px',
                    padding: '40px 32px 32px',
                    position: 'relative',
                    zIndex: 10,
                    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                }}
            >
                {/* Brand Header - Centered */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '56px', height: '56px',
                        borderRadius: '16px',
                        background: 'var(--accent)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 20px rgba(225,178,69,0.2)',
                        marginBottom: '20px',
                    }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#000' }}>brush</span>
                    </div>
                    <h1 style={{
                        fontSize: '22px', fontWeight: 700, color: '#fff',
                        margin: '0 0 6px', letterSpacing: '-0.3px',
                    }}>
                        {isLogin ? 'Welcome Back' : 'Join Motion Studio'}
                    </h1>
                    <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                        {isLogin ? 'Sign in to access your creative workspace' : 'Start creating stunning AI motion backgrounds'}
                    </p>
                </div>

                <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Messages */}
                    {message && (
                        <div style={{
                            padding: '12px 16px', fontSize: '13px', color: '#34d399',
                            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                            borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px',
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                            {message}
                        </div>
                    )}
                    {error && (
                        <div style={{
                            padding: '12px 16px', fontSize: '13px', color: '#f87171',
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px',
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
                            {error}
                        </div>
                    )}

                    {/* Input Fields */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Email */}
                        <div>
                            <label style={{
                                display: 'block', fontSize: '11px', fontWeight: 700,
                                textTransform: 'uppercase' as const, letterSpacing: '1px',
                                color: '#777', marginBottom: '8px', paddingLeft: '2px',
                            }}>
                                Email Address
                            </label>
                            <div style={{ position: 'relative' }}>
                                <span className="material-symbols-outlined" style={{
                                    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                                    fontSize: '20px', color: '#555', pointerEvents: 'none',
                                }}>mail</span>
                                <input
                                    className="login-input"
                                    name="email"
                                    placeholder="name@example.com"
                                    required
                                    autoComplete="email"
                                    style={{
                                        width: '100%', padding: '14px 16px 14px 46px',
                                        background: '#161616', border: '1px solid #333',
                                        borderRadius: '12px', fontSize: '15px', color: '#fff',
                                        outline: 'none', boxSizing: 'border-box' as const,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label style={{
                                display: 'block', fontSize: '11px', fontWeight: 700,
                                textTransform: 'uppercase' as const, letterSpacing: '1px',
                                color: '#777', marginBottom: '8px', paddingLeft: '2px',
                            }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <span className="material-symbols-outlined" style={{
                                    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                                    fontSize: '20px', color: '#555', pointerEvents: 'none',
                                }}>lock</span>
                                <input
                                    className="login-input"
                                    type="password"
                                    name="password"
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                    style={{
                                        width: '100%', padding: '14px 16px 14px 46px',
                                        background: '#161616', border: '1px solid #333',
                                        borderRadius: '12px', fontSize: '15px', color: '#fff',
                                        outline: 'none', boxSizing: 'border-box' as const,
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Forgot Password */}
                    {isLogin && (
                        <div style={{ textAlign: 'right' }}>
                            <Link href="/forgot-password" className="forgot-link" style={{
                                fontSize: '12px', color: '#888', textDecoration: 'none',
                            }}>
                                Forgot Password?
                            </Link>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        className="login-btn"
                        formAction={isLogin ? login : signup}
                        style={{
                            width: '100%', padding: '14px',
                            background: 'var(--accent)', color: '#000',
                            border: 'none', borderRadius: '12px',
                            fontSize: '14px', fontWeight: 700,
                            textTransform: 'uppercase' as const, letterSpacing: '0.5px',
                            cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', gap: '8px',
                            boxShadow: '0 4px 12px rgba(225,178,69,0.2)',
                            transition: 'filter 0.2s, transform 0.1s',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                            {isLogin ? 'login' : 'person_add'}
                        </span>
                        {isLogin ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                {/* Divider + Toggle */}
                <div style={{
                    marginTop: '28px', paddingTop: '20px',
                    borderTop: '1px solid #262626', textAlign: 'center',
                }}>
                    <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                        {isLogin ? 'New here? ' : 'Already have an account? '}
                        <Link
                            href={isLogin ? '/login?view=signup' : '/login'}
                            className="toggle-link"
                            style={{
                                color: '#fff', fontWeight: 600,
                                textDecoration: 'none', marginLeft: '4px',
                            }}
                        >
                            {isLogin ? 'Create an account' : 'Sign In'}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
