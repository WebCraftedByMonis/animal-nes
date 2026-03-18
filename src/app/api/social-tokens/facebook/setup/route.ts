import { NextRequest, NextResponse } from "next/server";
import {
  exchangeForLongLivedToken,
  debugToken,
  saveFacebookToken,
} from "@/lib/social-media/facebook-token";

/**
 * POST /api/social-tokens/facebook/setup
 * Initial setup of Facebook token from a short-lived token
 */
export async function POST(request: NextRequest) {
  try {
    const { shortLivedToken, pageId } = await request.json();

    if (!shortLivedToken || !pageId) {
      return NextResponse.json(
        { success: false, error: "Short-lived token and Page ID are required" },
        { status: 400 }
      );
    }

    // Exchange for long-lived user token
    const tokenData = await exchangeForLongLivedToken(shortLivedToken);

    // Fetch the Page Access Token for this specific page using /me/accounts
    const accountsUrl = new URL("https://graph.facebook.com/v18.0/me/accounts");
    accountsUrl.searchParams.append("access_token", tokenData.access_token);
    const accountsRes = await fetch(accountsUrl.toString());
    const accountsData = await accountsRes.json();

    if (!accountsRes.ok || accountsData.error) {
      throw new Error(
        accountsData.error?.message ||
          "Failed to fetch page accounts. Make sure pages_read_engagement and pages_manage_posts permissions are granted."
      );
    }

    const page = (accountsData.data as Array<{ id: string; access_token: string }>).find(
      (p) => p.id === pageId
    );

    if (!page) {
      throw new Error(
        `Page ID ${pageId} not found in your accounts. Make sure you are an admin of this page and the correct Page ID is used.`
      );
    }

    // page.access_token is a Page Access Token (never expires when derived from a long-lived user token)
    const pageAccessToken = page.access_token;

    // Get token expiration info (debug the user token for expiry reference)
    const debugInfo = await debugToken(tokenData.access_token);

    // Save the Page Access Token (not the user token) to the database
    await saveFacebookToken(
      pageAccessToken,
      pageId,
      tokenData.expires_in
    );

    const expiresAt = new Date(debugInfo.data.expires_at * 1000);

    return NextResponse.json({
      success: true,
      message: "Facebook token configured successfully",
      expiresAt: expiresAt.toISOString(),
      expiresInDays: Math.floor(
        (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ),
    });
  } catch (error: any) {
    console.error("Facebook token setup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to set up Facebook token",
      },
      { status: 500 }
    );
  }
}
