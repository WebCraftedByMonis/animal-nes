'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import PartnerForm from '@/components/forms/PartnerForm';

export default function AddPartnerClient() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success('Partner created successfully!');
      } else {
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
      }
    } catch (error) {
      console.log(error);
      toast.error('Network error or server down.');
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