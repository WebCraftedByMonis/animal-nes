# Facebook Token Auto-Refresh Setup Guide

This guide will help you set up automatic Facebook token refresh so your cross-poster never experiences token expiration issues.

## 📋 Prerequisites

Before you begin, you need:

1. **Facebook App** - Created at https://developers.facebook.com/apps/
2. **Facebook Page** - The page you want to post to
3. **App ID & App Secret** - From your Facebook App dashboard

---

## 🔧 Step 1: Configure Environment Variables

Add these to your `.env` file:

```env
# Facebook App Credentials (REQUIRED)
FACEBOOK_APP_ID=your_facebook_app_id_here
FACEBOOK_APP_SECRET=your_facebook_app_secret_here

# Token Encryption Key (REQUIRED for security)
# Generate one using: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
TOKEN_ENCRYPTION_KEY=your_64_character_hex_encryption_key_here

# Cron Secret (OPTIONAL but recommended)
# This secures your auto-refresh endpoint
CRON_SECRET=your_random_secret_string_here
```

### How to Get Facebook App Credentials:

1. Go to https://developers.facebook.com/apps/
2. Select your app or create a new one
3. Go to **Settings → Basic**
4. Copy your **App ID** and **App Secret**

### Generate Encryption Key:

Run this command in your terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as `TOKEN_ENCRYPTION_KEY` in your `.env` file.

---

## 🗄️ Step 2: Update Database

Run the Prisma migration to create the token storage table:

```bash
npx prisma db push
```

This will add the `SocialMediaToken` table to your database.

---

## 🎯 Step 3: Get Your Initial Facebook Token

1. Go to **Facebook Graph API Explorer**: https://developers.facebook.com/tools/explorer/

2. **Select your app** from the top-right dropdown

3. Click **"Get Page Access Token"**

4. **Select your Facebook Page**

5. **Request permissions**:
   - `pages_manage_posts` (required for posting)
   - `pages_read_engagement` (optional)

6. Click **"Generate Access Token"** and authorize

7. **Copy the token** that appears in the Access Token field

8. **Get your Page ID**:
   - Go to your Facebook Page
   - Click "About" → Scroll down to find "Page ID"
   - OR run this query in Graph API Explorer: `me/accounts`

---

## 🚀 Step 4: Set Up Token in Admin Dashboard

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to: **http://localhost:3000/dashboard/social-tokens**

3. Click **"Set Up Facebook Token"**

4. Paste your:
   - **Short-Lived Access Token** (from Graph API Explorer)
   - **Facebook Page ID**

5. Click **"Set Up Token"**

The system will automatically:
- ✅ Exchange your short-lived token for a long-lived token (60 days)
- ✅ Encrypt and store it securely in the database
- ✅ Enable automatic refresh

---

## ⏰ Step 5: Set Up Automatic Token Refresh (Cron Job)

Your token will automatically refresh 5 days before expiration. You need to set up a cron job to trigger this.

### Option A: Vercel Cron Jobs (Recommended for Vercel deployments)

1. Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-tokens",
      "schedule": "0 2 * * *"
    }
  ]
}
```

This runs daily at 2 AM UTC.

### Option B: External Cron Service (For other hosting)

Use a service like:
- https://cron-job.org
- https://www.easycron.com
- https://console.cron-job.org

**Configure:**
- **URL**: `https://yourdomain.com/api/cron/refresh-tokens`
- **Schedule**: Daily at 2 AM (Cron: `0 2 * * *`)
- **Method**: GET
- **Headers**: `Authorization: Bearer YOUR_CRON_SECRET` (if you set CRON_SECRET)

### Option C: Manual Trigger (Testing)

You can manually test the cron job:

```bash
curl http://localhost:3000/api/cron/refresh-tokens
```

---

## ✅ Verification

### Check Token Status

Visit: **http://localhost:3000/dashboard/social-tokens**

You should see:
- ✅ Status: Active
- ✅ Days Until Expiry: ~60 days
- ✅ Auto-Refresh: Enabled

### Test Posting

1. Go to: **http://localhost:3000/dashboard/cross-poster**
2. Enable Facebook
3. Write a test post
4. Click "Post Now"

If successful, your token is working correctly!

---

## 🔐 Security Features

### Token Encryption
- All tokens are encrypted using **AES-256-GCM** before storage
- Encryption key is stored in environment variables (not in database)

### Automatic Refresh
- Tokens refresh **5 days before expiration**
- No manual intervention needed
- Errors are logged for monitoring

### Fallback Support
- System falls back to `.env` variables if database tokens fail
- Graceful error handling

---

## 🛠️ Troubleshooting

### Issue: "Token expired" error in cross-poster

**Solution:**
1. Go to `/dashboard/social-tokens`
2. Check "Days Until Expiry"
3. Click "Refresh Token Now" button
4. If that fails, click "Update Token" and set up a new token

### Issue: Cron job not running

**Solution:**
1. Check your cron service is configured correctly
2. Test manually: `curl YOUR_DOMAIN/api/cron/refresh-tokens`
3. Check server logs for errors

### Issue: "Encryption key not set" warning

**Solution:**
1. Generate a key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Add to `.env`: `TOKEN_ENCRYPTION_KEY=your_generated_key`
3. Restart your server

---

## 📊 Monitoring

### Admin Dashboard

Visit `/dashboard/social-tokens` to monitor:
- Token expiration date
- Days until expiry
- Last refresh time
- Error count and messages
- Auto-refresh status

### Log Messages

Watch your server logs for:
- `✅ Facebook token refreshed successfully`
- `🔄 Checking tokens for refresh...`
- `❌ Failed to refresh Facebook token`

---

## 🎉 You're All Set!

Your Facebook token will now automatically refresh every ~59 days, ensuring your cross-poster never experiences downtime due to expired tokens.

### What Happens Automatically:

1. **Daily Check** (2 AM): Cron job checks if token needs refresh
2. **Auto-Refresh** (Day 55): Token is automatically refreshed
3. **New Token**: System gets a fresh 60-day token
4. **Seamless**: Users never experience interruptions

No manual intervention needed! 🚀

---

## 📞 Need Help?

If you encounter issues:
1. Check the admin dashboard at `/dashboard/social-tokens`
2. Review server logs for error messages
3. Verify all environment variables are set correctly
4. Test the manual refresh button first

---

## 🔑 Credentials Summary

Here's what you need to provide:

| Credential | Where to Get It | Required? |
|------------|-----------------|-----------|
| `FACEBOOK_APP_ID` | Facebook App Dashboard → Settings → Basic | ✅ Yes |
| `FACEBOOK_APP_SECRET` | Facebook App Dashboard → Settings → Basic | ✅ Yes |
| `TOKEN_ENCRYPTION_KEY` | Generate with crypto.randomBytes(32) | ✅ Yes |
| `CRON_SECRET` | Random string for cron security | ⚠️ Recommended |
| Short-Lived Token | Graph API Explorer | ✅ Yes (one-time) |
| Page ID | Facebook Page → About | ✅ Yes (one-time) |

---

Good luck! Your Facebook integration is now bulletproof. 💪
