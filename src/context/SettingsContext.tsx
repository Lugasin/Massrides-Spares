import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { isPushSupported, syncPushSubscription } from '@/lib/pushNotifications';

interface UserSettings {
    id: string;
    user_id: string;
    email_notifications: boolean;
    push_notifications: boolean;
    marketing_emails: boolean;
    order_updates: boolean;
    theme: 'light' | 'dark' | 'system';
    language: string;
    currency: string;
    timezone: string;
}

interface SettingsContextType {
    settings: UserSettings | null;
    loading: boolean;
    pushSupported: boolean;
    updateSetting: (key: keyof UserSettings, value: any) => Promise<void>;
    formatCurrency: (amount: number) => string;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, session, ready } = useAuth();
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const pushSupported = isPushSupported();

    useEffect(() => {
        if (!ready) {
            return;
        }

        if (user && session?.access_token) {
            fetchSettings();
            const channel = supabase
                .channel('user_settings_global')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'user_settings',
                        filter: `user_id=eq.${user.id}`
                    },
                    (payload) => {
                        setSettings(payload.new as UserSettings);
                    }
                )
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        } else {
            setLoading(false);
            setSettings(null);
        }
    }, [ready, session?.access_token, user]);

    // Apply Theme Side-Effect
    useEffect(() => {
        if (!settings) return;

        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');

        if (settings.theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
        } else {
            root.classList.add(settings.theme);
        }
    }, [settings?.theme]);

    const fetchSettings = async () => {
        try {
            setLoading(true);

            let data = null;
            if (user?.id) {
                const { data: dbData, error } = await supabase
                    .from('user_settings')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();
                
                if (!error && dbData) {
                    data = dbData;
                }
            }

            if (!data) {
                // Warning, but NOT fatal - use defaults
                console.warn("Using default settings");
                setSettings({
                    id: 'temp',
                    user_id: user?.id || 'temp',
                    theme: 'light',
                    currency: 'ZMW',
                    email_notifications: true,
                    push_notifications: true,
                    marketing_emails: false,
                    order_updates: true,
                    language: 'en',
                    timezone: 'Africa/Lusaka'
                } as UserSettings);
            } else {
                setSettings(data);
            }
        } catch (error) {
            console.error("Critical settings load error - Fallback to defaults", error);
            // FAIL SAFE
            setSettings({
                id: 'temp',
                user_id: user?.id || 'temp',
                theme: 'light',
                currency: 'ZMW',
                email_notifications: true,
                push_notifications: true,
                marketing_emails: false,
                order_updates: true,
                language: 'en',
                timezone: 'Africa/Lusaka'
            } as UserSettings);
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async (key: keyof UserSettings, value: any) => {
        const previousSettings = settings;

        // Optimistic update
        setSettings(prev => prev ? { ...prev, [key]: value } : null);

        try {
            if (key === 'push_notifications') {
                if (value && !pushSupported) {
                    throw new Error('This browser does not support push notifications.');
                }

                if (!session?.access_token) {
                    throw new Error('You must be signed in to update settings.');
                }

                await syncPushSubscription(Boolean(value), {
                    authToken: session.access_token,
                    promptForPermission: true,
                    requireAuth: true,
                });
            }

            // Let supabase.functions.invoke handle JWT auth automatically
            const { error } = await supabase.functions.invoke('update-user-settings', {
                body: { [key]: value }
            });

            if (error) {
                throw error;
            }

            if (key === 'push_notifications') {
                toast.success(value ? 'Push notifications enabled' : 'Push notifications disabled');
            }
        } catch (error) {
            console.error("Failed to update setting", error);
            setSettings(previousSettings);

            if (key === 'push_notifications') {
                void syncPushSubscription(Boolean(previousSettings?.push_notifications), {
                    authToken: session?.access_token,
                    promptForPermission: false,
                    requireAuth: false,
                }).catch((pushError) => {
                    console.warn('Failed to restore push subscription state:', pushError);
                });
            }

            toast.error(error instanceof Error ? error.message : 'Failed to update setting');
        }
    };

    const formatCurrency = (amount: number, overrideCurrency?: string) => {
        const currency = overrideCurrency || settings?.currency || 'USD';
        try {
          return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: currency,
          }).format(amount);
        } catch (e) {
          return `${currency} ${amount.toLocaleString()}`;
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, loading, pushSupported, updateSetting, formatCurrency }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
