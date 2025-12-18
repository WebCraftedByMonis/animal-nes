# Instagram Crossposter Setup Guide

This guide will help you set up Instagram posting in production.

## Prerequisites

1. ✅ Instagram Business or Creator Account
2. ✅ Instagram account connected to a Facebook Page
3. ✅ Facebook token already configured in database

## Production Setup Steps

### Step 1: Update Facebook Token with Instagram Permissions

Your existing Facebook token needs Instagram permissions. Follow these steps:

1. Go to [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)

2. Select your **Facebook Page** from the dropdown

3. Click on **"Permissions"** tab on the right side

4. Search for and enable these permissions:
   - ✅ `instagram_basic`
   - ✅ `instagram_content_publish`
   - ✅ `pages_read_engagement`
   - ✅ `pages_manage_posts`

5. Click **"Generate Access Token"**

6. Copy the new token

7. Exchange it for a long-lived token (60 days) - your existing token refresh system will handle this

8. Update your production database with the new token (through your admin dashboard or token refresh endpoint)

### Step 2: Get Your Instagram Business Account ID

1. Go to [Meta Business Suite](https://business.facebook.com)

2. Navigate to **Settings** → **Instagram accounts**

3. Find your Instagram account and copy the **ID**
   - Example: `17841469005860042`

### Step 3: Run the Setup Script in Production

SSH into your production server and run:

```bash
# Navigate to your project directory
cd /path/to/your/project

# Run the setup script with your Instagram Account ID
node setup-instagram-token.js 17841469005860042
```

Replace `17841469005860042` with your actual Instagram Business Account ID.

### Step 4: Verify Setup

The script will:
- ✅ Check for existing Facebook token
- ✅ Create/update Instagram record in database
- ✅ Use the same encrypted token as Facebook
- ✅ Set Instagram Account ID and Page ID

You should see output like:
```
✅ Found Facebook token
✅ Instagram token created successfully!
📋 Instagram Configuration:
   Platform: instagram
   Account ID: 17841469005860042
   Page ID: 104805151612130
   Status: Active
```

### Step 5: Test Instagram Posting

1. Go to your crossposter page
2. Select Instagram
3. Upload an image with caption
4. Post!

## How It Works

- Instagram posting uses **Facebook Graph API**
- Your Instagram and Facebook use the **same access token**
- The token is **encrypted** in the database
- The system automatically **refreshes** the token before expiration
- Images are uploaded to **Cloudinary** for public access

## Troubleshooting

### Error: "Application does not have permission for this action"
- Your token doesn't have Instagram permissions
- Go back to Step 1 and regenerate token with all required permissions

### Error: "Invalid OAuth access token"
- Your token is expired or invalid
- Regenerate a new token in Graph API Explorer
- Update it in your database

### Error: "Instagram requires an image to post"
- Instagram requires at least one image or video
- Make sure you've uploaded media before posting

## Token Permissions Reference

Required permissions for Instagram posting:

| Permission | Purpose |
|------------|---------|
| `instagram_basic` | Basic access to Instagram account |
| `instagram_content_publish` | Publish photos and videos |
| `pages_read_engagement` | Read Page content |
| `pages_manage_posts` | Manage Page posts |

## Support

If you encounter issues:
1. Check that your Instagram is a **Business or Creator** account (not personal)
2. Verify Instagram is **connected** to your Facebook Page
3. Ensure all **permissions** are granted
4. Check token **expiration** date in database
5. Review error logs for specific error messages
