'use client'

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import SignOutConfirmModal from "./SignOutConfirmModal"
import type { User } from '@supabase/supabase-js'

export default function AuthButton({ user }: { user: User | null }) {
    const router = useRouter()
    const supabase = createClient()
    const pathname = usePathname()
    const [showConfirm, setShowConfirm] = useState(false)

    const handleLogout = async () => {
        await supabase.auth.signOut()
        setShowConfirm(false)
        router.refresh()
    }

    // Hide "Sign In" when already on login page
    if (!user) {
        if (pathname === '/login') return null
        return (
            <Link
                href="/login"
                style={{
                    background: 'var(--accent)',
                    color: '#000',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '8px 18px',
                    borderRadius: '999px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 0 12px rgba(225,178,69,0.15)',
                    transition: 'filter 0.2s',
                    whiteSpace: 'nowrap' as const,
                }}
            >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>login</span>
                Sign In
            </Link>
        )
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
                fontSize: '12px',
                color: '#666',
            }}>{user.email}</span>
            <button
                onClick={() => setShowConfirm(true)}
                style={{
                    background: 'none',
                    border: 'none',
                    color: '#999',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    transition: 'color 0.2s',
                }}
            >
                Sign Out
            </button>

            <SignOutConfirmModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleLogout}
            />
        </div>
    )
}
