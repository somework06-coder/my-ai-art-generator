'use client';

import { useState, useEffect } from 'react';

export default function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(true);
    const [hasHydrated, setHasHydrated] = useState(false);

    useEffect(() => {
        setHasHydrated(true);
        // Initial state
        setIsOnline(navigator.onLine);

        // Listeners for network changes
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!hasHydrated || isOnline) return null;

    return (
        <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-500 px-2 py-1 rounded-full text-[10px] font-medium mr-2" style={{ animation: 'fadeIn 0.3s ease-out' }} title="You are currently offline. Generation is disabled, but you can view your saved works.">
            <span className="material-symbols-outlined shrink-0" style={{ fontSize: '12px' }}>wifi_off</span>
            Offline
        </div>
    );
}
