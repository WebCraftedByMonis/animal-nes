'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Loader2 } from 'lucide-react';
import Image from 'next/image';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const formSchema = z.object({
  name: z.string().min(1),
  company: z.string().min(1),
  mobileNumber: z.string().min(1),
  email: z.string().optional().or(z.literal('')).or(z.string().email()),
  position: z.string().min(1),
  eligibility: z.string().min(1),
  benefits: z.string().min(1),
  location: z.string().min(1),
  deadline: z.string().min(1),
  noofpositions: z.string().min(1),
  companyAddress: z.string().min(1),
  howToApply: z.string().min(1),
  image: z
    .instanceof(File)
    .refine((file) => file.size > 0, { message: 'Image is required' }),
});

type JobFormValues = z.infer<typeof formSchema>;

export default function JobFormUpload() {
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasValues, setHasValues] = useState(false);

  const form = useForm<JobFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      company: '',
      mobileNumber: '',
      email: '',
      position: '',
      eligibility: '',
      benefits: '',
      location: '',
      deadline: '',
      noofpositions: '',
      companyAddress: '',
      howToApply: '',
    },
  });

  useEffect(() => {
    const subscription = form.watch((value) => {
      const has = Object.values(value).some((val) =>
        typeof val === 'string' ? val.trim() !== '' : val instanceof File && val.size > 0
      );
      setHasValues(has);
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        form.setValue('image', file, { shouldValidate: true });
        const reader = new FileReader();
        reader.onload = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    },
    [form]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
  });

  const handleCancel = () => {
    form.reset();
    setPreview(null);
  };

  const onSubmit = async (data: JobFormValues) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      for (const key in data) {
        const value = (data as any)[key];
        if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, value || '');
        }
      }

      const res = await fetch('/api/vacancyForm', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || 'Something went wrong');
      } else {
        toast.success('Job form submitted successfully!');
        handleCancel();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit job form');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow">
      <h2 className="text-3xl font-bold text-green-500 mb-6">Post a Job</h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Individually Rendered Fields */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Your Name" className="focus-visible:ring-green-500" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Company Name" className="focus-visible:ring-green-500" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mobileNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile Number *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Mobile Number" className="focus-visible:ring-green-500" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="Email (optional)" className="focus-visible:ring-green-500" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Position *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Position" className="focus-visible:ring-green-500" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="eligibility"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Eligibility *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Eligibility" className="focus-visible:ring-green-500" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="benefits"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Benefits *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Benefits" className="focus-visible:ring-green-500" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Location" className="focus-visible:ring-green-500" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="deadline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deadline *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Deadline" className="focus-visible:ring-green-500" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="noofpositions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Positions *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Number of Positions" className="focus-visible:ring-green-500" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="companyAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Address *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Company Address" className="focus-visible:ring-green-500" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="howToApply"
            render={({ field }) => (
              <FormItem>
                <FormLabel>How to Apply *</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Provide application instructions" className="focus-visible:ring-green-500" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Company Image *</Label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed p-6 rounded-lg text-center cursor-pointer ${
                isDragActive
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-green-400'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center justify-center space-y-2">
                <UploadCloud className="h-10 w-10 text-green-500" />
                {preview ? (
                  <div className="relative w-full h-48 mt-2">
                    <Image
                      src={preview}
                      alt="Preview"
                      fill
                      className="object-contain rounded-md"
                    />
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    Drag & drop image here or click to upload
                  </p>
                )}
              </div>
            </div>
            {form.formState.errors.image && (
              <p className="text-sm text-red-500">{form.formState.errors.image.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4">
            {hasValues && (
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Job Form'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
