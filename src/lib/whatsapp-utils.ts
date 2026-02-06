import { Country } from '@/contexts/CountryContext';

/**
 * Formats a phone number for WhatsApp based on country
 * @param number - The phone number to format
 * @param country - The country (Pakistan or UAE)
 * @returns The formatted phone number with appropriate prefix
 */
export function formatWhatsAppNumber(number: string, country: Country = 'Pakistan'): string {
  // Remove all non-digit characters except +
  const cleaned = number.replace(/[^\d+]/g, '');

  if (country === 'UAE') {
    // UAE phone number formatting
    // If starts with 05, replace with +9715
    if (cleaned.startsWith('05')) {
      return '+971' + cleaned.slice(1);
    }

    // If starts with 5 (without 0), add +971
    if (cleaned.startsWith('5') && cleaned.length >= 9) {
      return '+971' + cleaned;
    }

    // If starts with 971 (without +), add +
    if (cleaned.startsWith('971') && !cleaned.startsWith('+')) {
      return '+' + cleaned;
    }

    // If already starts with +971, return as is
    if (cleaned.startsWith('+971')) {
      return cleaned;
    }

    // For UAE numbers, assume it needs +971 prefix
    if (!cleaned.startsWith('+')) {
      return '+971' + cleaned;
    }

    return cleaned;
  }

  // Pakistan phone number formatting (default)
  // If starts with 03, replace with +923
  if (cleaned.startsWith('03')) {
    return '+92' + cleaned.slice(1);
  }

  // If starts with 3 (without 0), add +92
  if (cleaned.startsWith('3') && cleaned.length >= 10) {
    return '+92' + cleaned;
  }

  // If starts with 92 (without +), add +
  if (cleaned.startsWith('92') && !cleaned.startsWith('+')) {
    return '+' + cleaned;
  }

  // If already starts with +92, return as is
  if (cleaned.startsWith('+92')) {
    return cleaned;
  }

  // For any other format, assume it needs +92 prefix
  if (!cleaned.startsWith('+')) {
    return '+92' + cleaned;
  }

  return cleaned;
}

/**
 * Generates a WhatsApp URL for a phone number
 * @param number - The phone number
 * @param message - Optional message to pre-fill
 * @param country - The country (Pakistan or UAE)
 * @returns The WhatsApp URL
 */
export function getWhatsAppUrl(number: string, message?: string, country: Country = 'Pakistan'): string {
  const formattedNumber = formatWhatsAppNumber(number, country).replace(/\D/g, '');
  const baseUrl = `https://wa.me/${formattedNumber}`;

  if (message) {
    return `${baseUrl}?text=${encodeURIComponent(message)}`;
  }

  return baseUrl;
}
