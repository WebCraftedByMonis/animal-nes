// node generate-descriptions.js
// Reads thin-desc-data.json, generates full descriptions, writes descriptions-output.json
// No API needed — uses rule-based expansion on existing short descriptions.

const fs = require('fs')

const INPUT  = process.argv[2] || 'c:/Users/as/Downloads/thin-desc-data.json'
const OUTPUT = process.argv[3] || 'descriptions-output.json'

// ─── helpers ─────────────────────────────────────────────────────────────────

function clean(s) {
  if (!s || s === 'null' || s === 'NULL') return ''
  return s.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
}

function wordCount(s) {
  return s.trim().split(/\s+/).filter(Boolean).length
}

function contains(text, ...terms) {
  const t = text.toLowerCase()
  return terms.some(term => t.includes(term.toLowerCase()))
}

// ─── expansion blocks by product type ────────────────────────────────────────

const BLOCKS = {

  // ── Pet food brands ──────────────────────────────────────────────────────

  royalCaninDog: `Royal Canin applies decades of scientific expertise to craft breed- and life-stage-specific formulas that meet each dog's unique biological needs. The precise nutrient profile supports healthy skin and a glossy coat, promotes optimal digestion, and strengthens the immune system. Kibble shape and texture are engineered to encourage thorough chewing, which slows eating and aids nutrient absorption. Suitable as the sole diet, this complete and balanced food requires no supplements when fed according to package guidelines. Store in a cool, dry place and transition gradually over seven days when switching from another food. Always provide fresh drinking water.`,

  royalCaninCat: `Royal Canin combines veterinary science and nutritional research to formulate food tailored to each cat's specific life stage, breed, and health needs. The formula supports urinary tract health, promotes a healthy coat and skin condition, and provides highly digestible proteins for sustained energy. Specially shaped kibble encourages cats to chew properly, slowing food intake and improving digestion. As a complete and balanced diet, no additional supplements are required. Transition gradually over seven days when changing foods. Ensure fresh water is always available alongside this food.`,

  britCare: `Brit Care is a premium holistic pet food brand that uses high-quality animal proteins as the primary ingredient, avoiding artificial colours, flavours, and preservatives. The hypoallergenic formula with prebiotics supports a healthy gut microbiome, reduces the risk of food sensitivities, and improves nutrient absorption. Omega-3 and Omega-6 fatty acids nourish the skin and promote a shiny, healthy coat. Chelated minerals and vitamins ensure optimal bone development and a strong immune system throughout every life stage. Feed according to the guidelines on the packaging based on your pet's weight and activity level. Always provide access to fresh, clean water.`,

  winnerplusDog: `Winner Plus is a European premium pet food brand formulated with carefully selected natural ingredients free from artificial additives and GMO components. The balanced protein-to-fat ratio supports lean muscle maintenance, healthy weight management, and sustained daily energy. Natural antioxidants from fruits and vegetables boost immune function and help protect cells from oxidative stress. The formula also contains prebiotics and probiotics to support a healthy digestive system and firm, regular stools. Feed the daily recommended amount in one or two meals based on your dog's weight and activity level. Ensure a constant supply of fresh drinking water is always available.`,

  farmina: `Farmina is an Italian premium pet food company dedicated to crafting scientifically validated, natural nutrition using fresh animal proteins and low-glycaemic carbohydrates. The formula is free from corn, wheat, and soy, making it ideal for pets with grain sensitivities. Omega-3 and Omega-6 fatty acids from fish oil nourish the skin and coat, while a blend of vitamins and chelated minerals supports bone health and immune defence. Prebiotics and probiotics contribute to a balanced gut microbiome and optimal digestion. Use the feeding guide on the package based on your pet's weight, age, and lifestyle. Always provide fresh water and transition to this food gradually over one week.`,

  jungleOrPedigree: `This pet food is carefully formulated to provide complete and balanced daily nutrition for your cat or dog. High-quality animal proteins support strong muscles and healthy body weight, while Omega-3 and Omega-6 fatty acids promote a glossy coat and supple skin. Added vitamins and minerals reinforce the immune system and contribute to strong bones and teeth. The palatable recipe is designed to appeal to even picky eaters, ensuring your pet consumes all the nutrients it needs every day. Feed according to the recommended daily portions based on body weight, adjusting for activity level. Always offer fresh water alongside meals.`,

  drClauder: `Dr. Clauder is a German brand that formulates premium veterinary-grade pet food using high-quality, carefully sourced ingredients. The grain-free or low-grain recipes are particularly suitable for pets with sensitive digestive systems or food intolerances. Rich in digestible animal protein, the formula supports lean muscle mass and healthy energy levels. Natural fibre sources promote smooth digestion and regular bowel function, while Omega fatty acids keep skin healthy and the coat shiny. Vitamins, minerals, and trace elements round out the complete nutritional profile, eliminating the need for separate supplements. Introduce the food gradually over five to seven days and always make fresh water available.`,

  smartHeart: `SmartHeart is a trusted pet food brand developed using nutritional science to support the health and vitality of cats and dogs at every life stage. The formula provides a balanced blend of proteins, fats, carbohydrates, vitamins, and minerals to meet daily energy requirements and maintain a healthy body condition. Key nutrients support cardiovascular health, sharp vision, and strong bones and teeth. The palatable flavour profile ensures high acceptance, even among selective eaters. Feed as directed on the packaging based on your pet's weight and age, splitting into two meals per day where possible. Fresh water must be available at all times.`,

  // ── Veterinary medicines ──────────────────────────────────────────────────

  antibiotic: `This veterinary antibiotic formulation delivers effective broad-spectrum or targeted antibacterial activity against a wide range of gram-positive and gram-negative organisms commonly associated with infections in livestock and poultry. It achieves rapid therapeutic concentrations at the site of infection, reducing clinical signs and shortening recovery time. The product is intended for use under veterinary supervision; correct diagnosis, dosage, and treatment duration are essential to achieve optimal results and minimise the risk of antimicrobial resistance. Administer only to the species and at the dose recommended on the label or as directed by a licensed veterinarian. Observe the prescribed withdrawal period before slaughter or milk consumption. Store in a cool, dry place away from direct sunlight and out of reach of children.`,

  injection: `This veterinary injectable product is designed for parenteral administration in livestock, poultry, or companion animals, delivering the active ingredient rapidly into the systemic circulation for prompt therapeutic effect. The sterile formulation ensures safety and efficacy at the injection site. Administration should be performed by or under the direct guidance of a registered veterinarian using proper aseptic technique. Correct dosage based on body weight is critical to achieving the desired clinical outcome. Observe all species-specific contraindications and meat or milk withdrawal periods as stipulated on the product label. Store refrigerated or as directed, protect from freezing, and use within the stated shelf life after opening.`,

  supplement: `This veterinary nutritional supplement is formulated to correct or prevent specific deficiencies in livestock, poultry, and other domestic animals. It provides essential vitamins, minerals, or trace elements that may be lacking in the basal diet, supporting metabolic function, growth, reproduction, and immune competence. Regular supplementation helps maintain optimal productivity in dairy cattle, improves feed conversion in poultry, and supports the overall health and condition of horses, sheep, and goats. Administer at the recommended dose for the target species as directed on the label or by a qualified veterinarian. Store in a cool, dry location, sealed tightly to preserve potency, and keep out of reach of children and non-target animals.`,

  vitaminMineral: `This veterinary vitamin and mineral preparation addresses common nutritional gaps in the diets of cattle, buffalo, horses, sheep, goats, and poultry. Adequate intake of fat-soluble vitamins and key minerals is essential for proper bone mineralisation, reproductive efficiency, immune system strength, and overall metabolic health. Deficiency conditions such as milk fever, white muscle disease, rickets, and poor growth response can be significantly reduced with timely supplementation. The product is suitable for prophylactic use during periods of high physiological demand such as pregnancy, lactation, and rapid growth phases. Administer according to label instructions or as prescribed by a licensed veterinarian. Keep out of reach of children and store away from direct sunlight and moisture.`,

  anthelmintic: `This veterinary anthelmintic product is indicated for the treatment and control of a broad range of internal parasites including roundworms, tapeworms, lungworms, and liver flukes in cattle, buffalo, sheep, goats, horses, and poultry. Effective parasite control is essential for maintaining animal productivity, feed conversion efficiency, and overall herd or flock health. Regular strategic deworming according to an integrated parasite management programme reduces pasture contamination and prevents the development of clinical disease. Administer at the recommended dose for the target species and observe any specified withdrawal periods before slaughter or use of animal products for human consumption. Consult a veterinarian for advice on optimal treatment intervals. Store in a cool, dry place.`,

  coccidiostat: `This veterinary coccidiostatic preparation is indicated for the treatment and prophylaxis of coccidiosis caused by Eimeria species in poultry and livestock. Coccidiosis is one of the most economically significant parasitic diseases in commercial poultry production, causing intestinal damage, reduced weight gain, poor feed conversion, and increased mortality in severe cases. Early intervention with the correct anticoccidial drug at the recommended dose is critical to limiting losses. Administer via drinking water or feed as directed on the label, ensuring uniform distribution and adequate intake across the flock. Observe all specified withdrawal periods. Rotate anticoccidial classes periodically as part of a resistance management strategy. Store in a cool, dry, well-ventilated location.`,

  vaccine: `This veterinary vaccine is designed to stimulate protective immunity against specific viral or bacterial pathogens in poultry or livestock. Vaccination is the most cost-effective tool for preventing infectious disease outbreaks, reducing mortality, improving production efficiency, and limiting the need for antibiotic treatment. The product is produced to strict biological manufacturing standards to ensure consistent antigen potency and safety. Administer by the recommended route and schedule to the target species as specified on the label or as advised by a licensed veterinarian. Maintain the cold chain throughout storage and handling; never use vaccine that has been frozen or exposed to excessive heat. Dispose of used vials and equipment safely according to local biosafety regulations.`,

  mastitis: `This intramammary or udder health product is formulated specifically for the treatment or prevention of mastitis in lactating or dry dairy cattle. Mastitis is the most costly disease in dairy farming, causing significant milk production losses, increased somatic cell counts, and potential permanent damage to mammary tissue. The active ingredient penetrates effectively into infected quarters to eliminate the causative bacteria and reduce inflammation. Administer by the intramammary route following complete milking out of the affected quarter and thorough teat-end cleaning and disinfection. Observe all milk and meat withdrawal periods as specified on the label. For dry cow therapy, apply at the time of drying off according to veterinary guidance.`,

  antiparasitic: `This antiparasitic preparation provides effective control of both internal and external parasites affecting livestock, poultry, and companion animals. External parasites such as ticks, mites, lice, and flies cause skin irritation, anaemia, secondary infections, and significant production losses, while internal parasites deplete nutrients and damage the gastrointestinal tract. Dual-action products offer the convenience of treating both parasite categories with a single administration, reducing handling stress on the animal. Apply or administer at the dose specified for the target species and body weight. Adhere strictly to any withdrawal periods before slaughter or during lactation. Rotate between product classes periodically to slow the development of resistance. Store out of reach of children and away from heat and direct sunlight.`,

  trypanosomiasis: `This veterinary preparation is indicated for the treatment and control of trypanosomiasis, a serious protozoal disease transmitted by biting insects such as the tsetse fly and other haematophagous vectors. Trypanosomiasis causes progressive anaemia, weight loss, reduced fertility, submandibular oedema, and death in untreated animals, with camels, horses, cattle, and buffalo being commonly affected. Early diagnosis and prompt treatment are critical to achieving a full clinical recovery. Administer the product at the correct dose for the target species under veterinary supervision. Monitor treated animals for adverse reactions and response to therapy. Store the product as directed, reconstitute immediately before use if supplied as a powder, and discard any unused portion safely.`,

  respiratory: `This veterinary respiratory product is formulated to treat or support recovery from respiratory tract infections in poultry, livestock, and companion animals. Conditions such as infectious bronchitis, Newcastle disease, mycoplasmosis, pasteurellosis, and enzootic pneumonia cause significant morbidity, reduced growth performance, and production losses. The product provides anti-infective, anti-inflammatory, or mucolytic action depending on its formulation, helping to clear airways, reduce fever, and restore normal respiratory function. Administer via the drinking water, feed premix, or parenteral route as specified. Maintain good ventilation, reduce stocking density where possible, and address any underlying predisposing factors alongside medication. Observe all withdrawal periods. Store in a cool, dry environment protected from light.`,

  liver: `This veterinary hepatoprotective and renal tonic is formulated to support liver and kidney function in livestock, poultry, and companion animals exposed to mycotoxins, hepatotoxic drugs, nutritional imbalances, or metabolic stress. The liver is the primary organ of detoxification and metabolic regulation; compromised function results in reduced productivity, poor feed conversion, and systemic illness. Active ingredients such as silymarin, methionine, choline, and sorbitol promote hepatocyte regeneration, facilitate toxin elimination, and restore normal bile flow. Administer as directed in the drinking water or feed. Regular use during periods of high toxin exposure or disease challenge reduces the risk of hepatic insufficiency and supports overall health. Store away from direct sunlight and moisture.`,

  electrolyte: `This veterinary electrolyte and rehydration product is formulated to rapidly restore fluid and electrolyte balance in livestock and poultry suffering from dehydration caused by diarrhoea, heat stress, transportation, or disease challenge. Dehydration and electrolyte imbalance compromise cardiovascular function, reduce muscle performance, and can be fatal if not corrected promptly. The formula provides the precise balance of sodium, potassium, chloride, and glucose to promote rapid intestinal absorption and cellular rehydration. Dissolve the recommended amount in clean drinking water and offer ad libitum or as directed by a veterinarian. Supportive electrolyte therapy is particularly valuable in young calves, lambs, and chicks where dehydration progresses rapidly. Store in a cool, dry location and use within the recommended period after mixing.`,

  disinfectant: `This veterinary disinfectant is formulated for effective use in animal housing, equipment, and farm environments to eliminate bacteria, viruses, fungi, and other pathogens that cause infectious disease in livestock and poultry. Regular disinfection of poultry houses, calf pens, milking parlours, and veterinary instruments between production cycles is a cornerstone of biosecurity and disease prevention. Dilute to the concentration recommended on the label for the specific application; higher dilutions may be insufficient to kill resistant organisms, while undiluted product may damage surfaces or equipment. Ensure thorough cleaning before disinfection to remove organic matter that reduces efficacy. Ventilate enclosed spaces adequately after application and keep animals out of treated areas until surfaces are completely dry.`,

  // ── Pet accessories / equipment ──────────────────────────────────────────

  petAccessory: `This pet accessory is designed with your animal's comfort, safety, and wellbeing in mind. Constructed from durable, pet-safe materials, it is built to withstand regular use while remaining gentle on your pet's body. The product is easy to fit, clean, and maintain, making it a practical choice for everyday use at home or outdoors. Whether used for exercise, enrichment, containment, or comfort, it meets the essential needs of pet owners looking for reliable, quality equipment. Always supervise your pet when using new accessories and ensure correct sizing for a safe and comfortable fit. Check the product regularly for wear or damage and replace if any components become compromised.`,

  scratchPole: `This cat scratching post and resting station satisfies your cat's natural instinct to scratch, stretch, and climb while protecting your furniture from damage. The sturdy base ensures stability during vigorous use, and the textured scratching surface encourages appropriate claw conditioning behaviour. Elevated resting platforms give cats a secure vantage point, which reduces stress and promotes confidence, especially in multi-pet households. The plush or fleece covering provides a warm, comfortable surface for resting and sleeping. Place the post near areas where your cat already scratches to encourage use. Sprinkle a small amount of catnip on the post to attract your cat initially. Ensure regular inspection of the sisal or carpeting for wear and replace the unit when the scratching surface is depleted.`,

  // ── General fallback ─────────────────────────────────────────────────────

  general: `This product is designed for use in veterinary and animal health applications, supporting the health, productivity, and wellbeing of livestock, poultry, and companion animals. It meets established quality standards for safety and efficacy when used as directed. Always read the product label carefully before use and follow the dosage instructions appropriate for the target species and body weight. For prescription medicines, administer only under the guidance of a licensed veterinarian. Proper storage conditions must be maintained to preserve product integrity and shelf life. Keep all veterinary products out of reach of children and non-target animals. Dispose of empty containers and unused product in accordance with local environmental regulations.`,
}

