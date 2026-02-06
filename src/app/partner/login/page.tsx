'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function PartnerLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/partner/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/partner/dashboard');
        router.refresh();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/partner/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetSuccess(true);
        setNewPassword(data.newPassword);
        setError('');
      } else {
        setError(data.error || 'Password reset failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setResetSuccess(false);
    setForgotPasswordEmail('');
    setNewPassword('');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-zinc-900 dark:to-zinc-800">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-xl border border-gray-200 dark:border-zinc-700">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.jpg"
              alt="Animal Wellness Logo"
              width={120}
              height={40}
              className="object-contain"
            />
          </div>
          <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Partner Dashboard
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {showForgotPassword
              ? 'Reset your password'
              : 'Sign in to manage your products and profile'}
          </p>
        </div>

        {!showForgotPassword ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-zinc-600 placeholder-gray-400 text-gray-900 dark:text-gray-100 dark:bg-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="partner@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-zinc-600 placeholder-gray-400 text-gray-900 dark:text-gray-100 dark:bg-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                Forgot Password?
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-8 space-y-6">
            {!resetSuccess ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    id="reset-email"
                    name="reset-email"
                    type="email"
                    required
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-zinc-600 placeholder-gray-400 text-gray-900 dark:text-gray-100 dark:bg-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    placeholder="Enter your email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                    <div className="text-sm text-red-800">{error}</div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-green-900 dark:text-green-300 mb-2">
                      Password Reset Successful!
                    </h3>
                    <p className="text-sm text-green-800 dark:text-green-400 mb-4">
                      Your new password is:
                    </p>
                    <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 border-2 border-green-300 dark:border-green-700">
                      <p className="text-2xl font-bold text-green-700 dark:text-green-400 font-mono">
                        {newPassword}
                      </p>
                    </div>
                    <p className="text-xs text-green-700 dark:text-green-400 mt-4">
                      Please save this password and use it to log in.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleBackToLogin}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors shadow-md hover:shadow-lg"
                >
                  Back to Login
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
