"use client";

import { useState, ChangeEvent, FormEvent, DragEvent } from "react";
import { CheckCircle, XCircle, Upload, AlertTriangle, Image as ImageIcon, Video as VideoIcon, Info, Search, Package } from "lucide-react";

interface Platform {
  id: string;
  name: string;
  enabled: boolean;
  requirements: string;
  icon: string;
  optimalSpecs?: string;
}

interface PostStatus {
  platform: string;
  status: "success" | "error";
  message: string;
}

interface MediaFile {
  file: File;
  preview: string;
  type: "image" | "video";
  id: string;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB in bytes
const MAX_FILES = 10;

interface ProductPreview {
  id: number;
  productName: string;
  description: string | null;
  productLink: string | null;
  image: { url: string; alt: string } | null;
  variants: { packingVolume: string | null; customerPrice: number | null }[];
}

export default function SimpleCrossPoster() {
  const [activeTab, setActiveTab] = useState<"manual" | "product">("manual");

  // Manual post state
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postStatuses, setPostStatuses] = useState<PostStatus[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // Product post state
  const [productId, setProductId] = useState("");
  const [productPreview, setProductPreview] = useState<ProductPreview | null>(null);
  const [isFetchingProduct, setIsFetchingProduct] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isPostingProduct, setIsPostingProduct] = useState<"facebook" | "instagram" | "linkedin" | null>(null);
  const [productPostStatuses, setProductPostStatuses] = useState<PostStatus[]>([]);

  const fetchProduct = async () => {
    if (!productId.trim()) return;
    setIsFetchingProduct(true);
    setFetchError(null);
    setProductPreview(null);
    setProductPostStatuses([]);

    try {
      const res = await fetch(`/api/product/${productId.trim()}`);
      const json = await res.json();

      if (!res.ok || json.error) {
        setFetchError(json.error || "Product not found");
        return;
      }

      const p = json.data;
      setProductPreview({
        id: p.id,
        productName: p.productName,
        description: p.description,
        productLink: p.productLink,
        image: p.image ? { url: p.image.url, alt: p.image.alt } : null,
        variants: p.variants || [],
      });
    } catch {
      setFetchError("Failed to fetch product");
    } finally {
      setIsFetchingProduct(false);
    }
  };

  const buildProductPostText = (product: ProductPreview): string => {
    const lines: string[] = [];
    lines.push(product.productName);
    if (product.description) lines.push("", product.description);
    if (product.variants.length > 0) {
      lines.push("");
      product.variants.forEach((v) => {
        const parts: string[] = [];
        if (v.packingVolume) parts.push(v.packingVolume);
        if (v.customerPrice != null) parts.push(`Rs. ${v.customerPrice.toLocaleString()}`);
        if (parts.length > 0) lines.push(`• ${parts.join(" — ")}`);
      });
    }
    // productLink is sent as a separate "link" param to Facebook so it renders
    // as a clickable preview card — no need to include it in the caption text.
    return lines.join("\n");
  };

