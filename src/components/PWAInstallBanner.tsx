import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

/**
 * PWA Install Banner
 * 
 * Displays a subtle banner when the app can be installed.
 * Can be placed in App.tsx or any layout component.
 */
export function PWAInstallBanner() {
    const { canInstall, install, dismiss, isInstalled } = usePWAInstall();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if previously dismissed (within 7 days)
        const dismissedAt = localStorage.getItem('pwa_install_dismissed');
        if (dismissedAt) {
            const daysSinceDismiss = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
            if (daysSinceDismiss < 7) {
                return;
            }
        }

        // Show banner after a delay if install is available
        if (canInstall && !isInstalled) {
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 3000); // 3 second delay

            return () => clearTimeout(timer);
        }
    }, [canInstall, isInstalled]);

    const handleInstall = async () => {
        const result = await install();
        if (result) {
            setIsVisible(false);
        }
    };

    const handleDismiss = () => {
        dismiss();
        setIsVisible(false);
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-5 duration-300">
            <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4 flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 p-2 bg-white/20 rounded-lg">
                    <Smartphone className="h-6 w-6" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm">Install MassRides</h4>
                    <p className="text-xs opacity-90 mt-0.5">
                        Add to your home screen for quick access
                    </p>

                    <div className="flex gap-2 mt-3">
                        <Button
                            size="sm"
                            variant="secondary"
                            className="bg-white text-primary hover:bg-white/90"
                            onClick={handleInstall}
                        >
                            <Download className="h-3 w-3 mr-1" />
                            Install
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-white/80 hover:text-white hover:bg-white/10"
                            onClick={handleDismiss}
                        >
                            Not now
                        </Button>
                    </div>
                </div>

                {/* Close button */}
                <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
                    aria-label="Dismiss"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

/**
 * PWA Install Button
 * 
 * A standalone button that can be placed anywhere.
 * Only shows when installation is available.
 */
export function PWAInstallButton({
    variant = 'default',
    size = 'default',
    className = ''
}: {
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg';
    className?: string;
}) {
    const { canInstall, install, isInstalled } = usePWAInstall();

    if (!canInstall || isInstalled) {
        return null;
    }

    return (
        <Button
            variant={variant}
            size={size}
            className={className}
            onClick={install}
        >
            <Download className="h-4 w-4 mr-2" />
            Install App
        </Button>
    );
}

export default PWAInstallBanner;
