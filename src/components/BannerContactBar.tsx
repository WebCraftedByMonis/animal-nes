"use client"

import { useCountry } from "@/contexts/CountryContext"
import { FaWhatsapp, FaSnapchatGhost, FaMapMarkerAlt } from "react-icons/fa"
import { RiMessage2Fill } from "react-icons/ri"
const PAKISTAN_LINKS = [
  {
    icon: <FaWhatsapp className="w-4 h-4" />,
    label: "WhatsApp",
    href: "https://wa.me/923354145431",
    color: "bg-green-600 hover:bg-green-700",
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
    icon: <FaMapMarkerAlt className="w-4 h-4" />,
    label: "Location",
    href: "https://maps.app.goo.gl/2BGmq1cdsvjwVEsGA",
    color: "bg-red-500 hover:bg-red-600",
  },
]

const UAE_LINKS = [
  {
    icon: <FaWhatsapp className="w-4 h-4" />,
    label: "WhatsApp",
    href: "https://wa.me/971547478202",
    color: "bg-green-600 hover:bg-green-700",
  },
]

export default function BannerContactBar() {
  const { country } = useCountry()
  const links = country === "UAE" ? UAE_LINKS : PAKISTAN_LINKS

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
