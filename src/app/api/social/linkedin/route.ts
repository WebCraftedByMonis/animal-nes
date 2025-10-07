import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const content = formData.get("content") as string;
    const link = formData.get("link") as string | null;
    const image = formData.get("image") as File | null;

    // Validate environment variables
    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
    const personId = process.env.LINKEDIN_PERSON_ID;
    const organizationId = process.env.LINKEDIN_ORGANIZATION_ID;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "LinkedIn access token not configured" },
        { status: 500 }
      );
    }

    if (!personId && !organizationId) {
      return NextResponse.json(
        { success: false, error: "LinkedIn person ID or organization ID not configured" },
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

    // Determine the author URN (use person if available, otherwise organization)
    const author = personId
      ? `urn:li:person:${personId}`
      : `urn:li:organization:${organizationId}`;

    let postData: any;

    if (image) {
      // Step 1: Register upload for the image
      const registerUploadBody = {
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner: author,
          serviceRelationships: [
            {
              relationshipType: "OWNER",
              identifier: "urn:li:userGeneratedContent"
            }
          ]
        }
      };

      const registerResponse = await fetch(
        "https://api.linkedin.com/v2/assets?action=registerUpload",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(registerUploadBody),
        }
      );

      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        console.error("LinkedIn register upload error:", registerData);
        return NextResponse.json(
          {
            success: false,
            error: registerData.message || "Failed to register image upload with LinkedIn",
          },
          { status: registerResponse.status }
        );
      }

      const uploadUrl = registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
      const asset = registerData.value.asset;

      // Step 2: Upload the image
      const arrayBuffer = await image.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": image.type,
        },
        body: buffer,
      });

      if (!uploadResponse.ok) {
        console.error("LinkedIn image upload error:", await uploadResponse.text());
        return NextResponse.json(
          {
            success: false,
            error: "Failed to upload image to LinkedIn",
          },
          { status: uploadResponse.status }
        );
      }

      // Step 3: Create post with image
      postData = {
        author: author,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: content,
            },
            shareMediaCategory: "IMAGE",
            media: [
              {
                status: "READY",
                description: {
                  text: "Shared image"
                },
                media: asset,
                title: {
                  text: "Image"
                }
              }
            ]
          }
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
      };
    } else {
      // Text-only post (with optional link)
      const shareContent: any = {
        shareCommentary: {
          text: content,
        },
        shareMediaCategory: "NONE",
      };

      // If a link is provided, include it
      if (link) {
        shareContent.shareMediaCategory = "ARTICLE";
        shareContent.media = [
          {
            status: "READY",
            originalUrl: link,
          }
        ];
      }

      postData = {
        author: author,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": shareContent
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
      };
    }

    // Create the post
    const postResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postData),
    });

    const postResponseData = await postResponse.json();

    if (!postResponse.ok) {
      console.error("LinkedIn post creation error:", postResponseData);
      return NextResponse.json(
        {
          success: false,
          error: postResponseData.message || "Failed to create LinkedIn post",
        },
        { status: postResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      postId: postResponseData.id,
      message: "Successfully posted to LinkedIn",
    });
  } catch (error: any) {
    console.error("LinkedIn API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
