'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Affiliate {
  id: number;
  name: string;
  email: string;
  referralCode: string;
  status: string;
  accountTitle: string | null;
  accountNumber: string | null;
  bankName: string | null;
  paymentMethod: string | null;
}

interface Stats {
  balance: number;
  clickCount: number;
  conversionCount: number;
  linkCount: number;
}

interface AffLink {
  id: number;
  code: string;
  label: string | null;
  productName: string | null;
  targetPath: string;
  clickCount: number;
  conversionCount: number;
  createdAt: string;
}

interface ProductOption {
  id: number;
  productName: string;
  category: string | null;
}

export default function AffiliateDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [links, setLinks] = useState<AffLink[]>([]);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMsg, setPayoutMsg] = useState('');

  const loadAll = useCallback(async () => {
    const authRes = await fetch('/api/affiliate/check-auth', { credentials: 'include' });
    if (!authRes.ok) {
      router.push('/affiliate/login');
      return;
    }
    const authData = await authRes.json();
    setAffiliate(authData.affiliate);
    setStats(authData.stats);

    const linksRes = await fetch('/api/affiliate/links', { credentials: 'include' });
    if (linksRes.ok) {
      const linksData = await linksRes.json();
      setLinks(linksData.links);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/affiliate/product-search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.products);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleCreateLink = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/affiliate/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId: selectedProduct?.id, label: label || undefined }),
      });
      if (res.ok) {
        setSelectedProduct(null);
        setQuery('');
        setLabel('');
        const linksRes = await fetch('/api/affiliate/links', { credentials: 'include' });
        if (linksRes.ok) setLinks((await linksRes.json()).links);
      }
    } finally {
      setCreating(false);
    }
  };

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/go/${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1500);
    });
  };

  const handleRequestPayout = async () => {
    setPayoutMsg('');
    const amount = Number(payoutAmount);
    if (!amount || amount <= 0) {
      setPayoutMsg('Enter a valid amount');
      return;
    }
    const res = await fetch('/api/affiliate/payouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    if (res.ok) {
      setPayoutMsg('Payout request submitted.');
      setPayoutAmount('');
      loadAll();
    } else {
      setPayoutMsg(data.error || 'Failed to submit payout request');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (!affiliate) return null;

  if (affiliate.status !== 'APPROVED') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold mb-2">
            {affiliate.status === 'PENDING' && 'Your account is pending approval'}
            {affiliate.status === 'REJECTED' && 'Your application was not approved'}
            {affiliate.status === 'SUSPENDED' && 'Your account is suspended'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Please check back later or contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10 pt-24">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Affiliate Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {affiliate.name} · Code: {affiliate.referralCode}</p>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              await fetch('/api/affiliate/logout', { method: 'POST', credentials: 'include' });
              router.push('/affiliate/login');
            }}
          >
            Log out
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Balance', value: stats ? `PKR ${stats.balance.toLocaleString()}` : '—' },
            { label: 'Clicks', value: stats?.clickCount ?? '—' },
            { label: 'Conversions', value: stats?.conversionCount ?? '—' },
            { label: 'Links created', value: stats?.linkCount ?? '—' },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-zinc-900 rounded-xl p-4 shadow-sm border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
              <p className="text-2xl font-semibold mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Create link */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border">
          <h2 className="font-semibold mb-3">Create a link</h2>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Label htmlFor="productQuery">Product (leave blank for a general homepage link)</Label>
              <Input
                id="productQuery"
                placeholder="Search a product…"
                value={selectedProduct ? selectedProduct.productName : query}
                onChange={(e) => {
                  setSelectedProduct(null);
                  setQuery(e.target.value);
                }}
              />
              {results.length > 0 && !selectedProduct && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-zinc-800 border rounded-lg shadow-lg max-h-56 overflow-auto">
                  {results.map((p) => (
                    <button
                      key={p.id}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-muted"
                      onClick={() => {
                        setSelectedProduct(p);
                        setResults([]);
                      }}
                    >
                      {p.productName}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="w-full md:w-56">
              <Label htmlFor="label">Label (optional)</Label>
              <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Instagram bio" />
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreateLink} disabled={creating} className="bg-green-600 hover:bg-green-700">
                {creating ? 'Creating…' : 'Create link'}
              </Button>
            </div>
          </div>
        </div>

        {/* Links table */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border overflow-x-auto">
          <h2 className="font-semibold mb-3">Your links</h2>
          {links.length === 0 ? (
            <p className="text-sm text-muted-foreground">No links yet — create one above.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 pr-4">Link</th>
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Clicks</th>
                  <th className="py-2 pr-4">Conversions</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {links.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-mono">/go/{l.code}</td>
                    <td className="py-2 pr-4">{l.productName || l.label || 'Homepage'}</td>
                    <td className="py-2 pr-4">{l.clickCount}</td>
                    <td className="py-2 pr-4">{l.conversionCount}</td>
                    <td className="py-2 pr-4">
                      <Button size="sm" variant="outline" onClick={() => copyLink(l.code)}>
                        {copiedCode === l.code ? 'Copied!' : 'Copy'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Payout request */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border">
          <h2 className="font-semibold mb-3">Request a payout</h2>
          {(!affiliate.accountTitle || !affiliate.accountNumber || !affiliate.bankName || !affiliate.paymentMethod) && (
            <p className="text-sm text-amber-600 mb-3">
              Add your payout details from your profile before requesting a payout.
            </p>
          )}
          <div className="flex gap-3 items-end">
            <div>
              <Label htmlFor="payoutAmount">Amount</Label>
              <Input
                id="payoutAmount"
                type="number"
                min={0}
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
              />
            </div>
            <Button onClick={handleRequestPayout} className="bg-green-600 hover:bg-green-700">
              Request payout
            </Button>
          </div>
          {payoutMsg && <p className="text-sm mt-2 text-muted-foreground">{payoutMsg}</p>}
        </div>
      </div>
    </div>
  );
}
