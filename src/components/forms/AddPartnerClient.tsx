'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import PartnerForm from '@/components/forms/PartnerForm';

export default function AddPartnerClient() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: any): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      // Extract premium-related fields
      const { requestPremium, premiumPaymentScreenshot, ...partnerData } = data;

      // Step 1: Create the partner
      const res = await fetch('/api/partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partnerData),
      });

      if (!res.ok) {
        const result = await res.json();

        if (res.status === 409 || (result.error && result.error.toLowerCase().includes('email already exists'))) {
          toast.error('Email already exists. Please use a different email address.');
        }
        else if (result.errors && Array.isArray(result.errors)) {
          toast.error('Please fix the form errors and try again.');
        }
        else {
          toast.error(result?.message || result?.error || 'Something went wrong.');
        }
        return false;
      }

      const createdPartner = await res.json();
      toast.success('Partner created successfully!');

      // Step 2: If premium was requested, create premium request
      if (requestPremium && premiumPaymentScreenshot) {
        try {
          // Convert base64 to Blob/File for FormData
          const response = await fetch(premiumPaymentScreenshot);
          const blob = await response.blob();
          const file = new File([blob], 'payment-screenshot.png', { type: blob.type });

          const formData = new FormData();
          formData.append('partnerId', createdPartner.id.toString());
          formData.append('paymentMethod', 'bank_transfer');
          formData.append('paymentScreenshot', file);

          const premiumRes = await fetch('/api/admin/premium-requests/create', {
            method: 'POST',
            body: formData,
          });

          if (premiumRes.ok) {
            toast.success('Premium partnership request submitted successfully! Pending admin approval.');
          } else {
            const errorData = await premiumRes.json();
            console.error('Premium request failed:', errorData);
            toast.error('Partner created but premium request failed. Please submit premium request separately.');
          }
        } catch (premiumError) {
          console.error('Premium request error:', premiumError);
          toast.error('Partner created but premium request failed. Please submit premium request separately.');
        }
      }

      return true;
    } catch (error) {
      console.log(error);
      toast.error('Network error or server down.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PartnerForm
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      title="Add Partner"
      submitButtonText="Submit"
    />
  );
}