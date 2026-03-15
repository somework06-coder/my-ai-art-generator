'use client';

import { TwoUsers, Video, Wallet, Chart } from "react-iconly";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";

export default function AdminDashboard() {
    const [stats, setStats] = useState([
        { title: "Total Users", value: "—", icon: <TwoUsers set="bulk" size="small" primaryColor="#60a5fa" /> },
        { title: "Art Generated", value: "—", icon: <Video set="bulk" size="small" primaryColor="#c084fc" /> },
        { title: "Active Credits", value: "—", icon: <Wallet set="bulk" size="small" primaryColor="#fbbf24" /> },
        { title: "Total Revenue", value: "Rp 0", icon: <Chart set="bulk" size="small" primaryColor="#34d399" /> },
    ]);

    const [recentUsers, setRecentUsers] = useState<any[]>([]);
    const [recentArtworks, setRecentArtworks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            const supabase = createClient();

            // Fetch Stats
            const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_admin', false);
            const { count: artCount } = await supabase.from('artworks').select('*', { count: 'exact', head: true });
            const { data: profiles } = await supabase.from('profiles').select('credits').eq('is_admin', false);

            // Total Revenue - from topup_orders where status is 'paid'
            const { data: orders } = await supabase.from('topup_orders').select('amount_idr').eq('status', 'paid');
            const totalRevenue = orders?.reduce((acc, curr) => acc + (curr.amount_idr || 0), 0) || 0;

            const totalCredits = profiles?.reduce((acc, curr) => acc + (curr.credits || 0), 0) || 0;

            setStats([
                { title: "Total Users", value: String(userCount || 0), icon: <TwoUsers set="bulk" size="small" primaryColor="#60a5fa" /> },
                { title: "Art Generated", value: String(artCount || 0), icon: <Video set="bulk" size="small" primaryColor="#c084fc" /> },
                { title: "Active Credits", value: totalCredits.toLocaleString(), icon: <Wallet set="bulk" size="small" primaryColor="#fbbf24" /> },
                { title: "Total Revenue", value: `Rp ${totalRevenue.toLocaleString()}`, icon: <Chart set="bulk" size="small" primaryColor="#34d399" /> },
            ]);

            // Fetch Recent Users
            const { data: users } = await supabase
                .from('profiles')
                .select('*')
                .eq('is_admin', false)
                .order('created_at', { ascending: false })
                .limit(5);
            setRecentUsers(users || []);

            // Fetch Recent Artworks
            const { data: artworks } = await supabase
                .from('artworks')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);
            setRecentArtworks(artworks || []);

            setLoading(false);
        }
        fetchData();
    }, []);

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
                <p className="text-white/60">Welcome back. Here is what is happening with Mossion today.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="glass-card p-6 border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-white/60">{stat.title}</h3>
                            <div className="p-2 glass-card rounded-lg">{stat.icon}</div>
                        </div>
                        <div className="text-3xl font-bold">{stat.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
                {/* Recent Users */}
                <div className="glass-card border-white/10 flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                        <h3 className="text-lg font-bold">Recent Users</h3>
                    </div>
                    {loading ? (
                        <div className="p-8 text-center text-white/40">Loading...</div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {recentUsers.length === 0 ? (
                                <div className="p-8 text-center text-white/40">No users found.</div>
                            ) : (
                                recentUsers.map(user => (
                                    <div key={user.id} className="p-4 px-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center font-bold text-purple-300">
                                                {user.full_name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <div className="font-medium">{user.full_name || 'Anonymous'}</div>
                                                <div className="text-xs text-white/40">{user.id.substring(0, 8)}...</div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-white/50 text-right">
                                            <div>{user.credits} credits</div>
                                            <div>{formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Recent Generations */}
                <div className="glass-card border-white/10 flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                        <h3 className="text-lg font-bold">Recent Generations</h3>
                    </div>
                    {loading ? (
                        <div className="p-8 text-center text-white/40">Loading...</div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {recentArtworks.length === 0 ? (
                                <div className="p-8 text-center text-white/40">No artworks generated yet.</div>
                            ) : (
                                recentArtworks.map(art => (
                                    <div key={art.id} className="p-4 px-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                                {art.thumbnail_url ? (
                                                    <img src={art.thumbnail_url} alt="Thumbnail" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="opacity-20"><Video set="light" size="small" /></div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium truncate max-w-[150px]">{art.prompt || 'Untiled Art'}</div>
                                                <div className="text-xs text-white/40 uppercase">{art.resolution || 'UNKNOWN'}</div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-white/50 text-right">
                                            <span className="inline-block px-2 py-0.5 rounded bg-white/5 text-white/70 mb-1">{art.status}</span>
                                            <div>{formatDistanceToNow(new Date(art.created_at), { addSuffix: true })}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
