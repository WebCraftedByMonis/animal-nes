"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Trash2, MoveUp, MoveDown, Save, ArrowLeft } from "lucide-react";

interface FormField {
  id?: string;
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

const FIELD_TYPES = [
  { value: "text", label: "Text Input" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Phone Number" },
  { value: "textarea", label: "Text Area" },
  { value: "file", label: "File Upload" },
  { value: "checkbox", label: "Checkbox" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Radio Buttons" },
];

export default function CreateFormPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    slug: "",
    headerTitle: "",
    headerSubtitle: "",
    paymentRequired: false,
    paymentAmount: "",
    paymentAccount: "",
    thankYouMessage: "",
    thankYouButtonText: "",
    thankYouButtonUrl: "",
    isActive: true,
  });

  const [fields, setFields] = useState<FormField[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));

    // Auto-generate slug from title
    if (name === "title" && !formData.slug) {
      const slug = value.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const addField = () => {
    const newField: FormField = {
      label: "",
      fieldType: "text",
      placeholder: "",
      helpText: "",
      isRequired: false,
      orderIndex: fields.length,
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updatedFields = [...fields];
    updatedFields[index] = { ...updatedFields[index], ...updates };
    setFields(updatedFields);
  };

  const removeField = (index: number) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    // Reindex remaining fields
    updatedFields.forEach((field, i) => {
      field.orderIndex = i;
    });
    setFields(updatedFields);
  };

  const moveField = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === fields.length - 1)
    ) {
      return;
    }

    const updatedFields = [...fields];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [updatedFields[index], updatedFields[targetIndex]] = [updatedFields[targetIndex], updatedFields[index]];

    // Update order indices
    updatedFields.forEach((field, i) => {
      field.orderIndex = i;
    });

    setFields(updatedFields);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.slug) {
      toast.error("Title and slug are required");
      return;
    }

    if (fields.length === 0) {
      toast.error("Please add at least one field to the form");
      return;
    }

    // Validate all fields have labels
    for (let i = 0; i < fields.length; i++) {
      if (!fields[i].label) {
        toast.error(`Field ${i + 1} is missing a label`);
        return;
      }
    }

    setLoading(true);
    const toastId = toast.loading("Creating form...");

    try {
      const payload = {
        ...formData,
        paymentAmount: formData.paymentAmount ? parseFloat(formData.paymentAmount) : undefined,
        fields: fields.map(({ id, ...field }) => field), // Remove id for new fields
      };

      const res = await fetch("/api/dynamic-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Form created successfully!", { id: toastId });
        router.push("/dashboard/dynamic-forms");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create form", { id: toastId });
      }
    } catch (error) {
      console.error("Error creating form:", error);
      toast.error("An error occurred while creating form", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push("/dashboard/dynamic-forms")}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Create New Form</h1>
          <p className="text-gray-600 mt-1">Design your custom form with dynamic fields</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Form Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g., Master Trainer Registration"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g., master-trainer"
              />
              <p className="text-xs text-gray-500 mt-1">
                Form will be available at: /forms/{formData.slug || "[slug]"}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Brief description of this form"
            />
          </div>

          <div className="mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="w-4 h-4 accent-green-600"
              />
              <span className="text-sm font-medium text-gray-700">Form is active (accepting submissions)</span>
            </label>
          </div>
        </div>

        {/* Header Customization */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Header Customization</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Header Title
              </label>
              <input
                type="text"
                name="headerTitle"
                value={formData.headerTitle}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g., ماسٹر ٹرینر پروگرام — رجسٹریشن اوپن!"
              />
              <p className="text-xs text-gray-500 mt-1">Can include multiple languages or special formatting</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Header Subtitle
              </label>
              <input
                type="text"
                name="headerSubtitle"
                value={formData.headerSubtitle}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g., Master Trainer Program — Registration Open!"
              />
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Payment Settings</h2>

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="paymentRequired"
                  checked={formData.paymentRequired}
                  onChange={handleInputChange}
                  className="w-4 h-4 accent-green-600"
                />
                <span className="text-sm font-medium text-gray-700">This form requires payment</span>
              </label>
            </div>

            {formData.paymentRequired && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Amount (PKR) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="paymentAmount"
                      value={formData.paymentAmount}
                      onChange={handleInputChange}
                      required={formData.paymentRequired}
                      min="0"
                      step="0.01"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., 5000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Account Details <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="paymentAccount"
                    value={formData.paymentAccount}
                    onChange={handleInputChange}
                    required={formData.paymentRequired}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Easypaisa: 03354145431 - Ghazala Yasmeen; Animal Wellness Shop"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Thank You Page Customization */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Thank You Page Customization</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Thank You Message
              </label>
              <textarea
                name="thankYouMessage"
                value={formData.thankYouMessage}
                onChange={handleInputChange}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Message shown after successful submission (leave empty for default)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Button Text
                </label>
                <input
                  type="text"
                  name="thankYouButtonText"
                  value={formData.thankYouButtonText}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Join WhatsApp Group, Download Certificate"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to hide custom button</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Button URL
                </label>
                <input
                  type="url"
                  name="thankYouButtonUrl"
                  value={formData.thankYouButtonUrl}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="https://example.com or https://wa.me/..."
                />
                <p className="text-xs text-gray-500 mt-1">Full URL including https://</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Form Fields</h2>
            <button
              type="button"
              onClick={addField}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              Add Field
            </button>
          </div>

          {fields.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No fields added yet. Click "Add Field" to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-semibold text-gray-700">Field {index + 1}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveField(index, "up")}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <MoveUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveField(index, "down")}
                        disabled={index === fields.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <MoveDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeField(index)}
                        className="p-1 text-red-400 hover:text-red-600 ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Field Label <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                        placeholder="e.g., Full Name"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Field Type
                      </label>
                      <select
                        value={field.fieldType}
                        onChange={(e) => updateField(index, { fieldType: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                      >
                        {FIELD_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Placeholder
                      </label>
                      <input
                        type="text"
                        value={field.placeholder || ""}
                        onChange={(e) => updateField(index, { placeholder: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                        placeholder="e.g., Enter your name"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Help Text
                      </label>
                      <input
                        type="text"
                        value={field.helpText || ""}
                        onChange={(e) => updateField(index, { helpText: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                        placeholder="Additional help text"
                      />
                    </div>

                    {(field.fieldType === "select" || field.fieldType === "radio") && (
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Options (one per line)
                        </label>
                        <textarea
                          value={field.options || ""}
                          onChange={(e) => updateField(index, { options: e.target.value })}
                          rows={3}
                          className="w-full p-2 border border-gray-300 rounded text-sm"
                          placeholder="Option 1&#10;Option 2&#10;Option 3"
                        />
                      </div>
                    )}

                    {field.fieldType === "file" && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Accepted File Types
                          </label>
                          <input
                            type="text"
                            value={field.fileAcceptTypes || ""}
                            onChange={(e) => updateField(index, { fileAcceptTypes: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                            placeholder="e.g., image/jpeg,image/png"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Max File Size (bytes)
                          </label>
                          <input
                            type="number"
                            value={field.maxFileSize || ""}
                            onChange={(e) => updateField(index, { maxFileSize: parseInt(e.target.value) || undefined })}
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                            placeholder="e.g., 10485760 (10MB)"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.isRequired}
                        onChange={(e) => updateField(index, { isRequired: e.target.checked })}
                        className="w-3 h-3 accent-green-600"
                      />
                      <span className="text-xs font-medium text-gray-700">Required field</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard/dynamic-forms")}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 ${
              loading
                ? "bg-green-300 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            <Save className="w-5 h-5" />
            {loading ? "Creating..." : "Create Form"}
          </button>
        </div>
      </form>
    </div>
  );
}
