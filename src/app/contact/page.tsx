"use client";
import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import ContactDetails from "@/components/ContactDetails";

const ContactPage = () => {
  const inputClass = "focus-visible:ring-green-500";

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="container mx-auto px-4 py-12">
        {/* Heading */}
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-12">Contact Us</h1>

        {/* Form */}
        <div className="max-w-2xl mx-auto mb-16 px-4">
          <h2 className="text-2xl font-semibold mb-6 text-green-500 dark:text-green-400 text-center">
            Get in touch
          </h2>
          <form className="space-y-5">
            {/* Form fields remain the same */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name (optional)
              </label>
              <Input id="name" className={inputClass} placeholder="Your name" />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <Input id="email" className={inputClass} type="email" placeholder="Your email" required />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-1">
                Phone Number
              </label>
              <Input id="phone" className={inputClass} type="tel" placeholder="Your phone number" />
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium mb-1">
                Subject
              </label>
              <Input id="subject" className={inputClass} placeholder="Subject" />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-1">
                Message
              </label>
              <Textarea className={inputClass} id="message" placeholder="Your message" rows={4} />
            </div>

            <Button
              type="submit"
              className="w-full bg-green-500 text-white hover:bg-green-600 dark:hover:bg-green-400"
            >
              Send Message
            </Button>
          </form>
        </div>

        {/* Contact Details Below - Centered with increased width */}
        <div className="flex justify-center">
        <div className="max-w-4xl px-4">
          <ContactDetails />

        </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;