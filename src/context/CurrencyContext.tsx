import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { formatCurrencyAmount, Currency, convertCurrency } from '@/lib/currencyUtils';
import { fetchCheckoutFxRate } from '@/lib/fxRate';

interface CurrencyContextType {
  currency: Currency;
  exchangeRate: number;
  setCurrency: (currency: Currency) => void;
  formatPrice: (amount: number) => string;
  convertPrice: (amount: number, targetCurrency?: Currency) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Default exchange rate - ZMW per 1 USD
const DEFAULT_RATE = 1.0;

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, ready } = useAuth();
  const { settings, updateSetting } = useSettings();
  const [currency, setCurrencyState] = useState<Currency>(
    (settings?.currency as Currency) || 'USD'
  );
  const [exchangeRate, setExchangeRate] = useState<number>(DEFAULT_RATE);
  const [loading, setLoading] = useState(true);

  // Fetch exchange rate from database or API
  useEffect(() => {
    if (!ready) {
      return;
    }

    let cancelled = false;

    const fetchExchangeRate = async () => {
      try {
        const response = await fetchCheckoutFxRate();

        if (cancelled) {
          return;
        }

        setExchangeRate(
          Number.isFinite(response.fx_rate?.rate)
            ? response.fx_rate.rate
            : DEFAULT_RATE
        );
      } catch (err) {
        console.error("Error fetching exchange rate:", err);

        if (!cancelled) {
          setExchangeRate(DEFAULT_RATE);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchExchangeRate();

    return () => {
      cancelled = true;
    };
  }, [ready, user?.id]);

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
