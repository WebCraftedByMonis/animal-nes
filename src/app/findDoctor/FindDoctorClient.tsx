"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useSession, signIn } from "next-auth/react";
import { SuggestiveInput } from "@/components/shared/SuggestiveInput";

export default function FindDoctorClient() {
  const router = useRouter();
  const { status } = useSession();
  const [form, setForm] = useState({
    doctor: "",
    city: "",
    state: "",
    species: "",
    fullAddress: "",
    gender: "MALE",
    isEmergency: false,
    description: "",
  });
  const [loading, setLoading] = useState(false);

  // Tell the user to login and redirect them to your login page
  useEffect(() => {
    if (status === "unauthenticated") {
      toast.error("Please log in to book an appointment.");
      const callback = encodeURIComponent("/findDoctor");
      
    }
  }, [status, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const value =
      target instanceof HTMLInputElement && target.type === "checkbox"
        ? target.checked
        : target.value;
    setForm((prev) => ({ ...prev, [target.name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading("Submitting appointment...");
    try {
      const res = await fetch("/api/appointments/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const appointment = await res.json();
        toast.success("Appointment submitted! Redirecting to payment...", { id: toastId });
        setForm({
          doctor: "",
          city: "",
          state: "",
          species: "",
          fullAddress: "",
          gender: "MALE",
          isEmergency: false,
          description: "",
        });
        setTimeout(() => {
          router.push(`/payment?appointmentId=${appointment.id}`);
        }, 1000);
      } else {
        const error = await res.json();
        console.error("Error response:", error);
        toast.error(error.error || "Failed to submit appointment", { id: toastId });
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("An error occurred while submitting", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // While NextAuth figures out the session
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center py-10 px-4">
        <div className="p-8 rounded-2xl shadow-lg max-w-xl w-full">
          <p className="text-center text-gray-500">Checking your session…</p>
        </div>
      </div>
    );
  }

  // If unauthenticated, we already pushed to /login, but this is a graceful fallback
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center py-10 px-4">
        <div className="p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-3">Login required</h1>
          <p className="mb-6">Please log in to book an appointment.</p>
          <button
            onClick={() => signIn("google")}
            className="w-full font-semibold py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  // Authenticated: render your form as-is
  return (
    <div className="min-h-screen flex items-center justify-center py-10 px-4">
      <div className="p-8 rounded-2xl shadow-lg max-w-xl w-full">
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
          
          <SuggestiveInput
            suggestions={[
              "Punjab",
              "Sindh",
              "Balochistan",
              "Khyber Pakhtunkhwa",
              "Gilgit Baltistan",
              "Kashmir",
              "Islamabad",
            ]}
            value={form.state}
            onChange={(val) => setForm((prev) => ({ ...prev, state: val }))}
            placeholder="State (Optional)"
          />

          <SuggestiveInput
            suggestions={[
              "Cow – گائے",
              "Buffalo – بھینس",
              "Goat – بکری",
              "Sheep – بھیڑ",
              "Camel – اونٹ",
              "Donkey – گدھا",
              "Horse – گھوڑا",
              "Desi/ Fancy birds – دیسی مرغی / مرغا",
              "Broiler Chicken – برائلر مرغی",
              "Layer Chicken – انڈے دینے والی مرغ",
              "Dog – کتا",
              "Cat – بلی"
            ]}
            value={form.species}
            onChange={(val) => setForm((prev) => ({ ...prev, species: val }))}
            placeholder="Animal Species"
          />

          <input
            name="fullAddress"
            placeholder="Full Address (Optional)"
            value={form.fullAddress}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Animal Gender
            </label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>

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
  );
}