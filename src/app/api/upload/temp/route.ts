import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const TEMP_DIR = path.join(process.cwd(), "public", "temp");

// Ensure temp directory exists
async function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true });
  }
}

// POST: Upload temporary file
export async function POST(request: NextRequest) {
  try {
    await ensureTempDir();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const extension = file.name.split(".").pop();
    const filename = `${timestamp}-${random}.${extension}`;

    // Convert file to buffer and save
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filePath = path.join(TEMP_DIR, filename);
    await writeFile(filePath, buffer);

    // Get base URL from environment or request
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    // Remove trailing slash
    const cleanBaseUrl = baseUrl.replace(/\/$/, "");

    // Return publicly accessible URL
    const publicUrl = `${cleanBaseUrl}/temp/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: filename,
    });
  } catch (error: any) {
    console.error("Temp file upload error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Remove temporary file
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename } = body;

    if (!filename) {
      return NextResponse.json(
        { success: false, error: "Filename required" },
        { status: 400 }
      );
    }

    // Security: Prevent path traversal
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return NextResponse.json(
        { success: false, error: "Invalid filename" },
        { status: 400 }
      );
    }

    const filePath = path.join(TEMP_DIR, filename);

    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error: any) {
    console.error("Temp file deletion error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Optional: Cleanup old files (call this periodically via cron job)
export async function GET(request: NextRequest) {
  try {
    await ensureTempDir();

    const { readdir, stat } = await import("fs/promises");
    const files = await readdir(TEMP_DIR);

    const MAX_AGE = 60 * 60 * 1000; // 1 hour in milliseconds
    const now = Date.now();
    let deleted = 0;

    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const stats = await stat(filePath);
      const age = now - stats.mtimeMs;

      if (age > MAX_AGE) {
        await unlink(filePath);
        deleted++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deleted} old files`,
      deleted,
    });
  } catch (error: any) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
