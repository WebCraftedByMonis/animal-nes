"use client";
import Link from "next/link";
import { CheckCircle, Mail, Calendar, Phone } from "lucide-react";

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
            <CheckCircle className="w-16 h-16 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-green-600 mb-4">
            Registration Submitted Successfully!
          </h1>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            شکریہ! آپ کی رجسٹریشن کامیابی سے جمع ہوگئی ہے
          </h2>
          <p className="text-lg text-gray-600">
            Thank you for registering for the Master Trainer Program
          </p>
        </div>

        {/* Information Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="space-y-6">
            {/* Email Notification */}
            <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Mail className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  Email Notification
                </h3>
                <p className="text-sm text-blue-800">
                  After we approve your registration, you will receive a confirmation email with all the program details and the Zoom meeting link.
                </p>
                <p className="text-sm text-blue-800 mt-2 font-medium">
                  منظوری کے بعد آپ کو ای میل موصول ہوگی جس میں پروگرام کی تفصیلات اور زوم لنک ہوگا
                </p>
              </div>
            </div>

            {/* Program Details */}
            <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <Calendar className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">
                  Program Details
                </h3>
                <p className="text-sm text-green-800">
                  <strong>Event Timing:</strong> November 29 - December 14, 2025
                </p>
                <p className="text-sm text-green-800 mt-1">
                  Please wait for the approval email before joining the program.
                </p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="flex items-start space-x-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <Phone className="w-6 h-6 text-yellow-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">
                  Need Help?
                </h3>
                <p className="text-sm text-yellow-800">
                  If you have any questions, feel free to contact us:
                </p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-yellow-900">
                    <strong>Phone:</strong>{" "}
                    <a
                      href="tel:+923354145431"
                      className="text-blue-600 hover:underline"
                    >
                      (+92) 335-4145431
                    </a>
                  </p>
                  <p className="text-sm text-yellow-900">
                    <strong>Email:</strong>{" "}
                    <a
                      href="mailto:animalwellnessshop@gmail.com"
                      className="text-blue-600 hover:underline"
                    >
                      animalwellnessshop@gmail.com
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* What's Next */}
            <div className="border-t pt-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                What happens next?
              </h3>
              <ol className="space-y-3">
                <li className="flex items-start">
                  <span className="flex items-center justify-center w-6 h-6 bg-green-600 text-white rounded-full text-sm font-bold mr-3 flex-shrink-0">
                    1
                  </span>
                  <div>
                    <p className="text-gray-700">
                      Our team will review your registration and payment screenshot
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      ہماری ٹیم آپ کی رجسٹریشن اور پیمنٹ کی تصدیق کرے گی
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex items-center justify-center w-6 h-6 bg-green-600 text-white rounded-full text-sm font-bold mr-3 flex-shrink-0">
                    2
                  </span>
                  <div>
                    <p className="text-gray-700">
                      Once approved, you'll receive a detailed email with program information
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      منظوری کے بعد آپ کو تفصیلی ای میل ملے گی
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex items-center justify-center w-6 h-6 bg-green-600 text-white rounded-full text-sm font-bold mr-3 flex-shrink-0">
                    3
                  </span>
                  <div>
                    <p className="text-gray-700">
                      Join the program on the scheduled date using the Zoom link provided
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      دیئے گئے زوم لنک کے ذریعے مقررہ تاریخ پر پروگرام میں شامل ہوں
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="text-center space-y-4">
          <Link
            href="/"
            className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-lg transition shadow-md hover:shadow-lg"
          >
            Return to Home
          </Link>
          <p className="text-sm text-gray-500">
            Please check your email regularly for updates
          </p>
        </div>
      </div>
    </div>
  );
}
