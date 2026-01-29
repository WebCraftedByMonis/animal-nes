"use client";
import React from "react";
import {
  FaWhatsapp,
  FaFacebook,
  FaYoutube,
  FaEnvelope,
  FaLinkedin,
  FaInstagram,
  FaTiktok,
  FaPinterest,
  FaPhoneAlt,
  FaGlobe,
} from "react-icons/fa";
import { SiThreads } from "react-icons/si";
import { BsFillHouseDoorFill } from "react-icons/bs";
import { RiMessage2Line } from "react-icons/ri";
import { getWhatsAppUrl } from "@/lib/whatsapp-utils";

const contactItems = [
  {
    icon: <BsFillHouseDoorFill className="text-green-500" />,
    label: "Address: 67-K Block, Commercial Market, DHA Phase-1, Lahore",
  },
  {
    icon: <FaGlobe className="text-green-600" />,
    label: "Website",
    href: "https://www.animalwellness.shop/",
  },
  {
    icon: <FaWhatsapp className="text-green-500" />,
    label: "Message on WhatsApp",
    href: "https://wa.me/923354145431",
  },
  {
    icon: <RiMessage2Line className="text-blue-500" />,
    label: "imo Lite",
    href: "https://imolite.onelink.me/82A5/dhpd35zl",
  },
  {
    icon: <FaPhoneAlt className="text-green-500" />,
    label: "0333-4145431",
    href: getWhatsAppUrl("0333-4145431"),
  },
  {
    icon: <FaFacebook className="text-blue-600" />,
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61569643526062",
  },
  {
    icon: <FaYoutube className="text-red-500" />,
    label: "YouTube",
    href: "https://www.youtube.com/@AnimalWellNessShop/videos",
  },
  {
    icon: <FaInstagram className="text-pink-500" />,
    label: "Instagram",
    href: "https://www.instagram.com/animalwellnessshop?igsh=Y3ZuYmNpc21iNjZ0",
  },
  {
    icon: <FaTiktok className="text-black" />,
    label: "TikTok",
    href: "https://www.tiktok.com/@animalwellnessshop?_t=ZS-8ybHNCBO7wl&_r=1",
  },
  {
    icon: <FaPinterest className="text-red-600" />,
    label: "Pinterest",
    href: "https://www.pinterest.com/pin/929360073111456519",
  },
  {
    icon: <FaLinkedin className="text-blue-700" />,
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/muhammad-fiaz-qamar-195208a2/",
  },
  {
    icon: <SiThreads className="text-black" />,
    label: "Threads",
    href: "https://www.threads.com/@animalwellnessshop",
  },
  {
    icon: <FaEnvelope className="text-red-500" />,
    label: "animalwellnessshop@gmail.com",
    href: "mailto:animalwellnessshop@gmail.com",
  },
];

const ContactDetails = () => {
  return (
    <div className="text-gray-800 flex justify-center flex-col align-center dark:text-gray-100 px-4 py-6 w-full">
      <h2 className="text-2xl font-bold mb-6 text-center text-green-500">Contact Options</h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
        {contactItems.map((item, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <div className="mt-1">{item.icon}</div>
            {item.href ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline break-all"
              >
                {item.label}
              </a>
            ) : (
              <span>{item.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ContactDetails;
