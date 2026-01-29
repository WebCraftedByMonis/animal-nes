"use client";

export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Loader2, UploadCloud, X, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { getWhatsAppUrl } from '@/lib/whatsapp-utils';

export default function AdditionalConsultationFeeForm() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdditionalConsultationFeeContent />
    </Suspense>
  );
}

export function AdditionalConsultationFeeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const prescriptionId = searchParams.get('prescriptionId');
  
  const [prescriptionData, setPrescriptionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [consultationFee, setConsultationFee] = useState(0);
  const [feeDescription, setFeeDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<any>({});

  // Fetch prescription data
  useEffect(() => {
    if (prescriptionId) {
      fetchPrescriptionData(prescriptionId);
    } else {
      toast.error('No prescription ID provided');
      router.push('/dashboard/manageprescriptionfrom');
    }
  }, [prescriptionId]);

  const fetchPrescriptionData = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/prescriptions/${id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch prescription');
      }
      const data = await res.json();
      setPrescriptionData(data);
    } catch (error) {
      console.error('Error fetching prescription:', error);
      toast.error('Failed to load prescription data');
      router.push('/dashboard/manageprescriptionfrom');
    } finally {
      setLoading(false);
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
    
    if (!consultationFee || consultationFee <= 0) {
      newErrors.consultationFee = 'Please enter a valid consultation fee';
    }
    
    if (!feeDescription.trim()) {
      newErrors.feeDescription = 'Please provide a description for the additional fee';
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
    
    if (!prescriptionId) {
      toast.error('Invalid prescription ID');
      return;
    }
    
    setSubmitting(true);
    const toastId = toast.loading('Submitting additional consultation fee...');
    
    try {
      const formData = new FormData();
      formData.append('prescriptionId', prescriptionId);
      formData.append('consultationFee', consultationFee.toString());
      formData.append('feeDescription', feeDescription);
      formData.append('paymentMethod', paymentMethod);
      
      if (screenshotFile) {
        formData.append('screenshot', screenshotFile);
      }
      
      const response = await fetch('/api/additional-consultation-fee', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit additional consultation fee');
      }
      
      const result = await response.json();
      
      toast.success('Additional consultation fee submitted successfully!', { id: toastId });
      
      // Redirect to thank you page after success
      setTimeout(() => {
        router.push('/thank-you-consultation');
      }, 1500);
      
    } catch (error: any) {
      console.error('Error submitting additional consultation fee:', error);
      toast.error(error.message || 'Failed to submit additional consultation fee', { id: toastId });
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

  if (!prescriptionData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-green-500 mb-6 text-center">
            Additional Consultation Fee
          </h1>
          
          {/* Prescription Summary */}
          <div className="mb-6 p-4 bg-green-50 rounded-xl">
            <h3 className="font-semibold text-green-700 mb-2">Prescription Details:</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="font-medium">Patient:</span> {prescriptionData.ownerName || 'N/A'}</p>
              <p><span className="font-medium">Contact:</span> {prescriptionData.ownerContact || 'N/A'}</p>
              <p><span className="font-medium">Animal:</span> {prescriptionData.animalSpecies}</p>
              <p><span className="font-medium">Doctor:</span> {prescriptionData.doctorName}</p>
              <p><span className="font-medium">Prescription ID:</span> {prescriptionData.id}</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Consultation Fee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Additional Consultation Fee (PKR) *
              </label>
              <input
                type="number"
                value={consultationFee}
                onChange={(e) => setConsultationFee(parseFloat(e.target.value) || 0)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter amount (e.g., 1000)"
                min="1"
                step="1"
              />
              {errors.consultationFee && (
                <p className="text-red-500 text-sm mt-2">{errors.consultationFee}</p>
              )}
            </div>

            {/* Fee Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Description/Reason for Additional Fee *
              </label>
              <textarea
                value={feeDescription}
                onChange={(e) => setFeeDescription(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Describe the reason for additional consultation fee (e.g., follow-up consultation, additional examination, special treatment)"
                rows={3}
              />
              {errors.feeDescription && (
                <p className="text-red-500 text-sm mt-2">{errors.feeDescription}</p>
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
                      <div className="text-sm text-gray-600"><a href={getWhatsAppUrl("0300-8424741")} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline" onClick={e => e.stopPropagation()}>0300-8424741</a> - Muhammad Fiaz Qamar</div>
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
                      <div className="text-sm text-gray-600"><a href={getWhatsAppUrl("0335-4145431")} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline" onClick={e => e.stopPropagation()}>0335-4145431</a> - Ghazala Yasmeen</div>
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
                      <div className="text-sm text-gray-600">Pay during next visit</div>
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
                  'Submit Additional Fee'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}