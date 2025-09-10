import { Metadata } from 'next';
import ContactDetails from "@/components/ContactDetails";

export const metadata: Metadata = {
  title: 'Contact Us - Get in Touch with Animal Wellness Team',
  description: 'Contact Animal Wellness for veterinary products, services, partnerships, or support. Reach out to our team for animal healthcare solutions, product inquiries, and professional collaboration opportunities.',
  keywords: [
    'contact animal wellness', 'veterinary support', 'animal healthcare contact',
    'pet care customer service', 'veterinary product inquiry', 'animal wellness support',
    'livestock services contact', 'veterinary consultation', 'animal health support'
  ],
  openGraph: {
    title: 'Contact Animal Wellness - Professional Animal Healthcare Support',
    description: 'Get in touch with our animal healthcare experts for veterinary products, services, and professional support.',
    type: 'website',
    images: ['/contact-og.jpg'],
  },
  alternates: {
    canonical: '/contact',
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="container mx-auto px-4 py-12">
        {/* Heading */}
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-12">Contact Us</h1>

        {/* Contact Details Below - Centered with increased width */}
        <div className="flex justify-center">
          <div className="max-w-4xl px-4">
            <ContactDetails />
          </div>
        </div>
      </div>
    </div>
  );
}