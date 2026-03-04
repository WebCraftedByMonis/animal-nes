"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Quote, PawPrint, ShieldCheck, ShoppingCart, Newspaper, Briefcase, Loader2, Send, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Textarea } from "@/components/ui/textarea"
import toast from 'react-hot-toast'
import axios from "axios"
import Image from "next/image"
import { useSession } from "next-auth/react"
import FullScreenSlider from "./FullScreenSlider"
import BannerContactBar from "./BannerContactBar"
import { useLoginModal } from "@/contexts/LoginModalContext"

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

interface InitialTestimonialsData {
  data: Testimonial[]
  pagination: {
    hasMore: boolean
    total: number
    page: number
    limit: number
  }
}

interface LandingPageProps {
  initialTestimonials?: InitialTestimonialsData
}

const TestimonialCard = ({ testimonial }: { testimonial: Testimonial }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const maxLength = 120
  const shouldTruncate = testimonial.content.length > maxLength

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
    <Card className="h-full flex flex-col">
      <CardContent className="p-4 sm:p-6 flex flex-col flex-1">
        <Quote className="text-emerald-600 w-6 h-6 mb-3 opacity-30" />
        <div className="flex-1">
          <p className="text-sm sm:text-base italic text-gray-700 dark:text-gray-300">
            "
            {isExpanded || !shouldTruncate
              ? testimonial.content
              : `${testimonial.content.slice(0, maxLength)}...`}
            "
          </p>
          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-emerald-600 hover:text-emerald-700 text-sm font-medium mt-2 inline-flex items-center gap-1"
            >
              {isExpanded ? "Show less" : "Read more"}
              <ChevronRight className={cn("h-3 w-3", isExpanded && "rotate-90")} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 mt-4 pt-4 border-t">
          <div className="flex-shrink-0">
            {testimonial.user.image ? (
              <Image
                src={testimonial.user.image}
                alt={testimonial.user.name || "User"}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-contain"
                loading="lazy"
                sizes="40px"
                quality={60}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                {getInitials(testimonial.user.name)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm break-words">{testimonial.user.name || "Anonymous"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function LandingPage({ initialTestimonials }: LandingPageProps) {
  const { data: session } = useSession()
  const { openModal } = useLoginModal()
  const [testimonials, setTestimonials] = useState<Testimonial[]>(initialTestimonials?.data || [])
  const [newTestimonial, setNewTestimonial] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingTestimonials, setIsLoadingTestimonials] = useState(!initialTestimonials)
  const [hasMore, setHasMore] = useState(initialTestimonials?.pagination.hasMore || false)
  const [page, setPage] = useState(initialTestimonials?.pagination.page || 1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Measure contact bar height so hero fills exactly the remaining viewport
  const contactBarRef = useRef<HTMLDivElement>(null)
  const [contactBarH, setContactBarH] = useState(44)

  useEffect(() => {
    const el = contactBarRef.current
    if (!el) return
    const update = () => setContactBarH(el.offsetHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!initialTestimonials) {
      fetchTestimonials()
    }
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
        params: { page: currentPage, limit: 3 }
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
      openModal('button')
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
      await axios.post('/api/testimonials', { content: newTestimonial })
      toast.success("Testimonial submitted! It will be visible after approval.")
      setNewTestimonial("")
      fetchTestimonials()
    } catch (error: any) {
      if (error.response?.status === 401) {
        openModal('button')
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error)
      } else {
        toast.error("Failed to submit testimonial")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Contact Bar */}
      <div ref={contactBarRef}>
        <BannerContactBar />
      </div>

      {/* Hero Section */}
      <section
        style={{ minHeight: `calc(100vh - var(--navbar-height) - ${contactBarH}px)` }}
        className="flex items-center relative overflow-hidden"
      >
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero-bg.jpg"
            alt="Hero Background"
            width={1920}
            height={1080}
            priority
            fetchPriority="high"
            className="w-full h-full object-cover"
            sizes="100vw"
            quality={60}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40"></div>
        </div>

        <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="text-white space-y-6">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight">
                  <span className="block">Animal</span>
                  <span className="block text-emerald-400">Wellness</span>
                </h1>

                <p className="text-lg sm:text-xl md:text-2xl font-medium text-gray-200 max-w-xl">
                  The all-in-one platform revolutionizing animal care, commerce, and veterinary careers
                </p>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <p className="text-gray-300">Find trusted veterinarians near you</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <p className="text-gray-300">Shop premium veterinary products</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <p className="text-gray-300">Connect with animal care community</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Link href="/products">
                    <Button
                      size="lg"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-6 text-lg"
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/about">
                    <Button
                      size="lg"
                      variant="outline"
                      className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 font-medium px-8 py-6 text-lg"
                    >
                      Learn More About Us
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="hidden lg:block"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Slider */}
      <section
        style={{ height: 'calc(100vh - var(--navbar-height))' }}
        className="relative overflow-hidden"
      >
        <FullScreenSlider />
      </section>

      {/* Features Grid */}
      <section className="relative py-16 md:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url('/poultry-bg.jpg')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-0 bg-black/50"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white">
              Everything You Need for Animal Care
            </h2>
            <p className="text-base md:text-lg text-gray-200 max-w-3xl mx-auto">
              Comprehensive solutions for pet owners, farmers, and veterinary professionals
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="h-full bg-white/5 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <div className="bg-emerald-400/20 backdrop-blur-sm p-3 rounded-full w-12 h-12 flex items-center justify-center text-emerald-400 mb-3 border border-emerald-400/30">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg md:text-xl text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm md:text-base text-gray-200 mb-4">{feature.description}</p>
                  <Link href={feature.link}>
                    <Button variant="link" className="px-0 text-emerald-400 hover:text-emerald-300 p-0">
                      Learn more about {feature.title}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Sections */}
      {sections.map((section, index) => (
        <section
          key={index}
          className={cn(
            "py-16 md:py-24 px-4 sm:px-6 lg:px-8",
            index % 2 === 0 ? "bg-muted/30" : "bg-background"
          )}
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
              <div className={cn("lg:w-1/2 space-y-6", index % 2 === 0 ? "lg:order-2" : "")}>
                <div className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-100/30 px-3 py-1 rounded-full">
                  {section.icon}
                  {section.category}
                </div>

                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">{section.title}</h2>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">{section.description}</p>

                <div className="space-y-3">
                  {section.bullets.map((bullet, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                      <p className="text-sm md:text-base text-muted-foreground">{bullet}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-4 inline-block">
                  <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 font-medium">
                    <a href={section.link} className="flex items-center gap-2">
                      {section.cta}
                      <ArrowRight className="h-5 w-5" />
                    </a>
                  </Button>
                </div>
              </div>

              <div className={cn("lg:w-1/2 w-full", index % 2 === 0 ? "lg:order-1" : "")}>
                <div className="aspect-[4/3] lg:aspect-[16/10]">
                  <Image
                    alt={section.title}
                    src={section.src}
                    width={600}
                    height={400}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Testimonials Section */}
      <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">What Our Community Says</h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto">
              Hear from pet owners, veterinarians, and farmers who use AnimalWellness daily
            </p>
          </div>

          {isLoadingTestimonials ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : testimonials.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {testimonials.map((testimonial) => (
                  <TestimonialCard key={testimonial.id} testimonial={testimonial} />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center">
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
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No testimonials yet. Be the first to share your experience!
            </div>
          )}

          {/* Post Testimonial Form */}
          <div className="mt-12 max-w-2xl mx-auto">
            <Card className="border-emerald-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/20 py-4">
                <CardTitle className="text-lg md:text-xl text-center">Share Your Experience</CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <div className="space-y-4">
                  <Textarea
                    placeholder="Tell us about your experience with AnimalWellness..."
                    value={newTestimonial}
                    onChange={(e) => setNewTestimonial(e.target.value)}
                    rows={3}
                    className="resize-none"
                    maxLength={275}
                  />
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {newTestimonial.length}/275 characters
                    </span>
                    <Button
                      onClick={handleSubmitTestimonial}
                      disabled={isSubmitting || !newTestimonial.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
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
                  </div>
                  {!session && (
                    <p className="text-sm text-center text-muted-foreground">
                      Please <button onClick={() => openModal('button')} className="text-emerald-600 hover:underline">login</button> to post your testimonial
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white py-16 md:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-6">
            Ready to Transform Animal Care?
          </h2>
          <p className="text-lg md:text-xl mb-8 text-emerald-100 max-w-3xl mx-auto">
            Join thousands of animal lovers, professionals, and businesses in our growing community.
            Experience the future of animal wellness today.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button onClick={() => openModal('button')} size="lg" className="bg-white dark:bg-zinc-100 text-emerald-800 hover:bg-gray-100 dark:hover:bg-zinc-200 font-bold px-6 md:px-8 py-5 md:py-6 text-base md:text-lg w-full sm:w-auto">
              Sign Up Free
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10 font-medium px-6 md:px-8 py-5 md:py-6 text-base md:text-lg w-full sm:w-auto">
              <Link href="/contact">Contact Sales</Link>
            </Button>
          </div>
        </div>
      </section>

    </div>
  )
}

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

const sections = [{ title: "Find the Perfect Veterinarian", description: "Our comprehensive vet directory connects you with licensed professionals specializing in everything from exotic pets to large farm animals. Filter by location, availability, services offered, and read authentic reviews from other pet owners.", category: "Veterinary Services", icon: <ShieldCheck className="h-4 w-4" />, cta: "Search Vets", link: "/Veternarians", bullets: ["Emergency vet services available 24/7", "Verified credentials and specialties", "Transparent pricing and reviews", "Video consultation options"], src: "/vet.jpg" }, { title: "Premium Veterinary Products", description: "Access a curated marketplace of veterinary-approved products, from prescription medications to premium pet food. All products are sourced from trusted manufacturers with quality guarantees.", category: "Animal Supplies", icon: <ShoppingCart className="h-4 w-4" />, cta: "Browse Products", link: "/products", bullets: ["Over 5,000 veterinary-approved products", "Auto-refill subscriptions available", "Verified product reviews", "Fast, reliable delivery"], src: "/products.jpg", useBackground: true, bgOverlay: 40, }, { title: "Trusted Animal Marketplace", description: "Whether you're looking to adopt a new pet or sell livestock, our secure marketplace connects responsible buyers and sellers with verified listings and health records.", category: "Buy & Sell", icon: <PawPrint className="h-4 w-4" />, cta: "Explore Listings", link: "/buy", bullets: ["Mandatory health certifications", "Secure payment processing", "Adoption and rehoming services", "Breeder verification system"], src: "/pets.jpg", useBackground: true, bgOverlay: 40, }, { title: "Veterinary Career Advancement", description: "Find your next career opportunity or grow your veterinary practice with our specialized job platform. We connect qualified professionals with the best clinics, hospitals, and research facilities.", category: "Professional Network", icon: <Briefcase className="h-4 w-4" />, cta: "View Jobs", link: "/traditionaljobposts", bullets: ["Exclusive job listings", "Resume and profile builder", "Continuing education resources", "Practice management tools"], src: "/job.jpg", useBackground: true, bgOverlay: 40, poster: "/jpb.jpg", }]
