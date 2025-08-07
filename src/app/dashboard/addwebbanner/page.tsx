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
  position: z.string().min(1, "Position is required").refine((val) => {
    const num = parseInt(val, 10);
    return !isNaN(num) && num > 0;
  }, {
    message: "Position must be a positive number",
  }),
  alt: z.string().min(1, "Alt text is required for accessibility"),
  image: z.instanceof(File).refine((file) => file.size > 0, {
    message: "Banner image is required",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddBannerPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [hasValues, setHasValues] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      position: "",
      alt: "",
    },
  });

  // Check if form has any values
  useEffect(() => {
    const subscription = form.watch((value) => {
      const hasValues = 
        value.position?.trim() !== "" ||
        value.alt?.trim() !== "" ||
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
      "image/*": [".jpeg", ".jpg", ".png", ".webp", ".gif"],
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
      formData.append("position", data.position);
      formData.append("alt", data.alt);
      formData.append("image", data.image);

      const response = await fetch("/api/banner", {
        method: "POST",
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (responseData.error) {
          if (responseData.error.includes("position")) {
            form.setError("position", {
              type: "manual",
              message: "A banner already exists at this position. Please choose a different position.",
            });
          } else if (responseData.error.includes("Alt text")) {
            form.setError("alt", {
              type: "manual",
              message: "This alt text is already in use. Please provide unique alt text.",
            });
          } else {
            toast.error(responseData.error || "Failed to create banner");
          }
        } else {
          toast.error("Failed to create banner");
        }
        return;
      }

      toast.success("Banner created successfully");
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
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-bold text-green-500 mb-8">Add Banner</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Position */}
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-gray-700">Position *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        className="focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                        placeholder="Enter display position (1, 2, 3...)"
                      />
                    </FormControl>
                    <FormMessage className="text-red-500" />
                    <p className="text-xs text-gray-500">
                      Banners will be displayed in order of position (1 = first)
                    </p>
                  </FormItem>
                )}
              />

              {/* Alt Text */}
              <FormField
                control={form.control}
                name="alt"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-gray-700">Alt Text *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                        placeholder="Describe the banner image"
                      />
                    </FormControl>
                    <FormMessage className="text-red-500" />
                    <p className="text-xs text-gray-500">
                      Required for accessibility and SEO
                    </p>
                  </FormItem>
                )}
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label className="text-gray-700">Banner Image *</Label>
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
                          alt="Banner preview"
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
                        Drag and drop your banner image here, or click to select
                      </p>
                      <p className="text-xs text-gray-500">
                        Supports: JPEG, JPG, PNG, WEBP, GIF (Max 5MB)
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Recommended dimensions: 1920x600 or similar aspect ratio
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
                  className="hover:bg-gray-100"
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
                  "Create Banner"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}