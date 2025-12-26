"use client";

import { CheckCircle, Home, ArrowRight, FileText } from 'lucide-react';
import Link from 'next/link';

export default function ThankYouPrescriptionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {/* Success Icon */}
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>

        {/* Thank You Message */}
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Prescription Submitted Successfully!
        </h1>

        <p className="text-gray-600 mb-6 leading-relaxed">
          Thank you for completing the prescription. The patient has been notified and will receive their prescription details.
        </p>

        {/* Information Box */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3 text-left">
            <FileText className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-green-800 font-medium mb-1">
                What's Next?
              </p>
              <p className="text-xs text-green-700">
                The patient will receive the prescription details and treatment instructions. You can view all your submitted prescriptions in the dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/partner/dashboard/manageprescriptionfrom"
            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            View My Prescriptions
          </Link>

          <Link
            href="/partner/dashboard"
            className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Partner Dashboard
          </Link>
        </div>

        {/* Footer Note */}
        <p className="text-xs text-gray-500 mt-6">
          The prescription has been saved and the patient will be able to access it for their treatment.
        </p>
      </div>
    </div>
  );
}