// ─── product-type detection ───────────────────────────────────────────────────

function detectBlock(name, category, subcategory, genericName, currentDesc) {
  const all = [name, category, subcategory, genericName, currentDesc].join(' ')

  // Pet food brands
  if (contains(name, 'royal canin')) {
    if (contains(all, 'dog', 'puppy', 'junior', 'canine', 'giant', 'maxi', 'labrador', 'rottweiler', 'german shepherd', 'gs '))
      return BLOCKS.royalCaninDog
    return BLOCKS.royalCaninCat
  }
  if (contains(name, 'brit care', 'brit premium')) return BLOCKS.britCare
  if (contains(name, 'winner plus')) return BLOCKS.winnerplusDog
  if (contains(name, 'farmina', 'matisse', 'nd low', 'nd pumkin', 'n&d')) return BLOCKS.farmina
  if (contains(name, 'jungle', 'pedigree', 'whiskas', 'purina', 'drools', 'smartheart', 'smart heart'))
    return contains(name, 'smart', 'smartheart') ? BLOCKS.smartHeart : BLOCKS.jungleOrPedigree
  if (contains(name, 'dr. clauder', 'dr.clauder', 'dr clauder')) return BLOCKS.drClauder
  if (contains(name, 'scratch pole', 'scratch post', 'cat tree', 'cat tower', 'scratch and rest', 'zebra fleece')) return BLOCKS.scratchPole
  if (contains(all, 'pet accessory', 'harness', 'leash', 'collar', 'cat bed', 'dog bed', 'feather boa', 'pet toy', 'gravy bone', 'dental stick'))
    return BLOCKS.petAccessory

  // Medicine types
  if (contains(all, 'trypanosomiasis', 'tryban', 'diminazene', 'berenil', 'samorin', 'quinapyramine'))
    return BLOCKS.trypanosomiasis
  if (contains(all, 'mastitis', 'intra-mammary', 'intramammary', 'dry cow', 'teat', 'cloxam'))
    return BLOCKS.mastitis
  if (contains(all, 'coccidiosis', 'coccidiostat', 'coccirid', 'amprolium', 'sulphaquinoxaline', 'toltrazuril', 'diclazuril', 'prolicox', 'toltra', 'toltracox'))
    return BLOCKS.coccidiostat
  if (contains(all, 'vaccine', 'newcastle', 'gumboro', 'marek', 'ibv', 'avian', 'nd vaccine', 'gallimune', 'vaccination'))
    return BLOCKS.vaccine
  if (contains(all, 'liver', 'hepatic', 'hepato', 'hepasol', 'sorbitol', 'silymarin', 'choline', 'mycotoxin', 'toxin binder', 'micotox', 'aflatoxin'))
    return BLOCKS.liver
  if (contains(all, 'electrolyte', 'rehydration', 'oral rehydration', 'dehydration', 'ors'))
    return BLOCKS.electrolyte
  if (contains(all, 'disinfectant', 'sanitiser', 'sanitizer', 'virucidal', 'germicidal', 'biosecur'))
    return BLOCKS.disinfectant
  if (contains(all, 'respiratory', 'bronchitis', 'pneumonia', 'expectorant', 'mucolytic', 'cough', 'mycoplasmosis'))
    return BLOCKS.respiratory
  if (contains(all, 'anthelmintic', 'dewormer', 'worm', 'nematode', 'tapeworm', 'lungworm', 'fluke', 'albendazole', 'ivermectin', 'levamisole', 'fenbendazole', 'niclosamide', 'selbazole', 'selmec', 'levasel', 'niclover', 'mecdor'))
    return BLOCKS.anthelmintic
  if (contains(all, 'tick', 'mite', 'lice', 'ectoparasit', 'flea', 'mange', 'antiparasit', 'pour-on', 'spot-on'))
    return BLOCKS.antiparasitic
  if (contains(all, 'vitamin', 'mineral', 'supplement', 'deficiency', 'ad3', 'vit c', 'vit a', 'calcium', 'phosphorus', 'selenium', 'zinc', 'iron', 'trace element', 'bovimix', 'sp minerals'))
    return BLOCKS.vitaminMineral
  if (contains(all, 'antibiotic', 'antibacterial', 'ampicillin', 'amoxicillin', 'oxytetracycline', 'enrofloxacin', 'tylosin', 'colistin', 'doxycycline', 'sulpha', 'trimethoprim', 'flumequine', 'norfloxacin', 'tilmicosin', 'penicillin', 'gentamicin'))
    return BLOCKS.antibiotic
  if (contains(all, 'injection', 'injectable', ' inj', '-inj', 'ampijet', 'solomin', 'calpho', 'selmec inj', 'intervac'))
    return BLOCKS.injection
  if (contains(all, 'supplement', 'nutritional', 'nutrient', 'growth promot', 'feed additive', 'premix'))
    return BLOCKS.supplement

  return BLOCKS.general
}

