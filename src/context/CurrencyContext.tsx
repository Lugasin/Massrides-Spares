import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { formatCurrencyAmount, Currency, convertCurrency } from '@/lib/currencyUtils';
import { supabase } from '@/integrations/supabase/client';

interface CurrencyContextType {
  currency: Currency;
  exchangeRate: number;
  autoFetch: boolean;
  setCurrency: (currency: Currency) => void;
  formatPrice: (amount: number) => string;
  convertPrice: (amount: number, targetCurrency?: Currency) => number;
  refreshSettings: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Default exchange rate - ZMW per 1 USD
const DEFAULT_RATE = 28;

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currency, setCurrencyState] = useState<Currency>('USD');
  const [exchangeRate, setExchangeRate] = useState<number>(DEFAULT_RATE);
  const [autoFetch, setAutoFetch] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'currency')
        .maybeSingle();

      if (!settingsError && settingsData?.value) {
        const val = settingsData.value as any;
        setExchangeRate(val.exchange_rate || DEFAULT_RATE);
        setAutoFetch(!!val.auto_fetch);
        // We could also set the default primary currency here if needed
      }

      // If autoFetch is on, we might want to get the latest live rate
      const { data, error } = await supabase.functions.invoke('get-fx-rate', {
        body: { base_currency: 'USD', quote_currency: 'ZMW' }
      });

      if (!error && data?.fx_rate?.rate) {
        setExchangeRate(data.fx_rate.rate);
      }
    } catch (err) {
      console.error('Failed to fetch currency settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Listen for changes in system_settings
  useEffect(() => {
    const channel = supabase
      .channel('system_settings_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'system_settings', filter: 'key=eq.currency' },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    // Persist to local storage or user profile if needed
    localStorage.setItem('preferred_currency', newCurrency);
  };

  useEffect(() => {
    const saved = localStorage.getItem('preferred_currency');
    if (saved === 'USD' || saved === 'ZMW') {
      setCurrencyState(saved as Currency);
    }
  }, []);

  const formatPrice = (amount: number): string => {
    return formatCurrencyAmount(amount, currency, exchangeRate);
  };

  const convertPriceAmount = (amount: number, targetCurrency?: Currency): number => {
    return convertCurrency(amount, targetCurrency || currency, exchangeRate);
  };

  const value: CurrencyContextType = {
    currency,
    exchangeRate,
    autoFetch,
    setCurrency,
    formatPrice,
    convertPrice: convertPriceAmount,
    refreshSettings: fetchSettings,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export default CurrencyContext;
