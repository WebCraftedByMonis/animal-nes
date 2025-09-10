import Image from "next/image";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us - Leading Animal Wellness Platform',
  description: 'Learn about Animal Wellness - your trusted partner connecting animal health professionals, pet owners, and livestock farmers. Discover our mission to improve animal healthcare across the region through quality products, services, and expert connections.',
  keywords: [
    'about animal wellness', 'veterinary platform', 'animal healthcare mission',
    'pet care company', 'livestock services', 'animal health solutions',
    'veterinary marketplace', 'animal wellness story', 'pet healthcare platform'
  ],
  openGraph: {
    title: 'About Animal Wellness - Leading Animal Healthcare Platform',
    description: 'Learn about our mission to improve animal healthcare through quality products, services, and expert connections.',
    type: 'website',
    images: ['/about-og.jpg'],
  },
  alternates: {
    canonical: '/about',
  },
};

export default function About() {
  return (
    <>
      <div className="px-4 font-bold py-8 flex flex-col items-center justify-center">
        <h1 className="text-4xl text-green-500 dark:text-green-400">About us</h1>
        <p className="text-xl font-semibold pt-3 text-gray-800 dark:text-gray-200">
          Connecting Animal Health and Wealth
        </p>
      </div>

      <div className="max-w-7xl mt-7 mx-auto flex flex-col lg:flex-row items-center lg:items-start gap-8 px-4">
        {/* Image first on small/medium, side on large screens */}
        <section className="w-full lg:w-1/3 flex justify-center">
          <Image
            src="/logo.jpg"
            alt="logo"
            width={400}
            height={400}
            className="object-contain"
          />
        </section>

        <section className="w-full lg:w-2/3 mt-8 text-gray-800 dark:text-gray-200">
          <p className="text-lg mb-4 text-justify">
          🐾 About Animal Wellness Shop

Connecting Animal Health and Wealth

Animal Wellness Shop is Pakistan’s trusted digital platform, connecting the entire livestock and animal care community—from farms to families. We provide timely access to compassionate veterinary care, quality services, and certified products for livestock, poultry, fisheries, wildlife, pets, and exotic birds through a reliable and expanding digital ecosystem.

At the heart of our mission lies a dedicated team of professionals from every corner of the veterinary and animal sciences field—including experienced veterinarians, livestock breeders, poultry farmers, pet specialists, pharmaceutical manufacturers, dealers, and bird enthusiasts. Together, we serve as a unified voice and support network for all animal stakeholders in Pakistan.

💡 Our Mission

To promote responsible and accessible animal health solutions through innovation, integrity, and education—empowering livestock keepers, pet owners, and animal lovers nationwide.

🧭 Our Vision

To become Pakistan’s most trusted digital platform for veterinary care, animal health solutions, and educational outreach, nurturing both productivity and compassion in every animal-human relationship.

🛠 What We Offer

Online access to veterinary and poultry medicines
Livestock and pet health consultation (remote and on-farm)
Marketplace for buying/selling animals
Veterinary job listings and freelance opportunities
Disease prevention awareness, training, and educational tools
Nationwide service coverage with timely delivery and professional care
💚 Our Core Values

Honesty: Integrity and accountability in every interaction
Compassion: Empathetic support for animals, clients, and colleagues
Quality: Commitment to outstanding care and client service
Education: A passion for continuous learning and knowledge sharing
Teamwork: Harnessing diverse talents for a unified purpose
Trust: Building lasting relationships through reliability and service
👨‍⚕ Our Lead Veterinarians

Dr. Hafiz Muhammad Haad – Veterinary Physician & Surgeon
(DVM, RVMP – Registered with PVMC, Islamabad)
Dr. Hafiz Muhammad Saad – Veterinary Physician & Surgeon
(DVM – UVAS, RVMP – PVMC Islamabad)
Our veterinary team is committed to improving the health and well-being of all animals—big or small—by offering compassionate care, timely services, and evidence-based solutions.

🤝 Our Promise

We are committed to enhancing animal health, strengthening the human–animal bond, and supporting the economic empowerment of farmers and animal caregivers across Pakistan. Through innovative digital access and community-driven services, we aim to be your long-term partner in responsible animal care.
          </p>

          <div className="text-2xl font-bold text-green-500 dark:text-green-400 my-3">
            Our Values:
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-md shadow p-4 mb-4">
            <ul className="list-disc pl-5 text-md font-semibold space-y-2">
              <li>
                Honesty—Personal integrity and accountability
              </li>
              <li>
                Compassion—Selfless empathetic support and care toward animals, clients, and each other
              </li>
              <li>
                Quality—Providing exceptional animal care and client support
              </li>
              <li>
                Education—A passion to expand and share our knowledge
              </li>
              <li>
                Teamwork—Collaboratively utilizing our diverse talents in pursuit of a common goal
              </li>
              <li>
                Trust—To believe in and rely on each other
              </li>
            </ul>
          </div>

          <p className="text-lg font-semibold my-3">
            Our highly trained health care team improves the quality of life for all family members of livestock and animals. We continually enhance and expand our compassionate care and services, while building long-term relationships and nurturing the human–animal bond.
          </p>

          <div className="text-2xl font-bold text-green-500 dark:text-green-400 my-3">
            Our Head Veterinarians:
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-md shadow p-4 mb-4">
            <ul className="list-disc pl-5 text-md font-semibold">
              <li>
                Dr Hafiz Muhammad Haad – Veterinary Physician And Surgeon (DVM, RVMP - PVMC Islamabad, Pakistan)
              </li>
              <li>
                Dr Hafiz Muhammad Saad – Veterinary Physician And Surgeon (DVM, UVAS, RVMP - PVMC Islamabad, Pakistan)
              </li>
            </ul>
          </div>

          <p className="text-lg font-semibold my-3">
            Our highly trained health care team improves the quality of life for all family members of livestock and animals. We continually enhance and expand our compassionate care and services, while building long-term relationships and nurturing the human–animal bond.
          </p>
        </section>
      </div>
    </>
  );
}
