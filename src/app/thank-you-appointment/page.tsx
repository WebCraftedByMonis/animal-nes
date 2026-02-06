"use client";

import { CheckCircle, Mail, Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ThankYouAppointmentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 text-center">
        {/* Success Icon */}
        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        
        {/* Thank You Message */}
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          Appointment Submitted Successfully!
        </h1>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
          Thank you for booking your appointment. We are now finding the best doctor for your animal.
        </p>
        
        {/* Next Steps */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3 mb-3">
            <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-left">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">You will receive an email</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">We'll send you doctor details and appointment confirmation</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="text-left">
              <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">Doctor Assignment</p>
              <p className="text-xs text-green-600 dark:text-green-400">A qualified veterinarian will be assigned to your case</p>
            </div>
          </div>
        </div>
        
        {/* What's Next */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">What happens next?</h3>
          <ul className="text-xs text-yellow-700 dark:text-yellow-400 text-left space-y-1">
            <li>• Doctor will be assigned within 24 hours</li>
            <li>• You'll receive email with doctor details</li>
            <li>• Doctor will contact you directly</li>
            <li>• Appointment will be confirmed</li>
          </ul>
        </div>
        
        {/* Action Button */}
        <Link 
          href="/"
          className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          Back to Home
          <ArrowRight className="w-4 h-4" />
        </Link>
        
        {/* Footer Note */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
          Need help? Contact our support team for assistance.
        </p>
      </div>
    </div>
  );
}