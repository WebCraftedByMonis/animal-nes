'use strict';

/**
 * Social Media Auto-Poster
 * Runs as a PM2 worker process alongside Next.js.
 * Posts products, news, jobs, animals, and dynamic forms to Facebook/Instagram/LinkedIn.
 *
 * Rate limits used:
 *   Facebook  : 1 post / 20s  (~180/hr)
 *   Instagram : 1 post / 72min (~20/day)
 *   LinkedIn  : 1 post / 40s  (~90/hr)
 *
 * State persisted in DB (SocialAutoPostLog) — survives PM2 restarts.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Config ────────────────────────────────────────────────────────────────────

const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL || 'https://animalwellness.shop';
const APP_URL   = process.env.APP_INTERNAL_URL     || 'http://localhost:3000';
const STARTUP_DELAY_MS = parseInt(process.env.POSTER_STARTUP_DELAY || '20000', 10);
const POLL_INTERVAL_MS  = parseInt(process.env.POSTER_POLL_INTERVAL || String(5 * 60 * 1000), 10);

// Milliseconds between posts per platform
const INTERVALS = {
  facebook:  parseInt(process.env.POSTER_FB_INTERVAL  || String(5 * 60 * 1000), 10), // 5min
  instagram: parseInt(process.env.POSTER_IG_INTERVAL  || String(72 * 60 * 1000), 10), // 72min
  // linkedin removed — re-add when ready
};

// Platforms that are currently active
const PLATFORMS = (process.env.POSTER_PLATFORMS || 'facebook,instagram').split(',').map(p => p.trim());

// ── Character limits per platform ────────────────────────────────────────────
// These are the official API hard limits for post captions/text.

const CHAR_LIMITS = {
  facebook:  63206, // Facebook page post body limit
  instagram:  2200, // Instagram caption limit
  linkedin:   3000, // LinkedIn UGC post commentary limit
};

// ── Text helpers ──────────────────────────────────────────────────────────────

function truncate(text, max) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max).trimEnd() + '...' : text;
}

/**
 * Apply the platform character limit to the final post text.
 * Cuts at the last word boundary before the limit and appends '...'.
 */
function applyPlatformLimit(text, platform) {
  const limit = CHAR_LIMITS[platform];
  if (!limit || text.length <= limit) return text;

  // Cut at last whitespace before limit to avoid splitting mid-word
  const cut = text.slice(0, limit - 3); // leave room for '...'
  const lastSpace = cut.lastIndexOf(' ');
  const trimmed = lastSpace > limit * 0.8 ? cut.slice(0, lastSpace) : cut;
  return trimmed.trimEnd() + '...';
}

function formatProduct(p) {
  const price = p.variants?.[0]?.customerPrice;
  const priceText = price ? `\n\n💰 Price: PKR ${price}` : '';
  const desc = truncate(p.description, 400);
  return `${p.productName}${desc ? '\n\n' + desc : ''}${priceText}`;
}

function formatNews(n) {
  return `${n.title}\n\n${truncate(n.description, 500)}`;
}

function formatJob(j) {
  return [
    `🚀 Job Opportunity: ${j.position}`,
    `🏢 Company: ${j.company}`,
    `📋 Eligibility: ${truncate(j.eligibility, 200)}`,
    `🎁 Benefits: ${truncate(j.benefits, 200)}`,
    `📍 Location: ${j.location}`,
    `⏰ Deadline: ${j.deadline}`,
  ].join('\n');
}

function formatAnimal(a) {
  return [
    `🐾 ${a.specie} - ${a.breed}`,
    `📍 Location: ${a.location}`,
    `💰 Price: PKR ${a.totalPrice}`,
  ].join('\n');
}

