"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, Eye, Link as LinkIcon } from "lucide-react";

interface FormField {
  id?: string;
  label: string;
  fieldType: string;
  placeholder?: string;
  helpText?: string;
  isRequired: boolean;
  orderIndex: number;
  options?: string;
  validation?: string;
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
  isActive: boolean;
  fields: FormField[];
  _count: {
    submissions: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function DynamicFormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState<DynamicForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);

  useEffect(() => {
    fetchForms();
  }, [includeInactive]);

  const fetchForms = async () => {
    try {
      const res = await fetch(`/api/dynamic-forms?includeInactive=${includeInactive}`);
      if (res.ok) {
        const data = await res.json();
        setForms(data.forms);
      } else {
        toast.error("Failed to fetch forms");
      }
    } catch (error) {
      console.error("Error fetching forms:", error);
      toast.error("An error occurred while fetching forms");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (formId: string, formTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${formTitle}"? This will also delete all submissions.`)) {
      return;
    }

    const toastId = toast.loading("Deleting form...");

    try {
      const res = await fetch(`/api/dynamic-forms/${formId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Form deleted successfully", { id: toastId });
        fetchForms();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete form", { id: toastId });
      }
    } catch (error) {
      console.error("Error deleting form:", error);
      toast.error("An error occurred while deleting form", { id: toastId });
    }
  };

  const copyFormLink = (slug: string) => {
    const link = `${window.location.origin}/forms/${slug}`;
    navigator.clipboard.writeText(link);
    toast.success("Form link copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dynamic Forms</h1>
          <p className="text-gray-600 mt-1">Create and manage custom forms</p>
        </div>
        <button
          onClick={() => router.push("/dashboard/dynamic-forms/create")}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-semibold shadow-md hover:shadow-lg transition w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
          Create New Form
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="w-4 h-4 accent-green-600"
          />
          <span className="text-sm text-gray-700">Show inactive forms</span>
        </label>
      </div>

      {/* Forms Table */}
      {forms.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-gray-400 mb-4">
            <Plus className="w-16 h-16 mx-auto mb-4" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No forms found</h3>
          <p className="text-gray-500 mb-6">
            {includeInactive
              ? "You haven't created any forms yet."
              : "No active forms found. Try showing inactive forms."}
          </p>
          {!includeInactive && (
            <button
              onClick={() => router.push("/dashboard/dynamic-forms/create")}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 font-semibold"
            >
              <Plus className="w-5 h-5" />
              Create Your First Form
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Form
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {forms.map((form) => (
                <tr key={form.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{form.title}</div>
                      {form.description && (
                        <div className="text-sm text-gray-500 line-clamp-1">{form.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{form.slug}</code>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        form.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {form.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {form.paymentRequired ? (
                      <span className="text-sm font-medium text-gray-900">
                        Rs. {form.paymentAmount?.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">No payment</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => router.push(`/dashboard/dynamic-forms/${form.id}/submissions`)}
                      className="text-sm font-medium text-green-600 hover:text-green-700"
                    >
                      {form._count.submissions} submission{form._count.submissions !== 1 ? "s" : ""}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyFormLink(form.slug)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Copy form link"
                      >
                        <LinkIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/dynamic-forms/${form.id}/submissions`)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition"
                        title="View submissions"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/dynamic-forms/${form.id}/edit`)}
                        className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition"
                        title="Edit form"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(form.id, form.title)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                        title="Delete form"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
