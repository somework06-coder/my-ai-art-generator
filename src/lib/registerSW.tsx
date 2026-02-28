'use client';

import { useEffect } from 'react';

export function RegisterSW() {
    useEffect(() => {
        // Only run in the browser and if service workers are supported
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {

            // Register SW after window load to not block critical rendering
            const handleLoad = () => {
                navigator.serviceWorker
                    .register('/sw.js')
                    .then((registration) => {
                        console.log('Service Worker registered with scope:', registration.scope);
                    })
                    .catch((error) => {
                        console.error('Service Worker registration failed:', error);
                    });
            };

            // If document is already loaded, register immediately
            if (document.readyState === 'complete') {
                handleLoad();
            } else {
                window.addEventListener('load', handleLoad);
            }

            return () => {
                window.removeEventListener('load', handleLoad);
            };
        }
    }, []);

    return null; /* Renderless component */
}
