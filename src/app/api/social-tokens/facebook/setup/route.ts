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

    // Get the Page Access Token directly from the page ID.
    // This avoids /me/accounts (which needs pages_show_list permission).
    // Only requires pages_read_engagement + pages_manage_posts.
    const pageTokenUrl = new URL(`https://graph.facebook.com/v18.0/${pageId}`);
    pageTokenUrl.searchParams.append("fields", "access_token,instagram_business_account");
    pageTokenUrl.searchParams.append("access_token", tokenData.access_token);
    const pageTokenRes = await fetch(pageTokenUrl.toString());
    const pageTokenData = await pageTokenRes.json();

    if (!pageTokenRes.ok || pageTokenData.error) {
      throw new Error(
        pageTokenData.error?.message ||
          "Failed to fetch page token. Make sure pages_read_engagement and pages_manage_posts permissions are granted."
      );
    }

    if (!pageTokenData.access_token) {
      throw new Error(
        "Could not get Page Access Token. Make sure you are an admin of this page and the correct Page ID is used."
      );
    }

    const pageAccessToken: string = pageTokenData.access_token;

    // Instagram Business Account ID comes from the same call above
    const instagramAccountId: string | undefined = pageTokenData?.instagram_business_account?.id;

    if (instagramAccountId) {
      console.log("✅ Found Instagram Business Account ID:", instagramAccountId);
    } else {
      console.log("ℹ️  No Instagram Business Account linked to this Facebook Page");
    }

    // Get token expiration info (debug the user token for expiry reference)
    const debugInfo = await debugToken(tokenData.access_token);

    // Save the Page Access Token + Instagram account ID to the database
    await saveFacebookToken(
      pageAccessToken,
      pageId,
      tokenData.expires_in,
      instagramAccountId
    );

    const expiresAt = new Date(debugInfo.data.expires_at * 1000);

    return NextResponse.json({
      success: true,
      message: instagramAccountId
        ? "Facebook and Instagram tokens configured successfully"
        : "Facebook token configured successfully (no Instagram Business Account found on this page)",
      expiresAt: expiresAt.toISOString(),
      expiresInDays: Math.floor(
        (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ),
      instagramLinked: !!instagramAccountId,
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
