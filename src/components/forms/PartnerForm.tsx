'use client';

import React, { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Dropzone from 'react-dropzone';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'react-hot-toast';
import { SuggestiveInput } from '@/components/shared/SuggestiveInput';
import {
  partnerTypeOptions,
  getSpecializationsByPartnerType,
  farmerSpecializations
} from '@/lib/partner-constants';
import { Plus, Trash2 } from 'lucide-react';
import { getWhatsAppUrl } from '@/lib/whatsapp-utils';

const genderOptions = ['MALE', 'FEMALE'] as const;
const sendToPartnerOptions = ['YES', 'NO'] as const;
const bloodGroupOptions = [
  'A_POSITIVE', 'B_POSITIVE', 'A_NEGATIVE', 'B_NEGATIVE',
  'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'
] as const;
const dayOptions = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY',
  'FRIDAY', 'SATURDAY', 'SUNDAY'
] as const;

const animalEntrySchema = z.object({
  animalType: z.string().min(1, "Animal type is required"),
  count: z.number().int().positive("Count must be at least 1"),
});

const formSchema = z.object({
  partnerName: z.string().min(1, "Partner name is required"),
  gender: z.enum(genderOptions).optional(),
  partnerEmail: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  partnerMobileNumber: z.string().optional(),
  shopName: z.string().optional(),
  cityName: z.string().optional(),
  country: z.string().optional(),
  fullAddress: z.string().optional(),
  rvmpNumber: z.string().optional(),
  sendToPartner: z.enum(sendToPartnerOptions).optional(),
  qualificationDegree: z.string().optional(),
  zipcode: z.string().optional(),
  state: z.string().optional(),
  areaTown: z.string().optional(),
  password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
  bloodGroup: z.enum(bloodGroupOptions).optional(),
  availableDays: z.array(z.enum(dayOptions)).min(1, "Please select at least one available day"),
  startTimeIds: z.array(z.number()).optional(),
  specialization: z.string().optional(),
  species: z.string().optional(),
  partnerType: z.string().optional(),
  numberOfAnimals: z.number().int().positive().optional(),
  animalEntries: z.array(animalEntrySchema).optional(),
  productIds: z.array(z.number()).optional(),
  image: z.string().min(1, "Image is required"),
  requestPremium: z.boolean().optional(),
  premiumPaymentScreenshot: z.string().optional(),
  referralCode: z.string().optional(),
}).refine((data) => {
  // If premium is requested, payment screenshot is required
  if (data.requestPremium && !data.premiumPaymentScreenshot) {
    return false;
  }
  return true;
}, {
  message: "Payment screenshot is required when requesting premium partnership",
  path: ["premiumPaymentScreenshot"],
});

type FormData = z.infer<typeof formSchema>;

interface PartnerFormProps {
  onSubmit: (data: FormData) => Promise<boolean>;
  isSubmitting: boolean;
  initialData?: Partial<FormData>;
  title?: string;
  submitButtonText?: string;
}

