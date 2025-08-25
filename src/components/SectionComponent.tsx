"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight, Briefcase, PawPrint, ShieldCheck, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// --- Animations (you can swap with your existing ones) ---
const slideInFromLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
};
const slideInFromRight = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
};
const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// --- Types ---
export type SectionItem = {
  title: string;
  description: string;
  category?: string;
  icon?: React.ReactNode;
  bullets: string[];
  cta?: string;
  link?: string;
  /**
   * Pass a single media source. If it's an MP4/WebM/OGG it will render a <video/>.
   * If it's an image (jpg/png/webp) it will render an <Image/>.
   */
  src?: string;
  /** Optional poster for videos */
  poster?: string;
  /** If true, this section uses a full-width background image/video with content on top */
  useBackground?: boolean;
  /** Optional overlay strength (0-100) for background layout */
  bgOverlay?: number;
};

// --- Helpers ---
const isVideo = (url?: string) => !!url && /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);

function MediaFigure({ src, alt, poster }: { src?: string; alt: string; poster?: string }) {
  if (!src) return null;

  if (isVideo(src)) {
    return (
      <video
        className="w-full h-full object-cover"
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        controls={false}
      />
    );
  }

  return (
    <Image
      alt={alt}
      src={src}
      fill
      sizes="(min-width: 1024px) 50vw, 90vw"
      className="object-cover"
      priority={false}
    />
  );
}

export default function SectionComponent(
    
//     {
//   sections,
// }: {
//   sections: SectionItem[];
// }

) {
  return (
    <div>
      {sections.map((section, index) => {
        const even = index % 2 === 0;
        const containerBg = even ? "bg-muted/30" : "bg-background";
        const overlay = Math.min(Math.max(section.bgOverlay ?? 35, 0), 100);

        if (section.useBackground) {
          // === Background layout ===
          return (
            <section key={index} className={cn("relative py-20 md:py-28", containerBg)}>
              <div className="absolute inset-0 -z-10">
                <div className="relative w-full h-full">
                  {/* Use absolutely positioned wrapper with next/image fill OR <video> */}
                  <div className="absolute inset-0">
                    {section.src ? (
                      isVideo(section.src) ? (
                        <video
                          className="w-full h-full object-cover"
                          src={section.src}
                          poster={section.poster}
                          autoPlay
                          muted
                          loop
                          playsInline
                        />
                      ) : (
                        <Image
                          src={section.src}
                          alt={section.title}
                          fill
                          sizes="100vw"
                          className="object-cover"
                          priority={false}
                        />
                      )
                    ) : null}
                  </div>

                  {/* Overlay for readability */}
                  <div
                    className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/20"
                    style={{ opacity: overlay / 100 }}
                  />
                </div>
              </div>

              <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-12 gap-8 lg:gap-16 items-center">
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.25 }}
                    variants={even ? slideInFromRight : slideInFromLeft}
                    className={cn("lg:col-span-7 space-y-6 text-white")}
                  >
                    {section.category && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                        className="inline-flex items-center gap-2 text-sm font-medium bg-emerald-500/20 px-3 py-1 rounded-full"
                      >
                        {section.icon}
                        {section.category}
                      </motion.div>
                    )}

                    <h2 className="text-3xl md:text-4xl font-bold">{section.title}</h2>
                    <p className="text-base md:text-lg max-w-2xl text-white/90 leading-relaxed">
                      {section.description}
                    </p>

                    <motion.div
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                      variants={staggerContainer}
                      className="space-y-3"
                    >
                      {section.bullets?.map((b, i) => (
                        <motion.div key={i} variants={fadeInUp} className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1 w-2 h-2 rounded-full bg-emerald-400" />
                          <p className="text-sm md:text-base text-white/90">{b}</p>
                        </motion.div>
                      ))}
                    </motion.div>

                    {section.cta && section.link && (
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="pt-4 inline-block">
                        <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 font-medium">
                          <a href={section.link} className="flex items-center gap-2">
                            {section.cta}
                            <ArrowRight className="h-5 w-5" />
                          </a>
                        </Button>
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Optional empty column to create breathing space on wide screens */}
                  <div className="hidden lg:block lg:col-span-5" />
                </div>
              </div>
            </section>
          );
        }

        // === Side-by-side layout (your original pattern) ===
        return (
          <section key={index} className={cn("py-16 md:py-24 px-4 sm:px-6 lg:px-8", containerBg)}>
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  variants={even ? slideInFromRight : slideInFromLeft}
                  className={cn("lg:w-1/2 space-y-6", even ? "lg:order-2" : "")}
                >
                  {section.category && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                      className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-100/30 px-3 py-1 rounded-full"
                    >
                      {section.icon}
                      {section.category}
                    </motion.div>
                  )}

                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">{section.title}</h2>
                  <p className="text-base md:text-lg text-muted-foreground leading-relaxed">{section.description}</p>

                  <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="space-y-3">
                    {section.bullets?.map((bullet, i) => (
                      <motion.div key={i} variants={fadeInUp} className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <motion.div
                            initial={{ scale: 0 }}
                            whileInView={{ scale: 1 }}
                            transition={{ duration: 0.3, delay: i * 0.1 }}
                            className="w-2 h-2 rounded-full bg-emerald-500"
                          />
                        </div>
                        <p className="text-sm md:text-base text-muted-foreground">{bullet}</p>
                      </motion.div>
                    ))}
                  </motion.div>

                  {section.cta && section.link && (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="pt-4 inline-block">
                      <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 font-medium">
                        <a href={section.link} className="flex items-center gap-2">
                          {section.cta}
                          <ArrowRight className="h-5 w-5" />
                        </a>
                      </Button>
                    </motion.div>
                  )}
                </motion.div>

                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  variants={even ? slideInFromLeft : slideInFromRight}
                  className={cn("lg:w-1/2 w-full", even ? "lg:order-1" : "")}
                >
                  <div className="aspect-[4/3] lg:aspect-[16/10] rounded-2xl shadow-xl overflow-hidden relative">
                    <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.3 }} className="w-full h-full">
                      <div className="absolute inset-0">
                        {/* MediaFigure will auto-choose image or video; next/image uses fill */}
                        <MediaFigure src={section.src} poster={section.poster} alt={section.title} />
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}



