'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Lock, Message, ChevronRight } from 'react-iconly';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError) {
            setError(signInError.message);
            setLoading(false);
            return;
        }

        // Checking admin status to guide routing
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', data.user.id)
            .single();

        if (profile?.is_admin) {
            router.push('/admin');
        } else {
            setError('Access denied. You do not have admin privileges.');
            await supabase.auth.signOut();
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#E1B245]/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md relative z-10 space-y-8">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto bg-white/5 border border-white/10 flex items-center justify-center rounded-2xl mb-6 shadow-[0_4px_20px_rgba(225,178,69,0.1)]">
                        <Lock set="bulk" size="medium" primaryColor="#E1B245" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Admin Portal</h1>
                    <p className="text-white/60">Sign in to manage Mossion.</p>
                </div>

                <form onSubmit={handleLogin} className="glass-card p-8 space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-xl">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70 block">Email Address</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                                    <Message set="light" size="small" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#E1B245]/50 focus:bg-white/5 transition-colors placeholder:text-white/20"
                                    placeholder="admin@mossion.app"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70 block">Password</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                                    <Lock set="light" size="small" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#E1B245]/50 focus:bg-white/5 transition-colors placeholder:text-white/20"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#E1B245] hover:bg-[#F2C96C] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(225,178,69,0.3)] hover:shadow-[0_6px_20px_rgba(225,178,69,0.4)]"
                    >
                        {loading ? 'Authenticating...' : (
                            <>
                                Sign In <ChevronRight set="bold" size="small" />
                            </>
                        )}
                    </button>
                </form>

                <p className="text-center text-xs text-white/40">
                    This portal is restricted to Mossion administrators only.
                </p>
            </div>
        </div>
    );
}
