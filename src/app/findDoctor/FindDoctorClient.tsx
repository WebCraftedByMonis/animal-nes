"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useSession, signIn } from "next-auth/react";
import { SuggestiveInput } from "@/components/shared/SuggestiveInput";
import { useLoginModal } from "@/contexts/LoginModalContext";
import { useCountry } from "@/contexts/CountryContext";

export default function FindDoctorClient() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const { openModal } = useLoginModal();
  const { country } = useCountry();
  const [hasPromptedLogin, setHasPromptedLogin] = useState(false);
  const [form, setForm] = useState({
    doctor: "",
    city: "",
    state: "",
    species: "",
    fullAddress: "",
    gender: "MALE",
    isEmergency: false,
    description: "",
    country: "Pakistan",
  });
  const [loading, setLoading] = useState(false);

  // Show login modal when user is not authenticated
  useEffect(() => {
    if (status === "unauthenticated" && !hasPromptedLogin) {
      setHasPromptedLogin(true);
      openModal('button');
    }
  }, [status, openModal, hasPromptedLogin]);

  if (status === 'loading') {
    return (
      <div className="text-center mt-20 text-lg font-medium text-gray-600 dark:text-gray-400">
        Loading...
      </div>
    )
  }

  if (!session?.user?.email) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-6">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-8 border border-green-200 dark:border-green-800">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Find a Veterinarian
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Sign in to book appointments with qualified veterinarians for your animals.
          </p>
          <button
            onClick={() => openModal('button')}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Sign In to Book Appointment
          </button>
        </div>
      </div>
    )
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const value =
      target instanceof HTMLInputElement && target.type === "checkbox"
        ? target.checked
        : target.value;
    setForm((prev) => {
      const updated = { ...prev, [target.name]: value };
      if (target.name === "country") updated.state = "";
      return updated;
    });
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
          country: "Pakistan",
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
          <p className="text-center text-gray-500 dark:text-gray-400">Checking your session…</p>
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
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          <input
            name="city"
            placeholder="City"
            value={form.city}
            onChange={handleChange}
            required
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Country
            </label>
            <select
              name="country"
              value={form.country}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="Pakistan">Pakistan</option>
              <option value="UAE">UAE</option>
            </select>
          </div>

          <SuggestiveInput
            suggestions={
              form.country === "UAE"
                ? [
                    "Abu Dhabi",
                    "Dubai",
                    "Sharjah",
                    "Ajman",
                    "Umm Al Quwain",
                    "Ras Al Khaimah",
                    "Fujairah",
                  ]
                : [
                    "Punjab",
                    "Sindh",
                    "Balochistan",
                    "Khyber Pakhtunkhwa",
                    "Gilgit Baltistan",
                    "Kashmir",
                    "Islamabad",
                  ]
            }
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
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Animal Gender
            </label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
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
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
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