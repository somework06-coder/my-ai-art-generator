'use client';

import { useEffect } from 'react';

/**
 * This component UNREGISTERS any leftover service workers from the old PWA setup.
 * Since we migrated to a Tauri desktop app, service workers are no longer needed
 * and can cause stale cache issues.
 */
export function RegisterSW() {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            // Unregister all service workers
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                for (const registration of registrations) {
                    registration.unregister().then((success) => {
                        if (success) {
                            console.log('Service Worker unregistered successfully');
                        }
                    });
                }
            });

            // Clear all caches
            if ('caches' in window) {
                caches.keys().then((cacheNames) => {
                    cacheNames.forEach((cacheName) => {
                        caches.delete(cacheName);
                        console.log('Cache cleared:', cacheName);
                    });
                });
            }
        }
    }, []);

    return null;
}
