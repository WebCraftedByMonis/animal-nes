import { Metadata } from 'next';
import AboutContent from './AboutContent';

export const metadata: Metadata = {
  title: 'About Us - Leading Animal Wellness Platform',
  description: 'Learn about Animal Wellness - your trusted partner connecting animal health professionals, pet owners, and livestock farmers. Discover our mission to improve animal healthcare across the region through quality products, services, and expert connections.',
  keywords: [
    'about animal wellness', 'veterinary platform', 'animal healthcare mission',
    'pet care company', 'livestock services', 'animal health solutions',
    'veterinary marketplace', 'animal wellness story', 'pet healthcare platform'
  ],
  openGraph: {
    title: 'About Animal Wellness - Leading Animal Healthcare Platform',
    description: 'Learn about our mission to improve animal healthcare through quality products, services, and expert connections.',
    type: 'website',
    images: ['/about-og.jpg'],
  },
  alternates: {
    canonical: '/about',
  },
};

export default function About() {
  return <AboutContent />;
}
