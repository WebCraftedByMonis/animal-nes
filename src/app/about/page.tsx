import Image from "next/image";

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
          <p className="text-lg mb-4">
            Animal Nexus is the livestock community’s choice for a complete array making digital connections for just in time reach of compassionate veterinary care, services, and products for livestock, poultry, fisheries, wildlife, dogs and cats. All the Projects of Animal Nexus are under supervision of The professional and courteous dedicated team from all fields of veterinary and Animal sciences. The team includes Professional Veterinarians, Livestock breeders, Poultry farmers, practicing vets, manufacturers, dealers and all livestock, poultry, pets and fancy birds stakeholders. We are committed in promoting responsible solutions to pet, animals and birds health, preventative care and health-related educational opportunities for our clients. Our national Service strives to offer excellence in veterinary care in all cities of Pakistan.
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