function formatForm(f) {
  return `${f.title}${f.description ? '\n\n' + truncate(f.description, 500) : ''}`;
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function getPostedIds(platform, contentType) {
  const logs = await prisma.socialAutoPostLog.findMany({
    // include 'failed' — prevents infinite retry loop on the same broken item
    // user can hit Re-queue in the dashboard to retry a specific failed item
    where: { platform, contentType, status: { in: ['posted', 'skipped', 'failed'] } },
    select: { contentId: true },
  });
  return new Set(logs.map(l => l.contentId));
}

async function markLog(contentType, contentId, platform, status, error) {
  const data = {
    status,
    error: error || null,
    postedAt: status === 'posted' ? new Date() : undefined,
    updatedAt: new Date(),
  };
  await prisma.socialAutoPostLog.upsert({
    where: { contentType_contentId_platform: { contentType, contentId, platform } },
    create: { contentType, contentId, platform, ...data },
    update: data,
  });
}

// ── Content fetchers ──────────────────────────────────────────────────────────

function toExcludeInts(set) {
  const nums = [...set].map(Number).filter(n => Number.isInteger(n) && n > 0);
  return nums.length ? nums : [-1];
}

async function getNextProduct(posted) {
  return prisma.product.findFirst({
    where: { isActive: true, id: { notIn: toExcludeInts(posted) } },
    orderBy: { id: 'asc' },
    include: { image: true, variants: { orderBy: { customerPrice: 'asc' }, take: 1 } },
  });
}

async function getNextNews(posted) {
  return prisma.animalNews.findFirst({
    where: { isActive: true, id: { notIn: toExcludeInts(posted) } },
    orderBy: { id: 'asc' },
    include: { image: true },
  });
}

async function getNextJob(posted) {
  return prisma.jobForm.findFirst({
    where: { id: { notIn: toExcludeInts(posted) } },
    orderBy: { id: 'asc' },
    include: { jobFormImage: true },
  });
}

async function getNextAnimal(posted) {
  return prisma.sellAnimal.findFirst({
    where: { status: 'PENDING', id: { notIn: toExcludeInts(posted) } },
    orderBy: { id: 'asc' },
    include: { images: { take: 1 } },
  });
}

async function getNextForm(posted) {
  // DynamicForm uses cuid string IDs — exclude directly
  return prisma.dynamicForm.findFirst({
    where: { isActive: true, id: { notIn: [...posted] } },
    orderBy: { createdAt: 'asc' },
  });
}

// Content type definitions
const CONTENT_TYPES = [
  {
    type: 'product',
    getter: getNextProduct,
    formatter: formatProduct,
    // Only attach a link if the product has some real content to show.
    // Empty products (name-only) post as plain text — no link card.
    // LinkedIn never gets a link to avoid pharmaceutical policy flags.
    linkFn: (item, platform) => {
      if (platform === 'linkedin') return null;
      const hasContent = item.image || item.description || item.variants?.[0]?.customerPrice;
      return hasContent ? `${SITE_URL}/products/${item.id}` : null;
    },
    imageFn: item => item.image?.url || null,
  },
  {
    type: 'news',
    getter: getNextNews,
    formatter: formatNews,
    linkFn:  null,
    imageFn: item => item.image?.url || null,
  },
  {
    type: 'job',
    getter: getNextJob,
    formatter: formatJob,
    linkFn:  null,
    imageFn: item => item.jobFormImage?.url || null,
  },
  {
    type: 'animal',
    getter: getNextAnimal,
    formatter: formatAnimal,
    linkFn:  null,
    imageFn: item => item.images?.[0]?.url || null,
  },
  {
    type: 'form',
    getter: getNextForm,
    formatter: formatForm,
    linkFn:  item => `${SITE_URL}/forms/${item.slug}`,
    imageFn: item => item.thumbnailUrl || null,
  },
];

async function getNextItem(platform) {
  for (const { type, getter, formatter, linkFn, imageFn } of CONTENT_TYPES) {
    const posted = await getPostedIds(platform, type);
    const item   = await getter(posted);
    if (!item) continue;

    return {
      contentType: type,
      contentId:   String(item.id),
      content:     formatter(item),
      link:        linkFn ? linkFn(item, platform) : null,
      imageUrl:    imageFn(item),
    };
  }
  return null; // all content posted for this platform
}

// ── Social API callers ────────────────────────────────────────────────────────

async function callRoute(endpoint, fields) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null && value !== undefined) formData.append(key, String(value));
  }
  const res  = await fetch(`${APP_URL}${endpoint}`, { method: 'POST', body: formData });
  const json = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` }));
  return json;
}

async function postFacebook(content, imageUrl, link) {
  const limited = applyPlatformLimit(content, 'facebook');
  const fields = { content: limited };
  if (link)          fields.link     = link;
  else if (imageUrl) fields.imageUrl = imageUrl;
  return callRoute('/api/social/facebook', fields);
}

async function postInstagram(content, imageUrl) {
  if (!imageUrl) return { success: false, skip: true, error: 'No image available for Instagram' };
  const caption = applyPlatformLimit(`${content}\n\n${SITE_URL}`, 'instagram');
  return callRoute('/api/social/instagram', {
    content: caption,
    imageUrl,
    mediaCount: '0',
  });
}

async function postLinkedIn(content, link) {
  const limited = applyPlatformLimit(content, 'linkedin');
  const fields = { content: limited };
  if (link) fields.link = link;
  return callRoute('/api/social/linkedin', fields);
}

// ── Throttle detection ────────────────────────────────────────────────────────

// How long to back off when a platform throttles us (ms)
const THROTTLE_BACKOFF = {
  facebook:  2 * 60 * 60 * 1000,  // 2 hours
  instagram: 2 * 60 * 60 * 1000,  // 2 hours
  linkedin:  6 * 60 * 60 * 1000,  // 6 hours (daily limit resets at midnight UTC)
};

const THROTTLE_PHRASES = [
  'we limit how often',
  'rate limit',
  'throttle',
  'too many requests',
  'spam',
  'day limit',
  'application_and_member',
];

function isThrottleError(msg) {
  if (!msg) return false;
  const lower = msg.toLowerCase();
  return THROTTLE_PHRASES.some(p => lower.includes(p));
}

// ── Core posting logic ────────────────────────────────────────────────────────

// Returns: true (posted/skipped/failed), false (no content left), 'throttled'
async function postNextItem(platform) {
  const item = await getNextItem(platform);

  if (!item) {
    console.log(`[${platform}] ⏸  All content posted — polling every ${POLL_INTERVAL_MS / 60000}min for new items`);
    return false;
  }

  const { contentType, contentId, content, link, imageUrl } = item;
  console.log(`[${platform}] ▶  Posting ${contentType} #${contentId}…`);

  let result;
  try {
    if (platform === 'facebook') {
      result = await postFacebook(content, imageUrl, link);
    } else if (platform === 'instagram') {
      result = await postInstagram(content, imageUrl);
    } else if (platform === 'linkedin') {
      result = await postLinkedIn(content, link);
    }

    if (result?.skip) {
      await markLog(contentType, contentId, platform, 'skipped', result.error);
      console.log(`[${platform}] ⏭  Skipped ${contentType} #${contentId}: ${result.error}`);
    } else if (result?.success) {
      await markLog(contentType, contentId, platform, 'posted');
      console.log(`[${platform}] ✅ Posted ${contentType} #${contentId}`);
    } else {
      const err = result?.error || 'Unknown error';
      // Throttle / rate-limit — do NOT mark item as failed, just back off
      if (isThrottleError(err)) {
        console.warn(`[${platform}] ⏳ Throttled by platform — backing off ${THROTTLE_BACKOFF[platform] / 3600000}h. Item #${contentId} will be retried.`);
        return 'throttled';
      }
      await markLog(contentType, contentId, platform, 'failed', err);
      console.error(`[${platform}] ❌ Failed ${contentType} #${contentId}: ${err}`);
    }
  } catch (err) {
    if (isThrottleError(err.message)) {
      console.warn(`[${platform}] ⏳ Throttled — backing off. Item #${contentId} will be retried.`);
      return 'throttled';
    }
    await markLog(contentType, contentId, platform, 'failed', err.message);
    console.error(`[${platform}] ❌ Error posting ${contentType} #${contentId}:`, err.message);
  }

  return true; // more content may exist
}

