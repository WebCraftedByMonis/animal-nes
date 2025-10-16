import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const content = formData.get("content") as string;
    const mediaCount = parseInt(formData.get("mediaCount") as string) || 0;

    // Validate environment variables
    const accessToken = process.env.PINTEREST_ACCESS_TOKEN;
    const boardId = process.env.PINTEREST_BOARD_ID;

    if (!accessToken || !boardId) {
      return NextResponse.json(
        { success: false, error: "Pinterest API credentials not configured" },
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

    // Pinterest requires at least one media file
    if (mediaFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one image or video is required for Pinterest" },
        { status: 400 }
      );
    }

    // Prepare title and description
    const title = content.slice(0, 100); // Pinterest title max 100 chars
    const description = content.slice(0, 500); // Pinterest description max 500 chars

    // Separate images and videos
    const images = mediaFiles.filter((m) => m.type === "image");
    const videos = mediaFiles.filter((m) => m.type === "video");

    // Pinterest doesn't support mixed media posts
    if (images.length > 0 && videos.length > 0) {
      return NextResponse.json(
        { success: false, error: "Pinterest doesn't support mixed image and video posts" },
        { status: 400 }
      );
    }

    let pinId: string;

    if (videos.length > 0) {
      // Post video pin (only single video supported)
      if (videos.length > 1) {
        return NextResponse.json(
          { success: false, error: "Pinterest supports only one video per pin" },
          { status: 400 }
        );
      }

      const video = videos[0];

      // Validate video size (2GB max)
      const maxVideoSize = 2 * 1024 * 1024 * 1024; // 2GB
      if (video.file.size > maxVideoSize) {
        return NextResponse.json(
          { success: false, error: "Video size must be less than 2GB" },
          { status: 400 }
        );
      }

      pinId = await createVideoPinByUrl(
        accessToken,
        boardId,
        title,
        description,
        video.file
      );
    } else if (images.length === 1) {
      // Single image pin
      pinId = await createImagePinByBase64(
        accessToken,
        boardId,
        title,
        description,
        images[0].file
      );
    } else {
      // Multiple images - create carousel pin
      pinId = await createCarouselPin(
        accessToken,
        boardId,
        title,
        description,
        images.map((img) => img.file)
      );
    }

    return NextResponse.json({
      success: true,
      pinId: pinId,
      message: "Successfully posted to Pinterest",
    });
  } catch (error: any) {
    console.error("Pinterest API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Create a single image pin using base64
async function createImagePinByBase64(
  accessToken: string,
  boardId: string,
  title: string,
  description: string,
  imageFile: File
): Promise<string> {
  // Convert image to base64
  const arrayBuffer = await imageFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64Image = buffer.toString("base64");
  const contentType = imageFile.type || "image/jpeg";

  const payload = {
    board_id: boardId,
    title: title,
    description: description,
    media_source: {
      source_type: "image_base64",
      content_type: contentType,
      data: base64Image,
    },
  };

  const response = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Pinterest API error:", data);
    throw new Error(data.message || "Failed to create pin");
  }

  return data.id;
}

// Create a carousel pin with multiple images
async function createCarouselPin(
  accessToken: string,
  boardId: string,
  title: string,
  description: string,
  imageFiles: File[]
): Promise<string> {
  // Convert all images to base64
  const mediaItems = await Promise.all(
    imageFiles.map(async (file) => {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Image = buffer.toString("base64");
      const contentType = file.type || "image/jpeg";

      return {
        title: title,
        description: description,
        media_source: {
          source_type: "image_base64",
          content_type: contentType,
          data: base64Image,
        },
      };
    })
  );

  const payload = {
    board_id: boardId,
    title: title,
    description: description,
    media_source: {
      source_type: "multiple_image_base64",
      items: mediaItems,
    },
  };

  const response = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Pinterest API error:", data);
    throw new Error(data.message || "Failed to create carousel pin");
  }

  return data.id;
}

// Create a video pin
async function createVideoPinByUrl(
  accessToken: string,
  boardId: string,
  title: string,
  description: string,
  videoFile: File
): Promise<string> {
  // For video, Pinterest requires a publicly accessible URL
  // Since we can't directly upload video as base64, we need to use a different approach
  // Option 1: Upload to cloud storage and get URL (recommended for production)
  // Option 2: Use Pinterest's video upload endpoint (requires multi-step process)

  // For this implementation, we'll use the media upload flow
  // Step 1: Register the video upload
  const registerPayload = {
    media_type: "video",
  };

  const registerResponse = await fetch(
    "https://api.pinterest.com/v5/media",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(registerPayload),
    }
  );

  if (!registerResponse.ok) {
    const errorData = await registerResponse.json();
    throw new Error(errorData.message || "Failed to register video upload");
  }

  const registerData = await registerResponse.json();
  const mediaId = registerData.media_id;
  const uploadUrl = registerData.upload_url;

  // Step 2: Upload the video file to the upload URL
  const arrayBuffer = await videoFile.arrayBuffer();
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": videoFile.type || "video/mp4",
    },
    body: arrayBuffer,
  });

  if (!uploadResponse.ok) {
    throw new Error("Failed to upload video");
  }

  // Step 3: Create the pin with the media ID
  const pinPayload = {
    board_id: boardId,
    title: title,
    description: description,
    media_source: {
      source_type: "video_id",
      media_id: mediaId,
    },
  };

  const pinResponse = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pinPayload),
  });

  const pinData = await pinResponse.json();

  if (!pinResponse.ok) {
    console.error("Pinterest API error:", pinData);
    throw new Error(pinData.message || "Failed to create video pin");
  }

  return pinData.id;
}
