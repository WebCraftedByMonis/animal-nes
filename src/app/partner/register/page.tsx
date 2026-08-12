import { Metadata } from 'next'
import VendorRegisterClient from '@/components/forms/VendorRegisterClient'

export const metadata: Metadata = {
  title: 'Become a Vendor | Animal Wellness',
  description: 'Sign up as a dealer, distributor or sales person on Animal Wellness. Applications are reviewed by our admin team before approval.',
}

export default function VendorRegisterPage() {
  return <VendorRegisterClient />
}
