"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import TopUpModal from './TopUpModal';

export default function CreditBalance() {
    const [credits, setCredits] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [supabase] = useState(() => createClient());

    useEffect(() => {
        fetchCredits();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchCredits();
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchCredits = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('credits')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error('Error fetching credits:', error);
                    setCredits(0); // Fallback to 0 so UI doesn't hang
                } else if (data) {
                    setCredits(data.credits);
                } else {
                    console.log('No profile data found');
                    setCredits(0); // Fallback
                }
            }
        } catch (err) {
            console.error('Unexpected error in fetchCredits:', err);
            setCredits(0); // Fallback
        }
    };

    return (
        <>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginRight: '10px'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#fff',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '6px 12px',
                    borderRadius: '50px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--accent)' }}>
                        bolt
                    </span>
                    <span>{credits !== null ? credits : 0}</span>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    style={{
                        background: 'var(--accent)',
                        color: '#000',
                        border: 'none',
                        borderRadius: '50px',
                        padding: '6px 16px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                    Top Up
                </button>
            </div>

            <TopUpModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
}
