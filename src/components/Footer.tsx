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

            {/* WhatsApp */}
            <h4 className="font-semibold text-lg mb-2">WhatsApp</h4>
            <div className="flex flex-col gap-2 mb-6">
              <a href="https://chat.whatsapp.com/CqLyuyp92ex6cZ7EtpfwaU" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white text-xs font-semibold rounded-lg transition-colors">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white flex-shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Join Community
              </a>
              <a href="https://whatsapp.com/channel/0029VaeV6OQ9mrGjhvOQkW2t" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold rounded-lg transition-colors">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white flex-shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Follow Channel
              </a>
            </div>

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