// ─── description builder ──────────────────────────────────────────────────────

function buildDescription(product) {
  const name     = clean(product.ProductName)
  const cat      = clean(product.Category)
  const sub      = clean(product.SubCategory)
  const generic  = clean(product.GenericName)
  const existing = clean(product.Description)
  const company  = clean(product.CompanyName)

  // Pick the right expansion block
  const expansion = detectBlock(name, cat, sub, generic, existing)

  // Build the base sentence(s) — use existing if it's meaningful,
  // otherwise synthesise from product name
  let base = existing
  if (!base || base.length < 20) {
    base = `${name} is a veterinary product formulated for use in domestic animals.`
  }

  // Add generic name context if it looks like an active ingredient list
  let ingredientNote = ''
  if (generic && generic.length > 5 &&
      !contains(generic, 'veterinary', 'NULL', 'null') &&
      !contains(generic, 'supplies online')) {
    ingredientNote = ` Active ingredient(s): ${generic.replace(/eq\. to .*/i, '').trim()}.`
  }

  // Brand attribution
  const companyNote = (company && !contains(company, 'monis raza', 'online vet', 'null'))
    ? ` Manufactured by ${company}.`
    : ''

  const full = `${base}${ingredientNote}${companyNote} ${expansion}`.trim()

  // Trim to ~250 words max to avoid runaway descriptions
  const words = full.split(/\s+/)
  return words.length > 250 ? words.slice(0, 250).join(' ') + '.' : full
}

// ─── main ─────────────────────────────────────────────────────────────────────

const raw = fs.readFileSync(INPUT, 'utf8').replace(/^﻿/, '')
const products = JSON.parse(raw)
console.log(`Loaded ${products.length} products from ${INPUT}`)

const output = []
let generated = 0

for (const p of products) {
  const description = buildDescription(p)
  output.push({ id: Number(p.ProductID), description })
  generated++
  if (generated % 500 === 0) console.log(`  Processed ${generated}/${products.length}`)
}

fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2))
console.log(`\nDone. ${generated} descriptions written to ${OUTPUT}`)
console.log(`\nNext step: copy ${OUTPUT} to VPS and run:`)
console.log(`  node apply-descriptions.js ${OUTPUT}`)
