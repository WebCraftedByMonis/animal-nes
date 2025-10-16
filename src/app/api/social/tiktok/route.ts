import { NextRequest, NextResponse } from "next/server";

const TIKTOK_API_BASE = "https://open.tiktokapis.com";
const MAX_VIDEO_SIZE = 4 * 1024 * 1024 * 1024; // 4GB
const MAX_DURATION_SECONDS = 600; // 10 minutes
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks for upload

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const content = formData.get("content") as string;
    const mediaCount = parseInt(formData.get("mediaCount") as string) || 0;

    // Validate environment variables
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    const accessToken = process.env.TIKTOK_ACCESS_TOKEN;

    if (!clientKey || !clientSecret || !accessToken) {
      return NextResponse.json(
        { success: false, error: "TikTok API credentials not configured" },
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

    // Collect all media files
    const mediaFiles: { file: File; type: string }[] = [];
    for (let i = 0; i < mediaCount; i++) {
      const file = formData.get(`media_${i}`) as File | null;
      const type = formData.get(`media_${i}_type`) as string | null;
      if (file && type) {
        mediaFiles.push({ file, type });
      }
    }

    // TikTok requires video content
    const videos = mediaFiles.filter((m) => m.type === "video");

    if (videos.length === 0) {
      return NextResponse.json(
        { success: false, error: "TikTok requires at least one video. Please add a video to post to TikTok." },
        { status: 400 }
      );
    }

    // TikTok supports only one video per post
    if (videos.length > 1) {
      return NextResponse.json(
        { success: false, error: "TikTok supports only one video per post" },
        { status: 400 }
      );
    }

    const video = videos[0].file;

    // Validate video format
    const supportedFormats = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"];
    if (!supportedFormats.includes(video.type)) {
      return NextResponse.json(
        { success: false, error: "TikTok supports MP4, MOV, AVI, and WebM video formats only" },
        { status: 400 }
      );
    }

    // Validate video size
    if (video.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { success: false, error: "Video size must be less than 4GB" },
        { status: 400 }
      );
    }

    // Validate video duration (would require additional processing, skip for now)
    // In production, you might want to use a library like fluent-ffmpeg to check duration

    // Extract hashtags from content and prepare description
    const description = prepareDescription(content);

    // Step 1: Initialize video upload
    const initData = await initializeVideoUpload(accessToken);

    if (!initData.publish_id || !initData.upload_url) {
      throw new Error("Failed to initialize video upload");
    }

    // Step 2: Upload video
    await uploadVideoChunks(initData.upload_url, video);

    // Step 3: Publish the video
    const publishResult = await publishVideo(
      accessToken,
      initData.publish_id,
      description
    );

    return NextResponse.json({
      success: true,
      postId: publishResult.publish_id,
      shareUrl: publishResult.share_url,
      message: "Successfully posted to TikTok",
    });
  } catch (error: any) {
    console.error("TikTok API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Step 1: Initialize video upload to creator's inbox
async function initializeVideoUpload(accessToken: string) {
  const payload = {
    source_info: {
      source: "FILE_UPLOAD",
      video_size: 0, // Will be set during actual upload
      chunk_size: CHUNK_SIZE,
    },
  };

  const response = await fetch(
    `${TIKTOK_API_BASE}/v2/post/publish/inbox/video/init/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    console.error("TikTok init error:", data);
    throw new Error(data.error?.message || "Failed to initialize video upload");
  }

  return {
    publish_id: data.data?.publish_id,
    upload_url: data.data?.upload_url,
  };
}

// Step 2: Upload video in chunks
async function uploadVideoChunks(uploadUrl: string, videoFile: File) {
  const arrayBuffer = await videoFile.arrayBuffer();
  const totalSize = arrayBuffer.byteLength;
  const numChunks = Math.ceil(totalSize / CHUNK_SIZE);

  for (let i = 0; i < numChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunk = arrayBuffer.slice(start, end);

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": videoFile.type || "video/mp4",
        "Content-Range": `bytes ${start}-${end - 1}/${totalSize}`,
        "Content-Length": chunk.byteLength.toString(),
      },
      body: chunk,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Chunk ${i + 1}/${numChunks} upload failed:`, errorText);
      throw new Error(`Failed to upload video chunk ${i + 1}/${numChunks}`);
    }
  }

  return true;
}

// Step 3: Publish the video with description
async function publishVideo(
  accessToken: string,
  publishId: string,
  description: string
) {
  const payload = {
    post_info: {
      title: description.slice(0, 150), // TikTok title max 150 chars
      description: description.slice(0, 2200), // TikTok description max 2200 chars
      privacy_level: "SELF_ONLY", // Options: PUBLIC_TO_EVERYONE, MUTUAL_FOLLOW_FRIENDS, SELF_ONLY, FOLLOWER_OF_CREATOR
      disable_duet: false,
      disable_comment: false,
      disable_stitch: false,
      video_cover_timestamp_ms: 1000, // Cover frame at 1 second
    },
    source_info: {
      source: "FILE_UPLOAD",
      publish_id: publishId,
    },
  };

  const response = await fetch(
    `${TIKTOK_API_BASE}/v2/post/publish/video/init/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    console.error("TikTok publish error:", data);
    throw new Error(data.error?.message || "Failed to publish video");
  }

  return {
    publish_id: data.data?.publish_id,
    share_url: data.data?.share_url || "",
  };
}

// Helper function to prepare description with hashtags
function prepareDescription(content: string): string {
  // TikTok descriptions can include hashtags
  // If content doesn't have hashtags, keep as is
  // TikTok will automatically parse hashtags from text

  // Remove extra whitespace and normalize
  const normalized = content.trim().replace(/\s+/g, " ");

  // TikTok supports up to 2200 characters
  return normalized.slice(0, 2200);
}

// Alternative: Direct video publishing (simplified approach)
// Some TikTok API versions support direct upload
async function publishVideoDirectly(
  accessToken: string,
  videoFile: File,
  description: string
) {
  const formData = new FormData();

  const arrayBuffer = await videoFile.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: videoFile.type });

  formData.append("video", blob, videoFile.name);
  formData.append("description", description);

  const response = await fetch(
    `${TIKTOK_API_BASE}/v2/post/publish/content/init/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    console.error("TikTok direct publish error:", data);
    throw new Error(data.error?.message || "Failed to publish video");
  }

  return {
    publish_id: data.data?.publish_id,
    share_url: data.data?.share_url || "",
  };
}
