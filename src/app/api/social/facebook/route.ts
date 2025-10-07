import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const content = formData.get("content") as string;
    const link = formData.get("link") as string | null;
    const image = formData.get("image") as File | null;

    // Validate environment variables
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

    if (!pageId || !accessToken) {
      return NextResponse.json(
        { success: false, error: "Facebook API credentials not configured" },
        { status: 500 }
      );
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Content is required" },
        { status: 400 }
      );
    }

    // Prepare message with link if provided
    let message = content;
    if (link) {
      message = `${content}\n\n${link}`;
    }

    let postId: string;
    let endpoint: string;
    let body: FormData;

    if (image) {
      // Post with image to /{page-id}/photos
      endpoint = `https://graph.facebook.com/v18.0/${pageId}/photos`;

      // Convert File to Blob for Facebook API
      const arrayBuffer = await image.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: image.type });

      body = new FormData();
      body.append("source", blob, image.name);
      body.append("message", message);
      body.append("access_token", accessToken);
    } else {
      // Text-only post to /{page-id}/feed
      endpoint = `https://graph.facebook.com/v18.0/${pageId}/feed`;

      body = new FormData();
      body.append("message", message);
      body.append("access_token", accessToken);
    }

    // Make request to Facebook Graph API
    const response = await fetch(endpoint, {
      method: "POST",
      body: body,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Facebook API error:", data);
      return NextResponse.json(
        {
          success: false,
          error: data.error?.message || "Failed to post to Facebook",
        },
        { status: response.status }
      );
    }

    // Facebook returns { id: "page-id_post-id" } or { id: "photo-id", post_id: "page-id_post-id" }
    postId = data.post_id || data.id;

    return NextResponse.json({
      success: true,
      postId: postId,
      message: "Successfully posted to Facebook",
    });
  } catch (error: any) {
    console.error("Facebook API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
