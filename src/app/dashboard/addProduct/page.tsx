"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import { Loader2, UploadCloud, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import { toast } from "react-toastify";
import axios from "axios";
import "react-toastify/dist/ReactToastify.css";

const formSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  genericName: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  subCategory: z.string().min(1, "Sub-category is required"),
  subsubCategory: z.string().min(1, "Sub-sub-category is required"),
  productType: z.string().min(1, "Product type is required"),
  companyId: z.string().min(1, "Company is required"),
  companyPrice: z.string().refine(val => !isNaN(Number(val)), "Must be a valid number").optional(),
  dealerPrice: z.string().refine(val => !isNaN(Number(val)), "Must be a valid number").optional(),
  customerPrice: z.string().min(1, "Customer price is required").refine(val => !isNaN(Number(val)), "Must be a valid number"),
  packingUnit: z.string().min(1, "Packing unit is required"),
  partnerId: z.string().min(1, "Partner is required"),
  description: z.string().optional(),
  dosage: z.string().optional(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  image: z.instanceof(File, { message: "Product image is required" }),
  pdf: z.instanceof(File, { message: "Product PDF is required" }),
});

type FormValues = z.infer<typeof formSchema>;

interface Company {
  id: number;
  companyName: string;
}

interface Partner {
  id: number;
  partnerName: string;
}

export default function AddProductPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);



  
 const form = useForm<FormValues>({
  resolver: zodResolver(formSchema)  as any , // Temporary workaround
  defaultValues: {
    isFeatured: false,
    isActive: true,
    productName: "",
    genericName: "",
    category: "",
    subCategory: "",
    subsubCategory: "",
    productType: "",
    companyId: "",
    companyPrice: "",
    dealerPrice: "",
    customerPrice: "",
    packingUnit: "",
    partnerId: "",
    description: "",
    dosage: "",
  },
});

  // Fetch companies and partners
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companiesRes, partnersRes] = await Promise.all([
          axios.get("/api/company"),
          axios.get("/api/partner")
        ]);
        setCompanies(companiesRes.data.data || []);
        setPartners(partnersRes.data.data || []);
      } catch (error) {
        toast.error("Failed to load companies/partners");
        console.error("Fetch error:", error);
      }
    };
    fetchData();
  }, []);

  // Image dropzone
  const { getRootProps: getImageRootProps, getInputProps: getImageInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        form.setValue("image", file, { shouldValidate: true });
        const reader = new FileReader();
        reader.onload = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    },
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
    maxFiles: 1,
  });

  // PDF dropzone
  const { getRootProps: getPdfRootProps, getInputProps: getPdfInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        form.setValue("pdf", file, { shouldValidate: true });
        setPdfPreview(file.name);
      }
    },
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      
      // Append all form data
      Object.entries(data).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        
        if (value instanceof File) {
          formData.append(key, value);
        } else if (typeof value === 'boolean') {
          formData.append(key, value ? 'true' : 'false');
        } else {
          formData.append(key, String(value));
        }
      });

      const response = await axios.post("/api/product", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status === 201) {
        toast.success("Product created successfully");
      }
    } catch (error) {
      
      console.error("Submission error:", error);
      if (error.response) {
        toast.error(error.response.data.error || "Failed to create product");
      } else {
        toast.error("Network error. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return ( 
    <div className="  min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 ">
        <h1 className="text-3xl font-bold text-green-500 mb-8">Add New Product</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 ">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6  pr-2">
              {/* Product Name */}
              <FormField
                control={form.control}
                name="productName"

                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter product name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Generic Name */}
              <FormField
                control={form.control}
                name="genericName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Generic Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter generic name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter category" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sub Category */}
              <FormField
                control={form.control}
                name="subCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub-category *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter sub-category" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sub-sub Category */}
              <FormField
                control={form.control}
                name="subsubCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub-sub-category *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter sub-sub-category" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Product Type */}
              <FormField
                control={form.control}
                name="productType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Type *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter product type" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Company Select */}
              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={String(company.id)}>
                            {company.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Partner Select */}
              <FormField
                control={form.control}
                name="partnerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Partner *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select partner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {partners.map((partner) => (
                          <SelectItem key={partner.id} value={String(partner.id)}>
                            {partner.partnerName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Company Price */}
              <FormField
                control={form.control}
                name="companyPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Price</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dealer Price */}
              <FormField
                control={form.control}
                name="dealerPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dealer Price</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Customer Price */}
              <FormField
                control={form.control}
                name="customerPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Price *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Packing Unit */}
              <FormField
                control={form.control}
                name="packingUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Packing Unit *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter packing unit" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Enter product description" rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dosage */}
              <FormField
                control={form.control}
                name="dosage"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Dosage</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Enter dosage information" rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status Switches */}
              <div className="md:col-span-2 flex gap-8">
                <FormField
                  control={form.control}
                  name="isFeatured"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormLabel>Featured Product</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormLabel>Active Product</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Image Upload */}
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="image"
                  render={() => (
                    <FormItem>
                      <FormLabel>Product Image *</FormLabel>
                      <div {...getImageRootProps()} className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer">
                        <input {...getImageInputProps()} />
                        {imagePreview ? (
                          <div className="mt-4">
                            <div className="relative w-full h-48">
                              <Image
                                src={imagePreview}
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
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <UploadCloud className="h-12 w-12 text-green-500" />
                            <p className="text-sm text-gray-600">
                              Drag and drop your product image here, or click to select
                            </p>
                            <p className="text-xs text-gray-500">
                              Supports: JPEG, JPG, PNG, WEBP
                            </p>
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* PDF Upload */}
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="pdf"
                  render={() => (
                    <FormItem>
                      <FormLabel>Product PDF *</FormLabel>
                      <div {...getPdfRootProps()} className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer">
                        <input {...getPdfInputProps()} />
                        {pdfPreview ? (
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <FileText className="h-12 w-12 text-green-500" />
                            <p className="text-sm text-gray-600">{pdfPreview}</p>
                            <p className="text-xs text-gray-500">
                              Click to replace or drag and drop another PDF
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <UploadCloud className="h-12 w-12 text-green-500" />
                            <p className="text-sm text-gray-600">
                              Drag and drop your product PDF here, or click to select
                            </p>
                            <p className="text-xs text-gray-500">
                              Supports: PDF files
                            </p>
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-green-500 hover:bg-green-600"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Product"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}