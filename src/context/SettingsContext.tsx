import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

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
    updateSetting: (key: keyof UserSettings, value: any) => Promise<void>;
    formatCurrency: (amount: number) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
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
    }, [user]);

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

            const { data: { session } } = await supabase.auth.getSession();
            const headers = session ? { Authorization: `Bearer ${session.access_token}` } : undefined;

            const { data, error } = await supabase.functions.invoke('get-user-settings', {
                headers
            });

            if (error || !data) {
                // Warning, but NOT fatal
                console.warn("Using default settings (fetch failed):", error);
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
        // Optimistic update
        setSettings(prev => prev ? { ...prev, [key]: value } : null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers = session ? { Authorization: `Bearer ${session.access_token}` } : undefined;

            await supabase.functions.invoke('update-user-settings', {
                body: { [key]: value },
                headers
            });
        } catch (error) {
            console.error("Failed to update setting", error);
            fetchSettings(); // Revert on error
        }
    };

    const formatCurrency = (amount: number) => {
        const currency = settings?.currency || 'USD';
        // Simple formatter map. Can be improved with Intl.NumberFormat
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    };

    return (
        <SettingsContext.Provider value={{ settings, loading, updateSetting, formatCurrency }}>
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
