import { Metadata } from 'next';
import AffiliateRegisterClient from './AffiliateRegisterClient';

export const metadata: Metadata = {
  title: 'Become an Affiliate | Animal Wellness',
  description: 'Sign up as an affiliate marketer for Animal Wellness. Get trackable product links and earn a commission on every sale you refer.',
};

export default function AffiliateRegisterPage() {
  return <AffiliateRegisterClient />;
}
