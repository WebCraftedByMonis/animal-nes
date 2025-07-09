// pages/appointments/new.tsx
"use client"
import { useState } from "react";
import Head from "next/head";
import toast from "react-hot-toast";

export default function NewAppointmentPage() {
  const [form, setForm] = useState({
    doctor: "",
    city: "",
    state: "",
    species: "",
    fullAddress: "",
    gender: "MALE",
    appointmentAt: "",
    isEmergency: false,
    description: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target;
  
    const value =
      target instanceof HTMLInputElement && target.type === "checkbox"
        ? target.checked
        : target.value;
  
    setForm((prev) => ({
      ...prev,
      [target.name]: value,
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const toastId = toast.loading("Submitting appointment...");
    const res = await fetch("/api/appointments/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
        toast.success("Appointment request submitted!", { id: toastId });
      setForm({
        doctor: "",
        city: "",
        state: "",
        species: "",
        fullAddress: "",
        gender: "MALE",
        appointmentAt: "",
        isEmergency: false,
        description: "",
      });
    } else {
        console.log(res)
        toast.error("Failed to submit appointment", { id: toastId });
    }
        setLoading(false);
      
  };

  return (
    <>
      <Head>
        <title>Find a Doctor - Animal Care</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center py-10 px-4">
        <div className=" p-8 rounded-2xl shadow-lg max-w-xl w-full">
          <h1 className="text-3xl font-bold text-green-500 mb-6 text-center">
            Find a Doctor for Your Animal
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              name="doctor"
              placeholder="Your Mobile Number"
              value={form.doctor}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              name="city"
              placeholder="City"
              value={form.city}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              name="state"
              placeholder="State (Optional)"
              value={form.state}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              name="species"
              placeholder="Animal Species"
              value={form.species}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              name="fullAddress"
              placeholder="Full Address (Optional)"
              value={form.fullAddress}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>

            <input
              type="datetime-local"
              name="appointmentAt"
              value={form.appointmentAt}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="isEmergency"
                checked={form.isEmergency}
                onChange={handleChange}
                className="accent-green-500"
              />
              <span>Emergency</span>
            </label>

            <textarea
              name="description"
              placeholder="Describe the issue"
              value={form.description}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            />

<button
              type="submit"
              disabled={loading}
              className={`w-full font-semibold py-3 rounded-xl transition ${
                loading
                  ? "bg-green-300 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600 text-white"
              }`}
            >
              {loading ? "Submitting..." : "Submit Appointment"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}