export default function PartnerForm({
  onSubmit,
  isSubmitting,
  initialData,
  title = "Add Partner",
  submitButtonText = "Submit"
}: PartnerFormProps) {
  const [uploadedImage, setUploadedImage] = useState<string>(initialData?.image || '');
  const [premiumPaymentImage, setPremiumPaymentImage] = useState<string>(initialData?.premiumPaymentScreenshot || '');

  // Get referral code from URL if present
  const [urlReferralCode, setUrlReferralCode] = useState<string>('');
  
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    clearErrors,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partnerName: initialData?.partnerName || '',
      gender: initialData?.gender || undefined,
      partnerEmail: initialData?.partnerEmail || '',
      partnerMobileNumber: initialData?.partnerMobileNumber || '',
      shopName: initialData?.shopName || '',
      cityName: initialData?.cityName || '',
      country: initialData?.country || '',
      fullAddress: initialData?.fullAddress || '',
      rvmpNumber: initialData?.rvmpNumber || '',
      sendToPartner: initialData?.sendToPartner || undefined,
      qualificationDegree: initialData?.qualificationDegree || '',
      zipcode: initialData?.zipcode || '',
      state: initialData?.state || '',
      areaTown: initialData?.areaTown || '',
      password: initialData?.password || '',
      bloodGroup: initialData?.bloodGroup || undefined,
      availableDays: initialData?.availableDays || [],
      startTimeIds: initialData?.startTimeIds || [],
      specialization: initialData?.specialization || '',
      species: initialData?.species || '',
      partnerType: initialData?.partnerType || undefined,
      numberOfAnimals: initialData?.numberOfAnimals || undefined,
      animalEntries: initialData?.animalEntries || [],
      productIds: initialData?.productIds || [],
      image: initialData?.image || '',
      requestPremium: initialData?.requestPremium || false,
      premiumPaymentScreenshot: initialData?.premiumPaymentScreenshot || '',
      referralCode: initialData?.referralCode || '',
    },
  });

  // Get referral code from URL on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref');
      if (refCode) {
        setUrlReferralCode(refCode);
        setValue('referralCode', refCode);
      }
    }
  }, [setValue]);

  // Watch partner type to determine specialization options
  const partnerType = watch('partnerType');
  
  // Get specialization suggestions based on partner type
  const specializationSuggestions = useMemo(() => {
    return getSpecializationsByPartnerType(partnerType || '');
  }, [partnerType]);

  // Clear specialization when partner type changes
  React.useEffect(() => {
    setValue('specialization', '');
  }, [partnerType, setValue]);

  const onDrop = (acceptedFiles: File[]) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setUploadedImage(reader.result as string);
        setValue('image', reader.result as string);
      }
    };
    reader.readAsDataURL(acceptedFiles[0]);
  };

  const onPremiumPaymentDrop = (acceptedFiles: File[]) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setPremiumPaymentImage(reader.result as string);
        setValue('premiumPaymentScreenshot', reader.result as string);
        clearErrors('premiumPaymentScreenshot');
      }
    };
    reader.readAsDataURL(acceptedFiles[0]);
  };

  // Helper function to reset form completely
  const resetFormCompletely = () => {
    reset({
      partnerName: '',
      gender: undefined,
      partnerEmail: '',
      partnerMobileNumber: '',
      shopName: '',
      cityName: '',
      country: '',
      fullAddress: '',
      rvmpNumber: '',
      sendToPartner: undefined,
      qualificationDegree: '',
      zipcode: '',
      state: '',
      areaTown: '',
      password: '',
      bloodGroup: undefined,
      availableDays: [],
      startTimeIds: [],
      specialization: '',
      species: '',
      partnerType: undefined,
      numberOfAnimals: undefined,
      animalEntries: [],
      productIds: [],
      image: '',
      requestPremium: false,
      premiumPaymentScreenshot: '',
      referralCode: '',
    });
    setUploadedImage('');
    setPremiumPaymentImage('');
    setUrlReferralCode('');
    clearErrors();
  };

  const handleFormSubmit = async (data: FormData) => {
    console.log('Form submission started with data:', data);
    try {
      const success = await onSubmit(data);
      if (success && !initialData) {
        // Only reset form if submission was successful and it's a new partner (add mode)
        resetFormCompletely();
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Form submission failed');
      // Don't reset the form on error, just let the parent handle the error state
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-green-500">{title}</h1>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="partnerName">Partner Name*</Label>
            <Input id="partnerName" {...register('partnerName')} className="focus:border-green-500 focus:ring-green-500" />
            {errors.partnerName && <p className="text-red-500 text-sm">{errors.partnerName.message}</p>}
          </div>

          <div>
            <Label htmlFor="partnerEmail">Email*</Label>
            <Input id="partnerEmail" {...register('partnerEmail')} className="focus:border-green-500 focus:ring-green-500" />
            {errors.partnerEmail && <p className="text-red-500 text-sm">{errors.partnerEmail.message}</p>}
          </div>

          <div>
            <Label htmlFor="partnerMobileNumber">Mobile Number</Label>
            <Input id="partnerMobileNumber" {...register('partnerMobileNumber')} className="focus:border-green-500 focus:ring-green-500" />
            {errors.partnerMobileNumber && <p className="text-red-500 text-sm">{errors.partnerMobileNumber.message}</p>}
          </div>

          <div>
            <Label htmlFor="gender">Gender</Label>
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="focus:border-green-500 focus:ring-green-500">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {genderOptions.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.gender && <p className="text-red-500 text-sm">{errors.gender.message}</p>}
          </div>

          <div>
            <Label htmlFor="partnerType">Partner Type</Label>
            <Controller
              control={control}
              name="partnerType"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="focus:border-green-500 focus:ring-green-500">
                    <SelectValue placeholder="Select partner type" />
                  </SelectTrigger>
                  <SelectContent>
                    {partnerTypeOptions.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.partnerType && <p className="text-red-500 text-sm">{errors.partnerType.message}</p>}
          </div>

          {/* Animal Entries - only shown when partner type is Farmer */}
          {partnerType === 'Farmer' && (
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <Label>Animals & Quantities</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-green-500 text-green-600 hover:bg-green-50"
                  onClick={() => {
                    const currentEntries = watch('animalEntries') || [];
                    setValue('animalEntries', [...currentEntries, { animalType: '', count: 1 }]);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Animal
                </Button>
              </div>

              <div className="space-y-3">
                {(watch('animalEntries') || []).map((entry, index) => (
                  <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg border">
                    <div className="flex-1">
                      <Label className="text-xs text-gray-500">Animal Type</Label>
                      <Controller
                        control={control}
                        name={`animalEntries.${index}.animalType`}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="focus:border-green-500 focus:ring-green-500">
                              <SelectValue placeholder="Select animal" />
                            </SelectTrigger>
                            <SelectContent>
                              {farmerSpecializations.filter(animal => animal !== 'Others').map((animal) => (
                                <SelectItem key={animal} value={animal}>{animal}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="w-24">
                      <Label className="text-xs text-gray-500">Count</Label>
                      <Input
                        type="number"
                        min="1"
                        value={entry.count}
                        onChange={(e) => {
                          const currentEntries = watch('animalEntries') || [];
                          const updatedEntries = [...currentEntries];
                          updatedEntries[index] = { ...updatedEntries[index], count: parseInt(e.target.value) || 1 };
                          setValue('animalEntries', updatedEntries);
                        }}
                        className="focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                    <div className="pt-5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          const currentEntries = watch('animalEntries') || [];
                          setValue('animalEntries', currentEntries.filter((_, i) => i !== index));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {(watch('animalEntries') || []).length === 0 && (
                  <div className="text-center py-4 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                    <p className="text-sm">No animals added yet</p>
                    <p className="text-xs">Click "Add Animal" to add your animals</p>
                  </div>
                )}

                {(watch('animalEntries') || []).length > 0 && (
                  <div className="text-sm text-green-600 font-medium">
                    Total: {(watch('animalEntries') || []).reduce((sum, e) => sum + (e.count || 0), 0)} animals ({(watch('animalEntries') || []).length} types)
                  </div>
                )}
              </div>
              {errors.animalEntries && <p className="text-red-500 text-sm mt-1">{errors.animalEntries.message}</p>}
            </div>
          )}

          <div>
            <Label htmlFor="shopName">Shop Name/Instition </Label>
            <Input id="shopName" {...register('shopName')} className="focus:border-green-500 focus:ring-green-500" />
            {errors.shopName && <p className="text-red-500 text-sm">{errors.shopName.message}</p>}
          </div>

          {/* Specialization field with conditional autocomplete */}
          <div>
            <Label htmlFor="specialization">Specialization</Label>
            {partnerType ? (
              <SuggestiveInput
                suggestions={specializationSuggestions}
                value={watch('specialization') || ''}
                onChange={(v) => setValue('specialization', v)}
                placeholder={`Select ${partnerType.toLowerCase()} specialization`}
              />
            ) : (
              <Input
                id="specialization"
                {...register('specialization')}
                className="focus:border-green-500 focus:ring-green-500"
                placeholder="Select partner type first"
                disabled
              />
            )}
            {errors.specialization && <p className="text-red-500 text-sm">{errors.specialization.message}</p>}
          </div>

          <div>
            <Label htmlFor="cityName">City</Label>
            <Input id="cityName" {...register('cityName')} className="focus:border-green-500 focus:ring-green-500" />
            {errors.cityName && <p className="text-red-500 text-sm">{errors.cityName.message}</p>}
          </div>

          <div>
            <Label htmlFor="country">Country</Label>
            <Controller
              control={control}
              name="country"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="focus:border-green-500 focus:ring-green-500">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pakistan">Pakistan</SelectItem>
                    <SelectItem value="UAE">UAE</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.country && <p className="text-red-500 text-sm">{errors.country.message}</p>}
          </div>

          <div>
            <Label>State</Label>
            <SuggestiveInput
              suggestions={[
                "Punjab",
                "Sindh",
                "Balochistan",
                "Khyber Pakhtunkhwa",
                "Gilgit Baltistan",
                "Kashmir",
                "Islamabad",
              ]}
              value={watch('state') || ""}
              onChange={(v) => setValue('state', v)}
              placeholder="Enter state"
            />
            {errors.state && <p className="text-red-500 text-sm">{errors.state.message}</p>}
          </div>

          <div>
  <Label htmlFor="areaTown">Date of Birth</Label>
  <Input 
    type="date"
    id="areaTown" 
    {...register('areaTown')} 
    className="focus:border-green-500 focus:ring-green-500" 
  />
  {errors.areaTown && <p className="text-red-500 text-sm">{errors.areaTown.message}</p>}
</div>

          <div className="md:col-span-2">
            <Label htmlFor="fullAddress">Full Address/ Map Link</Label>
            <Textarea id="fullAddress" {...register('fullAddress')} className="focus:border-green-500 focus:ring-green-500" />
            {errors.fullAddress && <p className="text-red-500 text-sm">{errors.fullAddress.message}</p>}
          </div>

          <div>
            <Label htmlFor="rvmpNumber">RVMP no./ License no. / Registration no.</Label>
            <Input id="rvmpNumber" {...register('rvmpNumber')} className="focus:border-green-500 focus:ring-green-500" />
            {errors.rvmpNumber && <p className="text-red-500 text-sm">{errors.rvmpNumber.message}</p>}
          </div>

          <div>
            <Label htmlFor="qualificationDegree">Qualification Degree</Label>
            <Input id="qualificationDegree" {...register('qualificationDegree')} className="focus:border-green-500 focus:ring-green-500" />
            {errors.qualificationDegree && <p className="text-red-500 text-sm">{errors.qualificationDegree.message}</p>}
          </div>

          <div>
            <Label htmlFor="bloodGroup">Blood Group</Label>
            <Controller
              control={control}
              name="bloodGroup"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="focus:border-green-500 focus:ring-green-500">
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    {bloodGroupOptions.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.bloodGroup && <p className="text-red-500 text-sm">{errors.bloodGroup.message}</p>}
          </div>

          <div>
            <Label htmlFor="password">Password* (min. 6 characters)</Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              className="focus:border-green-500 focus:ring-green-500"
              placeholder="Enter partner password"
            />
            {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
          </div>

          <div>
            <Label htmlFor="referralCode">Referral Code (Optional)</Label>
            <Input
              id="referralCode"
              {...register('referralCode')}
              className="focus:border-green-500 focus:ring-green-500"
              placeholder="Enter referral code"
              readOnly={!!urlReferralCode}
            />
            {urlReferralCode && (
              <p className="text-sm text-green-600 mt-1">✓ Referred by partner</p>
            )}
            {errors.referralCode && <p className="text-red-500 text-sm">{errors.referralCode.message}</p>}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <Label>Available Days*</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-green-500 text-green-600 hover:bg-green-50"
              onClick={() => {
                const currentDays = watch('availableDays');
                const allSelected = dayOptions.every(day => currentDays.includes(day));
                setValue('availableDays', allSelected ? [] : [...dayOptions]);
              }}
            >
              {dayOptions.every(day => watch('availableDays').includes(day)) ? 'Unselect All' : 'Select All Days'}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {dayOptions.map((day) => (
              <label key={day} className="flex items-center space-x-2">
                <Checkbox
                  checked={watch('availableDays').includes(day)}
                  onCheckedChange={(checked) => {
                    const prev = watch('availableDays');
                    setValue(
                      'availableDays',
                      checked ? [...prev, day] : prev.filter((d) => d !== day)
                    );
                  }}
                />
                <span>{day}</span>
              </label>
            ))}
          </div>
          {errors.availableDays && <p className="text-red-500 text-sm">{errors.availableDays.message}</p>}
        </div>

        <div>
          <Label>Image Upload*</Label>
          <Dropzone onDrop={onDrop} accept={{ 'image/*': [] }} multiple={false}>
            {({ getRootProps, getInputProps }) => (
              <div {...getRootProps()} className="border border-dashed border-green-500 p-4 text-center cursor-pointer">
                <input {...getInputProps()} />
                {uploadedImage ? (
                  <Image src={uploadedImage} alt="Preview" width={200} height={200} className="mx-auto" />
                ) : (
                  <p>Drag and drop or click to select an image</p>
                )}
              </div>
            )}
          </Dropzone>
          {errors.image && <p className="text-red-500 text-sm">{errors.image.message}</p>}
        </div>

        {/* Premium Partnership Section */}
        <div className="border-t pt-6 mt-6">
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg mb-4 border-2 border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <h3 className="text-xl font-bold text-green-800">Premium Partnership - 5000 PKR</h3>
            </div>

            <div className="bg-white p-4 rounded-lg mb-4">
              <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Premium Benefits:
              </h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span><strong>Priority Listing:</strong> Your profile appears at the top of search results</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span><strong>Verified Badge:</strong> Get a premium badge on your profile</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span><strong>Enhanced Visibility:</strong> Featured on homepage and category pages</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span><strong>Priority Support:</strong> Get faster response from our support team</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span><strong>Analytics Dashboard:</strong> Track views and inquiries on your profile</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span><strong>Marketing Benefits:</strong> Featured in promotional emails and newsletters</span>
                </li>
              </ul>
            </div>

            <label className="flex items-center space-x-3 cursor-pointer bg-white p-3 rounded-lg border-2 border-green-300 hover:bg-green-50 transition">
              <Checkbox
                checked={watch('requestPremium')}
                onCheckedChange={(checked) => {
                  setValue('requestPremium', !!checked);
                  if (!checked) {
                    setPremiumPaymentImage('');
                    setValue('premiumPaymentScreenshot', '');
                  }
                }}
              />
              <span className="font-semibold text-green-800">✅ I want to request Premium Partnership (5000 PKR)</span>
            </label>
          </div>

          {watch('requestPremium') && (
            <div className="space-y-4">
              {/* Payment Details Section - Shows when checkbox is checked */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border-2 border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-4 flex items-center gap-2 text-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Payment Details (5000 PKR):
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
                    <p className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                      📱 Jazz Cash:
                    </p>
                    <p className="text-gray-700"><strong>Account Title:</strong> Muhammad Fiaz Qamar</p>
                    <p className="text-gray-700"><strong>Mobile Number:</strong> <a href={getWhatsAppUrl("0300-8424741")} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">0300-8424741</a></p>
                  </div>

                  <div className="p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
                    <p className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                      💳 Easypaisa:
                    </p>
                    <p className="text-gray-700"><strong>Account Title:</strong> Ghazala Yasmeen</p>
                    <p className="text-gray-700"><strong>Mobile Number:</strong> <a href={getWhatsAppUrl("03354145431")} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">03354145431</a></p>
                  </div>

                  <div className="p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
                    <p className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                      🏦 Bank Alfalah:
                    </p>
                    <p className="text-gray-700"><strong>Account Title:</strong> ZAIDIS INTERNATIONAL</p>
                    <p className="text-gray-700"><strong>Account Number:</strong> 01531002450497</p>
                    <p className="text-gray-700"><strong>IBAN:</strong> PK82ALFH0153001002450497</p>
                    <p className="text-gray-700"><strong>Swift Code:</strong> ALFHPKKAXXX</p>
                    <p className="text-gray-700"><strong>Branch:</strong> Chauburji Branch, Lahore (Code: 0153)</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                  <p className="text-xs text-yellow-800 font-medium">
                    ⚠️ Please make sure to upload the payment screenshot after transferring the amount of 5000 PKR to any of the above accounts.
                  </p>
                </div>
              </div>

              {/* Upload Screenshot Section */}
              <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-300">
                <div className="flex items-start gap-2 mb-3">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-yellow-800 mb-1">Important: Upload Payment Screenshot</h4>
                    <p className="text-sm text-yellow-700">
                      After making the payment via Jazz Cash, Easypaisa, or Bank Alfalah, please upload a clear screenshot/photo of the payment receipt below.
                    </p>
                  </div>
                </div>

                <Label className="text-base font-semibold text-gray-800">Payment Screenshot*</Label>
                <Dropzone onDrop={onPremiumPaymentDrop} accept={{ 'image/*': [] }} multiple={false}>
                  {({ getRootProps, getInputProps }) => (
                    <div {...getRootProps()} className="border-2 border-dashed border-green-500 bg-white p-6 text-center cursor-pointer rounded-lg hover:bg-green-50 transition">
                      <input {...getInputProps()} />
                      {premiumPaymentImage ? (
                        <div>
                          <Image src={premiumPaymentImage} alt="Payment Screenshot" width={200} height={200} className="mx-auto rounded-lg shadow-md" />
                          <p className="text-sm text-green-600 mt-2 font-medium">✓ Screenshot uploaded successfully</p>
                        </div>
                      ) : (
                        <div>
                          <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-gray-600 font-medium">📸 Click or drag to upload payment screenshot</p>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG, JPEG up to 10MB</p>
                        </div>
                      )}
                    </div>
                  )}
                </Dropzone>
                {errors.premiumPaymentScreenshot && (
                  <p className="text-red-500 text-sm font-medium mt-2">⚠️ {errors.premiumPaymentScreenshot.message}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <Input type="hidden" {...register('image')} />
        <Input type="hidden" {...register('premiumPaymentScreenshot')} />

        <Button
          type="submit"
          className="bg-green-500 hover:bg-green-600 text-white"
          disabled={isSubmitting}
          onClick={() => {
            console.log('Submit button clicked!');
            console.log('Form errors:', errors);
            console.log('Current form values:', watch());
          }}
        >
          {isSubmitting ? 'Submitting...' : submitButtonText}
        </Button>
      </form>
    </div>
  );
}