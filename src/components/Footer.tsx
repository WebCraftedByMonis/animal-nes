"use client"

import { Briefcase, PawPrint, ShieldCheck, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer( ) {


    const pathname = usePathname();
      const isDashboard = pathname.startsWith('/dashboard');
    
     
    
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
           <div className="flex gap-4">
  {[
    { name: 'Twitter', url: 'https://twitter.com' },
    { name: 'Facebook', url: 'https://facebook.com' },
    { name: 'Instagram', url: 'https://instagram.com' },
    { name: 'LinkedIn', url: 'https://linkedin.com' },
    { name: 'YouTube', url: 'https://youtube.com' },
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
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-lg mb-4">Company</h4>
            <ul className="space-y-2">
              
                <li >
                  <Link href="/contact" className="text-muted-foreground-dark hover:text-background transition-colors">
                    Contact
                  </Link>
                </li>
            
            </ul>
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