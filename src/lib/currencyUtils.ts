/**
 * Currency conversion and formatting utilities
 * Supports USD and ZMW (Zambian Kwacha)
 */

export type Currency = 'USD' | 'ZMW';

export interface CurrencyConfig {
  currency: Currency;
  symbol: string;
  locale: string;
}

const currencyConfigs: Record<Currency, CurrencyConfig> = {
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
 * Convert amount between currencies
 * @param amount The amount to convert
 * @param targetCurrency The currency to convert to
 * @param exchangeRate The rate (how many ZMW per 1 USD)
 * @param baseCurrency The original currency of the amount (defaults to USD)
 */
export const convertCurrency = (
  amount: number,
  targetCurrency: Currency,
  exchangeRate: number,
  baseCurrency: Currency = 'USD'
): number => {
  if (targetCurrency === baseCurrency) {
    return amount;
  }

  if (baseCurrency === 'USD' && targetCurrency === 'ZMW') {
    return amount * exchangeRate;
  }

  if (baseCurrency === 'ZMW' && targetCurrency === 'USD') {
    return amount / exchangeRate;
  }

  return amount;
};

/**
 * Format amount with currency symbol
 */
export const formatCurrencyAmount = (
  amount: number,
  currency: Currency,
  exchangeRate: number,
  baseCurrency: Currency = 'USD'
): string => {
  const convertedAmount = convertCurrency(amount, currency, exchangeRate, baseCurrency);
  const config = currencyConfigs[currency];

  try {
    const formatter = new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(convertedAmount);
  } catch {
    const rounded = Math.round(convertedAmount * 100) / 100;
    return `${config.symbol}${rounded.toLocaleString()}`;
  }
};

export const getCurrencyInfo = (currency: Currency) => {
  return currencyConfigs[currency];
};

export const parseCurrencyString = (
  formatted: string
): number => {
  const numeric = formatted.replace(/[^\d.]/g, '');
  return parseFloat(numeric) || 0;
};

export default {
  convertCurrency,
  formatCurrencyAmount,
  getCurrencyInfo,
  parseCurrencyString,
};
