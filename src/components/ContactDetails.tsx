"use client";
import React from "react";
import {
  FaWhatsapp,
  FaFacebook,
  FaSkype,
  FaPhoneAlt,
  FaYoutube,
  FaEnvelope,
  FaLinkedin,
  FaInstagram,
} from "react-icons/fa";
import { Home } from "lucide-react";

const contactItems = [
  {
    icon: <Home className="text-green-500" />,
    label: "Nairobi, Kenya",
  },
  {
    icon: <FaWhatsapp className="text-green-500" />,
    label: "+254 712 345 678",
    href: "https://wa.me/254712345678",
  },
  {
    icon: <FaSkype className="text-blue-500" />,
    label: "live:yourid",
    href: "skype:live:yourid?chat",
  },
  {
    icon: <FaPhoneAlt className="text-green-500" />,
    label: (
      <div className="flex flex-col">
        <a href="tel:+254712345678" className="hover:underline">+254 712 345 678</a>
        <a href="tel:+254798765432" className="hover:underline">+254 798 765 432</a>
      </div>
    ),
  },
  {
    icon: <FaFacebook className="text-blue-600" />,
    label: "/yourid",
    href: "https://facebook.com/yourid",
  },
  {
    icon: <FaYoutube className="text-red-500" />,
    label: "/yourchannel",
    href: "https://youtube.com/yourchannel",
  },
  {
    icon: <FaEnvelope className="text-red-500" />,
    label: "youremail@gmail.com",
    href: "mailto:youremail@gmail.com",
  },
  {
    icon: <FaLinkedin className="text-blue-700" />,
    label: "/yourprofile",
    href: "https://linkedin.com/in/yourprofile",
  },
  {
    icon: <FaInstagram className="text-pink-500" />,
    label: "@yourhandle",
    href: "https://instagram.com/yourhandle",
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
