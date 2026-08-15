'use client';

import { useEffect, useState } from 'react';

interface AffLink {
  id: number;
  code: string;
  label: string | null;
  isActive: boolean;
  targetPath: string;
  productName: string | null;
  affiliate: { id: number; name: string; email: string };
  clickCount: number;
  conversionCount: number;
  createdAt: string;
}

export default function AffiliateLinksPage() {
  const [links, setLinks] = useState<AffLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/affiliate/links')
      .then((r) => r.json())
      .then((d) => setLinks(d.links || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Affiliate Links</h1>
        <p className="text-gray-600 mt-1">Read-only oversight of every link generated across all affiliates.</p>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : links.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg text-gray-500">No links generated yet</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Link</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Affiliate</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Target</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Clicks</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Conversions</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {links.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">/go/{l.code}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{l.affiliate.name}</div>
                    <div className="text-gray-500 text-xs">{l.affiliate.email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{l.productName || l.label || l.targetPath}</td>
                  <td className="px-4 py-3">{l.clickCount}</td>
                  <td className="px-4 py-3">{l.conversionCount}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(l.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
