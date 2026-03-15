'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

// ─── Password Strength Calculator ───
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: '#ef4444' };
    if (score <= 2) return { score: 2, label: 'Fair', color: '#f97316' };
    if (score <= 3) return { score: 3, label: 'Good', color: '#eab308' };
    if (score <= 4) return { score: 4, label: 'Strong', color: '#22c55e' };
    return { score: 5, label: 'Very Strong', color: '#10b981' };
}

// ─── Animated Shader Background (Simplified canvas animation) ───
function ShaderBackground() {
    useEffect(() => {
        const canvas = document.getElementById('auth-bg-canvas') as HTMLCanvasElement;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animId: number;
        let time = 0;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const draw = () => {
            time += 0.003;
            const w = canvas.width;
            const h = canvas.height;

            // Dark gradient base
            const grad = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.5, w * 0.7);
            grad.addColorStop(0, 'rgba(30, 20, 8, 0.15)');
            grad.addColorStop(0.5, 'rgba(10, 8, 5, 0.1)');
            grad.addColorStop(1, 'rgba(5, 5, 5, 0.05)');

            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            // Floating orbs
            for (let i = 0; i < 5; i++) {
                const x = w * (0.3 + 0.4 * Math.sin(time * 0.5 + i * 1.3));
                const y = h * (0.3 + 0.3 * Math.cos(time * 0.4 + i * 1.7));
                const r = 100 + 80 * Math.sin(time + i);

                const orbGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
                orbGrad.addColorStop(0, `rgba(225, 178, 69, ${0.04 + 0.02 * Math.sin(time + i)})`);
                orbGrad.addColorStop(1, 'rgba(225, 178, 69, 0)');

                ctx.fillStyle = orbGrad;
                ctx.fillRect(0, 0, w, h);
            }

            animId = requestAnimationFrame(draw);
        };
        draw();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            id="auth-bg-canvas"
            style={{
                position: 'fixed', inset: 0,
                width: '100%', height: '100%',
                zIndex: 0, pointerEvents: 'none',
            }}
        />
    );
}

