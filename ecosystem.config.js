/**
 * PM2 Ecosystem Config
 * Usage:
 *   pm2 start ecosystem.config.js          # start all
 *   pm2 restart ecosystem.config.js        # restart all
 *   pm2 stop social-auto-poster            # pause poster only
 *   pm2 logs social-auto-poster            # watch poster logs
 */
module.exports = {
  apps: [
    // ── Next.js application ──────────────────────────────────────────────────
    {
      name: 'nextjs',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },

    // ── Social media auto-poster ─────────────────────────────────────────────
    {
      name: 'social-auto-poster',
      script: 'social-auto-poster.js',
      cwd: './',
      instances: 1,        // MUST be 1 — multiple instances would double-post
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      restart_delay: 5000, // wait 5s before restarting on crash
      max_restarts: 20,
      env: {
        NODE_ENV: 'production',
        // How long to wait for Next.js to start before first post (ms)
        POSTER_STARTUP_DELAY: '25000',
        // How often to poll when all content is exhausted (ms) — default 5min
        POSTER_POLL_INTERVAL: String(5 * 60 * 1000),
        // Active platforms (comma-separated) — remove linkedin until ready
        POSTER_PLATFORMS: 'facebook,instagram',
        // Per-platform posting intervals (ms)
        // Facebook  : 1 post / 5min  → 12/hr, 288/day  (conservative, spam-safe)
        // Instagram : 1 post / 72min → 20/day           (hard daily limit)
        POSTER_FB_INTERVAL:  String(5 * 60 * 1000),   // 5 min
        POSTER_IG_INTERVAL:  String(72 * 60 * 1000),  // 72 min
      },
    },
  ],
};
