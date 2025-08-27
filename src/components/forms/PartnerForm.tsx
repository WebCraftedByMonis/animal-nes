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
import { toast } from 'react-toastify';
import { SuggestiveInput } from '@/components/shared/SuggestiveInput';
import { 
  partnerTypeOptions, 
  getSpecializationsByPartnerType 
} from '@/lib/partner-constants';

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

const formSchema = z.object({
  partnerName: z.string().min(1, "Partner name is required"),
  gender: z.enum(genderOptions).optional(),
  partnerEmail: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  partnerMobileNumber: z.string().optional(),
  shopName: z.string().optional(),
  cityName: z.string().optional(),
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
  productIds: z.array(z.number()).optional(),
  image: z.string().min(1, "Image is required"),
});

type FormData = z.infer<typeof formSchema>;

interface PartnerFormProps {
  onSubmit: (data: FormData) => Promise<void>;
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
      fullAddress: initialData?.fullAddress || '',
      rvmpNumber: initialData?.rvmpNumber || '',
      sendToPartner: initialData?.sendToPartner || undefined,
      qualificationDegree: initialData?.qualificationDegree || '',
      zipcode: initialData?.zipcode || '',
      state: initialData?.state || '',
      areaTown: initialData?.areaTown || '',
      password: initialData?.password || '1234566',
      bloodGroup: initialData?.bloodGroup || undefined,
      availableDays: initialData?.availableDays || [],
      startTimeIds: initialData?.startTimeIds || [],
      specialization: initialData?.specialization || '',
      species: initialData?.species || '',
      partnerType: initialData?.partnerType || undefined,
      productIds: initialData?.productIds || [],
      image: initialData?.image || '',
    },
  });

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

  // Helper function to reset form completely
  const resetFormCompletely = () => {
    reset({
      partnerName: '',
      gender: undefined,
      partnerEmail: '',
      partnerMobileNumber: '',
      shopName: '',
      cityName: '',
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
      productIds: [],
      image: '',
    });
    setUploadedImage('');
    clearErrors();
  };

  const handleFormSubmit = async (data: FormData) => {
    try {
      await onSubmit(data);
      if (!initialData) {
        // Only reset form if it's a new partner (add mode)
        resetFormCompletely();
      }
    } catch (error) {
      console.error('Form submission error:', error);
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

          <div>
            <Label htmlFor="shopName">Shop Name</Label>
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
            <Input id="areaTown" {...register('areaTown')} className="focus:border-green-500 focus:ring-green-500" />
            {errors.areaTown && <p className="text-red-500 text-sm">{errors.areaTown.message}</p>}
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="fullAddress">Full Address/ Map Link</Label>
            <Textarea id="fullAddress" {...register('fullAddress')} className="focus:border-green-500 focus:ring-green-500" />
            {errors.fullAddress && <p className="text-red-500 text-sm">{errors.fullAddress.message}</p>}
          </div>

          <div>
            <Label htmlFor="rvmpNumber">RVMP Number/ License Number</Label>
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
        </div>

        <div>
          <Label>Available Days*</Label>
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

        <Input type="hidden" {...register('image')} />

        <Button
          type="submit"
          className="bg-green-500 hover:bg-green-600 text-white"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : submitButtonText}
        </Button>
      </form>
    </div>
  );
}