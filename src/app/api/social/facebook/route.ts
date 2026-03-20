import { NextRequest, NextResponse } from "next/server";
import { getFacebookToken } from "@/lib/social-media/facebook-token";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const content = formData.get("content") as string;
    const link = formData.get("link") as string | null;
    const image = formData.get("image") as File | null;
    const imageUrl = formData.get("imageUrl") as string | null;

    // Get token from database (with fallback to environment variables)
    let pageId: string;
    let accessToken: string;

    const dbToken = await getFacebookToken();

    if (dbToken && dbToken.accessToken && dbToken.pageId) {
      // Use token from database
      pageId = dbToken.pageId;
      accessToken = dbToken.accessToken;
    } else {
      // Fallback to environment variables
      const envPageId = process.env.FACEBOOK_PAGE_ID;
      const envAccessToken = process.env.FACEBOOK_ACCESS_TOKEN;

      if (!envPageId || !envAccessToken) {
        return NextResponse.json(
          { success: false, error: "Facebook API credentials not configured. Please set up tokens in admin dashboard." },
          { status: 500 }
        );
      }

      pageId = envPageId;
      accessToken = envAccessToken;
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Content is required" },
        { status: 400 }
      );
    }

    let postId: string;
    let endpoint: string;
    let body: FormData;

    if (image) {
      // Photo upload post — link appended to caption as text (photos endpoint doesn't support link preview)
      endpoint = `https://graph.facebook.com/v18.0/${pageId}/photos`;

      const arrayBuffer = await image.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: image.type });
      const caption = link ? `${content}\n\n${link}` : content;

      body = new FormData();
      body.append("source", blob, image.name);
      body.append("message", caption);
      body.append("access_token", accessToken);
    } else if (link) {
      // Link post — Facebook generates a clickable rich preview card from the URL's OG tags.
      // Clicking the card takes users to the product page.
      endpoint = `https://graph.facebook.com/v18.0/${pageId}/feed`;

      body = new FormData();
      body.append("message", content);
      body.append("link", link);
      body.append("access_token", accessToken);
    } else if (imageUrl) {
      // Image URL post (no link) — post photo via URL
      endpoint = `https://graph.facebook.com/v18.0/${pageId}/photos`;

      body = new FormData();
      body.append("url", imageUrl);
      body.append("message", content);
      body.append("access_token", accessToken);
    } else {
      // Text-only post
      endpoint = `https://graph.facebook.com/v18.0/${pageId}/feed`;

      body = new FormData();
      body.append("message", content);
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
