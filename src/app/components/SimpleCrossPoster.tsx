"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { CheckCircle, XCircle } from "lucide-react";

interface Platform {
  id: string;
  name: string;
  enabled: boolean;
}

interface PostStatus {
  platform: string;
  status: "success" | "error";
  message: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

export default function SimpleCrossPoster() {
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [postStatuses, setPostStatuses] = useState<PostStatus[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [platforms, setPlatforms] = useState<Platform[]>([
    { id: "twitter", name: "Twitter/X", enabled: false },
    { id: "facebook", name: "Facebook", enabled: false },
    { id: "instagram", name: "Instagram", enabled: false },
    { id: "linkedin", name: "LinkedIn", enabled: false },
  ]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setValidationError(null);

    if (file) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setValidationError("Image size must be less than 5MB");
        e.target.value = ""; // Clear the input
        return;
      }

      setImageFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
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
        const formData = new FormData();
        formData.append("content", content);
        if (imageFile) formData.append("image", imageFile);
        if (link) formData.append("link", link);

        const response = await fetch(`/api/social/${platform.id}`, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

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
      } catch (error: any) {
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
        setImageFile(null);
        setImagePreview(null);
        setPlatforms(platforms.map((p) => ({ ...p, enabled: false })));
        setPostStatuses([]);
        setNotification(null);
      }, 3000); // Clear after 3 seconds
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Cross-Platform Poster</h1>

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

        {/* Image Upload */}
        <div>
          <label
            htmlFor="image"
            className="block text-sm font-medium mb-2"
          >
            Image (Optional) <span className="text-xs text-gray-500">(Max 5MB)</span>
          </label>
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleImageChange}
            disabled={isPosting}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          {imagePreview && (
            <div className="mt-4 relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-w-full h-auto rounded-lg border border-gray-300"
              />
              {!isPosting && (
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                    const input = document.getElementById("image") as HTMLInputElement;
                    if (input) input.value = "";
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              )}
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
          <div className="space-y-2">
            {platforms.map((platform) => (
              <label
                key={platform.id}
                className={`flex items-center space-x-3 ${
                  isPosting ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                }`}
              >
                <input
                  type="checkbox"
                  checked={platform.enabled}
                  onChange={() => handlePlatformToggle(platform.id)}
                  disabled={isPosting}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
                />
                <span className="text-sm">{platform.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPosting}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isPosting ? "Posting..." : "Post Now"}
        </button>
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
  );
}
