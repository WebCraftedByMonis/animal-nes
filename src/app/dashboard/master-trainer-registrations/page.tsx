"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Image from "next/image";

interface Registration {
  id: number;
  name: string;
  email: string;
  whatsappNumber: string;
  address: string;
  paymentConfirmed: boolean;
  approved: boolean;
  screenshotUrl: string | null;
  screenshotPublicId: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function MasterTrainerRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      const res = await fetch("/api/master-trainer");
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data);
      } else {
        toast.error("Failed to fetch registrations");
      }
    } catch (error) {
      console.error("Error fetching registrations:", error);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    if (!confirm("Are you sure you want to approve this registration? An email will be sent to the applicant.")) {
      return;
    }

    const toastId = toast.loading("Approving registration...");
    try {
      const res = await fetch(`/api/master-trainer?id=${id}`, {
        method: "PATCH",
      });

      if (res.ok) {
        toast.success("Registration approved and email sent successfully", { id: toastId });
        // Update the registration in state
        setRegistrations(registrations.map((r) =>
          r.id === id ? { ...r, approved: true } : r
        ));
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to approve registration", { id: toastId });
      }
    } catch (error) {
      console.error("Error approving registration:", error);
      toast.error("An error occurred", { id: toastId });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this registration?")) {
      return;
    }

    const toastId = toast.loading("Deleting registration...");
    try {
      const res = await fetch(`/api/master-trainer?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Registration deleted successfully", { id: toastId });
        setRegistrations(registrations.filter((r) => r.id !== id));
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete registration", { id: toastId });
      }
    } catch (error) {
      console.error("Error deleting registration:", error);
      toast.error("An error occurred", { id: toastId });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading registrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Master Trainer Program Registrations
          </h1>
          <p className="text-gray-600">
            Total Registrations: <span className="font-semibold">{registrations.length}</span>
          </p>
        </div>

        {registrations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg
                className="w-24 h-24 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No Registrations Yet
            </h3>
            <p className="text-gray-500">
              Registrations will appear here once users start registering.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {registrations.map((registration) => (
              <div
                key={registration.id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Registration Details */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {registration.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Registered on {formatDate(registration.createdAt)}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                        ID: {registration.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Email</p>
                        <a
                          href={`mailto:${registration.email}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {registration.email}
                        </a>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-600">WhatsApp</p>
                        <a
                          href={`https://wa.me/${registration.whatsappNumber.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800"
                        >
                          {registration.whatsappNumber}
                        </a>
                      </div>

                      <div className="md:col-span-2">
                        <p className="text-sm font-medium text-gray-600">Address</p>
                        <p className="text-gray-900">{registration.address}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-600">Payment Confirmed</p>
                        <p className="text-gray-900">
                          {registration.paymentConfirmed ? (
                            <span className="text-green-600 font-semibold">✓ Yes</span>
                          ) : (
                            <span className="text-red-600">✗ No</span>
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-600">Approval Status</p>
                        <p className="text-gray-900">
                          {registration.approved ? (
                            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                              ✓ Approved
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                              ⏳ Pending Approval
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Screenshot */}
                  <div className="space-y-4">
                    {registration.screenshotUrl ? (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">
                          Payment Screenshot
                        </p>
                        <div
                          className="relative w-full h-48 rounded-lg overflow-hidden cursor-pointer border-2 border-gray-200 hover:border-green-500 transition"
                          onClick={() => setSelectedImage(registration.screenshotUrl)}
                        >
                          <Image
                            src={registration.screenshotUrl}
                            alt="Payment Screenshot"
                            fill
                            className="object-cover"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Click to view full size
                        </p>
                      </div>
                    ) : (
                      <div className="bg-gray-100 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-500">No screenshot uploaded</p>
                      </div>
                    )}

                    {!registration.approved && (
                      <button
                        onClick={() => handleApprove(registration.id)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition mb-2"
                      >
                        ✓ Approve Registration
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(registration.id)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                    >
                      Delete Registration
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300"
            >
              ✕ Close
            </button>
            <div className="relative w-full h-full">
              <Image
                src={selectedImage}
                alt="Payment Screenshot Full Size"
                width={1200}
                height={800}
                className="object-contain max-h-[90vh]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
