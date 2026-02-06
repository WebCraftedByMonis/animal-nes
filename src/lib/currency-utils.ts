import { Country } from '@/contexts/CountryContext';

const CURRENCY_CONFIG = {
  Pakistan: {
    code: 'PKR',
    symbol: 'Rs.',
    locale: 'en-PK',
  },
  UAE: {
    code: 'AED',
    symbol: 'AED',
    locale: 'en-AE',
  },
};

/**
 * Formats a price based on the selected country
 * @param amount - The price amount
 * @param country - The country (Pakistan or UAE)
 * @param showSymbol - Whether to show currency symbol (default: true)
 * @returns Formatted price string
 */
export function formatPrice(amount: number, country: Country = 'Pakistan', showSymbol: boolean = true): string {
  const config = CURRENCY_CONFIG[country];
  const formattedNumber = amount.toLocaleString(config.locale);

  if (showSymbol) {
    return `${config.symbol} ${formattedNumber}`;
  }

  return formattedNumber;
}

/**
 * Gets the currency symbol for a country
 * @param country - The country (Pakistan or UAE)
 * @returns Currency symbol
 */
export function getCurrencySymbol(country: Country = 'Pakistan'): string {
  return CURRENCY_CONFIG[country].symbol;
}

/**
 * Gets the currency code for a country
 * @param country - The country (Pakistan or UAE)
 * @returns Currency code (PKR or AED)
 */
export function getCurrencyCode(country: Country = 'Pakistan'): string {
  return CURRENCY_CONFIG[country].code;
}