// ─── Main Login Content ───
function LoginContent() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const urlMessage = searchParams.get('message') ?? undefined
    const urlError = searchParams.get('error') ?? undefined
    const view = searchParams.get('view') ?? 'login'
    const isLogin = view !== 'signup'

    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [localError, setLocalError] = useState<string | undefined>(urlError)
    const [localMessage, setLocalMessage] = useState<string | undefined>(urlMessage)

    const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setLocalError(undefined);
        setLocalMessage(undefined);

        const supabase = createClient();

        if (isLogin) {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                setLocalError(error.message);
                setLoading(false);
            } else {
                router.push('/');
            }
        } else {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName }
                }
            });
            if (error) {
                setLocalError(error.message);
            } else {
                // Also update the profiles table with the full name
                if (data.user) {
                    try {
                        await supabase
                            .from('profiles')
                            .update({ full_name: fullName })
                            .eq('id', data.user.id);
                    } catch (profileError) {
                        console.error('Failed to save profile name:', profileError);
                    }
                }
                setLocalMessage('Check your email to continue sign in process');
            }
            setLoading(false);
        }
    }

    const message = localMessage;
    const error = localError;

    return (
        <div
            key={view}
            style={{ animation: 'authFadeIn 0.4s ease-out' }}
        >
            {/* Brand Header - Centered */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{
                    width: '56px', height: '56px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 30px rgba(225,178,69,0.25)',
                    marginBottom: '20px',
                }}>
                    <img
                        src="/mossion logo.jpg"
                        alt="Mossion Logo"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>
                <h1 style={{
                    fontSize: '24px', fontWeight: 700, color: '#fff',
                    margin: '0 0 6px', letterSpacing: '-0.3px',
                }}>
                    {isLogin ? 'Welcome Back' : 'Join Mossion'}
                </h1>
                <p style={{ fontSize: '13px', color: '#777', margin: 0 }}>
                    {isLogin ? 'Sign in to access your creative workspace' : 'Start creating stunning AI generative art'}
                </p>
            </div>

            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                    {/* Full Name (Signup only) */}
                    {!isLogin && (
                        <div style={{ animation: 'authSlideDown 0.3s ease-out' }}>
                            <label style={{
                                display: 'block', fontSize: '11px', fontWeight: 700,
                                textTransform: 'uppercase' as const, letterSpacing: '1px',
                                color: '#777', marginBottom: '8px', paddingLeft: '2px',
                            }}>
                                Full Name
                            </label>
                            <div style={{ position: 'relative' }}>
                                <span className="material-symbols-outlined" style={{
                                    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                                    fontSize: '20px', color: '#555', pointerEvents: 'none',
                                }}>person</span>
                                <input
                                    className="login-input"
                                    name="fullName"
                                    type="text"
                                    placeholder="Your full name"
                                    required
                                    autoComplete="name"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    style={{
                                        width: '100%', padding: '14px 16px 14px 46px',
                                        background: '#161616', border: '1px solid #333',
                                        borderRadius: '12px', fontSize: '15px', color: '#fff',
                                        outline: 'none', boxSizing: 'border-box' as const,
                                    }}
                                />
                            </div>
                        </div>
                    )}

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
                                type="email"
                                placeholder="name@example.com"
                                required
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                placeholder="••••••••"
                                required
                                autoComplete={isLogin ? 'current-password' : 'new-password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{
                                    width: '100%', padding: '14px 46px 14px 46px',
                                    background: '#161616', border: '1px solid #333',
                                    borderRadius: '12px', fontSize: '15px', color: '#fff',
                                    outline: 'none', boxSizing: 'border-box' as const,
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                                tabIndex={-1}
                            >
                                <span className="material-symbols-outlined" style={{
                                    fontSize: '20px', color: '#666',
                                    transition: 'color 0.2s',
                                }}>
                                    {showPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>

                        {/* Password Strength Indicator (Signup only) */}
                        {!isLogin && password.length > 0 && (
                            <div style={{ marginTop: '10px', animation: 'authFadeIn 0.3s ease-out' }}>
                                <div style={{
                                    display: 'flex', gap: '4px', marginBottom: '6px',
                                }}>
                                    {[1, 2, 3, 4, 5].map((level) => (
                                        <div
                                            key={level}
                                            style={{
                                                flex: 1, height: '3px',
                                                borderRadius: '2px',
                                                background: level <= passwordStrength.score
                                                    ? passwordStrength.color
                                                    : 'rgba(255,255,255,0.1)',
                                                transition: 'background 0.3s ease',
                                            }}
                                        />
                                    ))}
                                </div>
                                <span style={{
                                    fontSize: '11px', fontWeight: 600,
                                    color: passwordStrength.color,
                                    transition: 'color 0.3s ease',
                                }}>
                                    {passwordStrength.label}
                                </span>
                            </div>
                        )}
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
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%', padding: '14px',
                        background: 'var(--accent)', color: '#000',
                        border: 'none', borderRadius: '12px',
                        fontSize: '14px', fontWeight: 700,
                        textTransform: 'uppercase' as const, letterSpacing: '0.5px',
                        cursor: loading ? 'not-allowed' : 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', gap: '8px',
                        boxShadow: '0 4px 15px rgba(225,178,69,0.3)',
                        transition: 'filter 0.2s, transform 0.1s',
                        opacity: loading ? 0.7 : 1,
                    }}
                >
                    {loading ? (
                        <span className="material-symbols-outlined animate-spin" style={{ fontSize: '20px' }}>
                            progress_activity
                        </span>
                    ) : (
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                            {isLogin ? 'login' : 'person_add'}
                        </span>
                    )}
                    {loading ? (isLogin ? 'Signing In...' : 'Creating Account...') : (isLogin ? 'Sign In' : 'Create Account')}
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
                            color: 'var(--accent)', fontWeight: 600,
                            textDecoration: 'none', marginLeft: '4px',
                        }}
                    >
                        {isLogin ? 'Create an account' : 'Sign In'}
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default function LoginPage() {
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
            {/* Animated Background */}
            <ShaderBackground />

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
                .toggle-link:hover { filter: brightness(1.2) !important; }

                @keyframes authFadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes authSlideDown {
                    from { opacity: 0; transform: translateY(-10px); max-height: 0; }
                    to { opacity: 1; transform: translateY(0); max-height: 120px; }
                }
            `}</style>

            {/* Auth Card */}
            <div
                style={{
                    width: '100%',
                    maxWidth: '420px',
                    background: 'rgba(10, 10, 10, 0.85)',
                    backdropFilter: 'blur(40px)',
                    WebkitBackdropFilter: 'blur(40px)',
                    border: '1px solid rgba(225, 178, 69, 0.1)',
                    borderRadius: '24px',
                    padding: '40px 32px 32px',
                    position: 'relative',
                    zIndex: 10,
                    boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 80px rgba(225,178,69,0.03)',
                }}
            >
                <Suspense fallback={<div style={{ color: '#fff', textAlign: 'center' }}>Loading...</div>}>
                    <LoginContent />
                </Suspense>
            </div>
        </div>
    )
}
