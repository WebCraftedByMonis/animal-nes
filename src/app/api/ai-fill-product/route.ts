import { NextRequest, NextResponse } from "next/server";

const MODELS = [
  "google/gemma-3-4b-it:free",
  "google/gemma-3-12b-it:free",
  "meta-llama/llama-3.2-3b-instruct:free",
];

async function callOpenRouter(apiKey: string, prompt: string, modelIndex = 0): Promise<string> {
  const model = MODELS[modelIndex];
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://petszee.com",
      "X-Title": "Petszee AI Fill Product",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 1000,
    }),
    signal: AbortSignal.timeout(25000),
  });

  if (!res.ok) {
    const err = await res.text();
    const errData = JSON.parse(err).error;
    // 429 rate limit — try next model in fallback list
    if (errData?.code === 429 && modelIndex < MODELS.length - 1) {
      console.log(`[AI-FILL] ${model} rate-limited, falling back to ${MODELS[modelIndex + 1]}`);
      return callOpenRouter(apiKey, prompt, modelIndex + 1);
    }
    throw new Error(`OpenRouter API error: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 });
  }

  const { product, productLink } = await req.json();

  const prompt = `You are a product data expert for a pet/animal products e-commerce store.

Below is a partially filled product record. Some fields may be empty or wrong. Your job is to intelligently fill in the missing or empty fields based on the product name, any filled fields, and your knowledge of animal products.

Current product data:
${JSON.stringify(product, null, 2)}

Product source URL: ${productLink || ""}

Return ONLY a valid JSON object with ONLY these fields (fill empty ones, improve vague ones, keep good ones as-is):
{
  "genericName": "brand name or manufacturer",
  "category": "main animal/product category e.g. Cat Food, Dog Supplements, Bird Toys, Fish Supplies",
  "subCategory": "sub-category e.g. Dry Food, Wet Food, Treats, Shampoo, Litter, Toys",
  "subsubCategory": "more specific e.g. Grain Free, Indoor, Senior, Kitten, Natural",
  "productType": "product form e.g. Dry, Wet, Liquid, Tablet, Powder, Spray, Gel",
  "description": "comprehensive product description — what it is, key benefits, ingredients if known",
  "dosage": "feeding or usage instructions based on product type — e.g. serving size per kg body weight, frequency, age suitability. Leave empty string for toys or accessories."
}

Rules:
- Use the product name and URL as strong hints
- Do NOT change fields that are already well-filled
- description should be at least 2-3 sentences if you can infer it
- dosage: fill only for food, treats, supplements, medicine — leave empty string for toys/litter/accessories
- Return ONLY the JSON, no markdown or explanation`;

  try {
    const content = await callOpenRouter(apiKey, prompt);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "No JSON in AI response" }, { status: 500 });

    const filled = JSON.parse(jsonMatch[0]);
    console.log(`[AI-FILL] product: "${product.productName}" → dosage: "${filled.dosage}" | category: "${filled.category}"`);
    return NextResponse.json({ success: true, filled });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
