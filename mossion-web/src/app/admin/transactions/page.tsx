'use client';

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, Search, Document } from "react-iconly";

interface Transaction {
    id: string;
    user_id: string;
    amount: number;
    description: string;
    created_at: string;
    profiles?: { full_name: string | null };
}

export default function AdminTransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function fetchTransactions() {
            const supabase = createClient();
            const { data, error: err } = await supabase
                .from('credit_transactions')
                .select(`*, profiles ( full_name )`)
                .order('created_at', { ascending: false })
                .limit(100);

            if (err) {
                setError(err.message);
            } else {
                setTransactions((data as Transaction[]) || []);
                setFilteredTransactions((data as Transaction[]) || []);
            }
            setLoading(false);
        }
        fetchTransactions();
    }, []);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredTransactions(transactions);
            return;
        }

        const lowerQuery = searchQuery.toLowerCase();
        const filtered = transactions.filter(
            (tx) =>
                tx.description.toLowerCase().includes(lowerQuery) ||
                tx.user_id.toLowerCase().includes(lowerQuery) ||
                tx.profiles?.full_name?.toLowerCase().includes(lowerQuery)
        );
        setFilteredTransactions(filtered);
    }, [searchQuery, transactions]);

    const exportToCSV = () => {
        const headers = ['Order ID,Date,User Name,User ID,Amount,Description'];
        const csvRows = filteredTransactions.map(tx => {
            const date = format(new Date(tx.created_at), "yyyy-MM-dd HH:mm:ss");
            const name = tx.profiles?.full_name?.replace(/,/g, '') || 'Anonymous';
            const desc = tx.description.replace(/,/g, '');
            return `"${tx.id}","${date}","${name}","${tx.user_id}",${tx.amount},"${desc}"`;
        });

        const csvString = [headers.join('\n'), ...csvRows].join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mossion-transactions-${format(new Date(), "yyyyMMdd-HHmmss")}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (error) {
        return <div className="text-red-400 p-6 glass-card">Failed to load transactions: {error}</div>;
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Credit Transactions</h1>
                    <p className="text-white/60">Audit log of all credit deductions and top-ups.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={exportToCSV}
                        disabled={filteredTransactions.length === 0}
                        className="flex items-center gap-2 px-4 py-2 glass-card border-white/10 hover:bg-white/10 disabled:opacity-50 transition-colors rounded-xl text-sm font-medium"
                    >
                        <Document set="bold" size="small" />
                        Export CSV
                    </button>
                    <div className="relative flex-1 md:w-64">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                            <Search set="light" size="small" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter transactions..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-colors"
                        />
                    </div>
                </div>
            </div>

            <div className="glass-card border-white/10 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-white/40">Loading transactions...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-black/40 text-sm font-medium text-white/50">
                                    <th className="p-4 pl-6">Type</th>
                                    <th className="p-4">Amount</th>
                                    <th className="p-4">User</th>
                                    <th className="p-4">Description</th>
                                    <th className="p-4 text-right pr-6">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {filteredTransactions.map((tx) => {
                                    const isDeduction = tx.amount < 0;

                                    return (
                                        <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="p-4 pl-6">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDeduction
                                                    ? 'bg-amber-500/10'
                                                    : 'bg-emerald-500/10'
                                                    }`}>
                                                    {isDeduction
                                                        ? <ArrowDown set="bold" size="small" primaryColor="#f59e0b" />
                                                        : <ArrowUp set="bold" size="small" primaryColor="#10b981" />
                                                    }
                                                </div>
                                            </td>
                                            <td className="p-4 font-bold">
                                                <span className={isDeduction ? 'text-amber-500' : 'text-emerald-500'}>
                                                    {isDeduction ? tx.amount : `+${tx.amount}`}
                                                </span>
                                            </td>
                                            <td className="p-4 font-medium text-white/90">
                                                {tx.profiles?.full_name || 'Anonymous User'}
                                                <div className="text-xs text-white/40 font-normal">{tx.user_id.substring(0, 8)}...</div>
                                            </td>
                                            <td className="p-4 text-white/70 max-w-xs truncate">
                                                {tx.description}
                                            </td>
                                            <td className="p-4 text-right text-white/50 text-xs pr-6">
                                                {format(new Date(tx.created_at), "MMM d, yyyy HH:mm")}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredTransactions.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-white/40">
                                            No transactions found matching "{searchQuery}".
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
