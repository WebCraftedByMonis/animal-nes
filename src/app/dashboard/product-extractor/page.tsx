"use client";

import { useState } from "react";
import ProductExtractor from "@/app/components/ProductExtractor";
import PetzseeExtractor from "@/app/components/PetzseeExtractor";
import WisdomvetExtractor from "@/app/components/WisdomvetExtractor";
import VetpharmacyExtractor from "@/app/components/VetpharmacyExtractor";
import EurovetsExtractor from "@/app/components/EurovetsExtractor";

const TABS = [
  { id: "smbros",       label: "SMBros B2B",    sub: "b2b.smbros.org" },
  { id: "petzsee",     label: "Petzsee",       sub: "petzsee.com" },
  { id: "wisdomvet",   label: "WisdomVet",     sub: "wisdomvet.ae" },
  { id: "vetpharmacy", label: "VetPharmacy",   sub: "vetpharmacy.ae" },
  { id: "eurovets",    label: "Eurovets",      sub: "eurovets.ae" },
];

export default function ProductExtractorPage() {
  const [active, setActive] = useState("smbros");

  return (
    <div className="max-w-full p-6">
      <h1 className="text-3xl font-bold mb-1">Product Extractor</h1>
      <p className="text-gray-500 text-sm mb-5">
        Extract products from supported websites and add them directly to your store.
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
              active === tab.id
                ? "border-green-600 text-green-700 bg-green-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-[10px] font-normal text-gray-400">{tab.sub}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {active === "smbros"       && <ProductExtractor />}
      {active === "petzsee"     && <PetzseeExtractor />}
      {active === "wisdomvet"   && <WisdomvetExtractor />}
      {active === "vetpharmacy" && <VetpharmacyExtractor />}
      {active === "eurovets"    && <EurovetsExtractor />}
    </div>
  );
}
