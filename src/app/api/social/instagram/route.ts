import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    const formData = await request.formData();
    const content = formData.get("content") as string;
    const image = formData.get("image") as File | null;

    // Validate environment variables
    const businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

    if (!businessAccountId || !accessToken) {
      return NextResponse.json(
        { success: false, error: "Instagram API credentials not configured" },
        { status: 500 }
      );
    }

    // Instagram requires an image
    if (!image) {
      return NextResponse.json(
        { success: false, error: "Instagram requires an image to post" },
        { status: 400 }
      );
    }

    // Step 1: Save image temporarily and create a publicly accessible URL
    // Note: In production, you should use a proper file hosting service (S3, Cloudinary, etc.)
    // This is a simplified approach using the Next.js public folder
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `instagram-${timestamp}-${image.name}`;
    tempFilePath = join(process.cwd(), "public", "temp", filename);

    // Ensure temp directory exists and save file
    await writeFile(tempFilePath, buffer);

    // Construct public URL (you'll need to update this with your actual domain)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const imageUrl = `${baseUrl}/temp/${filename}`;

    // Step 2: Create media container
    const containerParams = new URLSearchParams({
      image_url: imageUrl,
      caption: content || "",
      access_token: accessToken,
    });

    const containerResponse = await fetch(
      `https://graph.facebook.com/v18.0/${businessAccountId}/media?${containerParams}`,
      { method: "POST" }
    );

    const containerData = await containerResponse.json();

    if (!containerResponse.ok) {
      console.error("Instagram container creation error:", containerData);
      return NextResponse.json(
        {
          success: false,
          error: containerData.error?.message || "Failed to create Instagram media container",
        },
        { status: containerResponse.status }
      );
    }

    const creationId = containerData.id;

    // Step 3: Publish the media container
    const publishParams = new URLSearchParams({
      creation_id: creationId,
      access_token: accessToken,
    });

    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${businessAccountId}/media_publish?${publishParams}`,
      { method: "POST" }
    );

    const publishData = await publishResponse.json();

    if (!publishResponse.ok) {
      console.error("Instagram publish error:", publishData);
      return NextResponse.json(
        {
          success: false,
          error: publishData.error?.message || "Failed to publish to Instagram",
        },
        { status: publishResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      postId: publishData.id,
      message: "Successfully posted to Instagram",
    });
  } catch (error: any) {
    console.error("Instagram API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  } finally {
    // Clean up temporary file
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
      } catch (err) {
        console.error("Failed to delete temporary file:", err);
      }
    }
  }
}
