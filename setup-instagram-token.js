/**
 * Setup Instagram Token Script
 *
 * This script creates an Instagram record in the SocialMediaToken table
 * based on your existing Facebook token (since Instagram uses Facebook Graph API)
 *
 * Usage:
 * 1. Make sure you have regenerated your Facebook token with Instagram permissions:
 *    - instagram_basic
 *    - instagram_content_publish
 *    - pages_read_engagement
 *
 * 2. Run this script:
 *    node setup-instagram-token.js YOUR_INSTAGRAM_ACCOUNT_ID
 *
 * Example:
 *    node setup-instagram-token.js 17841469005860042
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupInstagramToken(instagramAccountId) {
  try {
    console.log('🔍 Checking for existing Facebook token...');

    // Get existing Facebook token
    const facebookToken = await prisma.socialMediaToken.findUnique({
      where: { platform: 'facebook' },
    });

    if (!facebookToken) {
      console.error('❌ No Facebook token found in database!');
      console.error('Please set up Facebook token first.');
      process.exit(1);
    }

    if (!facebookToken.isActive) {
      console.error('❌ Facebook token is inactive!');
      console.error('Please activate Facebook token first.');
      process.exit(1);
    }

    console.log('✅ Found Facebook token');
    console.log(`   Page ID: ${facebookToken.pageId}`);

    // Check if Instagram token already exists
    const existingInstagram = await prisma.socialMediaToken.findUnique({
      where: { platform: 'instagram' },
    });

    if (existingInstagram) {
      console.log('⚠️  Instagram token already exists. Updating...');

      await prisma.socialMediaToken.update({
        where: { platform: 'instagram' },
        data: {
          accessToken: facebookToken.accessToken, // Same encrypted token as Facebook
          accountId: instagramAccountId,
          pageId: facebookToken.pageId,
          isActive: true,
          lastRefreshed: new Date(),
          updatedAt: new Date(),
        },
      });

      console.log('✅ Instagram token updated successfully!');
    } else {
      console.log('📝 Creating new Instagram token record...');

      await prisma.socialMediaToken.create({
        data: {
          platform: 'instagram',
          accessToken: facebookToken.accessToken, // Same encrypted token as Facebook
          accountId: instagramAccountId,
          pageId: facebookToken.pageId,
          tokenType: 'Bearer',
          expiresAt: facebookToken.expiresAt,
          lastRefreshed: new Date(),
          isActive: true,
          autoRefresh: true,
          refreshBeforeDays: 5,
        },
      });

      console.log('✅ Instagram token created successfully!');
    }

    console.log('\n📋 Instagram Configuration:');
    console.log(`   Platform: instagram`);
    console.log(`   Account ID: ${instagramAccountId}`);
    console.log(`   Page ID: ${facebookToken.pageId}`);
    console.log(`   Token: Using Facebook token (encrypted)`);
    console.log(`   Status: Active`);
    console.log('\n✅ Instagram posting is now configured!');
    console.log('\n⚠️  IMPORTANT: Make sure your Facebook token has these permissions:');
    console.log('   - instagram_basic');
    console.log('   - instagram_content_publish');
    console.log('   - pages_read_engagement');

  } catch (error) {
    console.error('❌ Error setting up Instagram token:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get Instagram Account ID from command line argument
const instagramAccountId = process.argv[2];

if (!instagramAccountId) {
  console.error('❌ Error: Instagram Account ID is required!');
  console.error('\nUsage:');
  console.error('  node setup-instagram-token.js YOUR_INSTAGRAM_ACCOUNT_ID');
  console.error('\nExample:');
  console.error('  node setup-instagram-token.js 17841469005860042');
  console.error('\n💡 To find your Instagram Account ID:');
  console.error('  1. Go to business.facebook.com');
  console.error('  2. Click Settings → Instagram accounts');
  console.error('  3. Copy the ID shown for your Instagram account');
  process.exit(1);
}

// Run the setup
setupInstagramToken(instagramAccountId);
