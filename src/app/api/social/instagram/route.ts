import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/social-media/encryption";
import { uploadImage } from "@/lib/cloudinary";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const content = formData.get("content") as string;
    const mediaCount = parseInt(formData.get("mediaCount") as string) || 0;

    // Get the first media file (Instagram API route currently handles single image)
    const image = formData.get("media_0") as File | null;

    // Fetch Instagram credentials from database
    const instagramToken = await prisma.socialMediaToken.findUnique({
      where: { platform: "instagram" },
    });

    if (!instagramToken || !instagramToken.isActive) {
      return NextResponse.json(
        { success: false, error: "Instagram credentials not configured or inactive" },
        { status: 500 }
      );
    }

    const businessAccountId = instagramToken.accountId;
    const accessToken = decryptToken(instagramToken.accessToken);

    if (!businessAccountId || !accessToken) {
      return NextResponse.json(
        { success: false, error: "Instagram API credentials not configured" },
        { status: 500 }
      );
    }

    // Instagram requires an image
    if (!image || mediaCount === 0) {
      return NextResponse.json(
        { success: false, error: "Instagram requires an image to post" },
        { status: 400 }
      );
    }

    // Step 1: Upload image to Cloudinary
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const cloudinaryResult = await uploadImage(
      buffer,
      "social-media/instagram",
      image.name
    );

    const imageUrl = cloudinaryResult.secure_url;

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
  }
}