  const buildProductPageUrl = (id: number) => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://animalwellness.shop";
    return `${baseUrl}/products/${id}`;
  };

  const handlePostProduct = async (platform: "facebook" | "instagram" | "linkedin") => {
    if (!productPreview) return;
    setIsPostingProduct(platform);
    setProductPostStatuses((prev) => prev.filter((s) => s.platform.toLowerCase() !== platform));

    try {
      const formData = new FormData();
      const productPageUrl = buildProductPageUrl(productPreview.id);

      if (platform === "facebook") {
        formData.append("content", buildProductPostText(productPreview));
        formData.append("link", productPageUrl);
      } else if (platform === "linkedin") {
        // LinkedIn: article link post — shows rich preview card, clickable
        formData.append("content", buildProductPostText(productPreview));
        formData.append("link", productPageUrl);
      } else {
        // Instagram: image is required, link goes in caption as text (not clickable)
        if (!productPreview.image?.url) {
          setProductPostStatuses((prev) => [
            ...prev.filter((s) => s.platform !== "Instagram"),
            { platform: "Instagram", status: "error", message: "This product has no image — Instagram requires an image to post." },
          ]);
          return;
        }
        const caption = `${buildProductPostText(productPreview)}\n\n${productPageUrl}`;
        formData.append("content", caption);
        formData.append("imageUrl", productPreview.image.url);
      }

      const res = await fetch(`/api/social/${platform}`, { method: "POST", body: formData });
      const data = await res.json();
      const platformLabel = platform === "facebook" ? "Facebook" : platform === "instagram" ? "Instagram" : "LinkedIn";

      setProductPostStatuses((prev) => [
        ...prev.filter((s) => s.platform !== platformLabel),
        {
          platform: platformLabel,
          status: data.success ? "success" : "error",
          message: data.success
            ? `Posted successfully to ${platformLabel}`
            : data.error || `Failed to post to ${platformLabel}`,
        },
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to post";
      const platformLabel = platform === "facebook" ? "Facebook" : platform === "instagram" ? "Instagram" : "LinkedIn";
      setProductPostStatuses((prev) => [
        ...prev.filter((s) => s.platform !== platformLabel),
        { platform: platformLabel, status: "error", message },
      ]);
    } finally {
      setIsPostingProduct(null);
    }
  };

  const [platforms, setPlatforms] = useState<Platform[]>([
    {
      id: "twitter",
      name: "Twitter/X",
      enabled: false,
      requirements: "Max 4 images or 1 video",
      icon: "🐦",
    },
    {
      id: "facebook",
      name: "Facebook",
      enabled: false,
      requirements: "Max 10 images or 1 video",
      icon: "👤",
    },
    {
      id: "instagram",
      name: "Instagram",
      enabled: false,
      requirements: "Max 10 images/video (media required)",
      icon: "📷",
      optimalSpecs: "Best with 1:1 or 4:5 aspect ratio",
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      enabled: false,
      requirements: "Max 9 images or 1 video",
      icon: "💼",
    },
    {
      id: "pinterest",
      name: "Pinterest",
      enabled: false,
      requirements: "Images or video (media required)",
      icon: "📌",
      optimalSpecs: "Best with 2:3 vertical aspect ratio",
    },
    {
      id: "tiktok",
      name: "TikTok",
      enabled: false,
      requirements: "Video only (required)",
      icon: "🎵",
      optimalSpecs: "Best with 9:16 vertical videos",
    },
  ]);

  const validateAndAddFiles = (files: FileList | File[]) => {
    setValidationError(null);
    const filesArray = Array.from(files);
    const newMediaFiles: MediaFile[] = [];
    const errors: string[] = [];

    // Check total file limit
    if (mediaFiles.length + filesArray.length > MAX_FILES) {
      setValidationError(`Maximum ${MAX_FILES} files allowed. Currently have ${mediaFiles.length} files.`);
      return;
    }

    filesArray.forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        errors.push(`${file.name}: Invalid file type`);
        return;
      }

      // Validate file size
      if (isImage && file.size > MAX_IMAGE_SIZE) {
        errors.push(`${file.name}: Image must be less than 5MB`);
        return;
      }

      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        errors.push(`${file.name}: Video must be less than 100MB`);
        return;
      }

      const mediaFile: MediaFile = {
        file,
        preview: URL.createObjectURL(file),
        type: isImage ? "image" : "video",
        id: `${Date.now()}-${Math.random()}`,
      };

      newMediaFiles.push(mediaFile);
    });

    if (errors.length > 0) {
      setValidationError(errors.join(", "));
    }

    if (newMediaFiles.length > 0) {
      setMediaFiles([...mediaFiles, ...newMediaFiles]);
    }
  };

  const handleMediaChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndAddFiles(files);
    }
    // Clear input so same file can be selected again
    e.target.value = "";
  };

  const removeMediaFile = (id: string) => {
    setMediaFiles(mediaFiles.filter((media) => {
      if (media.id === id) {
        URL.revokeObjectURL(media.preview);
        return false;
      }
      return true;
    }));
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  // Check if platform should be disabled based on current media
  const isPlatformDisabled = (platformId: string): boolean => {
    const hasImages = mediaFiles.some((m) => m.type === "image");
    const hasVideos = mediaFiles.some((m) => m.type === "video");
    const hasMedia = mediaFiles.length > 0;

    switch (platformId) {
      case "tiktok":
        // TikTok disabled if no video
        return !hasVideos;
      case "instagram":
      case "pinterest":
        // Instagram and Pinterest disabled if no media
        return !hasMedia;
      default:
        return false;
    }
  };

  // Get reason why platform is disabled
  const getDisabledReason = (platformId: string): string => {
    const hasImages = mediaFiles.some((m) => m.type === "image");
    const hasVideos = mediaFiles.some((m) => m.type === "video");

    switch (platformId) {
      case "tiktok":
        return "Add a video to enable TikTok";
      case "instagram":
      case "pinterest":
        return "Add media (images or video) to enable";
      default:
        return "";
    }
  };

  // Calculate estimated upload time for videos
  const getEstimatedUploadTime = (): string | null => {
    const videos = mediaFiles.filter((m) => m.type === "video");
    if (videos.length === 0) return null;

    const totalVideoSize = videos.reduce((sum, v) => sum + v.file.size, 0);
    const mbSize = totalVideoSize / (1024 * 1024);

    // Estimate based on average upload speed (assume 5 Mbps / 0.625 MB/s)
    const estimatedSeconds = mbSize / 0.625;

    if (estimatedSeconds < 10) return "< 10 seconds";
    if (estimatedSeconds < 60) return `~${Math.ceil(estimatedSeconds)} seconds`;
    const minutes = Math.ceil(estimatedSeconds / 60);
    return `~${minutes} minute${minutes > 1 ? "s" : ""}`;
  };

  // Platform compatibility warnings
  const getPlatformWarnings = () => {
    const warnings: string[] = [];
    const selectedPlatforms = platforms.filter((p) => p.enabled);
    const hasImages = mediaFiles.some((m) => m.type === "image");
    const hasVideos = mediaFiles.some((m) => m.type === "video");
    const imageCount = mediaFiles.filter((m) => m.type === "image").length;

    selectedPlatforms.forEach((platform) => {
      if (platform.id === "tiktok" && !hasVideos) {
        warnings.push("TikTok requires at least one video");
      }
      if (platform.id === "twitter" && imageCount > 4) {
        warnings.push("Twitter allows maximum 4 images");
      }
      if (platform.id === "instagram" && hasVideos && hasImages) {
        warnings.push("Instagram doesn't support mixed image and video posts");
      }
      if ((platform.id === "instagram" || platform.id === "pinterest") && !hasImages && !hasVideos) {
        warnings.push(`${platform.name} requires at least one image or video`);
      }
    });

    return warnings;
  };

  const handlePlatformToggle = (platformId: string) => {
    setPlatforms(
      platforms.map((p) =>
        p.id === platformId ? { ...p, enabled: !p.enabled } : p
      )
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsPosting(true);
    setPostStatuses([]);
    setNotification(null);
    setValidationError(null);

    const selectedPlatforms = platforms.filter((p) => p.enabled);

    // Validation: at least one platform selected
    if (selectedPlatforms.length === 0) {
      setValidationError("Please select at least one platform");
      setIsPosting(false);
      return;
    }

    // Validation: content required
    if (!content || content.trim().length === 0) {
      setValidationError("Content is required");
      setIsPosting(false);
      return;
    }

    // Validation: Twitter character limit
    if (selectedPlatforms.some((p) => p.id === "twitter") && content.length > 280) {
      setValidationError("Content exceeds Twitter's 280 character limit");
      setIsPosting(false);
      return;
    }

    const results: PostStatus[] = [];

    // Post to each selected platform
    for (const platform of selectedPlatforms) {
      try {
        // Initialize progress
        setUploadProgress((prev) => ({ ...prev, [platform.id]: 0 }));

        const formData = new FormData();
        formData.append("content", content);

        // Append all media files
        mediaFiles.forEach((media, index) => {
          formData.append(`media_${index}`, media.file);
          formData.append(`media_${index}_type`, media.type);
        });
        formData.append("mediaCount", mediaFiles.length.toString());

        if (link) formData.append("link", link);

        // Simulate progress for large files
        const hasLargeFiles = mediaFiles.some(
          (m) => m.file.size > 10 * 1024 * 1024
        );

        if (hasLargeFiles) {
          // Simulate upload progress
          const progressInterval = setInterval(() => {
            setUploadProgress((prev) => {
              const current = prev[platform.id] || 0;
              if (current < 90) {
                return { ...prev, [platform.id]: current + 10 };
              }
              return prev;
            });
          }, 300);

          const response = await fetch(`/api/social/${platform.id}`, {
            method: "POST",
            body: formData,
          });

          clearInterval(progressInterval);
          setUploadProgress((prev) => ({ ...prev, [platform.id]: 100 }));

          const data = await response.json();

          // Clear progress after a moment
          setTimeout(() => {
            setUploadProgress((prev) => {
              const updated = { ...prev };
              delete updated[platform.id];
              return updated;
            });
          }, 1000);

          if (data.success) {
            results.push({
              platform: platform.name,
              status: "success",
              message: data.message || `Posted successfully to ${platform.name}`,
            });
          } else {
            results.push({
              platform: platform.name,
              status: "error",
              message: data.error || `Failed to post to ${platform.name}`,
            });
          }
        } else {
          // For small files, just post directly
          setUploadProgress((prev) => ({ ...prev, [platform.id]: 50 }));

          const response = await fetch(`/api/social/${platform.id}`, {
            method: "POST",
            body: formData,
          });

          setUploadProgress((prev) => ({ ...prev, [platform.id]: 100 }));

          const data = await response.json();

          setTimeout(() => {
            setUploadProgress((prev) => {
              const updated = { ...prev };
              delete updated[platform.id];
              return updated;
            });
          }, 500);

          if (data.success) {
            results.push({
              platform: platform.name,
              status: "success",
              message: data.message || `Posted successfully to ${platform.name}`,
            });
          } else {
            results.push({
              platform: platform.name,
              status: "error",
              message: data.error || `Failed to post to ${platform.name}`,
            });
          }
        }
      } catch (error: any) {
        // Clear progress on error
        setUploadProgress((prev) => {
          const updated = { ...prev };
          delete updated[platform.id];
          return updated;
        });

        results.push({
          platform: platform.name,
          status: "error",
          message: error.message || `Failed to post to ${platform.name}`,
        });
      }
    }

    setPostStatuses(results);
    setIsPosting(false);

    // Show notification
    const successCount = results.filter((r) => r.status === "success").length;
    const failureCount = results.filter((r) => r.status === "error").length;

    if (successCount > 0 && failureCount === 0) {
      setNotification(`Posted successfully to ${successCount} platform${successCount > 1 ? "s" : ""}!`);
    } else if (successCount > 0 && failureCount > 0) {
      setNotification(`Posted to ${successCount} platform${successCount > 1 ? "s" : ""}, ${failureCount} failed`);
    } else {
      setNotification(`Failed to post to all platforms`);
    }

    // Reset form if all posts were successful
    if (results.every((r) => r.status === "success")) {
      setTimeout(() => {
        setContent("");
        setLink("");
        // Clean up media file URLs
        mediaFiles.forEach((media) => URL.revokeObjectURL(media.preview));
        setMediaFiles([]);
        setPlatforms(platforms.map((p) => ({ ...p, enabled: false })));
        setPostStatuses([]);
        setNotification(null);
      }, 3000); // Clear after 3 seconds
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Cross-Platform Poster</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("manual")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "manual"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Upload className="w-4 h-4" />
          Manual Post
        </button>
        <button
          onClick={() => setActiveTab("product")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "product"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Package className="w-4 h-4" />
          Post Product
        </button>
      </div>

      {/* Product Post Tab */}
      {activeTab === "product" && (
        <div className="space-y-6">
          {/* Product ID Input */}
          <div>
            <label className="block text-sm font-medium mb-2">Product ID</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchProduct()}
                placeholder="Enter product ID (e.g. 1)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={fetchProduct}
                disabled={isFetchingProduct || !productId.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Search className="w-4 h-4" />
                {isFetchingProduct ? "Fetching..." : "Fetch"}
              </button>
            </div>
          </div>

          {/* Fetch Error */}
          {fetchError && (
            <div className="p-4 bg-red-100 text-red-800 border border-red-200 rounded-lg flex items-start gap-2">
              <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>{fetchError}</span>
            </div>
          )}

          {/* Product Preview */}
          {productPreview && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Post Preview — Facebook
              </div>

              <div className="p-4 space-y-3">
                {/* Image */}
                {productPreview.image && (
                  <img
                    src={productPreview.image.url}
                    alt={productPreview.image.alt}
                    className="w-full rounded-lg object-cover max-h-64"
                  />
                )}

                {/* Post text preview */}
                <div className="text-sm text-gray-800 whitespace-pre-line border border-gray-100 rounded-lg p-3 bg-white">
                  {buildProductPostText(productPreview)}
                </div>

                {/* Link info */}
                {(() => {
                  const productPageUrl = buildProductPageUrl(productPreview.id);
                  return (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <div className="text-xs text-blue-700">
                        <span className="font-medium">Product page:</span>{" "}
                        <a href={productPageUrl} target="_blank" rel="noopener noreferrer" className="underline break-all">
                          {productPageUrl}
                        </a>
                        <span className="block mt-1 text-blue-600">Facebook: clickable preview card · Instagram: link in caption</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Post Buttons */}
              <div className="px-4 pb-4 flex gap-3">
                <button
                  onClick={() => handlePostProduct("facebook")}
                  disabled={isPostingProduct !== null}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {isPostingProduct === "facebook" ? "Posting..." : "👤 Facebook"}
                </button>
                <button
                  onClick={() => handlePostProduct("instagram")}
                  disabled={isPostingProduct !== null || !productPreview.image}
                  title={!productPreview.image ? "This product has no image — Instagram requires one" : ""}
                  className="flex-1 bg-pink-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {isPostingProduct === "instagram" ? "Posting..." : "📷 Instagram"}
                </button>
                <button
                  onClick={() => handlePostProduct("linkedin")}
                  disabled={isPostingProduct !== null}
                  className="flex-1 bg-sky-700 text-white py-3 px-4 rounded-lg font-semibold hover:bg-sky-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {isPostingProduct === "linkedin" ? "Posting..." : "💼 LinkedIn"}
                </button>
              </div>

              {/* Results */}
              {productPostStatuses.length > 0 && (
                <div className="mx-4 mb-4 space-y-2">
                  {productPostStatuses.map((s, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg flex items-start gap-3 ${
                        s.status === "success"
                          ? "bg-green-100 text-green-800 border border-green-200"
                          : "bg-red-100 text-red-800 border border-red-200"
                      }`}
                    >
                      {s.status === "success" ? (
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{s.platform}</p>
                        <p className="text-xs">{s.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manual Post Tab */}
      {activeTab === "manual" && (
      <div className="space-y-6">

      {/* Validation Error */}
      {validationError && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 border border-red-200 rounded-lg flex items-start gap-2">
          <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Success Notification */}
      {notification && (
        <div className={`mb-4 p-4 rounded-lg flex items-start gap-2 ${
          notification.includes("Failed")
            ? "bg-red-100 text-red-800 border border-red-200"
            : "bg-green-100 text-green-800 border border-green-200"
        }`}>
          {notification.includes("Failed") ? (
            <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          )}
          <span>{notification}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Content Field */}
        <div>
          <label
            htmlFor="content"
            className="block text-sm font-medium mb-2"
          >
            Post Content {platforms.find(p => p.id === "twitter" && p.enabled) && (
              <span className="text-xs text-gray-500">
                ({content.length}/280 characters for Twitter)
              </span>
            )}
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            disabled={isPosting}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="What's on your mind?"
            required
          />
        </div>

        {/* Media Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Media (Optional){" "}
            <span className="text-xs text-gray-500">
              (Max {MAX_FILES} files: Images up to 5MB, Videos up to 100MB)
            </span>
          </label>

          {/* Drag and Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 bg-gray-50"
            } ${isPosting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <input
              type="file"
              id="media"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaChange}
              disabled={isPosting}
              className="hidden"
            />
            <label
              htmlFor="media"
              className={`flex flex-col items-center ${
                isPosting ? "cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <Upload className="w-12 h-12 text-gray-400 mb-2" />
              <span className="text-sm text-gray-600">
                Drag and drop files here, or click to select
              </span>
              <span className="text-xs text-gray-500 mt-1">
                Images (JPG, PNG, GIF) and Videos (MP4, MOV, AVI)
              </span>
            </label>
          </div>

          {/* Media Preview Grid */}
          {mediaFiles.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              {mediaFiles.map((media) => (
                <div key={media.id} className="relative group">
                  {/* File Type Badge */}
                  <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-70 text-white text-xs font-semibold px-2 py-1 rounded">
                    {media.type.toUpperCase()}
                  </div>

                  {/* Remove Button */}
                  {!isPosting && (
                    <button
                      type="button"
                      onClick={() => removeMediaFile(media.id)}
                      className="absolute top-2 right-2 z-10 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      title="Remove file"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}

                  {/* Preview */}
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-300">
                    {media.type === "image" ? (
                      <img
                        src={media.preview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={media.preview}
                        controls
                        className="w-full h-full object-cover"
                      >
                        Your browser does not support the video tag.
                      </video>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="mt-1 text-xs text-gray-600 truncate">
                    {media.file.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(media.file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* File Count Info */}
          {mediaFiles.length > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              {mediaFiles.length} / {MAX_FILES} files selected
            </div>
          )}
        </div>

        {/* Link Field */}
        <div>
          <label
            htmlFor="link"
            className="block text-sm font-medium mb-2"
          >
            Link (Optional)
          </label>
          <input
            type="url"
            id="link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            disabled={isPosting}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="https://example.com"
          />
        </div>

        {/* Platform Selection */}
        <div>
          <label className="block text-sm font-medium mb-3">
            Select Platforms
          </label>
          <div className="space-y-3">
            {platforms.map((platform) => {
              const disabled = isPlatformDisabled(platform.id);
              const disabledReason = disabled ? getDisabledReason(platform.id) : null;

              return (
                <div
                  key={platform.id}
                  className={`border rounded-lg p-3 transition-all ${
                    platform.enabled
                      ? "border-blue-500 bg-blue-50"
                      : disabled
                      ? "border-gray-200 bg-gray-50 opacity-60"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <label
                    className={`flex items-start space-x-3 ${
                      disabled || isPosting
                        ? "cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={platform.enabled}
                      onChange={() => handlePlatformToggle(platform.id)}
                      disabled={disabled || isPosting}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{platform.icon}</span>
                        <span className="text-sm font-medium">
                          {platform.name}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {platform.requirements}
                      </p>
                      {platform.optimalSpecs && (
                        <div className="flex items-start gap-1 mt-1">
                          <Info className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-blue-600">
                            {platform.optimalSpecs}
                          </p>
                        </div>
                      )}
                      {disabled && disabledReason && (
                        <p className="text-xs text-red-600 mt-1 font-medium">
                          {disabledReason}
                        </p>
                      )}
                    </div>
                  </label>
                </div>
              );
            })}
          </div>

          {/* Estimated Upload Time */}
          {getEstimatedUploadTime() && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <VideoIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  Video Upload
                </p>
                <p className="text-xs text-blue-700">
                  Estimated time: {getEstimatedUploadTime()}
                </p>
              </div>
            </div>
          )}

          {/* Platform Compatibility Warnings */}
          {getPlatformWarnings().length > 0 && (
            <div className="mt-4 space-y-2">
              {getPlatformWarnings().map((warning, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                >
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-yellow-800">{warning}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isPosting}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isPosting ? "Posting..." : "Post Now"}
          </button>

          {/* Upload Progress */}
          {isPosting && Object.keys(uploadProgress).length > 0 && (
            <div className="mt-4 space-y-2">
              {Object.entries(uploadProgress).map(([platform, progress]) => (
                <div key={platform} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 capitalize">{platform}</span>
                    <span className="text-gray-600">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>

      {/* Status Messages */}
      {postStatuses.length > 0 && (
        <div className="mt-6 space-y-3">
          {postStatuses.map((status, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg flex items-start gap-3 ${
                status.status === "success"
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : "bg-red-100 text-red-800 border border-red-200"
              }`}
            >
              {status.status === "success" ? (
                <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium">{status.platform}</p>
                <p className="text-sm">{status.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
      )}
    </div>
  );
}
