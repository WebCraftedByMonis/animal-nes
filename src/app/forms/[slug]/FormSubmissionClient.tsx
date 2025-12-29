"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CheckCircle } from "lucide-react";

interface FormField {
  id: string;
  label: string;
  fieldType: string;
  placeholder?: string;
  helpText?: string;
  isRequired: boolean;
  orderIndex: number;
  options?: string;
  fileAcceptTypes?: string;
  maxFileSize?: number;
}

interface DynamicForm {
  id: string;
  title: string;
  description?: string;
  slug: string;
  headerTitle?: string;
  headerSubtitle?: string;
  paymentRequired: boolean;
  paymentAmount?: number;
  paymentAccount?: string;
  thankYouMessage?: string;
  thankYouButtonText?: string;
  thankYouButtonUrl?: string;
  isActive: boolean;
  fields: FormField[];
}

interface FormSubmissionClientProps {
  initialForm: DynamicForm;
}

export default function FormSubmissionClient({ initialForm }: FormSubmissionClientProps) {
  const router = useRouter();

  const [form] = useState<DynamicForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleFileChange = (fieldId: string, file: File | null) => {
    if (file) {
      setFiles(prev => ({ ...prev, [fieldId]: file }));
    } else {
      const newFiles = { ...files };
      delete newFiles[fieldId];
      setFiles(newFiles);
    }
  };

  const handlePaymentScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        e.target.value = "";
        return;
      }

      // Validate file type
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        toast.error("Only JPEG, JPG, PNG, and WEBP files are allowed");
        e.target.value = "";
        return;
      }

      setPaymentScreenshot(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form) return;

    // Validate required fields
    for (const field of form.fields) {
      if (field.isRequired) {
        if (field.fieldType === "file") {
          if (!files[field.id]) {
            toast.error(`${field.label} is required`);
            return;
          }
        } else if (!formData[field.id]) {
          toast.error(`${field.label} is required`);
          return;
        }
      }
    }

    // Validate payment screenshot if required
    if (form.paymentRequired && !paymentScreenshot) {
      toast.error("Payment screenshot is required");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Submitting form...");

    try {
      const submitFormData = new FormData();

      // Add payment screenshot if required
      if (form.paymentRequired && paymentScreenshot) {
        submitFormData.append("paymentScreenshot", paymentScreenshot);
      }

      // Add field values
      for (const field of form.fields) {
        if (field.fieldType === "file") {
          const file = files[field.id];
          if (file) {
            submitFormData.append(`field_${field.id}`, file);
          }
        } else {
          const value = formData[field.id];
          if (value !== undefined && value !== null) {
            submitFormData.append(`field_${field.id}`, value.toString());
          }
        }
      }

      const res = await fetch(`/api/dynamic-forms/${form.id}/submit`, {
        method: "POST",
        body: submitFormData,
      });

      if (res.ok) {
        toast.success("Form submitted successfully!", { id: toastId });
        setSubmitted(true);
        setFormData({});
        setFiles({});
        setPaymentScreenshot(null);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to submit form", { id: toastId });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("An error occurred while submitting form", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const commonProps = {
      id: field.id,
      name: field.id,
      required: field.isRequired,
      className: "w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500",
    };

    switch (field.fieldType) {
      case "text":
      case "email":
      case "tel":
        return (
          <input
            {...commonProps}
            type={field.fieldType}
            placeholder={field.placeholder}
            value={formData[field.id] || ""}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        );

      case "textarea":
        return (
          <textarea
            {...commonProps}
            placeholder={field.placeholder}
            value={formData[field.id] || ""}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            rows={4}
          />
        );

      case "checkbox":
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData[field.id] || false}
              onChange={(e) => handleInputChange(field.id, e.target.checked)}
              required={field.isRequired}
              className="w-5 h-5 accent-green-500"
            />
            <span className="text-sm text-gray-700">{field.helpText || field.placeholder}</span>
          </label>
        );

      case "select":
        const selectOptions = field.options?.split("\n").filter(o => o.trim()) || [];
        return (
          <select
            {...commonProps}
            value={formData[field.id] || ""}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          >
            <option value="">-- Select --</option>
            {selectOptions.map((option, idx) => (
              <option key={idx} value={option.trim()}>
                {option.trim()}
              </option>
            ))}
          </select>
        );

      case "radio":
        const radioOptions = field.options?.split("\n").filter(o => o.trim()) || [];
        return (
          <div className="space-y-2">
            {radioOptions.map((option, idx) => (
              <label key={idx} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={field.id}
                  value={option.trim()}
                  checked={formData[field.id] === option.trim()}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  required={field.isRequired}
                  className="w-4 h-4 accent-green-500"
                />
                <span className="text-sm text-gray-700">{option.trim()}</span>
              </label>
            ))}
          </div>
        );

      case "file":
        return (
          <div>
            <input
              type="file"
              id={field.id}
              accept={field.fileAcceptTypes}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Validate file size
                  if (field.maxFileSize && file.size > field.maxFileSize) {
                    toast.error(`File size exceeds ${(field.maxFileSize / 1024 / 1024).toFixed(2)} MB`);
                    e.target.value = "";
                    return;
                  }
                  handleFileChange(field.id, file);
                } else {
                  handleFileChange(field.id, null);
                }
              }}
              required={field.isRequired}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
            {files[field.id] && (
              <p className="mt-2 text-sm text-green-600">
                Selected: {files[field.id].name} ({(files[field.id].size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Thank You!</h1>
            <p className="text-gray-600 mb-6">
              {form.thankYouMessage ||
                "Your submission has been received successfully. We will review it and get back to you soon."}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {/* Custom Button */}
              {form.thankYouButtonText && form.thankYouButtonUrl && (
                <a
                  href={form.thankYouButtonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold inline-block"
                >
                  {form.thankYouButtonText}
                </a>
              )}

              {/* Back to Home Button */}
              <button
                onClick={() => router.push("/")}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {form.headerTitle && (
            <h1 className="text-4xl font-bold text-green-600 mb-4">{form.headerTitle}</h1>
          )}
          {form.headerSubtitle && (
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">{form.headerSubtitle}</h2>
          )}
          {!form.headerTitle && !form.headerSubtitle && (
            <h1 className="text-4xl font-bold text-green-600 mb-4">{form.title}</h1>
          )}
          {form.description && (
            <p className="text-gray-600 mt-4">{form.description}</p>
          )}

          {/* Payment Info */}
          {form.paymentRequired && (
            <div className="bg-white rounded-xl shadow-md p-6 mt-6 text-left">
              <h3 className="font-semibold text-green-600 mb-2">Payment Required</h3>
              <p className="text-gray-700 mb-2">
                Amount: <span className="font-bold">Rs. {form.paymentAmount?.toLocaleString()}</span>
              </p>
              <p className="text-gray-700 whitespace-pre-wrap">{form.paymentAccount}</p>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {form.fields.map((field) => (
              <div key={field.id}>
                {field.fieldType !== "checkbox" && (
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label}
                    {field.isRequired && <span className="text-red-500"> *</span>}
                  </label>
                )}
                {renderField(field)}
                {field.helpText && field.fieldType !== "checkbox" && (
                  <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
                )}
              </div>
            ))}

            {/* Payment Screenshot */}
            {form.paymentRequired && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Screenshot <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handlePaymentScreenshotChange}
                  required
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
                {paymentScreenshot && (
                  <p className="mt-2 text-sm text-green-600">
                    Selected: {paymentScreenshot.name} ({(paymentScreenshot.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={`w-full font-semibold py-4 rounded-xl transition text-lg ${
                submitting
                  ? "bg-green-300 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg"
              }`}
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
