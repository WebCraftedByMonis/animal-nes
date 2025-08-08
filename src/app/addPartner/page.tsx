// app/admin/partners/page.tsx
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
import 'react-toastify/dist/ReactToastify.css';
import { SuggestiveInput } from '@/components/shared/SuggestiveInput';

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

// Updated to use consistent formatting
const partnerTypeOptions = [
  'Veterinarian (Clinic, Hospital, Consultant)', 
  'Sales and Marketing (Dealer, Distributor, Sales Person)'
] as const;

// Specialization options based on partner type
const veterinarianSpecializations = [
  'Large Animal Veterinarian',
  'Small Animal Veterinarian',
  'Poultry Veterinarian',
  'Parasitologist',
  'Reproduction Specialist',
  'Animal Nutritionist',
  'Veterinary Surgeon',
  'Veterinary Pathologist',
  'Wildlife Veterinarian',
  'Public Health Veterinarian'
];

const salesMarketingSpecializations = [
  'Product Specialist',
  'Equipment Executive',
  'Brand Manager',
  'Sales Officer',
  'Marketing Specialist',
  'Authorized Dealer',
  'Bulk Wholesaler',
  'Regional Distributor',
  'Licensed Importer',
  'Product Manufacturer'
];

const formSchema = z.object({
  partnerName: z.string().min(1, "Partner name is required"),
  gender: z.enum(genderOptions).optional(),
  partnerEmail: z.string().min(1, "Email is required").email("Please enter a valid email address"), // Made required
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

export default function AddPartnerPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string>('');
  
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    setError,
    clearErrors,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
    },
  });

  // Watch partner type to determine specialization options
  const partnerType = watch('partnerType');
  
  // Get specialization suggestions based on partner type
  const specializationSuggestions = useMemo(() => {
    if (partnerType === 'Veterinarian (Clinic, Hospital, Consultant)') {
      return veterinarianSpecializations;
    } else if (partnerType === 'Sales and Marketing (Dealer, Distributor, Sales Person)') {
      return salesMarketingSpecializations;
    }
    return [];
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

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success('Partner created successfully!');
        resetFormCompletely(); // Reset form after successful submission
      } else {
        const result = await res.json();
        
        // Handle duplicate email error specifically
        if (res.status === 409 || (result.error && result.error.toLowerCase().includes('email already exists'))) {
          setError('partnerEmail', {
            type: 'manual',
            message: 'This email is already registered'
          });
          toast.error('Email already exists. Please use a different email address.');
        } 
        // Handle other validation errors
        else if (result.errors && Array.isArray(result.errors)) {
          result.errors.forEach((error: any) => {
            if (error.path && error.path.length > 0) {
              setError(error.path[0], {
                type: 'manual',
                message: error.message
              });
            }
          });
          toast.error('Please fix the form errors and try again.');
        }
        // Handle generic errors
        else {
          toast.error(result?.message || result?.error || 'Something went wrong.');
        }
      }
    } catch (error) {
      console.log(error);
      toast.error('Network error or server down.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-green-500">Add Partner</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <Label htmlFor="password">Password*</Label>
            <Input id="password" type="password" {...register('password')} className="focus:border-green-500 focus:ring-green-500" />
            {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
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
                placeholder={
                  partnerType === 'Veterinarian (Clinic, Hospital, Consultant)' 
                    ? "Select veterinary specialization" 
                    : "Select sales/marketing specialization"
                }
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
            <Label htmlFor="zipcode">Zipcode</Label>
            <Input id="zipcode" {...register('zipcode')} className="focus:border-green-500 focus:ring-green-500" />
            {errors.zipcode && <p className="text-red-500 text-sm">{errors.zipcode.message}</p>}
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

          <div>
            <Label htmlFor="sendToPartner">Send To Partner</Label>
            <Controller
              control={control}
              name="sendToPartner"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="focus:border-green-500 focus:ring-green-500">
                    <SelectValue placeholder="Send to partner?" />
                  </SelectTrigger>
                  <SelectContent>
                    {sendToPartnerOptions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.sendToPartner && <p className="text-red-500 text-sm">{errors.sendToPartner.message}</p>}
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
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
      </form>
    </div>
  );
}