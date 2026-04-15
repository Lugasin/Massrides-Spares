import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { formatCurrencyAmount, Currency, convertCurrency } from '@/lib/currencyUtils';
import { supabase } from '@/integrations/supabase/client';

interface CurrencyContextType {
  currency: Currency;
  exchangeRate: number;
  autoFetch: boolean;
  setCurrency: (currency: Currency) => void;
  formatPrice: (amount: number, baseCurrency?: Currency) => string;
  convertPrice: (amount: number, targetCurrency?: Currency, baseCurrency?: Currency) => number;
  refreshSettings: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const DEFAULT_RATE = 28;

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
      }

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
    localStorage.setItem('preferred_currency', newCurrency);
  };

  useEffect(() => {
    const saved = localStorage.getItem('preferred_currency');
    if (saved === 'USD' || saved === 'ZMW') {
      setCurrencyState(saved as Currency);
    }
  }, []);

  const formatPrice = (amount: number, baseCurrency: Currency = 'USD'): string => {
    return formatCurrencyAmount(amount, currency, exchangeRate, baseCurrency);
  };

  const convertPriceAmount = (amount: number, targetCurrency?: Currency, baseCurrency: Currency = 'USD'): number => {
    return convertCurrency(amount, targetCurrency || currency, exchangeRate, baseCurrency);
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
