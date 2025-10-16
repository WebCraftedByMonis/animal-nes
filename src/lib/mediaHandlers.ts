// Media Handler Utilities for Social Media Platforms
// Handles validation, upload, and formatting for different platforms

export interface MediaFile {
  file: File;
  type: "image" | "video";
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PlatformMediaLimits {
  maxImages: number;
  maxVideos: number;
  maxImageSize: number; // bytes
  maxVideoSize: number; // bytes
  maxVideoDuration: number; // seconds
  supportedImageFormats: string[];
  supportedVideoFormats: string[];
  preferredAspectRatio?: string;
  allowsMixedMedia: boolean;
}

// Platform-specific media limits and requirements
export const PLATFORM_LIMITS: Record<string, PlatformMediaLimits> = {
  twitter: {
    maxImages: 4,
    maxVideos: 1,
    maxImageSize: 5 * 1024 * 1024, // 5MB
    maxVideoSize: 512 * 1024 * 1024, // 512MB
    maxVideoDuration: 140, // 2:20 minutes
    supportedImageFormats: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    supportedVideoFormats: ["video/mp4", "video/quicktime"],
    allowsMixedMedia: false,
  },
  facebook: {
    maxImages: 10,
    maxVideos: 1,
    maxImageSize: 10 * 1024 * 1024, // 10MB
    maxVideoSize: 4 * 1024 * 1024 * 1024, // 4GB
    maxVideoDuration: 240 * 60, // 240 minutes
    supportedImageFormats: ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp"],
    supportedVideoFormats: ["video/mp4", "video/quicktime", "video/x-msvideo"],
    allowsMixedMedia: false,
  },
  instagram: {
    maxImages: 10,
    maxVideos: 1,
    maxImageSize: 8 * 1024 * 1024, // 8MB
    maxVideoSize: 100 * 1024 * 1024, // 100MB
    maxVideoDuration: 60, // 60 seconds for feed, 15 for stories
    supportedImageFormats: ["image/jpeg", "image/png"],
    supportedVideoFormats: ["video/mp4", "video/quicktime"],
    preferredAspectRatio: "1:1, 4:5, 16:9",
    allowsMixedMedia: false,
  },
  linkedin: {
    maxImages: 9,
    maxVideos: 1,
    maxImageSize: 10 * 1024 * 1024, // 10MB
    maxVideoSize: 5 * 1024 * 1024 * 1024, // 5GB
    maxVideoDuration: 600, // 10 minutes
    supportedImageFormats: ["image/jpeg", "image/png", "image/gif"],
    supportedVideoFormats: ["video/mp4", "video/quicktime", "video/x-msvideo"],
    allowsMixedMedia: false,
  },
  pinterest: {
    maxImages: 5,
    maxVideos: 1,
    maxImageSize: 32 * 1024 * 1024, // 32MB
    maxVideoSize: 2 * 1024 * 1024 * 1024, // 2GB
    maxVideoDuration: 15 * 60, // 15 minutes
    supportedImageFormats: ["image/jpeg", "image/png", "image/webp"],
    supportedVideoFormats: ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"],
    preferredAspectRatio: "2:3",
    allowsMixedMedia: false,
  },
  tiktok: {
    maxImages: 0,
    maxVideos: 1,
    maxImageSize: 0,
    maxVideoSize: 4 * 1024 * 1024 * 1024, // 4GB
    maxVideoDuration: 10 * 60, // 10 minutes
    supportedImageFormats: [],
    supportedVideoFormats: ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"],
    preferredAspectRatio: "9:16",
    allowsMixedMedia: false,
  },
};

// Validate media files for a specific platform
export function validateMediaForPlatform(
  platform: string,
  mediaFiles: MediaFile[]
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  const limits = PLATFORM_LIMITS[platform];
  if (!limits) {
    result.isValid = false;
    result.errors.push(`Unknown platform: ${platform}`);
    return result;
  }

  const images = mediaFiles.filter((m) => m.type === "image");
  const videos = mediaFiles.filter((m) => m.type === "video");

  // Check if platform requires specific media type
  if (platform === "tiktok" && videos.length === 0) {
    result.isValid = false;
    result.errors.push("TikTok requires at least one video");
    return result;
  }

  // Check mixed media
  if (!limits.allowsMixedMedia && images.length > 0 && videos.length > 0) {
    result.isValid = false;
    result.errors.push(`${capitalize(platform)} doesn't support mixed image and video posts`);
  }

  // Validate image count
  if (images.length > limits.maxImages) {
    result.isValid = false;
    result.errors.push(
      `${capitalize(platform)} allows maximum ${limits.maxImages} image${
        limits.maxImages !== 1 ? "s" : ""
      }`
    );
  }

  // Validate video count
  if (videos.length > limits.maxVideos) {
    result.isValid = false;
    result.errors.push(
      `${capitalize(platform)} allows maximum ${limits.maxVideos} video${
        limits.maxVideos !== 1 ? "s" : ""
      }`
    );
  }

  // Validate each image
  images.forEach((media) => {
    // Format validation
    if (!limits.supportedImageFormats.includes(media.file.type)) {
      result.isValid = false;
      result.errors.push(
        `${media.file.name}: Unsupported image format for ${capitalize(platform)}`
      );
    }

    // Size validation
    if (media.file.size > limits.maxImageSize) {
      result.isValid = false;
      result.errors.push(
        `${media.file.name}: Image exceeds ${formatBytes(limits.maxImageSize)} limit`
      );
    }
  });

  // Validate each video
  videos.forEach((media) => {
    // Format validation
    if (!limits.supportedVideoFormats.includes(media.file.type)) {
      result.isValid = false;
      result.errors.push(
        `${media.file.name}: Unsupported video format for ${capitalize(platform)}`
      );
    }

    // Size validation
    if (media.file.size > limits.maxVideoSize) {
      result.isValid = false;
      result.errors.push(
        `${media.file.name}: Video exceeds ${formatBytes(limits.maxVideoSize)} limit`
      );
    }
  });

  // Add aspect ratio warnings
  if (limits.preferredAspectRatio) {
    result.warnings.push(
      `${capitalize(platform)} recommends aspect ratio: ${limits.preferredAspectRatio}`
    );
  }

  return result;
}

// Validate media files for multiple platforms
export function validateMediaForPlatforms(
  platforms: string[],
  mediaFiles: MediaFile[]
): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {};

