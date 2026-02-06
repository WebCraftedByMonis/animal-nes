'use client';

import { getWhatsAppUrl } from '@/lib/whatsapp-utils';
import { FaWhatsapp } from 'react-icons/fa';
import { useCountry, Country } from '@/contexts/CountryContext';

interface WhatsAppLinkProps {
  phone: string;
  message?: string;
  children?: React.ReactNode;
  className?: string;
  showIcon?: boolean;
  /** Override the country for phone formatting. If not provided, uses the selected country from context */
  phoneCountry?: Country;
}

/**
 * A clickable phone number that opens WhatsApp
 * Automatically adds the appropriate country prefix based on the selected country
 * - Pakistan: +92 prefix
 * - UAE: +971 prefix
 */
export default function WhatsAppLink({
  phone,
  message,
  children,
  className = '',
  showIcon = true,
  phoneCountry,
}: WhatsAppLinkProps) {
  const { country: contextCountry } = useCountry();
  const effectiveCountry = phoneCountry || contextCountry;

  if (!phone || phone === '-') {
    return <span className={className}>{children || phone || '-'}</span>;
  }

  const whatsappUrl = getWhatsAppUrl(phone, message, effectiveCountry);

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-green-600 hover:text-green-700 hover:underline cursor-pointer ${className}`}
    >
      {showIcon && <FaWhatsapp className="w-4 h-4" />}
      {children || phone}
    </a>
  );
}
