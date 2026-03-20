"use client";

import { useEffect, useState, useCallback } from "react";

type LogEntry = {
  id: number;
  contentType: string;
  contentId: string;
  platform: string;
  status: string;
  error: string | null;
  postedAt: string | null;
  updatedAt: string;
};

type SummaryRow = {
  platform: string;
  status: string;
  _count: { id: number };
};

type ApiResponse = {
  logs: LogEntry[];
  total: number;
  page: number;
  limit: number;
  summary: SummaryRow[];
};

const PLATFORMS     = ["", "facebook", "instagram", "linkedin"];
const CONTENT_TYPES = ["", "product", "news", "job", "animal", "form"];
const STATUSES      = ["", "posted", "skipped", "failed"];

const STATUS_STYLE: Record<string, string> = {
  posted:  "bg-green-100 text-green-800",
  skipped: "bg-yellow-100 text-yellow-800",
  failed:  "bg-red-100 text-red-800",
  pending: "bg-gray-100 text-gray-700",
};

const PLATFORM_ICON: Record<string, string> = {
  facebook:  "👤",
  instagram: "📷",
  linkedin:  "💼",
};

const TYPE_ICON: Record<string, string> = {
  product: "🛍️",
  news:    "📰",
  job:     "💼",
  animal:  "🐾",
  form:    "📋",
};

function fmt(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString();
}

export default function AutoPostLogPage() {
  const [data, setData]               = useState<ApiResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [platform, setPlatform]       = useState("");
  const [contentType, setContentType] = useState("");
  const [status, setStatus]           = useState("");
  const [page, setPage]               = useState(1);
  const [deleting, setDeleting]       = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (platform)    params.set("platform",    platform);
    if (contentType) params.set("contentType", contentType);
    if (status)      params.set("status",      status);
    params.set("page", String(page));

    const res  = await fetch(`/api/social-auto-post-log?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [platform, contentType, status, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [platform, contentType, status]);

  async function handleDelete(id: number) {
    if (!confirm("Remove this log entry? The auto-poster will re-post this item on its next cycle.")) return;
    setDeleting(id);
    await fetch("/api/social-auto-post-log", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeleting(null);
    fetchData();
  }

  // Build summary cards: { facebook: {posted, skipped, failed}, ... }
  const summaryMap: Record<string, Record<string, number>> = {};
  if (data?.summary) {
    for (const row of data.summary) {
      if (!summaryMap[row.platform]) summaryMap[row.platform] = {};
      summaryMap[row.platform][row.status] = row._count.id;
    }
  }

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Auto Post Log</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Records of every post attempt made by the automated social media poster.
        </p>
      </div>

      {/* Summary cards */}
      {data?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {["facebook", "instagram", "linkedin"].map((plat) => {
            const s = summaryMap[plat] || {};
            const total = (s.posted || 0) + (s.skipped || 0) + (s.failed || 0);
            return (
              <div key={plat} className="border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 font-semibold capitalize">
                  <span>{PLATFORM_ICON[plat]}</span>
                  <span>{plat}</span>
                  <span className="ml-auto text-sm text-muted-foreground">{total} total</span>
                </div>
                <div className="flex gap-2 text-sm flex-wrap">
                  <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                    ✅ {s.posted || 0} posted
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                    ⏭ {s.skipped || 0} skipped
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                    ❌ {s.failed || 0} failed
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium mb-1 text-muted-foreground">Platform</label>
          <select
            className="border rounded px-3 py-1.5 text-sm bg-background"
            value={platform}
            onChange={e => setPlatform(e.target.value)}
          >
            {PLATFORMS.map(p => (
              <option key={p} value={p}>{p || "All platforms"}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-muted-foreground">Content Type</label>
          <select
            className="border rounded px-3 py-1.5 text-sm bg-background"
            value={contentType}
            onChange={e => setContentType(e.target.value)}
          >
            {CONTENT_TYPES.map(t => (
              <option key={t} value={t}>{t || "All types"}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-muted-foreground">Status</label>
          <select
            className="border rounded px-3 py-1.5 text-sm bg-background"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>{s || "All statuses"}</option>
            ))}
          </select>
        </div>
        <button
          onClick={fetchData}
          className="px-3 py-1.5 text-sm border rounded hover:bg-muted transition"
        >
          Refresh
        </button>
        {data && (
          <span className="text-sm text-muted-foreground ml-auto">
            {data.total} records
          </span>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Platform</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">ID</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Posted At</th>
                <th className="text-left px-4 py-3 font-medium">Error</th>
                <th className="text-left px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : !data?.logs?.length ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    No records found.
                  </td>
                </tr>
              ) : (
                data?.logs.map(log => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30 transition">
                    <td className="px-4 py-3">
                      <span className="capitalize flex items-center gap-1.5">
                        {PLATFORM_ICON[log.platform] || "🌐"} {log.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize flex items-center gap-1.5">
                        {TYPE_ICON[log.contentType] || "📄"} {log.contentType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      #{log.contentId}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[log.status] || "bg-gray-100 text-gray-700"}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {fmt(log.postedAt)}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {log.error ? (
                        <span className="text-xs text-red-600 line-clamp-2" title={log.error}>
                          {log.error}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(log.id)}
                        disabled={deleting === log.id}
                        title="Remove log — item will be re-posted on next cycle"
                        className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition"
                      >
                        {deleting === log.id ? "..." : "Re-queue"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-end text-sm">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-muted transition"
          >
            Prev
          </button>
          <span className="text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-muted transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