  platforms.forEach((platform) => {
    results[platform] = validateMediaForPlatform(platform, mediaFiles);
  });

  return results;
}

// ============================================================================
// TWITTER MEDIA HANDLERS
// ============================================================================

export async function uploadMediaToTwitter(
  accessToken: string,
  accessSecret: string,
  mediaFiles: MediaFile[]
): Promise<string[]> {
  const mediaIds: string[] = [];

  for (const media of mediaFiles) {
    if (media.type === "image") {
      const mediaId = await uploadTwitterImage(accessToken, accessSecret, media.file);
      mediaIds.push(mediaId);
    } else {
      const mediaId = await uploadTwitterVideoChunked(
        accessToken,
        accessSecret,
        media.file
      );
      mediaIds.push(mediaId);
    }
  }

  return mediaIds;
}

async function uploadTwitterImage(
  accessToken: string,
  accessSecret: string,
  imageFile: File
): Promise<string> {
  const formData = new FormData();
  const arrayBuffer = await imageFile.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: imageFile.type });

  formData.append("media", blob);

  const response = await fetch(
    "https://upload.twitter.com/1.1/media/upload.json",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    }
  );

  const data = await response.json();
  return data.media_id_string;
}

async function uploadTwitterVideoChunked(
  accessToken: string,
  accessSecret: string,
  videoFile: File
): Promise<string> {
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

  // Step 1: INIT
  const initResponse = await fetch(
    "https://upload.twitter.com/1.1/media/upload.json",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        command: "INIT",
        total_bytes: videoFile.size.toString(),
        media_type: videoFile.type,
        media_category: "tweet_video",
      }),
    }
  );

  const initData = await initResponse.json();
  const mediaId = initData.media_id_string;

  // Step 2: APPEND chunks
  const arrayBuffer = await videoFile.arrayBuffer();
  const totalChunks = Math.ceil(arrayBuffer.byteLength / CHUNK_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, arrayBuffer.byteLength);
    const chunk = arrayBuffer.slice(start, end);

    const chunkFormData = new FormData();
    chunkFormData.append("command", "APPEND");
    chunkFormData.append("media_id", mediaId);
    chunkFormData.append("segment_index", i.toString());
    chunkFormData.append("media", new Blob([chunk]));

    await fetch("https://upload.twitter.com/1.1/media/upload.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: chunkFormData,
    });
  }

  // Step 3: FINALIZE
  await fetch("https://upload.twitter.com/1.1/media/upload.json", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      command: "FINALIZE",
      media_id: mediaId,
    }),
  });

  return mediaId;
}

