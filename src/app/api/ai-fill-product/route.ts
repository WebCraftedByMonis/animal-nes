import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROK_API_KEY not configured" }, { status: 500 });
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
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Groq API error: ${err}` }, { status: 500 });
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "No JSON in AI response" }, { status: 500 });

    const filled = JSON.parse(jsonMatch[0]);
    console.log(`[AI-FILL] product: "${product.productName}" → dosage: "${filled.dosage}" | category: "${filled.category}"`);
    return NextResponse.json({ success: true, filled });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
