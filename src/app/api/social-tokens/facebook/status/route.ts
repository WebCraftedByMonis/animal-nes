import { NextRequest, NextResponse } from "next/server";
import { getTokenStatus } from "@/lib/social-media/facebook-token";

/**
 * GET /api/social-tokens/facebook/status
 * Get Facebook token status
 */
export async function GET(request: NextRequest) {
  try {
    const status = await getTokenStatus();

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error: any) {
    console.error("Facebook token status error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to get token status",
      },
      { status: 500 }
    );
  }
}