// ============================================================================
// FACEBOOK MEDIA HANDLERS
// ============================================================================

export async function uploadMediaToFacebook(
  pageId: string,
  accessToken: string,
  mediaFiles: MediaFile[],
  message: string
): Promise<string> {
  const images = mediaFiles.filter((m) => m.type === "image");
  const videos = mediaFiles.filter((m) => m.type === "video");

  if (videos.length > 0) {
    // Post with video
    return uploadFacebookVideo(pageId, accessToken, videos[0].file, message);
  } else if (images.length > 1) {
    // Post with multiple photos
    return uploadFacebookMultiplePhotos(pageId, accessToken, images, message);
  } else if (images.length === 1) {
    // Post with single photo
    return uploadFacebookSinglePhoto(pageId, accessToken, images[0].file, message);
  }

  throw new Error("No media to upload");
}

async function uploadFacebookSinglePhoto(
  pageId: string,
  accessToken: string,
  imageFile: File,
  message: string
): Promise<string> {
  const formData = new FormData();
  const arrayBuffer = await imageFile.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: imageFile.type });

  formData.append("source", blob, imageFile.name);
  formData.append("message", message);
  formData.append("access_token", accessToken);

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}/photos`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json();
  return data.post_id || data.id;
}

async function uploadFacebookMultiplePhotos(
  pageId: string,
  accessToken: string,
  images: MediaFile[],
  message: string
): Promise<string> {
  // Step 1: Upload all photos without publishing
  const photoIds: string[] = [];

  for (const image of images) {
    const formData = new FormData();
    const arrayBuffer = await image.file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: image.file.type });

    formData.append("source", blob, image.file.name);
    formData.append("published", "false");
    formData.append("access_token", accessToken);

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/photos`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();
    photoIds.push(data.id);
  }

  // Step 2: Create feed post with all photos
  const attachedMedia = photoIds.map((id) => ({ media_fbid: id }));

  const feedFormData = new FormData();
  feedFormData.append("message", message);
  feedFormData.append("attached_media", JSON.stringify(attachedMedia));
  feedFormData.append("access_token", accessToken);

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}/feed`,
    {
      method: "POST",
      body: feedFormData,
    }
  );

  const data = await response.json();
  return data.id;
}

async function uploadFacebookVideo(
  pageId: string,
  accessToken: string,
  videoFile: File,
  message: string
): Promise<string> {
  const formData = new FormData();
  const arrayBuffer = await videoFile.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: videoFile.type });

  formData.append("source", blob, videoFile.name);
  formData.append("description", message);
  formData.append("access_token", accessToken);

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}/videos`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json();
  return data.id;
}

// ============================================================================
// INSTAGRAM MEDIA HANDLERS
// ============================================================================

