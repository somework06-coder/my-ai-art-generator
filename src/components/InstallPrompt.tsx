'use client';

import { useState, useEffect } from 'react';

export default function InstallPrompt() {
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // Detect if already installed (standalone mode)
        const isAppMode = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;

        setIsStandalone(isAppMode);

        if (isAppMode) return; // Don't show if already installed

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isDeviceIOS = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isDeviceIOS);

        // Check if user previously dismissed the prompt
        const hasDismissed = localStorage.getItem('pwa-prompt-dismissed');

        // Handle Android / Chrome desktop native install prompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault(); // Prevent automatic mini-infobar
            setDeferredPrompt(e);

            // Show our custom UI if not dismissed recently
            if (!hasDismissed) {
                setTimeout(() => setShowPrompt(true), 3000); // Delay for better UX
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // For iOS, there is no generic event. Show a manual hint if not dismissed.
        if (isDeviceIOS && !hasDismissed) {
            setTimeout(() => setShowPrompt(true), 3000);
        }

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (isIOS) {
            alert('To install on iOS: tap the Share button (square with arrow up) at the bottom in Safari, then select "Add to Home Screen".');
            return;
        }

        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                console.log('User accepted the PWA install prompt');
            }
            setDeferredPrompt(null);
            setShowPrompt(false);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Remember dismissal for 7 days
        localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    };

    if (!showPrompt || isStandalone) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-[#121212] border border-[#E1B245]/30 rounded-2xl shadow-2xl p-4 flex items-start gap-4 z-[9999]" style={{ animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div className="w-12 h-12 bg-[#050505] rounded-xl flex items-center justify-center flex-shrink-0 border border-white/10">
                <span className="material-symbols-outlined text-[#E1B245]">apps</span>
            </div>

            <div className="flex-1">
                <h4 className="text-white font-bold text-sm mb-1">Install Motion Studio</h4>
                <p className="text-white/60 text-xs leading-relaxed mb-3">
                    Add this app to your {isIOS ? 'home screen' : 'device'} for a faster, full-screen offline experience.
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={handleInstallClick}
                        className="bg-[#E1B245] text-black px-4 py-1.5 rounded-lg text-xs font-bold hover:brightness-110 transition flex-1"
                    >
                        {isIOS ? 'Show Instructions' : 'Install App'}
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="bg-white/10 text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-white/20 transition"
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
}
