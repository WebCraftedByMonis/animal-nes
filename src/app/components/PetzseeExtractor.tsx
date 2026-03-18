"use client";

import { useState } from "react";
import { Search, Loader2, XCircle, CheckCircle, ImageOff, ExternalLink, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { useCountry } from "@/contexts/CountryContext";

interface Variant { packingVolume: string; customerPrice: string; companyPrice: string; dealerPrice: string; }

interface Product {
  productName: string;
  genericName: string;
  category: string;
  subCategory: string;
  subsubCategory: string;
  productType: string;
  description: string;
  dosage: string;
  pdfUrl: string;
  productLink: string;
  imageUrl: string;
  outofstock: boolean;
  variants: Variant[];
}

type SaveStatus = "idle" | "saving" | "saved" | "error";
type FillStatus = "idle" | "filling" | "done" | "error";

interface Row extends Product {
  id: number;
  saveStatus: SaveStatus;
  saveError: string;
  fillStatus: FillStatus;
}

const proxyImg = (url: string) =>
  url ? `/api/image-proxy?url=${encodeURIComponent(url)}` : "";

export default function PetzseeExtractor() {
  const { country } = useCountry();
  const [url, setUrl] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [totalLinks, setTotalLinks] = useState(0);
  const [expandedDesc, setExpandedDesc] = useState<Set<number>>(new Set());

  // ── Extract ──────────────────────────────────────────────────────────────
  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setFetchError(null); setRows([]); setTotalLinks(0);
    try {
      const res = await fetch("/api/scrape-products-petzsee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setFetchError(data.error || "Extraction failed."); return; }
      if (!data.products.length) { setFetchError("No products found on this page."); return; }
setTotalLinks(data.totalLinks || data.count);
      setRows(data.products.map((p: Product, i: number) => ({
        ...p,
        id: i,
        pdfUrl: "",
        variants: (p.variants || []).map(v => ({ packingVolume: v.packingVolume, customerPrice: v.customerPrice, companyPrice: "", dealerPrice: "" })),
        saveStatus: "idle" as SaveStatus,
        saveError: "",
        fillStatus: "idle" as FillStatus,
      })));
    } catch (e: any) {
      setFetchError(e.message || "Network error.");
    } finally { setLoading(false); }
  };

  // ── Field editing ─────────────────────────────────────────────────────────
  const updateRow = (id: number, field: keyof Product, value: string | boolean) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const updateVariant = (rowId: number, vIdx: number, field: keyof Variant, value: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const variants = r.variants.map((v, i) => i === vIdx ? { ...v, [field]: value } : v);
      return { ...r, variants };
    }));
  };

  const addVariant = (rowId: number) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, variants: [...r.variants, { packingVolume: "", customerPrice: "", companyPrice: "", dealerPrice: "" }] } : r));
  };

  const removeVariant = (rowId: number, vIdx: number) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, variants: r.variants.filter((_, i) => i !== vIdx) } : r));
  };

  const toggleDesc = (id: number) => setExpandedDesc(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  // ── AI Fill ───────────────────────────────────────────────────────────────
  const aiFill = async (row: Row) => {
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, fillStatus: "filling" } : r));
    try {
      const res = await fetch("/api/ai-fill-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: row, productLink: row.productLink }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, fillStatus: "error" } : r));
        return;
      }
      const f = data.filled;
      setRows(prev => prev.map(r => {
        if (r.id !== row.id) return r;
        return {
          ...r,
          fillStatus: "done",
          genericName:     f.genericName     != null && f.genericName     !== "" ? f.genericName     : r.genericName,
          category:        f.category        != null && f.category        !== "" ? f.category        : r.category,
          subCategory:     f.subCategory     != null && f.subCategory     !== "" ? f.subCategory     : r.subCategory,
          subsubCategory:  f.subsubCategory  != null && f.subsubCategory  !== "" ? f.subsubCategory  : r.subsubCategory,
          productType:     f.productType     != null && f.productType     !== "" ? f.productType     : r.productType,
          description:     r.description !== "" ? r.description : (f.description ?? ""),
          dosage:          f.dosage          != null && f.dosage          !== "" ? f.dosage          : r.dosage,
        };
      }));
    } catch {
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, fillStatus: "error" } : r));
    }
  };

  // ── Save a single product ─────────────────────────────────────────────────
  const addProduct = async (row: Row) => {
    if (!companyId || !partnerId) {
      alert("Please select a Company and Partner before adding.");
      return;
    }
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, saveStatus: "saving" } : r));
    try {
      const fd = new FormData();
      fd.append("productName",    row.productName);
      fd.append("genericName",    row.genericName || "");
      fd.append("category",       row.category    || "Uncategorized");
      fd.append("subCategory",    row.subCategory || "General");
      fd.append("subsubCategory", row.subsubCategory || "General");
      fd.append("productType",    row.productType || "General");
      fd.append("description",    row.description || "");
      fd.append("dosage",         row.dosage || "");
      fd.append("productLink",    row.productLink || "");
      fd.append("pdfUrl",         row.pdfUrl || "");
      fd.append("imageUrl",       row.imageUrl || "");
      fd.append("companyId",      companyId);
      fd.append("partnerId",      partnerId);
      fd.append("isActive",       "true");
      fd.append("isFeatured",     "false");
      fd.append("outofstock",     row.outofstock ? "true" : "false");
      row.variants.forEach((v, i) => {
        fd.append(`variants[${i}][packingVolume]`, v.packingVolume || "Standard");
        fd.append(`variants[${i}][customerPrice]`, v.customerPrice || "0");
        fd.append(`variants[${i}][companyPrice]`,  v.companyPrice || "");
        fd.append(`variants[${i}][dealerPrice]`,   v.dealerPrice || "");
        fd.append(`variants[${i}][inventory]`,     "10");
      });
      const res = await fetch("/api/product", { method: "POST", body: fd });
      const data = await res.json();
      if (res.status === 201) {
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, saveStatus: "saved" } : r));
      } else {
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, saveStatus: "error", saveError: data.error || "Failed" } : r));
      }
    } catch (e: any) {
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, saveStatus: "error", saveError: e.message } : r));
    }
  };

  const savedCount = rows.filter(r => r.saveStatus === "saved").length;
  const errorCount = rows.filter(r => r.saveStatus === "error").length;

  const addAll = async () => {
    if (!companyId || !partnerId) {
      alert("Please select a Company and Partner before adding.");
      return;
    }
    const pending = rows.filter(r => r.saveStatus === "idle" || r.saveStatus === "error");
    for (const row of pending) {
      await addProduct(row);
    }
  };

  return (
    <div className="max-w-full">
      <p className="text-gray-500 text-sm mb-1">
        Extract products from <span className="font-semibold text-gray-700">petzsee.com</span> and add them directly to your store.
      </p>
      <p className="text-xs text-gray-400 mb-6">
        This extractor is configured for <span className="font-medium">Petzsee</span> — paste a product category URL to extract all products.
      </p>

      {/* ── Step 1: URL + Company + Partner ─────────────────────────────── */}
      <form onSubmit={handleExtract} className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 space-y-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Step 1 — Source &amp; Assignment</p>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[260px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Product category URL *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="url" value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://petzsee.com/product-category/cat/"
                required disabled={loading}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>
          </div>
          <button type="submit" disabled={loading || !url.trim()}
            className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Extracting…</> : <><Search className="w-4 h-4" />Extract</>}
          </button>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Company * <span className="text-gray-400">(required to save)</span></label>
            <SearchableCombobox
              apiEndpoint="/api/company"
              searchKey="companyName"
              value={companyId}
              onChange={setCompanyId}
              placeholder="Select company"
              extraParams={{ country }}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Partner * <span className="text-gray-400">(required to save)</span></label>
            <SearchableCombobox
              apiEndpoint="/api/partner"
              searchKey="partnerName"
              value={partnerId}
              onChange={setPartnerId}
              placeholder="Select partner"
              extraParams={{ country }}
            />
          </div>
        </div>
      </form>

      {loading && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          Fetching products via WooCommerce API → enriching with product page details…
        </div>
      )}

      {fetchError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
          <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{fetchError}
        </div>
      )}

      {/* ── Step 2: Results table ─────────────────────────────────────────── */}
      {rows.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{rows.length}</span> of{" "}
              <span className="font-semibold text-gray-900">{totalLinks}</span> products extracted
              {savedCount > 0 && <span className="ml-2 text-green-600 font-medium">· {savedCount} added</span>}
              {errorCount > 0 && <span className="ml-2 text-red-600 font-medium">· {errorCount} failed</span>}
            </p>
            <button
              onClick={addAll}
              disabled={!companyId || !partnerId || rows.every(r => r.saveStatus === "saved" || r.saveStatus === "saving")}
              className="ml-auto flex items-center gap-1.5 bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              + Add All
            </button>
            {(!companyId || !partnerId) && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                Select a Company and Partner above before adding products.
              </p>
            )}
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                    <th className="px-3 py-2.5 text-left w-16">Image</th>
                    <th className="px-3 py-2.5 text-left min-w-[160px]">Product Name *</th>
                    <th className="px-3 py-2.5 text-left w-28">Generic Name</th>
                    <th className="px-3 py-2.5 text-left w-28">Category *</th>
                    <th className="px-3 py-2.5 text-left w-28">Sub Category *</th>
                    <th className="px-3 py-2.5 text-left w-28">Sub-Sub Category *</th>
                    <th className="px-3 py-2.5 text-left w-28">Product Type *</th>
                    <th className="px-3 py-2.5 text-left min-w-[180px]">Description</th>
                    <th className="px-3 py-2.5 text-left min-w-[120px]">Dosage</th>
                    <th className="px-3 py-2.5 text-left min-w-[140px]">PDF URL</th>
                    <th className="px-3 py-2.5 text-left min-w-[260px]">Variants</th>
                    <th className="px-3 py-2.5 text-left w-28">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const descExpanded = expandedDesc.has(row.id);
                    return (
                      <tr key={row.id} className="border-b border-gray-100 align-top hover:bg-gray-50 transition-colors">

                        <td className="px-3 py-2.5">
                          {row.imageUrl ? (
                            <img src={proxyImg(row.imageUrl)} alt={row.productName}
                              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                              className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
                          ) : (
                            <div className="w-14 h-14 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center">
                              <ImageOff className="w-5 h-5 text-gray-300" />
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-2.5">
                          <input value={row.productName}
                            onChange={e => updateRow(row.id, "productName", e.target.value)}
                            className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-green-400 focus:border-green-400 min-w-[150px]" />
                        </td>

                        <td className="px-3 py-2.5">
                          <input value={row.genericName}
                            onChange={e => updateRow(row.id, "genericName", e.target.value)}
                            className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-green-400" />
                        </td>

                        <td className="px-3 py-2.5">
                          <input value={row.category}
                            onChange={e => updateRow(row.id, "category", e.target.value)}
                            className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-green-400" />
                        </td>

                        <td className="px-3 py-2.5">
                          <input value={row.subCategory}
                            onChange={e => updateRow(row.id, "subCategory", e.target.value)}
                            className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-green-400" />
                        </td>

                        <td className="px-3 py-2.5">
                          <input value={row.subsubCategory}
                            onChange={e => updateRow(row.id, "subsubCategory", e.target.value)}
                            className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-green-400" />
                        </td>

                        <td className="px-3 py-2.5">
                          <input value={row.productType}
                            onChange={e => updateRow(row.id, "productType", e.target.value)}
                            className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-green-400" />
                        </td>

                        <td className="px-3 py-2.5 max-w-[200px]">
                          <div className="text-xs text-gray-600">
                            {descExpanded
                              ? <textarea value={row.description}
                                  onChange={e => updateRow(row.id, "description", e.target.value)}
                                  rows={6}
                                  className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-green-400 resize-none" />
                              : <span className="line-clamp-2">{row.description || "—"}</span>
                            }
                            {row.description && (
                              <button onClick={() => toggleDesc(row.id)}
                                className="text-green-600 font-medium mt-0.5 flex items-center gap-0.5">
                                {descExpanded ? <><ChevronUp className="w-3 h-3" />less</> : <><ChevronDown className="w-3 h-3" />edit</>}
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-2.5">
                          <textarea value={row.dosage}
                            onChange={e => updateRow(row.id, "dosage", e.target.value)}
                            rows={2}
                            className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-green-400 resize-none min-w-[110px]" />
                        </td>

                        <td className="px-3 py-2.5">
                          <input
                            value={row.pdfUrl}
                            onChange={e => updateRow(row.id, "pdfUrl", e.target.value)}
                            placeholder="https://…/product.pdf"
                            className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-green-400 min-w-[130px]"
                          />
                        </td>

                        <td className="px-3 py-2.5">
                          <div className="space-y-2 min-w-[250px]">
                            {row.variants.length > 0 && (
                              <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                                <span className="w-14">Size</span>
                                <span className="w-14">Customer</span>
                                <span className="w-14">Company</span>
                                <span className="w-14">Dealer</span>
                              </div>
                            )}
                            {row.variants.map((v, vi) => (
                              <div key={vi} className="flex items-center gap-1">
                                <input value={v.packingVolume}
                                  onChange={e => updateVariant(row.id, vi, "packingVolume", e.target.value)}
                                  placeholder="Size"
                                  className="w-14 border border-gray-200 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-green-400" />
                                <input value={v.customerPrice}
                                  onChange={e => updateVariant(row.id, vi, "customerPrice", e.target.value)}
                                  placeholder="0"
                                  className="w-14 border border-gray-200 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-green-400" />
                                <input value={v.companyPrice}
                                  onChange={e => updateVariant(row.id, vi, "companyPrice", e.target.value)}
                                  placeholder="0"
                                  className="w-14 border border-gray-200 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-green-400" />
                                <input value={v.dealerPrice}
                                  onChange={e => updateVariant(row.id, vi, "dealerPrice", e.target.value)}
                                  placeholder="0"
                                  className="w-14 border border-gray-200 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-green-400" />
                                <button onClick={() => removeVariant(row.id, vi)}
                                  className="text-red-400 hover:text-red-600 font-bold text-sm leading-none flex-shrink-0">×</button>
                              </div>
                            ))}
                            <button onClick={() => addVariant(row.id)}
                              className="text-green-600 hover:text-green-800 text-xs font-medium flex items-center gap-0.5 mt-1">
                              + add variant
                            </button>
                            {row.productLink && (
                              <a href={row.productLink} target="_blank" rel="noopener noreferrer"
                                className="text-gray-400 hover:text-gray-600 inline-flex items-center gap-0.5 mt-0.5">
                                source <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-2.5">
                          <div className="flex flex-col gap-1.5">
                            <button
                              onClick={() => aiFill(row)}
                              disabled={row.fillStatus === "filling" || row.saveStatus === "saved"}
                              className="flex items-center gap-1 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                            >
                              {row.fillStatus === "filling"
                                ? <><Loader2 className="w-3 h-3 animate-spin" />Filling…</>
                                : row.fillStatus === "done"
                                ? <><Sparkles className="w-3 h-3" />Re-fill</>
                                : <><Sparkles className="w-3 h-3" />AI Fill</>
                              }
                            </button>
                            {row.fillStatus === "error" && (
                              <span className="text-red-500 text-xs">AI failed</span>
                            )}

                            {row.saveStatus === "saved" ? (
                              <span className="flex items-center gap-1 text-green-600 font-medium text-xs whitespace-nowrap">
                                <CheckCircle className="w-4 h-4" />Added
                              </span>
                            ) : row.saveStatus === "saving" ? (
                              <span className="flex items-center gap-1 text-blue-500 text-xs whitespace-nowrap">
                                <Loader2 className="w-4 h-4 animate-spin" />Adding…
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => addProduct(row)}
                                  disabled={!companyId || !partnerId}
                                  className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                                >
                                  + Add to Website
                                </button>
                                {row.saveStatus === "error" && (
                                  <span className="text-red-500 text-xs" title={row.saveError}>
                                    <XCircle className="w-3 h-3 inline mr-0.5" />Failed — retry?
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && !rows.length && !fetchError && (
        <div className="text-center py-16 text-gray-400">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Enter a Petzsee product category URL above to get started.</p>
          <p className="text-xs mt-1 opacity-70">e.g. https://petzsee.com/product-category/cat/</p>
        </div>
      )}
    </div>
  );
}
