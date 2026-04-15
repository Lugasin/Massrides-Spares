import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { formatCurrencyAmount, Currency, convertCurrency } from '@/lib/currencyUtils';
import { supabase } from '@/integrations/supabase/client';

interface CurrencyContextType {
  currency: Currency;
  exchangeRate: number;
  setCurrency: (currency: Currency) => void;
  formatPrice: (amount: number) => string;
  convertPrice: (amount: number, targetCurrency?: Currency) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Default exchange rate - ZMW per 1 USD
const DEFAULT_RATE = 28;

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { settings, updateSetting } = useSettings();
  const [currency, setCurrencyState] = useState<Currency>(
    (settings?.currency as Currency) || 'USD'
  );
  const [exchangeRate, setExchangeRate] = useState<number>(DEFAULT_RATE);
  const [loading, setLoading] = useState(true);

  // Fetch exchange rate from database or API
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        // Use edge function which has proper access - this avoids RLS issues
        const { data, error } = await supabase.functions.invoke('get-fx-rate', {
          body: { base_currency: 'USD', quote_currency: 'ZMW' }
        });

        if (!error && data?.fx_rate?.rate) {
          setExchangeRate(data.fx_rate.rate);
        } else {
          // Fallback to default rate
          setExchangeRate(DEFAULT_RATE);
        }
      } catch {
        // Use default rate on error
        setExchangeRate(DEFAULT_RATE);
      } finally {
        setLoading(false);
      }
    };

    fetchExchangeRate();

    // Note: Real-time FX rate updates disabled due to RLS on fx_rates table
    // Users can manually set rate in Super Admin or Admin dashboard
  }, []);

  // Update settings when currency changes
  useEffect(() => {
    if (user && settings?.id) {
      setCurrencyState((settings?.currency as Currency) || 'USD');
    }
  }, [settings?.currency, user]);

  const setCurrency = async (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    if (user && updateSetting) {
      try {
        await updateSetting('currency', newCurrency);
      } catch (error) {
        console.error('Failed to update currency setting:', error);
        // Revert on error
        setCurrencyState(currency);
      }
    }
  };

  const formatPrice = (amount: number): string => {
    return formatCurrencyAmount(amount, currency, exchangeRate);
  };

  const convertPriceAmount = (amount: number, targetCurrency?: Currency): number => {
    return convertCurrency(amount, targetCurrency || currency, exchangeRate);
  };

  const value: CurrencyContextType = {
    currency,
    exchangeRate,
    setCurrency,
    formatPrice,
    convertPrice: convertPriceAmount,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {loading ? (
        <div>{children}</div> // Render children even while loading to avoid blocking UI
      ) : (
        children
      )}
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
