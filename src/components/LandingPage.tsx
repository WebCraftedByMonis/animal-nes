"use client"

import { useState, useEffect } from "react"
import { motion, useScroll, useTransform, Variants } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Quote, PawPrint, ShieldCheck, ShoppingCart, Newspaper, Briefcase, Loader2, Send, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "react-toastify"
import axios from "axios"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { signIn } from "next-auth/react"
import FullScreenSlider from "./FullScreenSlider"

interface Testimonial {
  id: number
  content: string
  user: {
    name: string | null
    email: string | null
    image: string | null
  }
  createdAt: string
}

// Animation Variants - Faster animations for snappier feel
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
}

const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.25,
      ease: "easeOut"
    }
  }
}

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05
    }
  }
}

const slideInFromLeft: Variants = {
  hidden: { opacity: 0, x: -60 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.35,
      ease: "easeOut"
    }
  }
}

const slideInFromRight: Variants = {
  hidden: { opacity: 0, x: 60 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.35,
      ease: "easeOut"
    }
  }
}

export default function LandingPage() {
  const { data: session, status } = useSession()
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [newTestimonial, setNewTestimonial] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingTestimonials, setIsLoadingTestimonials] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Parallax scroll
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 500], [0, 150])
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.3])

  // Fetch testimonials
  useEffect(() => {
    fetchTestimonials()
  }, [])

  const fetchTestimonials = async (loadMore = false) => {
    try {
      if (loadMore) {
        setIsLoadingMore(true)
      } else {
        setIsLoadingTestimonials(true)
      }

      const currentPage = loadMore ? page + 1 : 1
      const { data } = await axios.get('/api/testimonials', {
        params: {
          page: currentPage,
          limit: 3
        }
      })

      if (loadMore) {
        setTestimonials(prev => [...prev, ...data.data])
        setPage(currentPage)
      } else {
        setTestimonials(data.data)
      }

      setHasMore(data.pagination.hasMore)
    } catch (error) {
      console.error('Error fetching testimonials:', error)
    } finally {
      setIsLoadingTestimonials(false)
      setIsLoadingMore(false)
    }
  }

  const handleSubmitTestimonial = async () => {
    if (!session) {
      toast.info("Please login first to post your testimonial")
      signIn()
      return
    }

    if (!newTestimonial.trim()) {
      toast.error("Please write your testimonial")
      return
    }

    if (newTestimonial.length < 10) {
      toast.error("Testimonial must be at least 10 characters")
      return
    }

    setIsSubmitting(true)
    try {
      await axios.post('/api/testimonials', {
        content: newTestimonial
      })

      toast.success("Testimonial submitted! It will be visible after approval.")
      setNewTestimonial("")
      fetchTestimonials()
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error("Please login to post a testimonial")
        signIn()
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error)
      } else {
        toast.error("Failed to submit testimonial")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Hero Section with Parallax */}
      <motion.header 
        className="relative bg-gradient-to-br from-green-600 to-emerald-800 text-white py-20 overflow-hidden"
        style={{ y: heroY }}
      >
        <motion.div 
          className="absolute inset-0 opacity-10"
          style={{ opacity: heroOpacity }}
        >
          <div className="absolute inset-0 bg-[url('/pattern.svg')] bg-[length:100px_100px]"></div>
        </motion.div>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center relative z-10">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-emerald-100"
          >
            AnimalWellness
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
            className="text-xl md:text-2xl mt-6 max-w-3xl mx-auto font-medium text-emerald-100"
          >
            The all-in-one platform revolutionizing animal care, commerce, and veterinary careers
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
            className="mt-10 flex flex-col sm:flex-row justify-center gap-4"
          >
            <Link href="/products">
              <Button size="lg" className="bg-white text-emerald-800 hover:bg-gray-100 font-bold px-8 py-6 text-lg group">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/about">
              <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10 font-medium px-8 py-6 text-lg">
                Learn More
              </Button>
            </Link>
          </motion.div>
        </div>
      </motion.header>

      <FullScreenSlider/>

      <main className="space-y-24 md:space-y-32">
        {/* Features Grid with Stagger Animation */}
        <section className="py-16 px-6 max-w-7xl mx-auto">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need for Animal Care</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Comprehensive solutions for pet owners, farmers, and veterinary professionals
            </p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInScale}
                whileHover={{ y: -10, transition: { duration: 0.2 } }}
              >
                <Card className="hover:shadow-lg transition-shadow duration-300 h-full">
                  <CardHeader>
                    <motion.div 
                      initial={{ rotate: -90, opacity: 0 }}
                      whileInView={{ rotate: 0, opacity: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="bg-emerald-100/20 p-3 rounded-full w-12 h-12 flex items-center justify-center text-emerald-600"
                    >
                      {feature.icon}
                    </motion.div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{feature.description}</p>
                    <Link href={feature.link}>
                      <Button variant="link" className="px-0 text-emerald-600 hover:text-emerald-800 group">
                        Learn more
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Detailed Sections with Alternating Animations */}
        {sections.map((section, index) => (
          <section
            key={index}
            className={cn(
              "py-20 px-6 flex flex-col lg:flex-row items-center justify-between max-w-7xl mx-auto gap-12",
              index % 2 === 0 ? "bg-muted/50" : ""
            )}
          >
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={index % 2 === 0 ? slideInFromRight : slideInFromLeft}
              className={cn("lg:w-1/2 space-y-6", index % 2 === 0 ? "lg:order-2" : "")}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-100/30 px-3 py-1 rounded-full"
              >
                {section.icon}
                {section.category}
              </motion.div>
              <h2 className="text-3xl md:text-4xl font-bold">{section.title}</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">{section.description}</p>

              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
                className="space-y-3"
              >
                {section.bullets.map((bullet, i) => (
                  <motion.div 
                    key={i} 
                    variants={fadeInUp}
                    className="flex items-start gap-3"
                  >
                    <div className="flex-shrink-0 mt-1">
                      <motion.div 
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        transition={{ duration: 0.3, delay: i * 0.1 }}
                        className="w-2 h-2 rounded-full bg-emerald-500"
                      />
                    </div>
                    <p className="text-muted-foreground">{bullet}</p>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="pt-4 inline-block"
              >
                <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 font-medium">
                  <a href={section.link} className="flex items-center gap-2">
                    {section.cta}
                    <ArrowRight className="h-5 w-5" />
                  </a>
                </Button>
              </motion.div>
            </motion.div>
            
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={index % 2 === 0 ? slideInFromLeft : slideInFromRight}
              className={cn(
                "lg:w-1/2 lg:min-h-[580px] md:min-h-[500px] min-h-[400px] rounded-2xl shadow-lg overflow-hidden",
                index % 2 === 0 ? "lg:order-1" : ""
              )}
            >
              <motion.div 
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center"
              >
                <img alt={section.title} src={section.src} className="object-cover object-center" />
              </motion.div>
            </motion.div>
          </section>
        ))}

        {/* Testimonials Section with Fade In */}
        <section className="py-20 px-6 max-w-7xl mx-auto">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Community Says</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Hear from pet owners, veterinarians, and farmers who use AnimalWellness daily
            </p>
          </motion.div>

          {/* Testimonials Grid */}
          {isLoadingTestimonials ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : testimonials.length > 0 ? (
            <>
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                variants={staggerContainer}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 px-4"
                key={testimonials.length} // Force re-render when testimonials change
              >
                {testimonials.map((testimonial, index) => (
                  <motion.div
                    key={testimonial.id}
                    variants={fadeInScale}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  >
                    <Card className="hover:shadow-lg transition-shadow duration-300 h-full flex flex-col justify-between">
                      <CardContent className="p-4 sm:p-6">
                        <Quote className="text-emerald-600 w-8 h-8 mb-4 opacity-30" />
                        <p className="text-base sm:text-lg italic mb-4 text-center sm:text-justify break-words">
                          "{testimonial.content}"
                        </p>
                        <Quote className="text-emerald-600 w-8 h-8 mb-4 opacity-30 mx-auto sm:mx-0" />

                        <div className="flex items-center gap-4">
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                            className="flex-shrink-0"
                          >
                            {testimonial.user.image ? (
                              <Image
                                src={testimonial.user.image}
                                alt={testimonial.user.name || "User"}
                                width={50}
                                height={50}
                                className="rounded-full"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                                {getInitials(testimonial.user.name)}
                              </div>
                            )}
                          </motion.div>
                          <div className="min-w-0">
                            <p className="font-semibold break-words">{testimonial.user.name || "Anonymous"}</p>
                            <p className="text-sm text-muted-foreground break-words">{testimonial.user.email}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              {/* Load More Button */}
              {hasMore && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center"
                >
                  <Button
                    onClick={() => fetchTestimonials(true)}
                    disabled={isLoadingMore}
                    variant="outline"
                    size="lg"
                    className="gap-2"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Load More Testimonials
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No testimonials yet. Be the first to share your experience!
            </div>
          )}

          {/* Post Testimonial Form */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeInUp}
            className="mt-16 max-w-2xl mx-auto"
          >
            <Card className="border-emerald-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-emerald-100/50">
                <CardTitle className="text-xl text-center">Share Your Experience</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Textarea
                    placeholder="Tell us about your experience with AnimalWellness..."
                    value={newTestimonial}
                    onChange={(e) => setNewTestimonial(e.target.value)}
                    rows={4}
                    className="resize-none focus:ring-emerald-500 focus:border-emerald-500"
                    maxLength={275}
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {newTestimonial.length}/275 characters
                    </span>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={handleSubmitTestimonial}
                        disabled={isSubmitting || !newTestimonial.trim()}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            {session ? "Post Testimonial" : "Login to Post"}
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </div>
                  {!session && (
                    <p className="text-sm text-center text-muted-foreground">
                      Please <button onClick={() => signIn()} className="text-emerald-600 hover:underline">login</button> to post your testimonial
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </section>

        {/* CTA Section with Scale Animation */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeInScale}
          className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white py-24 px-6"
        >
          <div className="max-w-4xl mx-auto text-center">
            <motion.h2 
              variants={fadeInUp}
              className="text-3xl md:text-4xl font-extrabold mb-6"
            >
              Ready to Transform Animal Care?
            </motion.h2>
            <motion.p 
              variants={fadeInUp}
              className="text-xl mb-8 text-emerald-100 max-w-3xl mx-auto"
            >
              Join thousands of animal lovers, professionals, and businesses in our growing community.
              Experience the future of animal wellness today.
            </motion.p>
            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row justify-center gap-4"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" className="bg-white text-emerald-800 hover:bg-gray-100 font-bold px-8 py-6 text-lg">
                  Sign Up Free
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10 font-medium px-8 py-6 text-lg">
                  Contact Sales
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </motion.section>
      </main>
    </div>
  )
}

// Keep your existing data arrays
const features = [
  {
    title: "Veterinary Directory",
    description: "Find trusted veterinarians near you with verified reviews and 24/7 emergency options.",
    icon: <ShieldCheck className="h-5 w-5" />,
    link: "/Veternarians"
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
    link: "/buy"
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
    link: "/jobvacancy"
  },
  {
    title: "Community Support",
    description: "Connect with other animal lovers and get advice from professionals.",
    icon: <Quote className="h-5 w-5" />,
    link: "https://whatsapp.com/channel/0029VaeV6OQ9mrGjhvOQkW2t"
  }
]

const sections = [
  {
    title: "Find the Perfect Veterinarian",
    description: "Our comprehensive vet directory connects you with licensed professionals specializing in everything from exotic pets to large farm animals. Filter by location, availability, services offered, and read authentic reviews from other pet owners.",
    category: "Veterinary Services",
    icon: <ShieldCheck className="h-4 w-4" />,
    cta: "Search Vets",
    link: "/Veternarians",
    bullets: [
      "Emergency vet services available 24/7",
      "Verified credentials and specialties",
      "Transparent pricing and reviews",
      "Video consultation options"
    ],
    src: "/vet.jpg"
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
    ],
    src: "/products.jpg"
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
    ],
    src: "/pets.jpg"
  },
  {
    title: "Veterinary Career Advancement",
    description: "Find your next career opportunity or grow your veterinary practice with our specialized job platform. We connect qualified professionals with the best clinics, hospitals, and research facilities.",
    category: "Professional Network",
    icon: <Briefcase className="h-4 w-4" />,
    cta: "View Jobs",
    link: "/traditionaljobposts",
    bullets: [
      "Exclusive job listings",
      "Resume and profile builder",
      "Continuing education resources",
      "Practice management tools"
    ],
    src: "/job.jpg"
  }
]