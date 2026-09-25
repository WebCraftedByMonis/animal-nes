import { Metadata } from 'next';
import AffiliateRegisterClient from './AffiliateRegisterClient';
import { getSiteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Become an Affiliate | Animal Wellness',
  description: 'Sign up as an affiliate marketer for Animal Wellness. Get trackable product links and earn a commission on every sale you refer.',
  alternates: {
    canonical: `${getSiteUrl()}/affiliate/register`,
  },
  openGraph: {
    url: `${getSiteUrl()}/affiliate/register`,
    type: 'website',
    siteName: 'Animal Wellness',
  },
};

export default function AffiliateRegisterPage() {
  return <AffiliateRegisterClient />;
}
