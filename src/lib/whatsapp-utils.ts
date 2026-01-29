/**
 * Formats a phone number for WhatsApp by adding +92 prefix if needed
 * @param number - The phone number to format
 * @returns The formatted phone number with +92 prefix
 */
export function formatWhatsAppNumber(number: string): string {
  // Remove all non-digit characters except +
  const cleaned = number.replace(/[^\d+]/g, '');

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
 * @returns The WhatsApp URL
 */
export function getWhatsAppUrl(number: string, message?: string): string {
  const formattedNumber = formatWhatsAppNumber(number).replace(/\D/g, '');
  const baseUrl = `https://wa.me/${formattedNumber}`;

  if (message) {
    return `${baseUrl}?text=${encodeURIComponent(message)}`;
  }

  return baseUrl;
}
