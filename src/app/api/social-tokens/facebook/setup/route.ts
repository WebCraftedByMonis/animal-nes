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

    // Exchange for long-lived token
    const tokenData = await exchangeForLongLivedToken(shortLivedToken);

    // Get token expiration info
    const debugInfo = await debugToken(tokenData.access_token);

    // Save to database
    await saveFacebookToken(
      tokenData.access_token,
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
