'use client';

import { useState, useEffect } from "react";
import { Search, MoreSquare, Edit, CloseSquare, Message } from "react-iconly";
import { formatDistanceToNow } from "date-fns";

interface Profile {
    id: string;
    full_name: string | null;
    email: string;
    credits: number | null;
    created_at: string | null;
}

export default function AdminUsersPage() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal state
    const [editingUser, setEditingUser] = useState<Profile | null>(null);
    const [editCredits, setEditCredits] = useState<number>(0);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to fetch users');

            setProfiles(data.users || []);
            setFilteredProfiles(data.users || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    // Handle search filtering
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredProfiles(profiles);
            return;
        }

        const lowerQuery = searchQuery.toLowerCase();
        const filtered = profiles.filter(
            (p) =>
                p.full_name?.toLowerCase().includes(lowerQuery) ||
                p.email?.toLowerCase().includes(lowerQuery) ||
                p.id.toLowerCase().includes(lowerQuery)
        );
        setFilteredProfiles(filtered);
    }, [searchQuery, profiles]);

    const handleSaveCredits = async () => {
        if (!editingUser) return;
        setSaving(true);

        try {
            const res = await fetch(`/api/admin/users/${editingUser.id}/credits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credits: Number(editCredits) })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to update credits');

            // Update local state
            const updatedProfiles = profiles.map(p =>
                p.id === editingUser.id ? { ...p, credits: Number(editCredits) } : p
            );
            setProfiles(updatedProfiles);
            setEditingUser(null);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (error) {
        return <div className="text-red-400 p-6 glass-card">Failed to load users: {error}</div>;
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Users Directory</h1>
                    <p className="text-white/60">Manage your {profiles.length} registered users across Mossion.</p>
                </div>

                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                        <Search set="light" size="small" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search email, name or ID..."
                        className="w-full md:w-80 bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-colors"
                    />
                </div>
            </div>

            <div className="glass-card border-white/10 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-white/40">Loading users...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-black/40 text-sm font-medium text-white/50">
                                    <th className="p-4 pl-6">User / Email</th>
                                    <th className="p-4">User ID</th>
                                    <th className="p-4">Credits</th>
                                    <th className="p-4">Joined</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right pr-6">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {filteredProfiles.map((profile) => (
                                    <tr key={profile.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E1B245]/20 to-purple-500/20 flex items-center justify-center font-bold text-[#E1B245]">
                                                    {profile.full_name?.charAt(0) || profile.email?.charAt(0).toUpperCase() || '?'}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-white/90">
                                                        {profile.full_name || 'Anonymous User'}
                                                    </div>
                                                    <div className="text-white/50 text-xs flex items-center gap-1 mt-0.5">
                                                        <span className="opacity-70"><Message set="light" size="small" /></span>
                                                        {profile.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-white/70 font-mono text-xs">
                                            {profile.id.substring(0, 8)}...
                                        </td>
                                        <td className="p-4">
                                            <span className="font-bold text-white/90 bg-white/10 px-2 py-1 rounded">
                                                {profile.credits?.toLocaleString() || 0}
                                            </span>
                                        </td>
                                        <td className="p-4 text-white/60">
                                            {profile.created_at ? formatDistanceToNow(new Date(profile.created_at), { addSuffix: true }) : 'Unknown'}
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                Active
                                            </span>
                                        </td>
                                        <td className="p-4 pr-6 text-right">
                                            <button
                                                onClick={() => {
                                                    setEditingUser(profile);
                                                    setEditCredits(profile.credits || 0);
                                                }}
                                                className="p-2 text-[#E1B245] bg-[#E1B245]/10 hover:bg-[#E1B245]/20 rounded-lg transition-colors border border-[#E1B245]/20 opacity-0 group-hover:opacity-100"
                                                title="Edit Credits (Giveaway)"
                                            >
                                                <Edit set="bulk" size="small" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {filteredProfiles.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-white/40">
                                            No users found matching "{searchQuery}".
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Credits Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="glass-card max-w-sm w-full p-6 border-white/10 shadow-2xl relative">
                        <button
                            onClick={() => setEditingUser(null)}
                            className="absolute top-4 right-4 text-white/40 hover:text-white"
                        >
                            <CloseSquare set="light" size="medium" />
                        </button>

                        <h3 className="text-xl font-bold mb-1">Edit User Credits</h3>
                        <p className="text-white/60 text-sm mb-6">Modify credits for {editingUser.full_name || editingUser.email}</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">Credit Balance</label>
                                <input
                                    type="number"
                                    value={editCredits}
                                    onChange={(e) => setEditCredits(e.target.value ? parseInt(e.target.value) : 0)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#E1B245]/50 focus:bg-white/5 transition-colors text-xl font-mono text-center"
                                />
                            </div>

                            <button
                                onClick={handleSaveCredits}
                                disabled={saving}
                                className="w-full bg-[#E1B245] hover:bg-[#F2C96C] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl transition-all shadow-[0_4px_14px_rgba(225,178,69,0.3)]"
                            >
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
