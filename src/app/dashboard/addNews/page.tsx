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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Image from "next/image";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  image: z.instanceof(File).refine((file) => file.size > 0, {
    message: "Image is required",
  }),
  pdf: z.instanceof(File).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddAnimalNewsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [hasValues, setHasValues] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  useEffect(() => {
    const subscription = form.watch((value) => {
        const hasValues =
          (value.title ?? "").trim() !== "" ||
          (value.description ?? "").trim() !== "" ||
          (value.image && value.image.size > 0) ||
          (value.pdf && value.pdf.size > 0);
        setHasValues(!!hasValues);
      });
      
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      form.setValue("image", file, { shouldValidate: true });

      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
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
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("image", data.image);
      if (data.pdf) formData.append("pdf", data.pdf);

      const response = await fetch("/api/animal-news", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to create news");
        return;
      }

      toast.success("News created successfully");
      form.reset();
      setPreview(null);
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-green-500 mb-8">
          Add Animal News
        </h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-gray-700">Title *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter news title"
                        className="focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                      />
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-gray-700">Description *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter news description"
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
              <Label className="text-gray-700">News Image *</Label>
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
                        Drag and drop a news image here, or click to select
                      </p>
                      <p className="text-xs text-gray-500">
                        Supports: JPEG, JPG, PNG, WEBP
                      </p>
                    </>
                  )}
                </div>
              </div>
              <FormMessage>{form.formState.errors.image?.message}</FormMessage>
            </div>

            {/* PDF Upload */}
            <div className="space-y-2">
              <Label className="text-gray-700">Attach PDF (Optional)</Label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    form.setValue("pdf", e.target.files[0]);
                  }
                }}
                className="file:mr-4 file:py-2 file:px-4 file:border file:rounded-md file:border-green-500 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
              <span className="text-sm text-gray-500">Pdf should not be more than 10 mb</span>
              <FormMessage>{form.formState.errors.pdf?.message}</FormMessage>
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
                  "Create News"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
