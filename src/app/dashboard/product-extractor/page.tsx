"use client";

import { useState } from "react";
import ProductExtractor from "@/app/components/ProductExtractor";
import PetzseeExtractor from "@/app/components/PetzseeExtractor";
import WisdomvetExtractor from "@/app/components/WisdomvetExtractor";
import VetpharmacyExtractor from "@/app/components/VetpharmacyExtractor";
import EurovetsExtractor from "@/app/components/EurovetsExtractor";
import PetshubExtractor from "@/app/components/PetshubExtractor";
import OnlineVetPharmacyExtractor from "@/app/components/OnlineVetPharmacyExtractor";
import VetshopExtractor from "@/app/components/VetshopExtractor";
import PetplaceExtractor from "@/app/components/PetplaceExtractor";
import PetsgroceryExtractor from "@/app/components/PetsgroceryExtractor";
import VeterianhubExtractor from "@/app/components/VeterianhubExtractor";
import MuslimherbalExtractor from "@/app/components/MuslimherbalExtractor";
import YallapetsExtractor from "@/app/components/YallapetsExtractor";
import PetworlduaeExtractor from "@/app/components/PetworlduaeExtractor";
import PetcornerdubaiExtractor from "@/app/components/PetcornerdubaiExtractor";

const UAE_TABS = [
  { id: "smbros",          label: "SMBros B2B",      sub: "b2b.smbros.org" },
  { id: "petzsee",         label: "Petzsee",          sub: "petzsee.com" },
  { id: "wisdomvet",       label: "WisdomVet",        sub: "wisdomvet.ae" },
  { id: "vetpharmacy",     label: "VetPharmacy",      sub: "vetpharmacy.ae" },
  { id: "eurovets",        label: "Eurovets",         sub: "eurovets.ae" },
  { id: "yallapets",       label: "Yalla Pets",       sub: "yallapets.com" },
  { id: "petworlduae",     label: "Pet World UAE",    sub: "petworlduae.com" },
  { id: "petcornerdubai",  label: "Pet Corner Dubai", sub: "petcornerdubai.com" },
];

const PK_TABS = [
  { id: "petshub",            label: "PetsHub PK",        sub: "petshub.pk" },
  { id: "petplace",           label: "PetPlace PK",       sub: "petplace.pk" },
  { id: "petsgrocery",        label: "PetsGrocery PK",    sub: "petsgrocery.pk" },
  { id: "veterianhub",        label: "VeterianHub",       sub: "veterianhub.com" },
  { id: "muslimherbal",       label: "Muslim Herbal",     sub: "muslimherbalandnutraceutical.com" },
  { id: "onlinevetpharmacy",  label: "OnlineVetPharmacy", sub: "onlinevetpharmacy.com" },
  { id: "vetshop",            label: "VetShop",           sub: "vet-shop.net" },
];

export default function ProductExtractorPage() {
  const [country, setCountry] = useState<"uae" | "pk">("uae");
  const [active, setActive] = useState("smbros");

  const switchCountry = (c: "uae" | "pk") => {
    setCountry(c);
    setActive(c === "uae" ? "smbros" : "petshub");
  };

  const tabs = country === "uae" ? UAE_TABS : PK_TABS;

  return (
    <div className="max-w-full p-6">
      <h1 className="text-3xl font-bold mb-1">Product Extractor</h1>
      <p className="text-gray-500 text-sm mb-5">
        Extract products from supported websites and add them directly to your store.
      </p>

      {/* Country toggle */}
      <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1 mb-5">
        <button
          onClick={() => switchCountry("uae")}
          className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
            country === "uae"
              ? "bg-white text-gray-800 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🇦🇪 UAE
        </button>
        <button
          onClick={() => switchCountry("pk")}
          className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
            country === "pk"
              ? "bg-white text-gray-800 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🇵🇰 Pakistan
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map(tab => (
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
      {active === "smbros"            && <ProductExtractor />}
      {active === "petzsee"           && <PetzseeExtractor />}
      {active === "wisdomvet"         && <WisdomvetExtractor />}
      {active === "vetpharmacy"       && <VetpharmacyExtractor />}
      {active === "eurovets"          && <EurovetsExtractor />}
      {active === "yallapets"         && <YallapetsExtractor />}
      {active === "petworlduae"       && <PetworlduaeExtractor />}
      {active === "petcornerdubai"    && <PetcornerdubaiExtractor />}
      {active === "petshub"           && <PetshubExtractor />}
      {active === "petplace"          && <PetplaceExtractor />}
      {active === "petsgrocery"       && <PetsgroceryExtractor />}
      {active === "veterianhub"       && <VeterianhubExtractor />}
      {active === "muslimherbal"      && <MuslimherbalExtractor />}
      {active === "onlinevetpharmacy" && <OnlineVetPharmacyExtractor />}
      {active === "vetshop"           && <VetshopExtractor />}
    </div>
  );
}
