"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import axios, { AxiosError } from "axios";
import "react-toastify/dist/ReactToastify.css";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { SuggestiveInput } from "@/components/shared/SuggestiveInput";
import { useCountry } from "@/contexts/CountryContext";

const formSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  genericName: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  subCategory: z.string().min(1, "Sub-category is required"),
  subsubCategory: z.string().min(1, "Sub-sub-category is required"),
  productType: z.string().min(1, "Product type is required"),
  companyId: z.string().min(1, "Company is required"),
  variants: z
    .array(
      z.object({
        packingVolume: z.string().min(1, "Packing volume is required"),
        companyPrice: z.string().optional(),
        dealerPrice: z.string().optional(),
        customerPrice: z.string().min(1, "Customer price is required"),
      })
    )
    .min(1, "At least one variant is required"),

  partnerId: z.string().min(1, "Partner is required"),
  description: z.string().optional(),
  dosage: z.string().optional(),
  productLink: z.string().optional(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  outofstock: z.boolean().default(true),
  imageUrl: z.string().optional(),
  image: z.any().optional(),

  pdf: z
    .any()
    .optional()
    .refine(
      (file) => {
        // Allow empty or valid File
        return !file || (file instanceof File && file.size > 0 && file.type === "application/pdf");
      },
      { message: "Invalid PDF file" }
    ),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddProductForm() {
  const { country } = useCountry();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any, 
    defaultValues: {
      isFeatured: false,
      isActive: true,
      outofstock: false,
      productName: "",
      genericName: "",
      category: "",
      subCategory: "",
      subsubCategory: "",
      productType: "",
      companyId: "",
      variants: [
        {
          packingVolume: "",
          companyPrice: "",
          dealerPrice: "",
          customerPrice: "",
        },
      ],
      partnerId: "",
      description: "",
      dosage: "",
      productLink: "",
      imageUrl: "",
    },
  });


  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
  });



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
    let success = false;

    try {
      const formData = new FormData();

      // Append all form data
      const { variants, ...otherFields } = data;

      variants.forEach((variant, i) => {
        formData.append(`variants[${i}][packingVolume]`, variant.packingVolume);
        formData.append(`variants[${i}][companyPrice]`, variant.companyPrice ?? "");
        formData.append(`variants[${i}][dealerPrice]`, variant.dealerPrice ?? "");
        formData.append(`variants[${i}][customerPrice]`, variant.customerPrice);
        formData.append(`variants[${i}][inventory]`, "100"); // Default inventory value
      });

      Object.entries(otherFields).forEach(([key, value]) => {
        if (value instanceof File) {
          formData.append(key, value);
        } else if (typeof value === "boolean") {
          formData.append(key, value ? "true" : "false");
        } else if (value !== undefined && value !== null) {
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
        success = true;
      }

    } catch (error: unknown) {
      console.error("Submission error:", error);
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.error || "Failed to create product");
      } else {
        toast.error("Network error. Please try again.");
      }
    } finally {
      setIsSubmitting(false);

      if (success) {
        // Reset the form only on success
        form.reset({
          isFeatured: false,
          isActive: true,
          outofstock: false,
          productName: "",
          genericName: "",
          category: "",
          subCategory: "",
          subsubCategory: "",
          productType: "",
          companyId: "",
          variants: [
            {
              packingVolume: "",
              companyPrice: "",
              dealerPrice: "",
              customerPrice: "",
            },
          ],
          partnerId: "",
          description: "",
          dosage: "",
          productLink: "",
          imageUrl: "",
        });

        // Clear image and PDF previews
        setImagePreview(null);
        setPdfPreview(null);
      }
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
        <SuggestiveInput
          suggestions={[
            "Veterinary",
            "Poultry",
            "Pets",
            "Equine",
            "Livestock Feed",
            "Poultry Feed",
            "Instruments & Equipment",
            "Fisheries & Aquaculture",
            "Vaccination Services / Kits",
            "Herbal / Organic Products",
          ]}
          value={field.value}
          onChange={field.onChange}
          placeholder="Enter category"
        />
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
        <SuggestiveInput
          suggestions={[
            "Antiparasitics",
            "Antibiotics & Antibacterials",
            "Vaccines & Immunologicals",
            "Nutritional Supplements",
            "Growth Promoters",
            "Coccidiostats",
            "Pain Management / NSAIDs",
            "Reproductive Health / Hormones",
            "Liver & Kidney Tonics",
            "Respiratory Health / Expectorants",
          ]}
          value={field.value}
          onChange={field.onChange}
          placeholder="Enter sub-category"
        />
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
        <SuggestiveInput
          suggestions={[
            "Medicine",
            "Supplements",
            "Broad-Spectrum Dewormers",
            "Multivitamins & Trace Elements",
            "Electrolytes & Hydration Solutions",
            "Mineral Mixtures / Salt Licks",
            "Probiotics & Enzymes",
            "Calcium / Phosphorus Supplements",
            "Immuno-Stimulants",
            "Hepato-Renal Protectants",
          ]}
          value={field.value}
          onChange={field.onChange}
          placeholder="Enter sub-sub-category"
        />
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
        <SuggestiveInput
          suggestions={[
            "Injection (IV, IM, SC)",
            "Tablet / Bolus / Pill",
            "Oral Powder / Sachet",
            "Oral Suspension / Syrup",
            "Spray / Aerosol",
            "Oral Solution / Drops",
            "Topical Application / Pour-on / Spot-on",
            "Premix (for feed inclusion)",
            "Intrauterine / Intra-mammary",
            "Transdermal Patch / Ointment / Cream"
          ]}
          value={field.value}
          onChange={field.onChange}
          placeholder="Enter product type"
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>


              {/* Product link */}
              <FormField
                control={form.control}
                name="productLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Link </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter product Link" />
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
                    <FormControl>
                      <SearchableCombobox
                        apiEndpoint="/api/company"
                        searchKey="companyName"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select company"
                        extraParams={{ country }}
                      />
                    </FormControl>
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
                    <FormControl>
                      <SearchableCombobox
                        apiEndpoint="/api/partner"
                        searchKey="partnerName"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select partner"
                        extraParams={{ country }}
                      />
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
                    <FormLabel>Dosage/Usage</FormLabel>
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


                <FormField
                  control={form.control}
                  name="outofstock"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormLabel>Out of Stock</FormLabel>
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

              {/* Image URL */}
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Image URL (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter image URL (if not uploading a file)" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Image Upload */}
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="image"
                  render={() => (
                    <FormItem>
                      <FormLabel>Product Image (Optional — upload or provide URL above)</FormLabel>
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
                            <span className="text-sm text-gray-500">Pdf should not be more than 10 mb</span>
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormLabel className="block text-lg font-semibold text-gray-800">Product Variants *</FormLabel>
            {fields.map((field, index) => (
              <div key={field.id} className="border p-4 rounded-md space-y-2 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Packing Volume */}
                  <FormField
                    control={form.control}
                    name={`variants.${index}.packingVolume`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Packing Volume</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., 500ml, 1L" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Customer Price */}
                  <FormField
                    control={form.control}
                    name={`variants.${index}.customerPrice`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Our Price *</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Company Price */}
                  <FormField
                    control={form.control}
                    name={`variants.${index}.companyPrice`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Retail Price</FormLabel>
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
                    name={`variants.${index}.dealerPrice`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Price</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Remove Variant Button */}
                {form.watch("variants").length > 1 && (
                  <Button
                    variant="destructive"
                    onClick={() => remove(index)}
                  >
                    Remove Variant
                  </Button>

                )}
              </div>
            ))}

            <Button
              type="button"
              className="bg-green-100 text-green-700 border border-green-500 hover:bg-green-200"
              onClick={() =>
                append({
                  packingVolume: "",
                  companyPrice: "",
                  dealerPrice: "",
                  customerPrice: "",
                })
              }
            >
              + Add Variant
            </Button>


            <div className="mt-8 flex justify-end gap-4">

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
