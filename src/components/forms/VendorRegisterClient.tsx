'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { CheckCircle2 } from 'lucide-react';
import PartnerForm from '@/components/forms/PartnerForm';

const VENDOR_PARTNER_TYPE = 'Sales and Marketing (Dealer, Distributor, Sales Person)';

export default function VendorRegisterClient() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (data: any): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      // These fields exist on the shared form but don't apply to public
      // vendor sign-up (premium requests, product assignment, RVMP, etc.
      // stay admin-only).
      const {
        requestPremium,
        premiumPaymentScreenshot,
        sendToPartner,
        startTimeIds,
        productIds,
        numberOfAnimals,
        animalEntries,
        ...vendorData
      } = data;

      const res = await fetch('/api/partner/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendorData),
      });

      if (!res.ok) {
        const result = await res.json();
        if (res.status === 409) {
          toast.error('Email already exists. Please use a different email address.');
        } else if (result.errors && Array.isArray(result.errors)) {
          toast.error('Please fix the form errors and try again.');
        } else {
          toast.error(result?.error || 'Something went wrong.');
        }
        return false;
      }

      setSubmitted(true);
      return true;
    } catch (error) {
      console.error(error);
      toast.error('Network error or server down.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-8">
          <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-2">
            Request submitted
          </h1>
          <p className="text-sm text-green-800/80 dark:text-green-400 leading-relaxed">
            Thanks for applying to become a vendor. Your account is now <strong>pending review</strong> —
            once our admin team approves it, you&apos;ll be able to sign in and start managing your
            products. This usually doesn&apos;t take long, but you won&apos;t be able to log in until then.
          </p>
          <Link
            href="/partner/login"
            className="inline-block mt-6 text-sm font-medium text-green-700 dark:text-green-400 hover:underline"
          >
            Back to partner login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-3xl mx-auto px-4 pt-8">
        <h1 className="text-2xl font-bold text-green-500 mb-1">Become a Vendor</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Sign up as a dealer, distributor or sales person. An admin reviews every application before
          it goes live — you&apos;ll be able to log in as soon as yours is approved.
        </p>
      </div>
      <PartnerForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        title=""
        submitButtonText="Submit for approval"
        lockedPartnerType={VENDOR_PARTNER_TYPE}
      />
    </div>
  );
}
