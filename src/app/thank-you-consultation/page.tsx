"use client";

import { CheckCircle, Home, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ThankYouConsultationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {/* Success Icon */}
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        
        {/* Thank You Message */}
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Thank You for Your Service!
        </h1>
        
        <p className="text-gray-600 mb-6 leading-relaxed">
          Thank you for treating the patient. The additional consultation fee has been submitted successfully.
        </p>
        
        {/* Payment Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Payment Status:</strong> You will receive your payment soon once the patient completes the payment process.
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="space-y-3">
          <Link 
            href="/dashboard/additional-consultation-fees"
            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            View All Consultation Fees
            <ArrowRight className="w-4 h-4" />
          </Link>
          
          <Link 
            href="/dashboard"
            className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
        
        {/* Footer Note */}
        <p className="text-xs text-gray-500 mt-6">
          The patient will be notified about the additional consultation fee and payment instructions.
        </p>
      </div>
    </div>
  );
}