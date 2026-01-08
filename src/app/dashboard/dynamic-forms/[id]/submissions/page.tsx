"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, CheckCircle, XCircle, Trash2, Eye, Download, ExternalLink } from "lucide-react";

interface FieldValue {
  id: string;
  value: string;
  fileUrl?: string;
  field: {
    label: string;
    fieldType: string;
  };
}

interface Submission {
  id: string;
  approved: boolean;
  paymentScreenshotUrl?: string;
  fieldValues: FieldValue[];
  createdAt: string;
  form: {
    title: string;
    slug: string;
  };
}

export default function FormSubmissionsPage() {
  const router = useRouter();
  const params = useParams();
  const formId = params.id as string;

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "approved" | "pending">("all");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, [formId, filter]);

  const fetchSubmissions = async () => {
    try {
      let url = `/api/dynamic-forms/${formId}/submissions`;
      if (filter === "approved") {
        url += "?approved=true";
      } else if (filter === "pending") {
        url += "?approved=false";
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions);
      } else {
        toast.error("Failed to fetch submissions");
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error("An error occurred while fetching submissions");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (submissionId: string) => {
    const toastId = toast.loading("Approving submission...");

    try {
      const res = await fetch(`/api/dynamic-forms/${formId}/submissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, approved: true }),
      });

      if (res.ok) {
        toast.success("Submission approved successfully", { id: toastId });
        fetchSubmissions();
        setShowModal(false);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to approve submission", { id: toastId });
      }
    } catch (error) {
      console.error("Error approving submission:", error);
      toast.error("An error occurred", { id: toastId });
    }
  };

  const handleReject = async (submissionId: string) => {
    const toastId = toast.loading("Rejecting submission...");

    try {
      const res = await fetch(`/api/dynamic-forms/${formId}/submissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, approved: false }),
      });

      if (res.ok) {
        toast.success("Submission rejected", { id: toastId });
        fetchSubmissions();
        setShowModal(false);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to reject submission", { id: toastId });
      }
    } catch (error) {
      console.error("Error rejecting submission:", error);
      toast.error("An error occurred", { id: toastId });
    }
  };

  const handleDelete = async (submissionId: string) => {
    if (!confirm("Are you sure you want to delete this submission?")) {
      return;
    }

    const toastId = toast.loading("Deleting submission...");

    try {
      const res = await fetch(`/api/dynamic-forms/${formId}/submissions?submissionId=${submissionId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Submission deleted successfully", { id: toastId });
        fetchSubmissions();
        setShowModal(false);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete submission", { id: toastId });
      }
    } catch (error) {
      console.error("Error deleting submission:", error);
      toast.error("An error occurred", { id: toastId });
    }
  };

  const viewSubmission = (submission: Submission) => {
    setSelectedSubmission(submission);
    setShowModal(true);
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
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push("/dashboard/dynamic-forms")}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Form Submissions</h1>
          {submissions.length > 0 && (
            <p className="text-gray-600 mt-1">{submissions[0].form.title}</p>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === "all"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All ({submissions.length})
          </button>
          <button
            onClick={() => setFilter("approved")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === "approved"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === "pending"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Pending
          </button>
        </div>
      </div>

      {/* Submissions Table */}
      {submissions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No submissions found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Submission ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {submissions.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {submission.id.substring(0, 8)}
                    </code>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(submission.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        submission.approved
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {submission.approved ? "Approved" : "Pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {submission.paymentScreenshotUrl ? (
                      <a
                        href={submission.paymentScreenshotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View
                      </a>
                    ) : (
                      <span className="text-sm text-gray-500">No payment</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => viewSubmission(submission)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {!submission.approved && (
                        <button
                          onClick={() => handleApprove(submission.id)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition"
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {submission.approved && (
                        <button
                          onClick={() => handleReject(submission.id)}
                          className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(submission.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                        title="Delete"
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

      {/* View Submission Modal */}
      {showModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Submission Details</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    ID: {selectedSubmission.id}
                  </p>
                  <p className="text-sm text-gray-500">
                    Submitted: {new Date(selectedSubmission.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Status */}
              <div>
                <span className="text-sm font-medium text-gray-600">Status:</span>
                <span
                  className={`ml-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    selectedSubmission.approved
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {selectedSubmission.approved ? "Approved" : "Pending"}
                </span>
              </div>

              {/* Payment Screenshot */}
              {selectedSubmission.paymentScreenshotUrl && (
                <div>
                  <span className="block text-sm font-medium text-gray-600 mb-2">Payment Screenshot:</span>
                  <a
                    href={selectedSubmission.paymentScreenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={selectedSubmission.paymentScreenshotUrl}
                      alt="Payment Screenshot"
                      className="max-w-full h-auto rounded-lg border border-gray-300"
                    />
                  </a>
                </div>
              )}

              {/* Field Values */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Form Data</h3>
                <div className="space-y-3">
                  {selectedSubmission.fieldValues.map((fieldValue) => (
                    <div key={fieldValue.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm font-medium text-gray-600 mb-1">
                        {fieldValue.field.label}
                      </div>
                      {fieldValue.fileUrl ? (
                        <a
                          href={fieldValue.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                        >
                          <Download className="w-3 h-3" />
                          {fieldValue.value}
                        </a>
                      ) : (
                        <div className="text-gray-900">{fieldValue.value}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              {!selectedSubmission.approved ? (
                <>
                  <button
                    onClick={() => handleApprove(selectedSubmission.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleDelete(selectedSubmission.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleReject(selectedSubmission.id)}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Mark as Pending
                  </button>
                  <button
                    onClick={() => handleDelete(selectedSubmission.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
