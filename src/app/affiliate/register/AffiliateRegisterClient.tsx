'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AffiliateRegisterClient() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    paymentMethod: '',
    bankName: '',
    accountTitle: '',
    accountNumber: '',
  });
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/affiliate/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data.error || (data.errors ? data.errors[0]?.message : 'Registration failed'));
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-zinc-900 dark:to-zinc-800 px-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
          <h1 className="text-xl font-semibold mb-2">Application submitted</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your affiliate account is pending admin approval. We&apos;ll let you know once it&apos;s
            approved — then you can log in and start generating links.
          </p>
          <Link href="/affiliate/login">
            <Button className="w-full bg-green-600 hover:bg-green-700">Go to Affiliate Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-zinc-900 dark:to-zinc-800 px-4 py-12">
      <div className="max-w-lg w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold mb-1">Become an Affiliate</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Promote our products with your own trackable links and earn a commission on every sale.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" required value={formData.name} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required minLength={6} value={formData.password} onChange={handleChange} />
          </div>

          <div className="border-t pt-4 mt-2">
            <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              Payout details (optional, can add later)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="paymentMethod">Payment method</Label>
                <Input id="paymentMethod" name="paymentMethod" placeholder="bank_transfer / jazzcash / easypaisa" value={formData.paymentMethod} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="bankName">Bank / provider</Label>
                <Input id="bankName" name="bankName" value={formData.bankName} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="accountTitle">Account title</Label>
                <Input id="accountTitle" name="accountTitle" value={formData.accountTitle} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="accountNumber">Account number</Label>
                <Input id="accountNumber" name="accountNumber" value={formData.accountNumber} onChange={handleChange} />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
            {loading ? 'Submitting…' : 'Submit Application'}
          </Button>
        </form>

        <p className="text-sm text-center text-muted-foreground mt-6">
          Already an affiliate?{' '}
          <Link href="/affiliate/login" className="text-green-600 font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
