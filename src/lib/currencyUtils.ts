/**
 * Currency conversion and formatting utilities
 * Supports USD and ZMW (Zambian Kwacha)
 */

// Exchange rate: 1 USD = approximately 28 ZMW (this should be updated dynamically)
const DEFAULT_USD_TO_ZMW_RATE = 28;

export type Currency = 'USD' | 'ZMW';

export interface CurrencyConfig {
  currency: Currency;
  rate: number; // ZMW per 1 USD
  symbol: string;
  locale: string;
}

const currencyConfigs: Record<Currency, Omit<CurrencyConfig, 'rate'>> = {
  USD: {
    currency: 'USD',
    symbol: '$',
    locale: 'en-US',
  },
  ZMW: {
    currency: 'ZMW',
    symbol: 'ZK',
    locale: 'en-ZM',
  },
};

/**
 * Convert USD amount to specified currency
 */
export const convertCurrency = (
  usdAmount: number,
  targetCurrency: Currency,
  exchangeRate = DEFAULT_USD_TO_ZMW_RATE
): number => {
  if (targetCurrency === 'USD') {
    return usdAmount;
  }
  return usdAmount * exchangeRate;
};

/**
 * Format amount with currency symbol
 */
export const formatCurrencyAmount = (
  amount: number,
  currency: Currency,
  exchangeRate = DEFAULT_USD_TO_ZMW_RATE
): string => {
  const convertedAmount = convertCurrency(amount, currency, exchangeRate);
  const config = currencyConfigs[currency];

  try {
    const formatter = new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'ZMW' ? 0 : 2,
      maximumFractionDigits: currency === 'ZMW' ? 0 : 2,
    });
    return formatter.format(convertedAmount);
  } catch {
    // Fallback formatting if Intl is not available
    const rounded = Math.round(convertedAmount * 100) / 100;
    return `${config.symbol}${rounded.toLocaleString()}`;
  }
};

/**
 * Get currency display info
 */
export const getCurrencyInfo = (currency: Currency) => {
  return {
    ...currencyConfigs[currency],
    currency,
  };
};

/**
 * Parse currency string back to number (removes symbol/formatting)
 */
export const parseCurrencyString = (
  formatted: string,
  currency: Currency = 'USD'
): number => {
  // Remove all non-numeric characters except decimal point
  const numeric = formatted.replace(/[^\d.]/g, '');
  return parseFloat(numeric) || 0;
};

export default {
  convertCurrency,
  formatCurrencyAmount,
  getCurrencyInfo,
  parseCurrencyString,
};
