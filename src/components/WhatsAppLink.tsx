'use client';

import { getWhatsAppUrl } from '@/lib/whatsapp-utils';
import { FaWhatsapp } from 'react-icons/fa';

interface WhatsAppLinkProps {
  phone: string;
  message?: string;
  children?: React.ReactNode;
  className?: string;
  showIcon?: boolean;
}

/**
 * A clickable phone number that opens WhatsApp
 * Automatically adds +92 prefix if the number starts with 03 or doesn't have country code
 */
export default function WhatsAppLink({
  phone,
  message,
  children,
  className = '',
  showIcon = true,
}: WhatsAppLinkProps) {
  if (!phone || phone === '-') {
    return <span className={className}>{children || phone || '-'}</span>;
  }

  const whatsappUrl = getWhatsAppUrl(phone, message);

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
