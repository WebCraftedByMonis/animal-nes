"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Image from "next/image";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Define form schema
const formSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  mobileNumber: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  image: z.instanceof(File).refine((file) => file.size > 0, {
    message: "Company image is required",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddCompanyPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [hasValues, setHasValues] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      mobileNumber: "",
      address: "",
      email: "",
    },
  });

  // Check if form has any values
  useEffect(() => {
    const subscription = form.watch((value) => {
      const hasValues = 
        value.companyName?.trim() !== "" ||
        value.mobileNumber?.trim() !== "" ||
        value.address?.trim() !== "" ||
        value.email?.trim() !== "" ||
        (value.image && value.image.size > 0);
      setHasValues(!!hasValues);
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFileError(null);
      form.setValue("image", file, { shouldValidate: true });

      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [form]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxFiles: 1,
  });

  function handleCancel() {
    form.reset();
    setPreview(null);
  }

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("companyName", data.companyName);
      if (data.mobileNumber) formData.append("mobileNumber", data.mobileNumber);
      if (data.address) formData.append("address", data.address);
      if (data.email) formData.append("email", data.email);
      formData.append("image", data.image);

      const response = await fetch("/api/company", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error.includes("unique")) {
          // Handle unique constraint errors
          if (errorData.error.includes("companyName")) {
            form.setError("companyName", {
              type: "manual",
              message: "This company name is already taken",
            });
          } else if (errorData.error.includes("email")) {
            form.setError("email", {
              type: "manual",
              message: "This email is already registered",
            });
          }
        } else {
          toast.error(errorData.error || "Failed to create company");
        }
        return;
      }

      toast.success("Company created successfully");
      
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen  flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-green-500 mb-8">Add Company</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company Name */}
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-gray-700">Company Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                        placeholder="Enter company name"
                      />
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />

              {/* Mobile Number */}
              <FormField
                control={form.control}
                name="mobileNumber"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-gray-700">Mobile Number</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                        placeholder="Enter mobile number"
                      />
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-gray-700">Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                        placeholder="Enter email address"
                        type="email"
                      />
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />

              {/* Address */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="space-y-2 md:col-span-2">
                    <FormLabel className="text-gray-700">Address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                        placeholder="Enter company address"
                      />
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label className="text-gray-700">Company Image *</Label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-green-400"
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <UploadCloud className="h-12 w-12 text-green-500" />
                  {preview ? (
                    <div className="mt-4">
                      <div className="relative w-full h-48">
                        <Image
                          src={preview}
                          alt="Preview"
                          fill
                          className="rounded-md object-contain"
                        />
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        Click to replace or drag and drop another image
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">
                        Drag and drop your company logo here, or click to select
                      </p>
                      <p className="text-xs text-gray-500">
                        Supports: JPEG, JPG, PNG, WEBP
                      </p>
                    </>
                  )}
                </div>
              </div>
              {form.formState.errors.image && (
                <p className="text-sm font-medium text-red-500">
                  {form.formState.errors.image.message}
                </p>
              )}
              {fileError && (
                <p className="text-sm font-medium text-red-500">{fileError}</p>
              )}
            </div>

            <div className="flex justify-end gap-4 pt-4">
              {hasValues && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
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
                    Creating...
                  </>
                ) : (
                  "Create Company"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}