import { NextRequest, NextResponse } from "next/server";
import { TwitterApi } from "twitter-api-v2";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const content = formData.get("content") as string;
    const image = formData.get("image") as File | null;

    // Validate environment variables
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      return NextResponse.json(
        { success: false, error: "Twitter API credentials not configured" },
        { status: 500 }
      );
    }

    // Validate content length (280 characters for Twitter)
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Content is required" },
        { status: 400 }
      );
    }

    if (content.length > 280) {
      return NextResponse.json(
        { success: false, error: "Content exceeds 280 characters" },
        { status: 400 }
      );
    }

    // Initialize Twitter client
    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessSecret,
    });

    let mediaId: string | undefined;

    // Upload image if provided
    if (image) {
      try {
        // Convert File to Buffer
        const arrayBuffer = await image.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload media to Twitter
        mediaId = await client.v1.uploadMedia(buffer, {
          mimeType: image.type,
        });
      } catch (error) {
        console.error("Twitter media upload error:", error);
        return NextResponse.json(
          { success: false, error: "Failed to upload image to Twitter" },
          { status: 500 }
        );
      }
    }

    // Create tweet
    try {
      const tweetData: any = {
        text: content,
      };

      // Add media if uploaded
      if (mediaId) {
        tweetData.media = {
          media_ids: [mediaId],
        };
      }

      const tweet = await client.v2.tweet(tweetData);

      return NextResponse.json({
        success: true,
        tweetId: tweet.data.id,
        message: "Successfully posted to Twitter",
      });
    } catch (error: any) {
      console.error("Twitter tweet creation error:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to create tweet",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Twitter API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