export async function uploadMediaToInstagram(
  businessAccountId: string,
  accessToken: string,
  mediaFiles: MediaFile[],
  caption: string
): Promise<string> {
  const images = mediaFiles.filter((m) => m.type === "image");
  const videos = mediaFiles.filter((m) => m.type === "video");

  if (videos.length > 0) {
    return uploadInstagramVideo(businessAccountId, accessToken, videos[0].file, caption);
  } else if (images.length > 1) {
    return uploadInstagramCarousel(businessAccountId, accessToken, images, caption);
  } else if (images.length === 1) {
    return uploadInstagramSinglePhoto(
      businessAccountId,
      accessToken,
      images[0].file,
      caption
    );
  }

  throw new Error("No media to upload");
}

async function uploadInstagramSinglePhoto(
  businessAccountId: string,
  accessToken: string,
  imageFile: File,
  caption: string
): Promise<string> {
  // Instagram requires a publicly accessible image URL
  // In production, upload to your server or cloud storage first
  const imageUrl = await uploadToCloudStorage(imageFile);

  // Step 1: Create container
  const containerResponse = await fetch(
    `https://graph.facebook.com/v18.0/${businessAccountId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        caption: caption,
        access_token: accessToken,
      }),
    }
  );

  const containerData = await containerResponse.json();
  const containerId = containerData.id;

  // Step 2: Publish container
  const publishResponse = await fetch(
    `https://graph.facebook.com/v18.0/${businessAccountId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
    }
  );

  const publishData = await publishResponse.json();
  return publishData.id;
}

async function uploadInstagramCarousel(
  businessAccountId: string,
  accessToken: string,
  images: MediaFile[],
  caption: string
): Promise<string> {
  // Step 1: Create container for each image
  const containerIds: string[] = [];

  for (const image of images) {
    const imageUrl = await uploadToCloudStorage(image.file);

    const containerResponse = await fetch(
      `https://graph.facebook.com/v18.0/${businessAccountId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          is_carousel_item: true,
          access_token: accessToken,
        }),
      }
    );

    const containerData = await containerResponse.json();
    containerIds.push(containerData.id);
  }

  // Step 2: Create carousel container
  const carouselResponse = await fetch(
    `https://graph.facebook.com/v18.0/${businessAccountId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "CAROUSEL",
        children: containerIds,
        caption: caption,
        access_token: accessToken,
      }),
    }
  );

  const carouselData = await carouselResponse.json();
  const carouselId = carouselData.id;

  // Step 3: Publish carousel
  const publishResponse = await fetch(
    `https://graph.facebook.com/v18.0/${businessAccountId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: carouselId,
        access_token: accessToken,
      }),
    }
  );

  const publishData = await publishResponse.json();
  return publishData.id;
}

async function uploadInstagramVideo(
  businessAccountId: string,
  accessToken: string,
  videoFile: File,
  caption: string
): Promise<string> {
  const videoUrl = await uploadToCloudStorage(videoFile);

  // Step 1: Create video container
  const containerResponse = await fetch(
    `https://graph.facebook.com/v18.0/${businessAccountId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "VIDEO",
        video_url: videoUrl,
        caption: caption,
        access_token: accessToken,
      }),
    }
  );

  const containerData = await containerResponse.json();
  const containerId = containerData.id;

  // Step 2: Wait for video processing (check status)
  await waitForVideoProcessing(businessAccountId, containerId, accessToken);

  // Step 3: Publish video
  const publishResponse = await fetch(
    `https://graph.facebook.com/v18.0/${businessAccountId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
    }
  );

  const publishData = await publishResponse.json();
  return publishData.id;
}

async function waitForVideoProcessing(
  businessAccountId: string,
  containerId: string,
  accessToken: string,
  maxAttempts: number = 30
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const statusResponse = await fetch(
      `https://graph.facebook.com/v18.0/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    const statusData = await statusResponse.json();

    if (statusData.status_code === "FINISHED") {
      return;
    } else if (statusData.status_code === "ERROR") {
      throw new Error("Video processing failed");
    }

    // Wait 2 seconds before checking again
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("Video processing timeout");
}