// Drop this in a file like app/(marketing)/sections-data.tsx
// It validates your data shape, fixes small issues (e.g., link spelling),
// and shows how to send it into the <Sections/> component I shared.

// <-- adjust import path to where you saved the component

// ✅ Recommended: keep media files in /public and reference with absolute paths like "/vet.jpg"
//    For remote images, configure next.config.js images.domains or remotePatterns.

const sections: SectionItem[] = [
  {
    title: "Find the Perfect Veterinarian",
    description:
      "Our comprehensive vet directory connects you with licensed professionals specializing in everything from exotic pets to large farm animals. Filter by location, availability, services offered, and read authentic reviews from other pet owners.",
    category: "Veterinary Services",
    icon: <ShieldCheck className="h-4 w-4" />,
    cta: "Search Vets",
    // ❗ Typo fix: "/Veternarians" → "/veterinarians" (change if your route is different)
    link: "/veterinarians",
    bullets: [
      "Emergency vet services available 24/7",
      "Verified credentials and specialties",
      "Transparent pricing and reviews",
      "Video consultation options",
    ],
    src: "/vet.jpg", // image → will render Next <Image/>
  },
  {
    title: "Premium Veterinary Products",
    description:
      "Access a curated marketplace of veterinary-approved products, from prescription medications to premium pet food. All products are sourced from trusted manufacturers with quality guarantees.",
    category: "Animal Supplies",
    icon: <ShoppingCart className="h-4 w-4" />,
    cta: "Browse Products",
    link: "/products",
    bullets: [
      "Over 5,000 veterinary-approved products",
      "Auto-refill subscriptions available",
      "Verified product reviews",
      "Fast, reliable delivery",
    ],
    src: "/products.jpg",
    useBackground: true, // full-width background section
    bgOverlay: 40,
  },
  {
    title: "Trusted Animal Marketplace",
    description:
      "Whether you're looking to adopt a new pet or sell livestock, our secure marketplace connects responsible buyers and sellers with verified listings and health records.",
    category: "Buy & Sell",
    icon: <PawPrint className="h-4 w-4" />,
    cta: "Explore Listings",
    link: "/buy",
    bullets: [
      "Mandatory health certifications",
      "Secure payment processing",
      "Adoption and rehoming services",
      "Breeder verification system",
    ],
    src: "/pets.jpg",
    useBackground: true,
    bgOverlay: 40,
  },
  {
    title: "Veterinary Career Advancement",
    description:
      "Find your next career opportunity or grow your veterinary practice with our specialized job platform. We connect qualified professionals with the best clinics, hospitals, and research facilities.",
    category: "Professional Network",
    icon: <Briefcase className="h-4 w-4" />,
    cta: "View Jobs",
    link: "/traditionaljobposts",
    bullets: [
      "Exclusive job listings",
      "Resume and profile builder",
      "Continuing education resources",
      "Practice management tools",
    ],
    // 🔄 Example of video + poster. If you only have an image, keep src to .jpg/.png and poster will be ignored.
    src: "/jobs-hero.mp4", // ← change to your video file if you have one; otherwise use "/job.jpg"
    poster: "/job.jpg",
    useBackground: true,
    bgOverlay: 40,
  },
];



/*
Notes:
- The component auto-detects media type by extension. mp4/webm/ogg → <video>; others → <Image>.
- When useBackground=true, the media fills the section background and content is overlaid with a gradient set by bgOverlay.
- For Next <Image>, the parent wrapper is already positioned for fill, so you only need a valid src (public/ or allowed remote).
- "poster" is used only when the src is a video; safe to leave undefined for images.
*/
