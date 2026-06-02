"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Quote, PawPrint, ShieldCheck, ShoppingCart, Newspaper, Briefcase, Loader2, Send, ChevronDown, ChevronRight, CheckCircle2, MessageCircle, Star } from "lucide-react"
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
import { useCountry } from "@/contexts/CountryContext"

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

const TestimonialCard = ({ testimonial, isUAE }: { testimonial: Testimonial; isUAE?: boolean }) => {
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
        <Quote className={cn("w-6 h-6 mb-3 opacity-30", isUAE ? "text-[#EF3340]" : "text-emerald-600")} />
        <div className="flex-1">
          <p className="text-sm sm:text-base italic text-gray-700 dark:text-gray-300">
            &ldquo;
            {isExpanded || !shouldTruncate
              ? testimonial.content
              : `${testimonial.content.slice(0, maxLength)}...`}
            &rdquo;
          </p>
          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn("text-sm font-medium mt-2 inline-flex items-center gap-1", isUAE ? "text-[#EF3340] hover:text-[#CC1A28]" : "text-emerald-600 hover:text-emerald-700")}
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
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm", isUAE ? "bg-[#EF3340]/10 text-[#EF3340]" : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400")}>
                {getInitials(testimonial.user.name)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm break-words">{testimonial.user.name || "Anonymous"}</p>
            <div className="flex gap-0.5 mt-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

export default function LandingPage({ initialTestimonials }: LandingPageProps) {
  const { data: session } = useSession()
  const { openModal } = useLoginModal()
  const { country } = useCountry()
  const isUAE = country === 'UAE'

  const c = isUAE ? {
    heroOverlay:       'bg-gradient-to-r from-[#EF3340]/70 via-black/55 to-black/30',
    wellnessText:      'text-[#EF3340]',
    heroDot:           'bg-[#EF3340]',
    btnPrimary:        'bg-[#EF3340] hover:bg-[#CC1A28] text-white font-bold px-8 py-6 text-lg',
    iconWrap:          'bg-[#EF3340]/20 backdrop-blur-sm p-3 rounded-full w-12 h-12 flex items-center justify-center text-[#EF3340] mb-3 border border-[#EF3340]/30',
    featureLink:       'text-[#EF3340] hover:text-[#CC1A28]',
    badgeText:         'text-[#CE1126]',
    badgeBg:           'bg-[#EF3340]/10',
    sectionDot:        'bg-[#EF3340]',
    sectionBtn:        'bg-[#EF3340] hover:bg-[#CC1A28]',
    loader:            'text-[#EF3340]',
    testimonialBorder: 'border-[#EF3340]/40',
    testimonialHeader: 'bg-gradient-to-r from-[#EF3340]/10 to-[#EF3340]/5 dark:from-[#EF3340]/20 dark:to-[#EF3340]/10',
    submitBtn:         'bg-[#EF3340] hover:bg-[#CC1A28]',
    loginLink:         'text-[#EF3340]',
    ctaSection:        'bg-gradient-to-br from-[#EF3340] via-[#CC1A28] to-[#8B0000]',
    trustBadge:        'bg-[#EF3340]/20 border border-[#EF3340]/40 text-[#EF3340]',
    whyBg:             'bg-gradient-to-br from-[#EF3340]/5 to-[#EF3340]/10',
    whyCheck:          'text-[#EF3340]',
    catCard:           'hover:border-[#EF3340]/50 hover:bg-[#EF3340]/5',
  } : {
    heroOverlay:       'bg-gradient-to-r from-black/80 via-black/60 to-black/40',
    wellnessText:      'text-emerald-400',
    heroDot:           'bg-emerald-400',
    btnPrimary:        'bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-6 text-lg',
    iconWrap:          'bg-emerald-400/20 backdrop-blur-sm p-3 rounded-full w-12 h-12 flex items-center justify-center text-emerald-400 mb-3 border border-emerald-400/30',
    featureLink:       'text-emerald-400 hover:text-emerald-300',
    badgeText:         'text-emerald-600',
    badgeBg:           'bg-emerald-100/30',
    sectionDot:        'bg-emerald-500',
    sectionBtn:        'bg-emerald-600 hover:bg-emerald-700',
    loader:            'text-emerald-600',
    testimonialBorder: 'border-emerald-200',
    testimonialHeader: 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/20',
    submitBtn:         'bg-emerald-600 hover:bg-emerald-700',
    loginLink:         'text-emerald-600',
    ctaSection:        'bg-gradient-to-br from-emerald-600 to-emerald-800',
    trustBadge:        'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300',
    whyBg:             'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10',
    whyCheck:          'text-emerald-500',
    catCard:           'hover:border-emerald-400/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
  }

  const [testimonials, setTestimonials] = useState<Testimonial[]>(initialTestimonials?.data || [])
  const [newTestimonial, setNewTestimonial] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingTestimonials, setIsLoadingTestimonials] = useState(!initialTestimonials)
  const [hasMore, setHasMore] = useState(initialTestimonials?.pagination.hasMore || false)
  const [page, setPage] = useState(initialTestimonials?.pagination.page || 1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

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

  const fetchTestimonials = useCallback(async (loadMore = false) => {
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
  }, [page])

  useEffect(() => {
    if (!initialTestimonials) {
      fetchTestimonials()
    }
  }, [initialTestimonials, fetchTestimonials])

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
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number; data?: { error?: string } } }
      if (axiosError.response?.status === 401) {
        openModal('button')
      } else if (axiosError.response?.data?.error) {
        toast.error(axiosError.response.data.error)
      } else {
        toast.error("Failed to submit testimonial")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const waOrderLink = "https://wa.me/923354145431?text=I%20want%20to%20place%20an%20order"
  const waUAELink = "https://wa.me/971547478202?text=I%20want%20to%20place%20an%20order"
  const waLink = isUAE ? waUAELink : waOrderLink

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Contact Bar */}
      <div ref={contactBarRef}>
        <BannerContactBar />
      </div>

      {/* ─── HERO SECTION ─────────────────────────────────────────────────────── */}
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
          <div className={`absolute inset-0 ${c.heroOverlay}`} />
        </div>

        <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="text-white space-y-5">

                {/* Trust badge pills */}
                <div className="flex flex-wrap gap-2">
                  {["✔ COD Available", "✔ WhatsApp Order", "✔ Vet Verified Products"].map((badge) => (
                    <span
                      key={badge}
                      className={`text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm ${c.trustBadge}`}
                    >
                      {badge}
                    </span>
                  ))}
                </div>

                {/* Main headline */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight" dir="rtl">
                  {isUAE ? "أول متجر بيطري رقمي في الإمارات العربية المتحدة" : "پاکستان کا پہلا ڈیجیٹل ویٹرنری اسٹور"}
                </h1>

                {/* Sub-headline */}
                <p className="text-base sm:text-lg md:text-xl font-medium text-gray-200 max-w-xl leading-relaxed" dir="rtl">
                  {isUAE ? "أدوية أصلية مع إرشادات الطبيب البيطري – اطلبها وأنت في منزلك" : "اصل ادویات، ویٹرنری ڈاکٹر کی رہنمائی کے ساتھ – گھر بیٹھے آرڈر کریں"}
                </p>

                {/* Trust checkmarks */}
                <div className="space-y-2">
                  {[
                    "100% Original Medicines",
                    "Cash on Delivery Available",
                    "Free Vet Guidance",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <p className="text-gray-200 text-sm sm:text-base">{item}</p>
                    </div>
                  ))}
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold px-6 py-4 text-base rounded-xl transition-all duration-200 shadow-lg hover:shadow-[#25D366]/30 hover:scale-[1.02] w-full sm:w-auto"
                  >
                    <WhatsAppIcon className="w-5 h-5 fill-white" />
                    Order on WhatsApp
                  </a>
                  <Button
                    asChild
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-4 text-base rounded-xl w-full sm:w-auto"
                  >
                    <Link href="/products">
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      Shop Now
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="hidden lg:block" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── SPECIAL OFFER BANNER ─────────────────────────────────────────────── */}
      <div className="bg-amber-400 text-amber-900 py-3 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8 text-center">
          <span className="font-bold text-sm sm:text-base">
            {isUAE ? "🔥 Free Delivery on Orders Above AED 300" : "🔥 Free Delivery on Orders Above Rs. 3000"}
          </span>
          <span className="hidden sm:block text-amber-700">|</span>
          <span className="font-bold text-sm sm:text-base">
            🎁 Free Vet Consultation with Every Order
          </span>
        </div>
      </div>

      {/* ─── PROBLEM → SOLUTION SECTION ───────────────────────────────────────── */}
      <section className="py-14 md:py-20 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center mb-10" dir="rtl">
            {isUAE ? "هل تواجه هذه المشاكل؟" : "کیا آپ کو یہ مسائل درپیش ہیں؟"}
          </h2>

          {/* Problems */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {(isUAE ? [
              { emoji: "🐄", text: "الحيوان يمرض بشكل متكرر؟", color: "border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800/40" },
              { emoji: "💊", text: "هل يصعب عليك اختيار الدواء المناسب؟", color: "border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800/40" },
              { emoji: "⚠️", text: "هل تخشى خطر الأدوية المقلدة؟", color: "border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800/40" },
            ] : [
              { emoji: "🐄", text: "جانور بار بار بیمار ہو رہا ہے؟", color: "border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800/40" },
              { emoji: "💊", text: "صحیح دوا کا انتخاب مشکل ہے؟", color: "border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800/40" },
              { emoji: "⚠️", text: "نقلی ادویات کا خطرہ؟", color: "border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800/40" },
            ]).map((p, i) => (
              <div key={i} className={`rounded-xl border-2 p-5 text-center ${p.color}`}>
                <div className="text-3xl mb-3">{p.emoji}</div>
                <p className="font-semibold text-base text-gray-800 dark:text-gray-200" dir="rtl">{p.text}</p>
              </div>
            ))}
          </div>

          {/* Arrow divider */}
          <div className="flex justify-center my-6">
            <div className="flex flex-col items-center gap-1">
              <div className="w-0.5 h-8 bg-gradient-to-b from-red-400 to-emerald-500" />
              <div className="w-3 h-3 rotate-45 bg-emerald-500 translate-y-[-4px]" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
            </div>
          </div>

          {/* Solution */}
          <div className={cn("rounded-2xl border-2 p-6 md:p-8 text-center max-w-2xl mx-auto", isUAE ? "border-[#EF3340]/40 bg-[#EF3340]/5 dark:bg-[#EF3340]/10" : "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20")}>
            <p className={cn("text-lg md:text-xl font-bold mb-5", isUAE ? "text-[#CC1A28] dark:text-[#EF3340]" : "text-emerald-800 dark:text-emerald-200")} dir="rtl">
              {isUAE ? "احصل عليه في Animal Wellness Shop:" : "Animal Wellness Shop پر حاصل کریں:"}
            </p>
            <div className="space-y-3">
              {(isUAE ? [
                { label: "أدوية موثقة", sub: "100% Original, Vet Verified" },
                { label: "إرشادات الطبيب", sub: "Free Vet Consultation" },
                { label: "توصيل إلى المنزل", sub: "Cash on Delivery Available" },
              ] : [
                { label: "مستند ادویات", sub: "100% Original, Vet Verified" },
                { label: "ڈاکٹر کی رہنمائی", sub: "Free Vet Consultation" },
                { label: "گھر تک ڈیلیوری", sub: "Cash on Delivery Available" },
              ]).map((s, i) => (
                <div key={i} className="flex items-center gap-3 justify-center">
                  <CheckCircle2 className={cn("w-5 h-5 flex-shrink-0", isUAE ? "text-[#EF3340]" : "text-emerald-600")} />
                  <span className="font-semibold text-base text-gray-800 dark:text-gray-200" dir="rtl">{s.label}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">— {s.sub}</span>
                </div>
              ))}
            </div>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-6 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold px-6 py-3 rounded-xl text-sm transition-all duration-200 hover:scale-[1.02]"
            >
              <WhatsAppIcon className="w-4 h-4 fill-white" />
              {isUAE ? "اطلب الآن" : "ابھی آرڈر کریں"}
            </a>
          </div>
        </div>
      </section>

      {/* ─── FULL SCREEN SLIDER ───────────────────────────────────────────────── */}
      <section
        style={{ height: 'calc(100vh - var(--navbar-height))' }}
        className="relative overflow-hidden"
      >
        <FullScreenSlider />
      </section>

      {/* ─── FEATURED CATEGORIES ──────────────────────────────────────────────── */}
      <section className="py-14 md:py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2" dir="rtl">
              {isUAE ? "تصفح حسب نوع الحيوان أو فئة المنتج" : "ہماری مصنوعات کی اقسام"}
            </h2>
            <p className="text-muted-foreground text-sm md:text-base">Browse by Animal Type or Product Category</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            {(isUAE ? categoriesUAE : categories).map((cat) => (
              <Link
                key={cat.label}
                href={cat.href}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-transparent bg-background transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer",
                  c.catCard
                )}
              >
                <span className="text-3xl md:text-4xl">{cat.emoji}</span>
                <span className="text-xs sm:text-sm font-semibold text-center text-gray-700 dark:text-gray-300" dir="rtl">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES GRID ────────────────────────────────────────────────────── */}
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
          <div className="absolute inset-0 bg-black/50" />
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
                  <div className={c.iconWrap}>
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg md:text-xl text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm md:text-base text-gray-200 mb-4">{feature.description}</p>
                  <Link href={feature.link}>
                    <Button variant="link" className={`px-0 p-0 ${c.featureLink}`}>
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

      {/* ─── BEST SELLING PRODUCTS ────────────────────────────────────────────── */}
      <section className="py-14 md:py-20 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2" dir="rtl">
              {isUAE ? "المنتجات الأكثر مبيعاً" : "بیسٹ سیلنگ مصنوعات"}
            </h2>
            <p className="text-muted-foreground text-sm md:text-base">Our Most Popular Veterinary Products</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {bestSellers.map((product, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col hover:shadow-lg transition-shadow duration-200"
              >
                {/* Product color block */}
                <div className={`h-36 flex items-center justify-center text-5xl ${product.bgColor}`}>
                  {product.emoji}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-sm md:text-base mb-1">{product.name}</h3>
                  <div className="space-y-1 mb-3 flex-1">
                    {product.benefits.map((b, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">{b}</span>
                      </div>
                    ))}
                  </div>
                  <a
                    href={`https://wa.me/${isUAE ? '971547478202' : '923354145431'}?text=I%20want%20to%20order%3A%20${encodeURIComponent(product.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold px-4 py-2.5 rounded-lg text-xs transition-all duration-200 hover:scale-[1.02] mt-auto"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5 fill-white" />
                    Order on WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── DETAILED SECTIONS ────────────────────────────────────────────────── */}
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
                <div className={`inline-flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full ${c.badgeText} ${c.badgeBg}`}>
                  {section.icon}
                  {section.category}
                </div>

                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">{section.title}</h2>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">{section.description}</p>

                <div className="space-y-3">
                  {section.bullets.map((bullet, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-2 h-2 rounded-full ${c.sectionDot}`} />
                      </div>
                      <p className="text-sm md:text-base text-muted-foreground">{bullet}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-4 inline-block">
                  <Button asChild size="lg" className={`${c.sectionBtn} font-medium`}>
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

      {/* ─── WHY CHOOSE US ────────────────────────────────────────────────────── */}
      <section className={`py-14 md:py-20 px-4 sm:px-6 lg:px-8 ${c.whyBg}`}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2" dir="rtl">
              {isUAE ? "لماذا تختارنا؟" : "ہمیں کیوں منتخب کریں؟"}
            </h2>
            <p className="text-muted-foreground text-sm md:text-base">Why Choose Animal Wellness Shop?</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(isUAE ? whyChooseUsUAE : whyChooseUs).map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-4 bg-background rounded-xl p-4 border border-border shadow-sm"
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl ${isUAE ? 'bg-[#EF3340]/10' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
                  {item.icon}
                </div>
                <div>
                  <p className="font-semibold text-sm md:text-base" dir="rtl">{item.urdu}</p>
                  <p className="text-xs text-muted-foreground">{item.en}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS SECTION ─────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2" dir="rtl">
              {isUAE ? "ماذا يقول عملاؤنا؟" : "ہمارے صارفین کیا کہتے ہیں؟"}
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto">
              What Our Customers Say
            </p>
          </div>

          {isLoadingTestimonials ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className={`h-8 w-8 animate-spin ${c.loader}`} />
            </div>
          ) : testimonials.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {testimonials.map((testimonial) => (
                  <TestimonialCard key={testimonial.id} testimonial={testimonial} isUAE={isUAE} />
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
            <Card className={`${c.testimonialBorder} shadow-lg`}>
              <CardHeader className={`${c.testimonialHeader} py-4`}>
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
                      className={`${c.submitBtn} w-full sm:w-auto`}
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
                      Please <button onClick={() => openModal('button')} className={`${c.loginLink} hover:underline`}>login</button> to post your testimonial
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── BIG WHATSAPP CTA ─────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#128C7E] via-[#25D366] to-[#075E54] text-white relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/15 px-4 py-1.5 rounded-full text-sm font-medium border border-white/20">
            <MessageCircle className="w-4 h-4" />
            Direct WhatsApp Support
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight" dir="rtl">
            {isUAE ? "اطلب الآن أو تحدث مع الطبيب" : "ابھی آرڈر کریں یا ڈاکٹر سے بات کریں"}
          </h2>

          <p className="text-lg md:text-xl text-white/90" dir="rtl">
            {isUAE ? "سنقوم بإرشادك إلى الدواء الأنسب" : "ہم آپ کی رہنمائی کریں گے کہ کونسی دوا بہتر ہے"}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-white text-[#075E54] hover:bg-gray-50 font-extrabold px-8 py-4 rounded-2xl text-base md:text-lg transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-[1.03] w-full sm:w-auto justify-center"
            >
              <WhatsAppIcon className="w-6 h-6 fill-[#25D366]" />
              💬 Click to WhatsApp
            </a>
          </div>

          <div className="flex items-center justify-center gap-2 text-white/80">
            <span className="text-2xl">📞</span>
            <a href={isUAE ? "tel:+971547478202" : "tel:+923354145431"} className="text-xl md:text-2xl font-bold tracking-wide hover:text-white transition-colors">
              {isUAE ? "+971 54 747 8202" : "+92 335 4145431"}
            </a>
          </div>
        </div>
      </section>

      {/* ─── MAIN CTA SECTION ─────────────────────────────────────────────────── */}
      <section className={`${c.ctaSection} text-white py-16 md:py-24 px-4 sm:px-6 lg:px-8`}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-6" dir="rtl">
            {isUAE ? "انضم الآن – أول متجر بيطري في الإمارات" : "ابھی شامل ہوں – پاکستان کا پہلا ویٹرنری اسٹور"}
          </h2>
          <p className="text-lg md:text-xl mb-8 text-emerald-100 max-w-3xl mx-auto">
            Join thousands of animal lovers, professionals, and businesses in our growing community.
            Experience the future of animal wellness today.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button onClick={() => openModal('button')} size="lg" className={`bg-white dark:bg-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-200 font-bold px-6 md:px-8 py-5 md:py-6 text-base md:text-lg w-full sm:w-auto ${isUAE ? 'text-[#EF3340]' : 'text-emerald-800'}`}>
              Sign Up Free
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10 font-medium px-6 md:px-8 py-5 md:py-6 text-base md:text-lg w-full sm:w-auto">
              <Link href="/contact">Contact Sales</Link>
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
            <a href="https://chat.whatsapp.com/CqLyuyp92ex6cZ7EtpfwaU" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-3 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold rounded-xl text-sm transition-colors">
              <WhatsAppIcon className="w-4 h-4 fill-white flex-shrink-0" />
              Join WhatsApp Community
            </a>
            <a href="https://whatsapp.com/channel/0029VaeV6OQ9mrGjhvOQkW2t" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-3 bg-white/15 hover:bg-white/25 border border-white/40 text-white font-semibold rounded-xl text-sm transition-colors">
              <WhatsAppIcon className="w-4 h-4 fill-white flex-shrink-0" />
              Follow WhatsApp Channel
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── Static Data ───────────────────────────────────────────────────────────────

const categories = [
  { emoji: "🐄", label: "ڈیری جانور",    href: "/products?category=Dairy+Animals" },
  { emoji: "🐐", label: "بکری و بھیڑ",   href: "/products?category=Goats+%26+Sheep" },
  { emoji: "🐓", label: "پولٹری",         href: "/products?category=Poultry" },
  { emoji: "🐕", label: "پالتو جانور",   href: "/products?category=Pets" },
  { emoji: "💊", label: "ادویات",         href: "/products?category=Veterinary" },
  { emoji: "🧪", label: "سپلیمنٹس",      href: "/products?category=Supplements" },
]

const categoriesUAE = [
  { emoji: "🐄", label: "أبقار حلوب",     href: "/products?category=Dairy+Animals" },
  { emoji: "🐐", label: "ماعز وأغنام",    href: "/products?category=Goats+%26+Sheep" },
  { emoji: "🐓", label: "دواجن",           href: "/products?category=Poultry" },
  { emoji: "🐕", label: "حيوانات أليفة",  href: "/products?category=Pets" },
  { emoji: "💊", label: "أدوية",           href: "/products?category=Veterinary" },
  { emoji: "🧪", label: "مكملات غذائية",  href: "/products?category=Supplements" },
]

const bestSellers = [
  {
    emoji: "🐄",
    name: "Deworming Medicine for Cows",
    benefits: ["Kills internal parasites", "Improves milk production"],
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
  },
  {
    emoji: "🐓",
    name: "Poultry Vitamins",
    benefits: ["Boosts immunity", "Increases egg production"],
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
  },
  {
    emoji: "🐕",
    name: "Tick & Flea Control",
    benefits: ["Protects pets", "Fast-acting formula"],
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    emoji: "🦴",
    name: "Calcium Supplement",
    benefits: ["Strong bones", "Better milk yield"],
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
  },
]

const whyChooseUs = [
  { icon: "🏥", urdu: "ویٹرنری ڈاکٹر سے تصدیق شدہ مصنوعات",    en: "Vet Verified Products" },
  { icon: "🚚", urdu: "پاکستان بھر میں ڈیلیوری",                  en: "Nationwide Delivery" },
  { icon: "💵", urdu: "Cash on Delivery دستیاب",                   en: "Pay on Delivery" },
  { icon: "💬", urdu: "فوری واٹس ایپ سپورٹ",                      en: "Instant WhatsApp Support" },
  { icon: "🤝", urdu: "کسانوں اور پالتو جانوروں کے مالکان کا اعتماد", en: "Trusted by Farmers & Pet Owners" },
]

const whyChooseUsUAE = [
  { icon: "🏥", urdu: "منتجات معتمدة من طبيب بيطري",            en: "Vet Verified Products" },
  { icon: "🚚", urdu: "توصيل في جميع أنحاء الإمارات",            en: "Nationwide Delivery" },
  { icon: "💵", urdu: "الدفع عند الاستلام متوفر",                 en: "Pay on Delivery" },
  { icon: "💬", urdu: "دعم فوري عبر واتساب",                      en: "Instant WhatsApp Support" },
  { icon: "🐎🐪", urdu: "خيول السباق والإبل",                    en: "Racing Horses & Camels" },
  { icon: "🤝", urdu: "ثقة المزارعين وأصحاب الحيوانات الأليفة", en: "Trusted by Farmers & Pet Owners" },
]

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
