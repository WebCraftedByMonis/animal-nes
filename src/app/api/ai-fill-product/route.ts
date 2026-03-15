import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
  }

  const { product, productLink } = await req.json();

  const CATEGORIES = [
    "Veterinary", "Poultry", "Pets", "Equine", "Livestock Feed",
    "Poultry Feed", "Instruments & Equipment", "Fisheries & Aquaculture",
    "Vaccination Services / Kits", "Herbal / Organic Products",
  ];

  const SUB_CATEGORIES = [
    "Antiparasitics", "Antibiotics & Antibacterials", "Vaccines & Immunologicals",
    "Nutritional Supplements", "Growth Promoters", "Coccidiostats",
    "Pain Management / NSAIDs", "Reproductive Health / Hormones",
    "Liver & Kidney Tonics", "Respiratory Health / Expectorants",
  ];

  const SUB_SUB_CATEGORIES = [
    "Medicine", "Supplements", "Broad-Spectrum Dewormers",
    "Multivitamins & Trace Elements", "Electrolytes & Hydration Solutions",
    "Mineral Mixtures / Salt Licks", "Probiotics & Enzymes",
    "Calcium / Phosphorus Supplements", "Immuno-Stimulants", "Hepato-Renal Protectants",
    "Endoparasiticides (e.g., dewormers)", "Ectoparasiticides (e.g., tick/flea/mite treatment)",
  ];

  const PRODUCT_TYPES = [
    "Injection (IV, IM, SC)", "Tablet / Bolus / Pill", "Oral Powder / Sachet",
    "Oral Suspension / Syrup", "Spray / Aerosol", "Oral Solution / Drops",
    "Topical Application / Pour-on / Spot-on", "Premix (for feed inclusion)",
    "Intrauterine / Intra-mammary", "Transdermal Patch / Ointment / Cream",
  ];

  const prompt = `You are a product data expert for a veterinary/animal products e-commerce store.

Below is a partially filled product record. Fill in the missing or empty fields based on the product name and your knowledge.

Current product data:
${JSON.stringify(product, null, 2)}

Product source URL: ${productLink || ""}

Preferred category values (use one of these if it fits):
${CATEGORIES.map(c => `- "${c}"`).join("\n")}

Preferred subCategory values (use one of these if it fits):
${SUB_CATEGORIES.map(c => `- "${c}"`).join("\n")}

Preferred subsubCategory values (use one of these if it fits):
${SUB_SUB_CATEGORIES.map(c => `- "${c}"`).join("\n")}

Preferred productType values (use one of these if it fits):
${PRODUCT_TYPES.map(c => `- "${c}"`).join("\n")}

Return ONLY a valid JSON object with these fields:
{
  "genericName": "brand name or manufacturer",
  "category": "pick from preferred list if a good match exists, otherwise use your best short label",
  "subCategory": "pick from preferred list if a good match exists, otherwise use your best short label",
  "subsubCategory": "pick from preferred list if a good match exists, otherwise use your best short label",
  "productType": "pick from preferred list if a good match exists, otherwise use your best short label",
  "description": "comprehensive product description — what it is, key benefits, ingredients if known",
  "dosage": "for food/medicine/supplements: feeding or dosage instructions. For toys/accessories/equipment/grooming products: describe how to use the product (application method, frequency, tips). Never leave empty — always provide either dosage or usage instructions."
}

Rules:
- Prefer the listed values but use free text if the product genuinely doesn't fit any option
- Do NOT change fields that are already well-filled
- description should be at least 2-3 sentences
- dosage field = dosage instructions for medicines/food, OR usage instructions for everything else
- Return ONLY the JSON, no markdown or explanation`;

  try {
    console.log(`[AI-FILL] Calling Groq for: "${product.productName}"`);

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 1000,
      }),
      signal: AbortSignal.timeout(25000),
    });

    console.log(`[AI-FILL] Groq status: ${res.status}`);

    if (!res.ok) {
      const err = await res.text();
      console.log(`[AI-FILL] ✗ Groq error: ${err.substring(0, 300)}`);
      throw new Error(`Groq API error ${res.status}: ${err.substring(0, 200)}`);
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content || "";
    console.log(`[AI-FILL] Groq replied (${content.length} chars): ${content.substring(0, 150)}`);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log(`[AI-FILL] ✗ No JSON in response`);
      return NextResponse.json({ error: "No JSON in AI response" }, { status: 500 });
    }

    const filled = JSON.parse(jsonMatch[0]);
    console.log(`[AI-FILL] ✓ category:"${filled.category}" dosage(${(filled.dosage || "").length} chars)`);
    return NextResponse.json({ success: true, filled });
  } catch (e: any) {
    console.log(`[AI-FILL] ✗ Exception: ${e.message}`);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
