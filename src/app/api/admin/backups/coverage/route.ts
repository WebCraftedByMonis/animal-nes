import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { validateAdminSession } from '@/lib/auth/admin-auth';
import * as XLSX from 'xlsx';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin-token')?.value;
  if (!token) return null;
  return validateAdminSession(token);
}

export const runtime = 'nodejs';
export const maxDuration = 60;

// Top searched / most in-demand products (by search impressions), ranked.
// `hint` is the parenthetical note from the source list — kept for context only,
// it is not used for matching.
const TRENDING_PRODUCTS: { rank: number; name: string; hint: string | null }[] = [
  { rank: 1, name: 'Cazitel Plus', hint: 'wormer' },
  { rank: 2, name: 'Gentacombisone Injection', hint: null },
  { rank: 3, name: 'Ecosin Tablet', hint: null },
  { rank: 4, name: 'Psittacus Complete Bird Food Pellets', hint: null },
  { rank: 5, name: 'Zentel Syrup', hint: null },
  { rank: 6, name: 'Isoflurane', hint: null },
  { rank: 7, name: 'Vitamin AD3E Injection', hint: null },
  { rank: 8, name: 'Praferan Tablet', hint: null },
  { rank: 9, name: 'Amoxtin Powder', hint: null },
  { rank: 10, name: 'Vetoryl', hint: '10mg capsules' },
  { rank: 11, name: 'Rumen Tonic', hint: null },
  { rank: 12, name: 'Oxaplex', hint: null },
  { rank: 13, name: 'Feed Grade Yeast', hint: null },
  { rank: 14, name: 'Sulphanic Bolus', hint: null },
  { rank: 15, name: 'Neocep', hint: null },
  { rank: 16, name: 'Xylax', hint: null },
  { rank: 17, name: 'Josera Culinesse', hint: 'cat food' },
  { rank: 18, name: 'Septin Plus Solution', hint: null },
  { rank: 19, name: 'Alphacal D', hint: null },
  { rank: 20, name: 'Mobiflex Mobility Supplement', hint: null },
  { rank: 21, name: 'Cat House / Cat Bed', hint: null },
  { rank: 22, name: 'Niclozole', hint: null },
  { rank: 23, name: 'AATU Puppy Food', hint: null },
  { rank: 24, name: 'Scatt', hint: 'bird mite treatment' },
  { rank: 25, name: 'Silima Syrup', hint: null },
  { rank: 26, name: 'Schesir Cat Food', hint: null },
  { rank: 27, name: 'Ecocell', hint: null },
  { rank: 28, name: 'Zoramek Injection', hint: null },
  { rank: 29, name: 'Serilin Injection', hint: null },
  { rank: 30, name: 'Milfon C', hint: null },
  { rank: 31, name: 'Arthroforte Sachet', hint: null },
  { rank: 32, name: 'Punjnad Wanda', hint: 'animal feed' },
  { rank: 33, name: 'Toxin Binder', hint: null },
  { rank: 34, name: 'Finch Supplements', hint: null },
  { rank: 35, name: 'Feed Up Yeast', hint: null },
  { rank: 36, name: 'Virkon', hint: 'disinfectant' },
  { rank: 37, name: 'Diarroban', hint: null },
  { rank: 38, name: 'Fa-Try Banil Injection', hint: null },
  { rank: 39, name: 'Antil Injection', hint: null },
  { rank: 40, name: 'Levomex', hint: null },
  { rank: 41, name: 'Tylofurcin Powder', hint: null },
  { rank: 42, name: 'Biosal Injection', hint: null },
  { rank: 43, name: 'Earthz Pet', hint: null },
  { rank: 44, name: 'Beaphar Plaque Away', hint: null },
  { rank: 45, name: 'Reflex Cat Food', hint: null },
  { rank: 46, name: 'Viusid', hint: null },
  { rank: 47, name: 'Loxin Injection', hint: null },
  { rank: 48, name: 'Zagribind', hint: 'toxin binder' },
  { rank: 49, name: 'Kaolin Powder', hint: null },
  { rank: 50, name: 'Medivac ND Emulsion', hint: null },
  { rank: 51, name: 'KM Feed', hint: null },
  { rank: 52, name: 'Fenerol', hint: null },
  { rank: 53, name: 'Cholorex', hint: null },
  { rank: 54, name: 'Tricure Injection', hint: null },
  { rank: 55, name: 'Fosfan Injection', hint: null },
  { rank: 56, name: 'Maxel C Syrup', hint: null },
  { rank: 57, name: 'Utrosan', hint: null },
  { rank: 58, name: 'Gentacyn', hint: null },
  { rank: 59, name: 'Symostress', hint: null },
  { rank: 60, name: 'Livphoria', hint: null },
  { rank: 61, name: 'Bioaugment', hint: null },
  { rank: 62, name: 'Teragen Spray', hint: null },
  { rank: 63, name: 'DCP Powder', hint: null },
  { rank: 64, name: 'F10 Disinfectant', hint: null },
  { rank: 65, name: 'Cimalgex', hint: null },
  { rank: 66, name: 'Renalof Syrup', hint: null },
  { rank: 67, name: 'Mycosorb', hint: 'toxin binder' },
  { rank: 68, name: 'Frontline Spray', hint: null },
  { rank: 69, name: 'Regumate', hint: 'equine' },
  { rank: 70, name: 'Anti-parasite Shampoo', hint: null },
  { rank: 71, name: 'Biowin Injection', hint: null },
  { rank: 72, name: 'Faromac', hint: null },
  { rank: 73, name: 'Seguvan Powder', hint: null },
  { rank: 74, name: 'Sinolox', hint: null },
  { rank: 75, name: 'Cefur Injection', hint: null },
  { rank: 76, name: 'Dyro X Powder', hint: null },
  { rank: 77, name: 'Primatox', hint: null },
  { rank: 78, name: 'Conceptal Injection', hint: null },
  { rank: 79, name: 'Biofel PCH Vaccine', hint: 'cats' },
  { rank: 80, name: 'Primodog Vaccine', hint: null },
  { rank: 81, name: 'Aminomax', hint: null },
  { rank: 82, name: 'Duck Jerky Dog Treats', hint: null },
  { rank: 83, name: 'Animal Feed Molasses', hint: null },
  { rank: 84, name: 'Organic Paw & Nose Balm', hint: null },
  { rank: 85, name: 'Aurizon Ear Drops', hint: null },
  { rank: 86, name: 'Hepagen', hint: null },
  { rank: 87, name: 'Caustic Soda', hint: null },
  { rank: 88, name: 'Vitamax', hint: null },
  { rank: 89, name: 'Funginox Spray', hint: null },
  { rank: 90, name: 'Mera Cat Food', hint: null },
  { rank: 91, name: 'Blitzform', hint: 'pigeon' },
  { rank: 92, name: 'Enrosol S', hint: 'poultry' },
  { rank: 93, name: 'Lonkeen Cat Litter', hint: null },
  { rank: 94, name: 'Petlac Milk Powder', hint: null },
  { rank: 95, name: 'Novasul', hint: null },
  { rank: 96, name: 'Solozan', hint: null },
  { rank: 97, name: 'Ivomec Super Injection', hint: null },
  { rank: 98, name: 'Diazine Syrup', hint: null },
  { rank: 99, name: 'Seafowl', hint: null },
  { rank: 100, name: 'Josera Cat Food', hint: 'range' },
];

