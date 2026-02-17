"use client"

import { useCountry } from "@/contexts/CountryContext"
import { FaWhatsapp, FaSnapchatGhost, FaMapMarkerAlt, FaFacebookMessenger, FaTiktok } from "react-icons/fa"
import { RiMessage2Fill } from "react-icons/ri"
import { SiZoom } from "react-icons/si"

const WHATSAPP_LINKS: Record<string, { icon: React.ReactNode; label: string; href: string; color: string }> = {
  Pakistan: {
    icon: <FaWhatsapp className="w-4 h-4" />,
    label: "WhatsApp",
    href: "https://wa.me/923354145431",
    color: "bg-green-600 hover:bg-green-700",
  },
  UAE: {
    icon: <FaWhatsapp className="w-4 h-4" />,
    label: "WhatsApp",
    href: "https://wa.me/971547478202",
    color: "bg-green-600 hover:bg-green-700",
  },
}

const COMMON_LINKS = [
  {
    icon: <FaFacebookMessenger className="w-4 h-4" />,
    label: "Messenger",
    href: "https://m.me/61569643526062",
    color: "bg-blue-500 hover:bg-blue-600",
  },
  {
    icon: <RiMessage2Fill className="w-4 h-4" />,
    label: "IMO",
    href: "https://imo.onelink.me/7QOl/iso",
    color: "bg-blue-600 hover:bg-blue-700",
  },
  {
    icon: <FaSnapchatGhost className="w-4 h-4" />,
    label: "Snapchat",
    href: "https://www.snapchat.com/add/animalwellnesss?share_id=u6epSPYsFIU&locale=en-GB",
    color: "bg-yellow-500 hover:bg-yellow-600",
  },
  {
    icon: <FaTiktok className="w-4 h-4" />,
    label: "TikTok",
    href: "https://www.tiktok.com/@animalwellnessshop?_r=1&_t=ZS-93thXueLmuV",
    color: "bg-gray-800 hover:bg-gray-900",
  },
  {
    icon: <SiZoom className="w-4 h-4" />,
    label: "Zoom",
    href: "https://us05web.zoom.us/j/89762221855?pwd=CT3wbqCWG5HSan9Gdy4dbTV2DGyZD5.1",
    color: "bg-blue-500 hover:bg-blue-600",
  },
  {
    icon: <FaMapMarkerAlt className="w-4 h-4" />,
    label: "Location",
    href: "https://maps.app.goo.gl/2BGmq1cdsvjwVEsGA",
    color: "bg-red-500 hover:bg-red-600",
  },
]

export default function BannerContactBar() {
  const { country } = useCountry()
  const links = [WHATSAPP_LINKS[country], ...COMMON_LINKS]

  return (
    <div className="w-full bg-emerald-800 py-2 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
        <span className="text-white text-xs sm:text-sm font-semibold mr-1 sm:mr-2">
          Contact Us:
        </span>
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 text-white text-xs sm:text-sm font-medium px-2.5 sm:px-3 py-1 rounded-full ${link.color} transition-colors shadow-sm`}
          >
            {link.icon}
            <span className="hidden sm:inline">{link.label}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
