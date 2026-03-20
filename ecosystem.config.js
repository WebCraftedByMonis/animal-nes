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
        // Per-platform posting intervals (ms)
        POSTER_FB_INTERVAL:  '20000',              // Facebook: 20s  (~180/hr)
        POSTER_IG_INTERVAL:  String(72 * 60 * 1000), // Instagram: 72min (~20/day)
        POSTER_LI_INTERVAL:  '40000',              // LinkedIn: 40s  (~90/hr)
      },
    },
  ],
};
