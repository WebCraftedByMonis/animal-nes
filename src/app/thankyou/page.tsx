import Link from "next/link";
import { CheckCircle, Package, Users, Radio, ArrowRight, ShoppingBag } from "lucide-react";

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full">

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">

          {/* Green header */}
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-10 text-white text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">Order Placed!</h1>
            <p className="text-emerald-100 text-sm">
              Thank you for your order. We&apos;ve received it and will begin processing shortly.
            </p>
          </div>

          <div className="px-8 py-6 space-y-5">

            {/* What happens next */}
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <Package className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">What happens next?</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  A confirmation email has been sent to you. Our team will process and dispatch your order within 1–2 business days.
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 font-medium">Stay connected with us</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* WhatsApp Community */}
            <a
              href="https://chat.whatsapp.com/CqLyuyp92ex6cZ7EtpfwaU"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 border-2 border-[#25D366] rounded-2xl hover:bg-[#25D366]/5 transition-all group"
            >
              <div className="w-11 h-11 bg-[#25D366] rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 group-hover:text-[#25D366] transition-colors">
                  Join our WhatsApp Community
                </p>
                <p className="text-xs text-gray-500">Connect with animal lovers, ask questions, get tips</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#25D366] flex-shrink-0" />
            </a>

            {/* WhatsApp Channel */}
            <a
              href="https://whatsapp.com/channel/0029VaeV6OQ9mrGjhvOQkW2t"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-2xl hover:border-[#25D366] hover:bg-[#25D366]/5 transition-all group"
            >
              <div className="w-11 h-11 bg-gray-100 group-hover:bg-[#25D366] rounded-full flex items-center justify-center flex-shrink-0 transition-colors">
                <Radio className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 group-hover:text-[#25D366] transition-colors">
                  Follow our WhatsApp Channel
                </p>
                <p className="text-xs text-gray-500">Get exclusive deals, product launches &amp; news</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#25D366] flex-shrink-0 transition-colors" />
            </a>

            {/* CTA buttons */}
            <div className="flex gap-3 pt-2">
              <Link href="/orders"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <Package className="w-4 h-4" />
                My Orders
              </Link>
              <Link href="/products"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors">
                <ShoppingBag className="w-4 h-4" />
                Continue Shopping
              </Link>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