// ── Per-platform loop ─────────────────────────────────────────────────────────

async function runPlatformLoop(platform) {
  const interval = INTERVALS[platform];
  console.log(`[${platform}] Starting (interval: ${interval / 1000}s, poll when idle: ${POLL_INTERVAL_MS / 60000}min)`);

  async function tick() {
    try {
      const result = await postNextItem(platform);
      if (result === 'throttled') {
        const backoff = THROTTLE_BACKOFF[platform];
        console.log(`[${platform}] 💤 Sleeping ${backoff / 3600000}h before retrying…`);
        setTimeout(tick, backoff);
      } else {
        setTimeout(tick, result ? interval : POLL_INTERVAL_MS);
      }
    } catch (err) {
      console.error(`[${platform}] Loop error:`, err.message);
      setTimeout(tick, interval);
    }
  }

  tick();
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────

async function shutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully…`);
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ── Startup ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Social Auto Poster starting…');
  console.log(`   App URL  : ${APP_URL}`);
  console.log(`   Site URL : ${SITE_URL}`);
  console.log(`   Startup delay: ${STARTUP_DELAY_MS / 1000}s`);

  // Give Next.js time to boot
  await new Promise(r => setTimeout(r, STARTUP_DELAY_MS));

  console.log('▶  Launching platform loops…');
  PLATFORMS.forEach(runPlatformLoop);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
