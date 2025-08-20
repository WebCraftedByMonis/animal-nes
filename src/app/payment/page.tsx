// app/payment/page.tsx
"use client";



export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Loader2, UploadCloud, X, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

export default function PaymentForm() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentFormContent />
    </Suspense>
  );
}



export  function PaymentFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const appointmentId = searchParams.get('appointmentId');
  
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [consultationType, setConsultationType] = useState('');
  const [consultationFee, setConsultationFee] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<any>({});

  // Fetch appointment data
  useEffect(() => {
    if (appointmentId) {
      fetchAppointmentData(appointmentId);
    } else {
      toast.error('No appointment ID provided');
      router.push('/findDoctor');
    }
  }, [appointmentId]);

  const fetchAppointmentData = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments/${id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch appointment');
      }
      const data = await res.json();
      setAppointmentData(data);
    } catch (error) {
      console.error('Error fetching appointment:', error);
      toast.error('Failed to load appointment data');
      router.push('/findDoctor');
    } finally {
      setLoading(false);
    }
  };

  // Handle consultation type change
  const handleConsultationTypeChange = (type: string) => {
    setConsultationType(type);
    // Set fee based on type
    switch(type) {
      case 'needy':
        setConsultationFee(0);
        break;
      case 'virtual':
        setConsultationFee(500);
        break;
      case 'physical':
        setConsultationFee(1000);
        break;
      default:
        setConsultationFee(0);
    }
    // Clear error
    if (errors.consultationType) {
      setErrors({ ...errors, consultationType: null });
    }
  };

  // Handle payment method change
  const handlePaymentMethodChange = (method: string) => {
    setPaymentMethod(method);
    // Clear error
    if (errors.paymentMethod) {
      setErrors({ ...errors, paymentMethod: null });
    }
    // If COD is selected, clear screenshot error
    if (method === 'cod' && errors.screenshot) {
      setErrors({ ...errors, screenshot: null });
    }
  };

  // Dropzone for image upload
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      
      setScreenshotFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Clear error
      if (errors.screenshot) {
        setErrors({ ...errors, screenshot: null });
      }
    }
  }, [errors]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    multiple: false
  });

  // Remove screenshot
  const removeScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
  };

  // Validate form
  const validateForm = () => {
    const newErrors: any = {};
    
    if (!consultationType) {
      newErrors.consultationType = 'Please select consultation type';
    }
    
    if (!paymentMethod) {
      newErrors.paymentMethod = 'Please select payment method';
    }
    
    // Screenshot required for all payment methods except COD
    if (paymentMethod && paymentMethod !== 'cod' && !screenshotFile) {
      newErrors.screenshot = 'Payment screenshot is required for online payment';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };



  

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fill all required fields');
      return;
    }
    
    if (!appointmentId) {
      toast.error('Invalid appointment ID');
      return;
    }
    
    setSubmitting(true);
    const toastId = toast.loading('Submitting payment information...');
    
    try {
      const formData = new FormData();
      formData.append('appointmentId', appointmentId);
      formData.append('consultationType', consultationType);
      formData.append('consultationFee', consultationFee.toString());
      formData.append('paymentMethod', paymentMethod);
      
      if (screenshotFile) {
        formData.append('screenshot', screenshotFile);
      }
      
      const response = await fetch('/api/appointment-payment', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit payment');
      }
      
      const result = await response.json();
      
      toast.success('Payment information submitted successfully!', { id: toastId });
      
      // Redirect to dashboard after success
     
      
    } catch (error: any) {
      console.error('Error submitting payment:', error);
      toast.error(error.message || 'Failed to submit payment information', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (!appointmentData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-green-500 mb-6 text-center">
            Payment Information
          </h1>
          
          {/* Appointment Summary */}
          <div className="mb-6 p-4 bg-green-50 rounded-xl">
            <h3 className="font-semibold text-green-700 mb-2">Appointment Details:</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="font-medium">Customer:</span> {appointmentData.customer?.name || 'N/A'}</p>
              <p><span className="font-medium">Contact:</span> {appointmentData.doctor}</p>
              <p><span className="font-medium">Location:</span> {appointmentData.city}, {appointmentData.state || 'Pakistan'}</p>
              <p><span className="font-medium">Animal:</span> {appointmentData.species}</p>
              <p><span className="font-medium">Issue:</span> {appointmentData.description}</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Consultation Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Consultation Type *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleConsultationTypeChange('needy')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    consultationType === 'needy'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-green-400'
                  }`}
                >
                  <div className="font-semibold">Needy</div>
                  <div className="text-2xl font-bold text-green-600 mt-1">Free</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleConsultationTypeChange('virtual')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    consultationType === 'virtual'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-green-400'
                  }`}
                >
                  <div className="font-semibold">Virtual</div>
                  <div className="text-2xl font-bold text-green-600 mt-1">500 PKR</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleConsultationTypeChange('physical')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    consultationType === 'physical'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-green-400'
                  }`}
                >
                  <div className="font-semibold">Physical</div>
                  <div className="text-2xl font-bold text-green-600 mt-1">1000 PKR</div>
                </button>
              </div>
              {errors.consultationType && (
                <p className="text-red-500 text-sm mt-2">{errors.consultationType}</p>
              )}
            </div>
            
            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Payment Method *
              </label>
              <div className="space-y-3">
                <div
                  onClick={() => handlePaymentMethodChange('jazzcash')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'jazzcash'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-green-400'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">JazzCash</div>
                      <div className="text-sm text-gray-600">0300-8424741 - Muhammad Fiaz Qamar</div>
                    </div>
                    {paymentMethod === 'jazzcash' && <CheckCircle className="h-5 w-5 text-green-500" />}
                  </div>
                </div>
                
                <div
                  onClick={() => handlePaymentMethodChange('easypaisa')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'easypaisa'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-green-400'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">Easypaisa</div>
                      <div className="text-sm text-gray-600">0335-4145431 - Ghazala Yasmeen</div>
                    </div>
                    {paymentMethod === 'easypaisa' && <CheckCircle className="h-5 w-5 text-green-500" />}
                  </div>
                </div>
                
                <div
                  onClick={() => handlePaymentMethodChange('bank')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'bank'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-green-400'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">Bank Alfalah</div>
                      <div className="text-sm text-gray-600">ZAIDIS INTERNATIONAL - 01531002450497</div>
                      <div className="text-xs text-gray-500">Chauburji Branch, Lahore</div>
                    </div>
                    {paymentMethod === 'bank' && <CheckCircle className="h-5 w-5 text-green-500" />}
                  </div>
                </div>
                
                <div
                  onClick={() => handlePaymentMethodChange('cod')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'cod'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-green-400'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">Cash on Delivery (COD)</div>
                      <div className="text-sm text-gray-600">Pay when doctor arrives</div>
                    </div>
                    {paymentMethod === 'cod' && <CheckCircle className="h-5 w-5 text-green-500" />}
                  </div>
                </div>
              </div>
              {errors.paymentMethod && (
                <p className="text-red-500 text-sm mt-2">{errors.paymentMethod}</p>
              )}
            </div>
            
            {/* Payment Screenshot Upload - Only show if not COD */}
            {paymentMethod && paymentMethod !== 'cod' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Payment Screenshot *
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Please attach a screenshot of your payment transaction
                </p>
                
                {!screenshotPreview ? (
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                      isDragActive ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <UploadCloud className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">
                      Drag and drop your screenshot here, or click to select
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Supports: JPEG, JPG, PNG, WEBP (Max 5MB)
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative w-full h-64 border-2 border-green-500 rounded-xl overflow-hidden">
                      <Image
                        src={screenshotPreview}
                        alt="Payment screenshot"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={removeScreenshot}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      Click the X to remove and upload a different screenshot
                    </p>
                  </div>
                )}
                
                {errors.screenshot && (
                  <p className="text-red-500 text-sm mt-2">{errors.screenshot}</p>
                )}
              </div>
            )}
            
            {/* Important Note */}
            {consultationFee > 0 && paymentMethod && paymentMethod !== 'cod' && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> Please complete the payment of <strong>{consultationFee} PKR</strong> to the selected payment method before uploading the screenshot.
                </p>
              </div>
            )}
            
            {/* Submit Buttons */}
            <div className="flex justify-between gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                disabled={submitting}
              >
                Back
              </button>
              
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Payment Information'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}