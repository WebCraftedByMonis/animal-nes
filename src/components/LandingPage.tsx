import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Quote, PawPrint, ShieldCheck, ShoppingCart, Newspaper, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Footer from "./Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Hero Section */}
      <header className="relative bg-gradient-to-br from-green-600 to-emerald-800 text-white py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('/pattern.svg')] bg-[length:100px_100px]"></div>
        </div>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-900/30 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-emerald-400/20">
            <PawPrint className="h-5 w-5" />
            <span className="text-sm font-medium">Trusted by 50,000+ animal lovers</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-emerald-100">
            AnimalWellness
          </h1>
          <p className="text-xl md:text-2xl mt-6 max-w-3xl mx-auto font-medium text-emerald-100">
            The all-in-one platform revolutionizing animal care, commerce, and veterinary careers
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/products">
           
           
            <Button size="lg" className="bg-white text-emerald-800 hover:bg-gray-100 font-bold px-8 py-6 text-lg">
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            </Link>
             <Link href="/about">
            <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10 font-medium px-8 py-6 text-lg">
              Learn More
            </Button>
             </Link>
          </div>
        </div>
      </header>

      <main className="space-y-24 md:space-y-32">
        {/* Features Grid */}
        <section className="py-16 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need for Animal Care</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Comprehensive solutions for pet owners, farmers, and veterinary professionals
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300 h-full">
                <CardHeader>
                  <div className="bg-emerald-100/20 p-3 rounded-full w-12 h-12 flex items-center justify-center text-emerald-600">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{feature.description}</p>
                  <Link href={feature.link}>
                  <Button variant="link" className="px-0 text-emerald-600 hover:text-emerald-800">
                    Learn more
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Detailed Sections */}
        {sections.map((section, index) => (
          <section
            key={index}
            className={cn(
              "py-20 px-6 flex flex-col lg:flex-row items-center justify-between max-w-7xl mx-auto gap-12",
              index % 2 === 0 ? "bg-muted/50" : ""
            )}
          >
            <div className={cn("lg:w-1/2 space-y-6", index % 2 === 0 ? "lg:order-2" : "")}>
              <div className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-100/30 px-3 py-1 rounded-full">
                {section.icon}
                {section.category}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">{section.title}</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">{section.description}</p>
              
              <div className="space-y-3">
                {section.bullets.map((bullet, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    </div>
                    <p className="text-muted-foreground">{bullet}</p>
                  </div>
                ))}
              </div>
              
              <div className="pt-4">
                <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 font-medium">
                  <a href={section.link} className="flex items-center gap-2">
                    {section.cta}
                    <ArrowRight className="h-5 w-5" />
                  </a>
                </Button>
              </div>
            </div>
            <div className={cn(
              "lg:w-1/2 h-[400px] rounded-2xl shadow-lg overflow-hidden",
              index % 2 === 0 ? "lg:order-1" : ""
            )}>
              <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
                <div className="text-5xl font-bold text-emerald-600/30">Image</div>
              </div>
            </div>
          </section>
        ))}

        {/* Stats Section */}
        <section className="bg-gradient-to-br from-emerald-700 to-emerald-900 text-white py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Trusted by the Animal Community</h2>
              <p className="text-lg text-emerald-100 max-w-3xl mx-auto">
                Join thousands of satisfied users who trust AnimalWellness for their animal care needs
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-4xl md:text-5xl font-bold mb-2">{stat.value}</div>
                  <p className="text-emerald-200">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Community Says</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Hear from pet owners, veterinarians, and farmers who use AnimalWellness daily
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <Card key={i} className="hover:shadow-lg transition-shadow duration-300 h-full">
                <CardContent className="p-8">
                  <Quote className="text-emerald-600 w-8 h-8 mb-6 opacity-30" />
                  <p className="text-lg italic mb-6">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                      {testimonial.author.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white py-24 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-6">Ready to Transform Animal Care?</h2>
            <p className="text-xl mb-8 text-emerald-100 max-w-3xl mx-auto">
              Join thousands of animal lovers, professionals, and businesses in our growing community. 
              Experience the future of animal wellness today.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" className="bg-white text-emerald-800 hover:bg-gray-100 font-bold px-8 py-6 text-lg">
                Sign Up Free
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10 font-medium px-8 py-6 text-lg">
                Contact Sales
              </Button>
            </div>
          </div>
        </section>
      </main>

   {/* <Footer/> */}
    </div>
  );
}

const features = [
  {
    title: "Veterinary Directory",
    description: "Find trusted veterinarians near you with verified reviews and 24/7 emergency options.",
    icon: <ShieldCheck className="h-5 w-5" />,
    link: "findDoctor"
  },
  {
    title: "Premium Products",
    description: "Shop veterinary-grade supplies, medicines, and food with doorstep delivery.",
    icon: <ShoppingCart className="h-5 w-5" />,
    link: "/products"
  },
  {
    title: "Animal Marketplace",
    description: "Buy and sell pets and livestock with verified health records and secure payments.",
    icon: <PawPrint className="h-5 w-5" />,
    link: "/sell"

  },
  {
    title: "Latest News",
    description: "Stay updated with expert articles, research breakthroughs, and care guides.",
    icon: <Newspaper className="h-5 w-5" />,
    link: "/animal-news"
  },
  {
    title: "Career Hub",
    description: "Find your dream veterinary job or qualified professionals for your practice.",
    icon: <Briefcase className="h-5 w-5" />,
    link: "/jobApplicantForm"
  },
  {
    title: "Community Support",
    description: "Connect with other animal lovers and get advice from professionals.",
    icon: <Quote className="h-5 w-5" />,
    link: "/"
  }
];

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

const testimonials = [
  {
    quote: "As a small animal vet, I've found AnimalWellness invaluable for connecting with clients and staying updated on the latest treatments. The platform has helped grow my practice by 40% in just one year.",
    author: "Dr. Emily Rodriguez",
    role: "Veterinarian, Miami FL"
  },
  {
    quote: "When my horse needed emergency care while traveling, AnimalWellness helped me locate a qualified equine vet within minutes. The detailed profiles and reviews gave me confidence in my choice.",
    author: "Michael Chen",
    role: "Equestrian, Kentucky"
  },
  {
    quote: "Our animal shelter has placed 3 times more adoptions since listing on AnimalWellness. The verification process ensures our animals go to responsible homes.",
    author: "Sarah Johnson",
    role: "Shelter Director, Portland OR"
  }
];

const stats = [
  { value: "50K+", label: "Active Users" },
  { value: "8K+", label: "Veterinary Professionals" },
  { value: "15K+", label: "Animals Helped Monthly" },
  { value: "4.9", label: "Average Rating" }
];