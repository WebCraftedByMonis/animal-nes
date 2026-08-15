'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface AnalyticsData {
  eventCountsByType: { type: string; count: number }[];
  dailyCounts: { day: string; count: number }[];
  topViewedProducts: { productId: number; productName: string; views: number }[];
  affiliateLeaderboard: { id: number; name: string; clicks: number; conversions: number; commission: number }[];
}

const EVENT_LABELS: Record<string, string> = {
  PRODUCT_IMPRESSION: 'Product Impressions',
  PRODUCT_VIEW: 'Product Views',
  SEARCH: 'Searches',
  CATEGORY_VIEW: 'Category Views',
  PRODUCT_CLICK: 'Product Clicks',
  WISHLIST_ADD: 'Wishlist Adds',
  CART_ADD: 'Cart Adds',
  CHECKOUT_START: 'Checkout Starts',
  PURCHASE: 'Purchases',
  AFFILIATE_CLICK: 'Affiliate Clicks',
  SHARE: 'Shares',
  REVIEW: 'Reviews',
  TIME_ON_PRODUCT: 'Time on Product',
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <div className="p-6 text-gray-500">Loading…</div>;

  const funnelOrder = ['PRODUCT_IMPRESSION', 'PRODUCT_VIEW', 'CART_ADD', 'CHECKOUT_START', 'PURCHASE'];
  const countByType = new Map(data.eventCountsByType.map((e) => [e.type, e.count]));
  const funnel = funnelOrder.map((type) => ({ name: EVENT_LABELS[type], count: countByType.get(type) || 0 }));

  const dailyChartData = data.dailyCounts.map((d) => ({
    name: new Date(d.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    count: d.count,
  }));

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Event Analytics</h1>
        <p className="text-gray-600 mt-1">Last 14 days, from the central event-tracking service.</p>
      </div>

      {/* Event totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(EVENT_LABELS).map(([type, label]) => (
          <div key={type} className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-semibold mt-1 text-gray-900">{countByType.get(type) || 0}</p>
          </div>
        ))}
      </div>

      {/* Daily trend */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-gray-900 mb-4">All events, per day</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={dailyChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Funnel */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Purchase funnel</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={funnel}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top viewed products */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Most viewed products</h2>
          {data.topViewedProducts.length === 0 ? (
            <p className="text-sm text-gray-500">No product views recorded yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.topViewedProducts.map((p) => (
                <li key={p.productId} className="py-2 flex justify-between text-sm">
                  <span className="text-gray-700">{p.productName}</span>
                  <span className="font-medium text-gray-900">{p.views}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Affiliate leaderboard */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Affiliate leaderboard</h2>
          {data.affiliateLeaderboard.length === 0 ? (
            <p className="text-sm text-gray-500">No approved affiliates yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2">Affiliate</th>
                  <th className="py-2">Clicks</th>
                  <th className="py-2">Conversions</th>
                  <th className="py-2">Commission</th>
                </tr>
              </thead>
              <tbody>
                {data.affiliateLeaderboard.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-2 text-gray-900">{a.name}</td>
                    <td className="py-2">{a.clicks}</td>
                    <td className="py-2">{a.conversions}</td>
                    <td className="py-2 font-medium">PKR {a.commission.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