// Dosage-form / packaging words stripped from the end of a search term before
// matching, so "Gentacombisone Injection" also matches a catalog product
// stored as e.g. "Gentacombisone Inj 10ml".
const DOSAGE_FORM_SUFFIXES = new Set([
  'injection', 'tablet', 'tablets', 'syrup', 'powder', 'spray', 'solution',
  'bolus', 'emulsion', 'capsules', 'capsule', 'vaccine', 'drops', 'sachet',
  'cream',
]);

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function coreWords(term: string): string[] {
  const words = normalize(term).split(' ').filter(Boolean);
  if (words.length > 1 && DOSAGE_FORM_SUFFIXES.has(words[words.length - 1])) {
    words.pop();
  }
  return words;
}

interface CatalogEntry {
  id: number;
  productName: string;
  companyName: string | null;
  searchable: string;
}

function findMatch(termName: string, catalog: CatalogEntry[]): CatalogEntry | null {
  // A term like "Cat House / Cat Bed" is treated as two alternatives —
  // a match on either one counts as found.
  const alternatives = termName.includes('/')
    ? termName.split('/').map((s) => s.trim()).filter(Boolean)
    : [termName];

  for (const alt of alternatives) {
    const words = coreWords(alt);
    if (words.length === 0) continue;
    const match = catalog.find((entry) => words.every((w) => entry.searchable.includes(w)));
    if (match) return match;
  }
  return null;
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

interface FoundRow {
  Rank: number | null;
  SearchedProductName: string | null;
  ProductID: number;
  ProductName: string;
  GenericName: string | null;
  Category: string | null;
  AdditionalCategories: string;
  SubCategory: string | null;
  SubSubCategory: string | null;
  ProductType: string | null;
  CompanyID: number | null;
  CompanyName: string | null;
  PartnerID: number | null;
  PartnerName: string | null;
  Description: string | null;
  ProductLink: string | null;
  Dosage: string | null;
  OutOfStock: boolean;
  IsFeatured: boolean;
  IsActive: boolean;
  ImageID: number | null;
  ImageURL: string | null;
  ImageAlt: string | null;
  ImagePublicId: string | null;
  CreatedAt: string | null;
  UpdatedAt: string | null;
  VariantID: number | null;
  PackingVolume: string | null;
  CompanyPrice: number | null;
  DealerPrice: number | null;
  'Customer Price': number | null;
  Inventory: number | null;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country') || 'Pakistan';

  const products = await prisma.product.findMany({
    where: {
      OR: [
        { company: { country: country } },
        { partner: { country: country } },
      ],
    },
    select: {
      id: true,
      productName: true,
      genericName: true,
      company: { select: { companyName: true } },
    },
  });

  const catalog: CatalogEntry[] = products.map((p) => ({
    id: p.id,
    productName: p.productName,
    companyName: p.company?.companyName ?? null,
    searchable: normalize(`${p.productName} ${p.genericName ?? ''}`),
  }));

  // Every rank gets its own entry here — even when two different trending
  // terms happen to match the same catalog product (e.g. "Toxin Binder" and
  // "Mycosorb" both matching a single "Mycosorb Toxin Binder" product), so no
  // rank silently disappears.
  const matchedTerms: { rank: number; name: string; productId: number }[] = [];

  for (const { rank, name } of TRENDING_PRODUCTS) {
    const match = findMatch(name, catalog);
    if (match) {
      matchedTerms.push({ rank, name, productId: match.id });
    }
  }

  const matchedIds = [...new Set(matchedTerms.map((t) => t.productId))];

  const fullProducts = matchedIds.length === 0 ? [] : await prisma.product.findMany({
    where: { id: { in: matchedIds } },
    include: {
      company: { select: { id: true, companyName: true } },
      partner: { select: { id: true, partnerName: true } },
      variants: { orderBy: { id: 'asc' } },
      image: true,
      categories: true,
    },
    orderBy: { id: 'asc' },
  });
  const productById = new Map(fullProducts.map((p) => [p.id, p]));

  // Same row shape as the Products Backup, with the trending rank/search term prepended.
  const foundRows: FoundRow[] = matchedTerms.flatMap(({ rank, name, productId }): FoundRow[] => {
    const product = productById.get(productId);
    if (!product) return [];
    const base = {
      Rank: rank,
      SearchedProductName: name,
      ProductID: product.id,
      ProductName: product.productName,
      GenericName: product.genericName,
      Category: product.category,
      AdditionalCategories: product.categories.map((c) => c.category).join(', '),
      SubCategory: product.subCategory,
      SubSubCategory: product.subsubCategory,
      ProductType: product.productType,
      CompanyID: product.companyId,
      CompanyName: product.company?.companyName ?? null,
      PartnerID: product.partnerId,
      PartnerName: product.partner?.partnerName ?? null,
      Description: product.description,
      ProductLink: product.productLink,
      Dosage: product.dosage,
      OutOfStock: product.outofstock,
      IsFeatured: product.isFeatured,
      IsActive: product.isActive,
      ImageID: product.image?.id ?? null,
      ImageURL: product.image?.url ?? null,
      ImageAlt: product.image?.alt ?? null,
      ImagePublicId: product.image?.publicId ?? null,
      CreatedAt: toIso(product.createdAt),
      UpdatedAt: toIso(product.updatedAt),
    };
    if (product.variants.length === 0) {
      return [{ ...base, VariantID: null, PackingVolume: null, CompanyPrice: null, DealerPrice: null, 'Customer Price': null, Inventory: null }];
    }
    return product.variants.map((v) => ({
      ...base,
      VariantID: v.id,
      PackingVolume: v.packingVolume,
      CompanyPrice: v.companyPrice,
      DealerPrice: v.dealerPrice,
      'Customer Price': v.customerPrice,
      Inventory: v.inventory,
    }));
  }).sort((a, b) => (a.Rank ?? 0) - (b.Rank ?? 0));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(foundRows), 'Found Products');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `trending-products-found-${country}-${stamp}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
