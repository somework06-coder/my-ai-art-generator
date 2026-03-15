'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Category, TwoUsers, Wallet, Buy, Logout } from "react-iconly";
import { createClient } from "@/lib/supabase/client";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();

    const navItems = [
        { href: "/admin", label: "Overview", icon: <Category set="bulk" size="small" /> },
        { href: "/admin/users", label: "Users", icon: <TwoUsers set="bulk" size="small" /> },
        { href: "/admin/transactions", label: "Transactions", icon: <Wallet set="bulk" size="small" /> },
        { href: "/admin/orders", label: "Orders", icon: <Buy set="bulk" size="small" /> },
    ];

    const handleSignOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/10 bg-black/50 p-6 flex flex-col">
                <div className="mb-8 px-2">
                    <span className="text-xl font-bold tracking-tight">Mossion Admin</span>
                </div>

                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
                                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                {item.icon}
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-auto pt-6 border-t border-white/10">
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                        <Logout set="bold" size="small" primaryColor="#f87171" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
