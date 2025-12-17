"use client";

import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";

interface TokenStatus {
  configured: boolean;
  isActive: boolean;
  expiresAt: string | null;
  daysUntilExpiry: number | null;
  lastRefreshed: string | null;
  errorCount: number;
  lastError: string | null;
  autoRefresh: boolean;
}

export default function SocialTokensPage() {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [setupMode, setSetupMode] = useState(false);

  // Setup form state
  const [shortLivedToken, setShortLivedToken] = useState("");
  const [pageId, setPageId] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupSuccess, setSetupSuccess] = useState(false);

  useEffect(() => {
    fetchTokenStatus();
  }, []);

  const fetchTokenStatus = async () => {
    try {
      const response = await fetch("/api/social-tokens/facebook/status");
      const data = await response.json();

      if (data.success) {
        setTokenStatus(data.status);
      }
    } catch (error) {
      console.error("Failed to fetch token status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/social-tokens/facebook/refresh", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        await fetchTokenStatus();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert("Failed to refresh token");
    } finally {
      setRefreshing(false);
    }
  };

  const handleSetupToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);
    setSetupSuccess(false);
    setRefreshing(true);

    try {
      const response = await fetch("/api/social-tokens/facebook/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortLivedToken, pageId }),
      });

      const data = await response.json();

      if (data.success) {
        setSetupSuccess(true);
        setShortLivedToken("");
        setPageId("");
        setSetupMode(false);
        await fetchTokenStatus();
      } else {
        setSetupError(data.error);
      }
    } catch (error: any) {
      setSetupError(error.message || "Failed to set up token");
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = () => {
    if (!tokenStatus?.configured) return "gray";
    if (tokenStatus.daysUntilExpiry === null) return "gray";
    if (tokenStatus.daysUntilExpiry <= 5) return "red";
    if (tokenStatus.daysUntilExpiry <= 15) return "yellow";
    return "green";
  };

  const getStatusIcon = () => {
    const color = getStatusColor();
    switch (color) {
      case "green":
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case "yellow":
        return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case "red":
        return <XCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Info className="w-6 h-6 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Social Media Token Management</h1>

      {/* Facebook Token Status Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👤</span>
            <h2 className="text-xl font-semibold">Facebook Access Token</h2>
          </div>
          {getStatusIcon()}
        </div>

        {tokenStatus?.configured ? (
          <div className="space-y-3">
            {/* Status Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-medium">
                  {tokenStatus.isActive ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-red-600">Inactive</span>
                  )}
                </p>
              </div>

              {tokenStatus.expiresAt && (
                <div>
                  <p className="text-sm text-gray-600">Expires At</p>
                  <p className="font-medium">
                    {new Date(tokenStatus.expiresAt).toLocaleDateString()}
                  </p>
                </div>
              )}

              {tokenStatus.daysUntilExpiry !== null && (
                <div>
                  <p className="text-sm text-gray-600">Days Until Expiry</p>
                  <p
                    className={`font-medium ${
                      tokenStatus.daysUntilExpiry <= 5
                        ? "text-red-600"
                        : tokenStatus.daysUntilExpiry <= 15
                        ? "text-yellow-600"
                        : "text-green-600"
                    }`}
                  >
                    {tokenStatus.daysUntilExpiry} days
                  </p>
                </div>
              )}

              {tokenStatus.lastRefreshed && (
                <div>
                  <p className="text-sm text-gray-600">Last Refreshed</p>
                  <p className="font-medium">
                    {new Date(tokenStatus.lastRefreshed).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600">Auto-Refresh</p>
                <p className="font-medium">
                  {tokenStatus.autoRefresh ? (
                    <span className="text-green-600">Enabled</span>
                  ) : (
                    <span className="text-gray-600">Disabled</span>
                  )}
                </p>
              </div>

              {tokenStatus.errorCount > 0 && (
                <div>
                  <p className="text-sm text-gray-600">Error Count</p>
                  <p className="font-medium text-red-600">{tokenStatus.errorCount}</p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {tokenStatus.lastError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Last Error:</strong> {tokenStatus.lastError}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleRefreshToken}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Refresh Token Now"}
              </button>

              <button
                onClick={() => setSetupMode(true)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Update Token
              </button>
            </div>

            {/* Info Box */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p>
                    <strong>Automatic Refresh:</strong> Your token will be automatically
                    refreshed 5 days before expiration.
                  </p>
                  <p className="mt-1">
                    No action needed unless you see errors above.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">
              Facebook token is not configured. Click below to set it up.
            </p>
            <button
              onClick={() => setSetupMode(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Set Up Facebook Token
            </button>
          </div>
        )}
      </div>

      {/* Setup Form Modal */}
      {setupMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                Set Up Facebook Access Token
              </h2>

              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                  <li>
                    Go to{" "}
                    <a
                      href="https://developers.facebook.com/tools/explorer/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium"
                    >
                      Facebook Graph API Explorer
                    </a>
                  </li>
                  <li>Select your app from the dropdown</li>
                  <li>Click "Get Page Access Token"</li>
                  <li>Choose your Facebook Page</li>
                  <li>
                    Request permissions: <code className="bg-blue-100 px-1">pages_manage_posts</code>
                  </li>
                  <li>Click "Generate Access Token"</li>
                  <li>Copy the token and paste it below</li>
                  <li>Also get your Page ID from your Facebook Page</li>
                </ol>
              </div>

              <form onSubmit={handleSetupToken} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Short-Lived Access Token
                  </label>
                  <textarea
                    value={shortLivedToken}
                    onChange={(e) => setShortLivedToken(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Paste your short-lived token here..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Facebook Page ID
                  </label>
                  <input
                    type="text"
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your Facebook Page ID"
                    required
                  />
                </div>

                {setupError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                    {setupError}
                  </div>
                )}

                {setupSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                    Token set up successfully! It will automatically refresh every 60 days.
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={refreshing}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {refreshing ? "Setting Up..." : "Set Up Token"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSetupMode(false);
                      setSetupError(null);
                      setSetupSuccess(false);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* How It Works Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">How Auto-Refresh Works</h2>

        <div className="space-y-4 text-sm text-gray-700">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 font-semibold">1</span>
            </div>
            <div>
              <p className="font-medium">Initial Setup</p>
              <p className="text-gray-600">
                You provide a short-lived token (lasts ~1 hour), which is automatically
                exchanged for a long-lived token (lasts ~60 days).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 font-semibold">2</span>
            </div>
            <div>
              <p className="font-medium">Automatic Monitoring</p>
              <p className="text-gray-600">
                A cron job runs daily to check if your token needs refreshing (5 days
                before expiration).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 font-semibold">3</span>
            </div>
            <div>
              <p className="font-medium">Auto-Refresh</p>
              <p className="text-gray-600">
                When needed, the system automatically exchanges your current token for a
                new one, keeping it fresh indefinitely.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 font-semibold">4</span>
            </div>
            <div>
              <p className="font-medium">Secure Storage</p>
              <p className="text-gray-600">
                Tokens are encrypted in the database using AES-256-GCM encryption for
                maximum security.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
