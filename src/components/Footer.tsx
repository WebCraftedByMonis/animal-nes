"use client"

import { Briefcase, PawPrint, ShieldCheck, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Footer() {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith('/dashboard');
  const [email, setEmail] = useState("");
  const [subStatus, setSubStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [subMsg, setSubMsg] = useState("");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubStatus("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) { setSubStatus("done"); setSubMsg("You're subscribed!"); setEmail(""); }
      else { setSubStatus("error"); setSubMsg(data.error || "Something went wrong"); }
    } catch {
      setSubStatus("error"); setSubMsg("Failed to subscribe");
    }
  };

  if (isDashboard) return null;
    return <>
       {/* Footer */}
      <footer className="bg-foreground text-background py-16 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
          <div>
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <PawPrint className="h-6 w-6 text-emerald-400" />
              AnimalWellness
            </h3>
            <p className="text-muted-foreground-dark mb-4">
              The complete platform for animal care, commerce, and veterinary careers.
            </p>
           <div className="flex flex-wrap max-w-2xl gap-4">
  {[
    { name: 'Twitter', url: 'https://twitter.com' },
    { name: 'Facebook', url: 'https://www.facebook.com/profile.php?id=100064043800171&mibextid=ZbWKwL' },
    { name: 'Instagram', url: 'https://www.instagram.com/animalwellnessshop/' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/in/muhammad-fiaz-qamar-195208a2/' },
    { name: 'YouTube', url: 'https://www.youtube.com/@AnimalWellNessShop/shorts' },
    { name: 'WhatsApp', url: 'https://wa.me/923354145431' },
    // add more links if needed
  ].map(({ name, url }) => (
    <a
      key={name}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground-dark hover:text-background transition-colors"
    >
      {name}
    </a>
  ))}
</div>


          </div>
          
          <div>
            <h4 className="font-semibold text-lg mb-4">Services</h4>
            <ul className="space-y-2">
              {sections.slice(0, 3).map((s, i) => (
                <li key={i}>
                  <a href={s.link} className="text-muted-foreground-dark hover:text-background transition-colors">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-lg mb-4">Resources</h4>
            <ul className="space-y-2">
              {sections.slice(3).map((s, i) => (
                <li key={i}>
                  <a href={s.link} className="text-muted-foreground-dark hover:text-background transition-colors">
                    {s.title}
                  </a>
                </li>
                
              ))}
              <li>
                <a href="https://maps.app.goo.gl/Z5aXZi9idwzWhTJ1A">Shop map</a>
                 
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-lg mb-2">Company</h4>
            <ul className="space-y-2 mb-6">
              <li>
                <Link href="/contact" className="text-muted-foreground-dark hover:text-background transition-colors">
                  Contact
                </Link>
              </li>
              <li className="text-muted-foreground-dark text-sm">
                Address: 67-K Block, Commercial Market, DHA Phase-1, Lahore
              </li>
            </ul>

            {/* Newsletter */}
            <h4 className="font-semibold text-lg mb-2">Newsletter</h4>
            <p className="text-muted-foreground-dark text-sm mb-3">
              Get the latest updates on animal health & products.
            </p>
            {subStatus === "done" ? (
              <p className="text-emerald-400 text-sm font-medium">✓ {subMsg}</p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-background placeholder:text-muted-foreground-dark text-sm focus:outline-none focus:border-emerald-400"
                />
                <button
                  type="submit"
                  disabled={subStatus === "loading"}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
                >
                  {subStatus === "loading" ? "Subscribing..." : "Subscribe"}
                </button>
                {subStatus === "error" && <p className="text-red-400 text-xs">{subMsg}</p>}
              </form>
            )}
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-muted-foreground/20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground-dark text-sm">
              © {new Date().getFullYear()} AnimalWellness. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/Privacy" className="text-muted-foreground-dark hover:text-background text-sm transition-colors">
                Privacy Policy
              </Link>
              <Link href="/" className="text-muted-foreground-dark hover:text-background text-sm transition-colors">
                Terms of Service
              </Link>
            
            </div>
          </div>
        </div>
      </footer>
    </>
}


const sections = [
  {
    title: "Find the Perfect Veterinarian",
    description: "Our comprehensive vet directory connects you with licensed professionals specializing in everything from exotic pets to large farm animals. Filter by location, availability, services offered, and read authentic reviews from other pet owners.",
    category: "Veterinary Services",
    icon: <ShieldCheck className="h-4 w-4" />,
    cta: "Search Vets",
    link: "/findDoctor",
    bullets: [
      "Emergency vet services available 24/7",
      "Verified credentials and specialties",
      "Transparent pricing and reviews",
      "Video consultation options"
    ]
  },
  {
    title: "Premium Veterinary Products",
    description: "Access a curated marketplace of veterinary-approved products, from prescription medications to premium pet food. All products are sourced from trusted manufacturers with quality guarantees.",
    category: "Animal Supplies",
    icon: <ShoppingCart className="h-4 w-4" />,
    cta: "Browse Products",
    link: "/products",
    bullets: [
      "Over 5,000 veterinary-approved products",
      "Auto-refill subscriptions available",
      "Verified product reviews",
      "Fast, reliable delivery"
    ]
  },
  {
    title: "Trusted Animal Marketplace",
    description: "Whether you're looking to adopt a new pet or sell livestock, our secure marketplace connects responsible buyers and sellers with verified listings and health records.",
    category: "Buy & Sell",
    icon: <PawPrint className="h-4 w-4" />,
    cta: "Explore Listings",
    link: "/buy",
    bullets: [
      "Mandatory health certifications",
      "Secure payment processing",
      "Adoption and rehoming services",
      "Breeder verification system"
    ]
  },
  {
    title: "Veterinary Career Advancement",
    description: "Find your next career opportunity or grow your veterinary practice with our specialized job platform. We connect qualified professionals with the best clinics, hospitals, and research facilities.",
    category: "Professional Network",
    icon: <Briefcase className="h-4 w-4" />,
    cta: "View Jobs",
    link: "/jobApplicantForm",
    bullets: [
      "Exclusive job listings",
      "Resume and profile builder",
      "Continuing education resources",
      "Practice management tools"
    ]
  }
];