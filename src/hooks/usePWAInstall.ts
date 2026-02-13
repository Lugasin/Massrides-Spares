import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UsePWAInstallReturn {
  canInstall: boolean;
  isInstalled: boolean;
  install: () => Promise<'accepted' | 'dismissed' | null>;
  dismiss: () => void;
}

/**
 * Custom hook for PWA install prompt
 * 
 * Usage:
 * const { canInstall, install, isInstalled } = usePWAInstall();
 * 
 * if (canInstall) {
 *   <Button onClick={install}>Install App</Button>
 * }
 */
export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    
    if (isStandalone || isInWebAppiOS) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
      console.log('PWA install prompt available');
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | null> => {
    if (!deferredPrompt) {
      console.log('No install prompt available');
      return null;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for user choice
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`User ${outcome} the install prompt`);
      
      // Clear the deferred prompt
      setDeferredPrompt(null);
      setCanInstall(false);
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      
      return outcome;
    } catch (error) {
      console.error('Error showing install prompt:', error);
      return null;
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setCanInstall(false);
    // Store dismissal in localStorage to not show again for a while
    localStorage.setItem('pwa_install_dismissed', Date.now().toString());
  }, []);

  return {
    canInstall,
    isInstalled,
    install,
    dismiss
  };
}

export default usePWAInstall;
