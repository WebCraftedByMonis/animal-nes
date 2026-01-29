"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { getWhatsAppUrl } from "@/lib/whatsapp-utils";

export default function MasterTrainerRegistration() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    whatsappNumber: "",
    address: "",
    paymentConfirmed: false,
  });
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    const value =
      target instanceof HTMLInputElement && target.type === "checkbox"
        ? target.checked
        : target.value;
    setForm((prev) => ({ ...prev, [target.name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        e.target.value = "";
        return;
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error("Only JPEG, JPG, PNG, and WEBP files are allowed");
        e.target.value = "";
        return;
      }

      setScreenshot(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.paymentConfirmed) {
      toast.error("Please confirm the payment requirement");
      return;
    }

    if (!screenshot) {
      toast.error("Please upload payment screenshot");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Submitting registration...");

    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("email", form.email);
      formData.append("whatsappNumber", form.whatsappNumber);
      formData.append("address", form.address);
      formData.append("paymentConfirmed", form.paymentConfirmed.toString());
      formData.append("screenshot", screenshot);

      const res = await fetch("/api/master-trainer", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        toast.success("Registration submitted successfully!", { id: toastId });
        setForm({
          name: "",
          email: "",
          whatsappNumber: "",
          address: "",
          paymentConfirmed: false,
        });
        setScreenshot(null);

        // Reset file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = "";

        setTimeout(() => {
          router.push("/master-trainer/thank-you");
        }, 1500);
      } else {
        const error = await res.json();
        console.error("Error response:", error);
        toast.error(error.error || "Failed to submit registration", { id: toastId });
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("An error occurred while submitting", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-600 mb-4">
            ماسٹر ٹرینر پروگرام — رجسٹریشن اوپن!
          </h1>
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Master Trainer Program — Registration Open!
          </h2>

          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="space-y-3 text-left">
              <p className="text-lg">
                <span className="font-semibold text-green-600">Event Timing:</span>{" "}
                <span className="text-gray-700">November 29 - December 14, 2025</span>
              </p>

              <div>
                <p className="font-semibold text-green-600 mb-2">Zoom Meeting Link:</p>
                <a
                  href="https://us05web.zoom.us/j/82580834219?pwd=wHuWFJ7oZCnsHcuiRykOiCOrXbCdjn.1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline break-all text-sm"
                >
                  https://us05web.zoom.us/j/82580834219?pwd=wHuWFJ7oZCnsHcuiRykOiCOrXbCdjn.1
                </a>
              </div>

              <div>
                <p className="font-semibold text-green-600 mb-1">Contact Us:</p>
                <p className="text-gray-700">
                  Phone: <a href={getWhatsAppUrl("0335-4145431")} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">(+92) 335-4145431</a>
                </p>
                <p className="text-gray-700">
                  Email: <a href="mailto:animalwellnessshop@gmail.com" className="text-blue-600 hover:text-blue-800">animalwellnessshop@gmail.com</a>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">Registration Form</h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                placeholder="your.email@example.com"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="whatsappNumber"
                placeholder="+92 3XX XXXXXXX"
                value={form.whatsappNumber}
                onChange={handleChange}
                required
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address <span className="text-red-500">*</span>
              </label>
              <textarea
                name="address"
                placeholder="Enter your complete address"
                value={form.address}
                onChange={handleChange}
                required
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Screenshot <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-gray-600 mb-2">
                Upload payment screenshot (Max 10 MB - JPEG, PNG, WEBP)
              </p>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileChange}
                required
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
              {screenshot && (
                <p className="mt-2 text-sm text-green-600">
                  Selected: {screenshot.name} ({(screenshot.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="paymentConfirmed"
                  checked={form.paymentConfirmed}
                  onChange={handleChange}
                  required
                  className="mt-1 accent-green-500 w-5 h-5"
                />
                <span className="text-sm text-gray-700">
                  <span className="text-red-500">*</span> I understand that I will have to pay{" "}
                  <span className="font-bold">Rs. 5000</span> through easypaisa account{" "}
                  <a href={getWhatsAppUrl("03354145431")} target="_blank" rel="noopener noreferrer" className="font-bold text-green-600 hover:underline" onClick={e => e.stopPropagation()}>03354145431</a>: Ghazala Yasmeen; Animal Wellness Shop
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full font-semibold py-4 rounded-xl transition text-lg ${
                loading
                  ? "bg-green-300 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg"
              }`}
            >
              {loading ? "Submitting..." : "Submit Registration"}
            </button>
          </form>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center text-sm text-gray-600 bg-white p-4 rounded-lg shadow">
          <p className="font-semibold text-gray-800 mb-2">Important Notice:</p>
          <p>After submitting your registration, our team will review your payment.</p>
          <p className="mt-1">Once approved, you will receive a confirmation email with all program details.</p>
          <p className="mt-2 text-xs text-gray-500">For any queries, contact us at <a href={getWhatsAppUrl("0335-4145431")} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">(+92) 335-4145431</a></p>
        </div>
      </div>
    </div>
  );
}
