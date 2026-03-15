'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useProfile } from './useProfile';

export function useCredits() {
    const { profile, loading: profileLoading } = useProfile();
    const [isDeducting, setIsDeducting] = useState(false);
    const supabase = createClient();

    // Derived state: actual credit balance
    const credits = profile?.credits || 0;

    /**
     * Checks if the user has enough credits
     */
    const hasCredits = useCallback((cost: number = 1) => {
        return credits >= cost;
    }, [credits]);

    /**
     * Deducts credits via secure Supabase RPC
     * Returns true if successful, false if insufficient bounds or error
     */
    const deductCredits = async (cost: number, description: string): Promise<boolean> => {
        if (!profile?.id) return false;

        setIsDeducting(true);
        try {
            const { data, error } = await supabase
                .rpc('deduct_credits', {
                    p_user_id: profile.id,
                    p_amount: cost,
                    p_description: description
                });

            if (error) {
                console.error('Error deducting credits:', error);
                return false;
            }

            // `data` is boolean returned from our plpgsql function
            return data === true;
        } catch (err) {
            console.error('Exception deducting credits:', err);
            return false;
        } finally {
            setIsDeducting(false);
        }
    };

    return {
        credits,
        loading: profileLoading || isDeducting,
        hasCredits,
        deductCredits
    };
}
