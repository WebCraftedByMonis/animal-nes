"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";

const applicantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  mobileNumber: z.string().min(1, "Mobile number is required"),
  address: z.string().min(1, "Address is required"),
  qualification: z.string().optional(),
  dateOfBirth: z.string().optional(),
  expectedPosition: z.string().optional(),
  expectedSalary: z.string().optional(),
  preferredIndustry: z.string().optional(),
  preferredLocation: z.string().optional(),
  highestDegree: z.string().optional(),
  degreeInstitution: z.string().optional(),
  majorFieldOfStudy: z.string().optional(),
  workExperience: z.string().optional(),
  previousCompany: z.string().optional(),
  declaration: z.enum(["AGREED", "NOT_AGREED"]),
  image: z.instanceof(File).optional(),
  cv: z.instanceof(File).optional(),
});

type FormValues = z.infer<typeof applicantSchema>;

export default function JobApplicantForm() {
  const { data: session, status } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(applicantSchema),
    defaultValues: {
      name: "",
      gender: "MALE",
      mobileNumber: "",
      address: "",
      declaration: "AGREED",


      // optional fields get empty string or null
      qualification: "",
      expectedPosition: "",
      expectedSalary: "",
      preferredIndustry: "",
      preferredLocation: "",
      highestDegree: "",
      degreeInstitution: "",
      majorFieldOfStudy: "",
      workExperience: "",
      previousCompany: "",
      dateOfBirth: "",  // or undefined if using `z.date().optional()`
      image: undefined,
      cv: undefined,
    },
  });

  const onDropImage = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (file) {
        form.setValue("image", file, { shouldValidate: true });
        const reader = new FileReader();
        reader.onload = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    },
    [form]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: onDropImage,
    accept: { "image/*": [".jpeg", ".jpg", ".png"] },
    maxFiles: 1,
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    const loadingToast = toast.loading("Submitting...");
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value instanceof File) {
          formData.append(key, value);
        } else if (value) {
          formData.append(key, value);
        }
      });

      const res = await fetch("/api/jobApplicant", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to submit application", { id: loadingToast });
        return;
      }

      toast.success("Application submitted successfully", { id: loadingToast });
      form.reset();
      setImagePreview(null);
    } catch (e) {
      toast.error("Something went wrong", { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") return <p>Loading session...</p>;
  if (!session) return <p className="text-center text-red-600">You must be logged in to apply.</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-green-600 mb-6">Job Application Form</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Manually written fields */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input {...field} placeholder="Enter full name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mobileNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl><Input {...field} placeholder="Enter mobile number" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl><Input {...field} placeholder="Enter address" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Optional Fields */}
            <FormField
              control={form.control}
              name="qualification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qualification (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter qualification" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expectedPosition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Position (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter expected position" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expectedSalary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Salary (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter expected salary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferredIndustry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Industry (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter preferred industry" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferredLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Location (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter preferred location" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="highestDegree"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Highest Degree (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter highest degree" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="degreeInstitution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Degree Institution (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter degree institution" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="majorFieldOfStudy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Major Field of Study (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter field of study" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="workExperience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work Experience (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter work experience" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="previousCompany"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Previous Company (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter previous company" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth*</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Gender */}
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <FormControl>
                    <select {...field} className="input w-full border px-2 py-2 rounded">
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Declaration */}
            <FormField
              control={form.control}
              name="declaration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>✅ Declaration
                    I solemnly declare that all the information provided in this form is true, accurate, and complete to the best of my knowledge. I understand that this information may be stored, viewed, or published (where required) on the official website www.animalwellness.shop for employment processing purposes.</FormLabel>
                  <FormControl>
                    <select {...field} className="input w-full border px-2 py-2 rounded">
                      <option value="AGREED">Agreed</option>
                      <option value="NOT_AGREED">Not Agreed</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Profile Image Upload */}
          <div>
            <Label>Upload Profile Image</Label>
            <div
              {...getRootProps()}
              className="border border-dashed rounded p-6 text-center cursor-pointer"
            >
              <input {...getInputProps()} />
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Preview"
                  width={100}
                  height={100}
                  className="mx-auto rounded"
                />
              ) : (
                <p className="text-sm text-gray-500">
                  Drag & drop or click to select image
                </p>
              )}
            </div>
          </div>

          {/* CV Upload */}
          <FormField
            control={form.control}
            name="cv"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Upload CV</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        form.setValue("cv", e.target.files[0]);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="bg-green-500 text-white hover:bg-green-600"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              "Submit Application"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
