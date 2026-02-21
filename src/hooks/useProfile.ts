'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export type UserProfile = {
    id: string;
    render_tier: 'regular' | 'super';
    credits: number;
    // ...other fields if needed
};

export function useProfile() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [supabase] = useState(() => createClient());

    useEffect(() => {
        let isMounted = true;

        async function fetchProfile() {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    if (isMounted) setProfile(null);
                    return;
                }

                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;
                if (isMounted) setProfile(data as UserProfile);
            } catch (err) {
                console.error("Error fetching profile:", err);
                if (isMounted) setProfile(null);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchProfile();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchProfile();
            } else {
                setProfile(null);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [supabase]);

    return { profile, loading };
}
