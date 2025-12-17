import { NextRequest, NextResponse } from "next/server";
import { refreshFacebookTokenIfNeeded } from "@/lib/social-media/facebook-token";

/**
 * POST /api/social-tokens/facebook/refresh
 * Manually trigger Facebook token refresh
 */
export async function POST(request: NextRequest) {
  try {
    const refreshed = await refreshFacebookTokenIfNeeded();

    if (refreshed) {
      return NextResponse.json({
        success: true,
        message: "Facebook token refreshed successfully",
      });
    } else {
      return NextResponse.json({
        success: true,
        message: "Token does not need refresh yet",
      });
    }
  } catch (error: any) {
    console.error("Facebook token refresh error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to refresh Facebook token",
      },
      { status: 500 }
    );
  }
}
