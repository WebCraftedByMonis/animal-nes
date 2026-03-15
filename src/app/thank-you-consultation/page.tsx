"use client";

import { CheckCircle, Home, ArrowRight, Users, Radio } from 'lucide-react';
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
        
        {/* WhatsApp */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400 font-medium">Stay connected</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <a href="https://chat.whatsapp.com/CqLyuyp92ex6cZ7EtpfwaU" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 border-2 border-[#25D366] rounded-xl hover:bg-[#25D366]/5 transition-colors group">
          <div className="w-9 h-9 bg-[#25D366] rounded-full flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 group-hover:text-[#25D366] transition-colors">Join Community</p>
            <p className="text-xs text-gray-500">Chat with animal lovers &amp; get support</p>
          </div>
          <span className="text-[#25D366] text-xs font-bold">JOIN →</span>
        </a>

        <a href="https://whatsapp.com/channel/0029VaeV6OQ9mrGjhvOQkW2t" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl hover:border-[#25D366] hover:bg-[#25D366]/5 transition-colors group">
          <div className="w-9 h-9 bg-gray-100 group-hover:bg-[#25D366] rounded-full flex items-center justify-center flex-shrink-0 transition-colors">
            <Radio className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 group-hover:text-[#25D366] transition-colors">Follow Channel</p>
            <p className="text-xs text-gray-500">Get exclusive deals &amp; updates</p>
          </div>
          <span className="text-gray-300 group-hover:text-[#25D366] text-xs font-bold transition-colors">FOLLOW →</span>
        </a>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/partner/dashboard/additional-consultation-fees"
            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            View My Consultation Fees
            <ArrowRight className="w-4 h-4" />
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
          The patient will be notified about the additional consultation fee and payment instructions.
        </p>
      </div>
    </div>
  );
}