'use client';

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus, Document, TickSquare, TimeCircle, CloseSquare, Search } from "react-iconly";

interface Order {
    id: string;
    user_id: string;
    pack_name: string;
    credits: number;
    amount_idr: number;
    status: string;
    payment_method: string | null;
    created_at: string;
    profiles?: { full_name: string | null };
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'paid':
            return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><TickSquare set="bold" size="small" primaryColor="#34d399" /> Paid</span>;
        case 'pending':
            return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"><TimeCircle set="bold" size="small" primaryColor="#fbbf24" /> Pending</span>;
        case 'failed':
        case 'expired':
            return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20"><CloseSquare set="bold" size="small" primaryColor="#f87171" /> Failed</span>;
        default:
            return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white/10 text-white/70 border border-white/20">{status}</span>;
    }
}

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [tableNotReady, setTableNotReady] = useState(false);

    useEffect(() => {
        async function fetchOrders() {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('topup_orders')
                .select(`*, profiles ( full_name )`)
                .order('created_at', { ascending: false });

            if (error) {
                setTableNotReady(true);
            } else {
                setOrders((data as Order[]) || []);
                setFilteredOrders((data as Order[]) || []);
            }
            setLoading(false);
        }
        fetchOrders();
    }, []);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredOrders(orders);
            return;
        }

        const lowerQuery = searchQuery.toLowerCase();
        const filtered = orders.filter(
            (o) =>
                o.id.toLowerCase().includes(lowerQuery) ||
                o.profiles?.full_name?.toLowerCase().includes(lowerQuery) ||
                o.pack_name.toLowerCase().includes(lowerQuery)
        );
        setFilteredOrders(filtered);
    }, [searchQuery, orders]);

    const exportToCSV = () => {
        const headers = ['Order ID,Date,User Name,Pack,Amount,Method,Status'];
        const csvRows = filteredOrders.map(o => {
            const date = format(new Date(o.created_at), "yyyy-MM-dd HH:mm:ss");
            const name = o.profiles?.full_name?.replace(/,/g, '') || 'Anonymous';
            return `"${o.id}","${date}","${name}","${o.pack_name}",${o.amount_idr},"${o.payment_method || 'Manual'}","${o.status}"`;
        });

        const csvString = [headers.join('\n'), ...csvRows].join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mossion-orders-${format(new Date(), "yyyyMMdd-HHmmss")}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Top-Up Orders</h1>
                    <p className="text-white/60">Manage credit purchases and manual top-ups.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                            <Search set="light" size="small" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter orders..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-colors"
                        />
                    </div>
                    <button
                        onClick={exportToCSV}
                        disabled={filteredOrders.length === 0}
                        className="flex items-center gap-2 px-4 py-2 glass-card border-white/10 hover:bg-white/10 disabled:opacity-50 transition-colors rounded-xl text-sm font-medium"
                    >
                        <Document set="bold" size="small" />
                        Export
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E1B245] to-[#F2C96C] text-black hover:opacity-90 transition-opacity rounded-xl text-sm font-bold shadow-lg shadow-[#E1B245]/20">
                        <Plus set="bold" size="small" />
                        Manual Top-Up
                    </button>
                </div>
            </div>

            {tableNotReady && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-xl text-sm mb-6">
                    Notice: The topup_orders table has not been created yet. Please run the <code className="bg-black/50 px-1 rounded">phase_b_mossion_web_schema.sql</code> migration in Supabase.
                </div>
            )}

            <div className="glass-card border-white/10 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-white/40">Loading orders...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-black/40 text-sm font-medium text-white/50">
                                    <th className="p-4 pl-6 min-w-[200px]">Order ID</th>
                                    <th className="p-4 min-w-[150px]">Date</th>
                                    <th className="p-4 min-w-[150px]">User</th>
                                    <th className="p-4">Pack</th>
                                    <th className="p-4 min-w-[120px]">Amount</th>
                                    <th className="p-4">Method</th>
                                    <th className="p-4 text-right pr-6">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4 pl-6 text-white/70 font-mono text-xs truncate max-w-[200px]">
                                            {order.id}
                                        </td>
                                        <td className="p-4 text-white/60">
                                            {format(new Date(order.created_at), "MMM d, yyyy HH:mm")}
                                        </td>
                                        <td className="p-4 font-medium text-white/90">
                                            {order.profiles?.full_name || 'Anonymous User'}
                                        </td>
                                        <td className="p-4">
                                            <span className="capitalize bg-purple-500/10 text-purple-400 px-2.5 py-1 rounded font-medium text-xs">
                                                {order.pack_name} ({order.credits} cr)
                                            </span>
                                        </td>
                                        <td className="p-4 font-bold">
                                            Rp {order.amount_idr?.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-white/60 capitalize">
                                            {order.payment_method || 'Manual'}
                                        </td>
                                        <td className="p-4 text-right pr-6">
                                            <StatusBadge status={order.status} />
                                        </td>
                                    </tr>
                                ))}

                                {filteredOrders.length === 0 && !tableNotReady && (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-white/40">
                                            No orders found matching "{searchQuery}".
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
