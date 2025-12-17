import { PrismaClient } from "@prisma/client";
import { encryptToken, decryptToken } from "./encryption";

const prisma = new PrismaClient();

interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface FacebookDebugTokenResponse {
  data: {
    app_id: string;
    type: string;
    application: string;
    data_access_expires_at: number;
    expires_at: number;
    is_valid: boolean;
    scopes: string[];
    user_id: string;
  };
}

/**
 * Exchange a short-lived token for a long-lived token (60 days)
 */
export async function exchangeForLongLivedToken(
  shortLivedToken: string
): Promise<FacebookTokenResponse> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("Facebook App ID or App Secret not configured");
  }

  const url = new URL("https://graph.facebook.com/v18.0/oauth/access_token");
  url.searchParams.append("grant_type", "fb_exchange_token");
  url.searchParams.append("client_id", appId);
  url.searchParams.append("client_secret", appSecret);
  url.searchParams.append("fb_exchange_token", shortLivedToken);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(
      data.error?.message || "Failed to exchange token"
    );
  }

  return data as FacebookTokenResponse;
}

/**
 * Get token expiration information from Facebook
 */
export async function debugToken(
  accessToken: string
): Promise<FacebookDebugTokenResponse> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("Facebook App ID or App Secret not configured");
  }

  const appAccessToken = `${appId}|${appSecret}`;
  const url = new URL("https://graph.facebook.com/v18.0/debug_token");
  url.searchParams.append("input_token", accessToken);
  url.searchParams.append("access_token", appAccessToken);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(
      data.error?.message || "Failed to debug token"
    );
  }

  return data as FacebookDebugTokenResponse;
}

/**
 * Store or update Facebook token in database
 */
export async function saveFacebookToken(
  accessToken: string,
  pageId: string,
  expiresIn?: number
): Promise<void> {
  const encryptedToken = encryptToken(accessToken);

  // Calculate expiration date (default 60 days if not provided)
  const expirationDays = expiresIn ? expiresIn / (60 * 60 * 24) : 60;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expirationDays);

  await prisma.socialMediaToken.upsert({
    where: { platform: "facebook" },
    update: {
      accessToken: encryptedToken,
      pageId: pageId,
      expiresAt: expiresAt,
      lastRefreshed: new Date(),
      isActive: true,
      errorCount: 0,
      lastError: null,
    },
    create: {
      platform: "facebook",
      accessToken: encryptedToken,
      pageId: pageId,
      expiresAt: expiresAt,
      tokenType: "Bearer",
      isActive: true,
      autoRefresh: true,
      refreshBeforeDays: 5,
    },
  });
}

/**
 * Get Facebook token from database
 */
export async function getFacebookToken(): Promise<{
  accessToken: string;
  pageId: string;
  expiresAt: Date | null;
} | null> {
  const tokenData = await prisma.socialMediaToken.findUnique({
    where: { platform: "facebook" },
  });

  if (!tokenData || !tokenData.isActive) {
    return null;
  }

  return {
    accessToken: decryptToken(tokenData.accessToken),
    pageId: tokenData.pageId || "",
    expiresAt: tokenData.expiresAt,
  };
}

/**
 * Refresh Facebook token if it's about to expire
 */
export async function refreshFacebookTokenIfNeeded(): Promise<boolean> {
  const tokenData = await prisma.socialMediaToken.findUnique({
    where: { platform: "facebook" },
  });

  if (!tokenData || !tokenData.autoRefresh || !tokenData.isActive) {
    return false;
  }

  // Check if token needs refresh
  if (!tokenData.expiresAt) {
    return false;
  }

  const now = new Date();
  const daysUntilExpiry = Math.floor(
    (tokenData.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Refresh if within refreshBeforeDays of expiration
  if (daysUntilExpiry <= tokenData.refreshBeforeDays) {
    try {
      const currentToken = decryptToken(tokenData.accessToken);

      // Exchange for new long-lived token
      const newTokenData = await exchangeForLongLivedToken(currentToken);

      // Get token info to get exact expiration
      const debugInfo = await debugToken(newTokenData.access_token);
      const expiresAt = new Date(debugInfo.data.expires_at * 1000);

      // Save new token
      await saveFacebookToken(
        newTokenData.access_token,
        tokenData.pageId || "",
        newTokenData.expires_in
      );

      console.log(`✅ Facebook token refreshed successfully. Expires: ${expiresAt.toISOString()}`);
      return true;
    } catch (error: any) {
      // Log error and increment error count
      await prisma.socialMediaToken.update({
        where: { platform: "facebook" },
        data: {
          errorCount: { increment: 1 },
          lastError: error.message,
        },
      });

      console.error("❌ Failed to refresh Facebook token:", error.message);
      return false;
    }
  }

  return false;
}

/**
 * Check all tokens and refresh if needed
 */
export async function checkAndRefreshAllTokens(): Promise<void> {
  console.log("🔄 Checking tokens for refresh...");

  const refreshed = await refreshFacebookTokenIfNeeded();

  if (refreshed) {
    console.log("✅ Token refresh completed");
  } else {
    console.log("ℹ️  No tokens needed refresh");
  }
}

/**
 * Get token status for admin dashboard
 */
export async function getTokenStatus() {
  const tokenData = await prisma.socialMediaToken.findUnique({
    where: { platform: "facebook" },
  });

  if (!tokenData) {
    return {
      configured: false,
      isActive: false,
      expiresAt: null,
      daysUntilExpiry: null,
      lastRefreshed: null,
      errorCount: 0,
      lastError: null,
    };
  }

  const now = new Date();
  const daysUntilExpiry = tokenData.expiresAt
    ? Math.floor(
        (tokenData.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return {
    configured: true,
    isActive: tokenData.isActive,
    expiresAt: tokenData.expiresAt,
    daysUntilExpiry,
    lastRefreshed: tokenData.lastRefreshed,
    errorCount: tokenData.errorCount,
    lastError: tokenData.lastError,
    autoRefresh: tokenData.autoRefresh,
  };
}
