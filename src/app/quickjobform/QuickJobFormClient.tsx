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
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Image from "next/image";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Define form schema
const formSchema = z.object({
  title: z.string().min(1, "Job title is required"),
  description: z.string().min(1, "Job description is required"),
  name: z.string().default(""),
  whatsapp: z.string().default(""),
  email: z.string().email("Invalid email address").or(z.literal("")).default(""),
  image: z.instanceof(File).refine((file) => file.size > 0, {
    message: "Job post image is required",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export default function QuickJobFormClient() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [hasValues, setHasValues] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      name: "",
      whatsapp: "",
      email: "",
    },
  });

  // Check if form has any values
  useEffect(() => {
    const subscription = form.watch((value) => {
      const hasValues =
        value.title?.trim() !== "" ||
        value.description?.trim() !== "" ||
        (value.name ?? "").trim() !== "" ||
        (value.whatsapp ?? "").trim() !== "" ||
        (value.email ?? "").trim() !== "" ||
        (value.image && value.image.size > 0);
      setHasValues(!!hasValues);
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setFileError("File size must be less than 5MB");
        return;
      }

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
    setFileError(null);
  }

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      if (data.name) formData.append("name", data.name);
      if (data.whatsapp) formData.append("whatsapp", data.whatsapp);
      if (data.email) formData.append("email", data.email);
      formData.append("image", data.image);

      const response = await fetch("/api/traditionaljobpost", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to create job post");
        return;
      }

      toast.success("Job post created successfully");
      // Reset form after successful submission
      form.reset();
      setPreview(null);
      setFileError(null);
      
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-green-500 mb-8">Add Traditional Job Post</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Job Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-gray-700">Job Title *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                      placeholder="Enter job title"
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            {/* Job Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-gray-700">Job Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={8}
                      className="focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 resize-none"
                      placeholder="Enter detailed job description..."
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            {/* Optional Contact Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-gray-700">Name <span className="text-gray-400 font-normal">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter name"
                        className="focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                      />
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-gray-700">WhatsApp No <span className="text-gray-400 font-normal">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter WhatsApp number"
                        className="focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                      />
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-gray-700">Email Address <span className="text-gray-400 font-normal">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="Enter email address"
                        className="focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                      />
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label className="text-gray-700">Job Post Image *</Label>
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
                    <div className="mt-4 w-full">
                      <div className="relative w-full h-64">
                        <Image
                          src={preview}
                          alt="Job post preview"
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
                        Drag and drop your job post image here, or click to select
                      </p>
                      <p className="text-xs text-gray-500">
                        Supports: JPEG, JPG, PNG, WEBP (Max 5MB)
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Recommended: Company logo or job-related image
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
                  "Create Job Post"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}