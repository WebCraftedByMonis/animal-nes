import { NextRequest, NextResponse } from "next/server";
import { checkAndRefreshAllTokens } from "@/lib/social-media/facebook-token";

/**
 * GET /api/cron/refresh-tokens
 * Cron job endpoint to automatically check and refresh tokens
 *
 * Security: In production, protect this endpoint with a secret key
 * Example using Vercel Cron: https://vercel.com/docs/cron-jobs
 * Or use services like: https://cron-job.org, EasyCron, etc.
 *
 * Recommended schedule: Run daily at 2 AM
 * Cron expression: 0 2 * * *
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended for security)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("🔄 Cron job started: Checking tokens...");

    await checkAndRefreshAllTokens();

    console.log("✅ Cron job completed successfully");

    return NextResponse.json({
      success: true,
      message: "Token refresh check completed",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ Cron job failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Token refresh failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