// ============================================================================
// PINTEREST MEDIA HANDLERS (Already implemented in route)
// ============================================================================

// ============================================================================
// TIKTOK VIDEO UPLOAD WITH PROGRESS
// ============================================================================

export async function uploadVideoToTikTokWithProgress(
  accessToken: string,
  videoFile: File,
  onProgress?: (progress: number) => void
): Promise<{ publishId: string; uploadUrl: string }> {
  const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB

  // Step 1: Initialize
  const initResponse = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        source_info: {
          source: "FILE_UPLOAD",
          video_size: videoFile.size,
          chunk_size: CHUNK_SIZE,
        },
      }),
    }
  );

  const initData = await initResponse.json();
  const publishId = initData.data?.publish_id;
  const uploadUrl = initData.data?.upload_url;

  if (!publishId || !uploadUrl) {
    throw new Error("Failed to initialize TikTok video upload");
  }

  // Step 2: Upload chunks with progress
  const arrayBuffer = await videoFile.arrayBuffer();
  const totalChunks = Math.ceil(arrayBuffer.byteLength / CHUNK_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, arrayBuffer.byteLength);
    const chunk = arrayBuffer.slice(start, end);

    await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": videoFile.type || "video/mp4",
        "Content-Range": `bytes ${start}-${end - 1}/${arrayBuffer.byteLength}`,
        "Content-Length": chunk.byteLength.toString(),
      },
      body: chunk,
    });

    // Update progress
    if (onProgress) {
      const progress = ((i + 1) / totalChunks) * 100;
      onProgress(progress);
    }
  }

  return { publishId, uploadUrl };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Upload file to your own server temporarily for Instagram to access
// Instagram requires a publicly accessible URL
async function uploadToCloudStorage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  // Upload to your own Next.js API route that saves to /public/temp
  const response = await fetch("/api/upload/temp", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Temporary upload failed: ${error.error || "Unknown error"}`);
  }

  const data = await response.json();
  // Returns something like: https://yourdomain.com/temp/abc123.jpg
  return data.url;
}

// Delete temporary file from your server after Instagram downloads it
export async function deleteTempFile(filename: string): Promise<void> {
  try {
    await fetch("/api/upload/temp", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filename }),
    });
  } catch (error) {
    console.warn("Failed to delete temporary file:", error);
  }
}

// Get video dimensions and aspect ratio
export async function getVideoMetadata(
  file: File
): Promise<{ width: number; height: number; duration: number; aspectRatio: string }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const width = video.videoWidth;
      const height = video.videoHeight;
      const duration = video.duration;
      const aspectRatio = calculateAspectRatio(width, height);

      resolve({ width, height, duration, aspectRatio });
    };

    video.onerror = () => {
      reject(new Error("Failed to load video metadata"));
    };

    video.src = URL.createObjectURL(file);
  });
}

// Get image dimensions and aspect ratio
export async function getImageMetadata(
  file: File
): Promise<{ width: number; height: number; aspectRatio: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      window.URL.revokeObjectURL(img.src);
      const width = img.width;
      const height = img.height;
      const aspectRatio = calculateAspectRatio(width, height);

      resolve({ width, height, aspectRatio });
    };

    img.onerror = () => {
      reject(new Error("Failed to load image metadata"));
    };

    img.src = URL.createObjectURL(file);
  });
}

function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

// Format bytes to human-readable string
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Capitalize first letter
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Compress video (placeholder - requires ffmpeg or similar)
export async function compressVideo(
  file: File,
  targetSize: number
): Promise<File> {
  // This would require a video compression library
  // Options:
  // 1. Client-side: Use ffmpeg.wasm
  // 2. Server-side: Upload and compress on server
  // 3. Cloud service: Use a video processing API

  console.warn("Video compression not implemented");
  return file;
}

// Resize image
export async function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create blob"));
            return;
          }

          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });

          resolve(resizedFile);
        },
        file.type,
        0.9
      );
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = URL.createObjectURL(file);
  });
}
