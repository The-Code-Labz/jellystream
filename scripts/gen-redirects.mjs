// Generates public/_redirects at build time so the Jellyfin proxy target
// can come from an env var (Netlify doesn't support env var interpolation
// directly inside netlify.toml/_redirects).
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const jellyfinUrl = (process.env.VITE_JELLYFIN_URL || '').replace(/\/$/, '');

// SPA fallback is always required (BrowserRouter routes 404 on Netlify
// without it) — independent of whether the Jellyfin proxy is enabled.
let redirects = '';

if (jellyfinUrl) {
  redirects += `/jellyfin/*  ${jellyfinUrl}/:splat  200\n`;
  console.log(`[gen-redirects] Wrote /jellyfin/* proxy -> ${jellyfinUrl}`);
} else {
  console.log('[gen-redirects] VITE_JELLYFIN_URL not set, skipping /jellyfin proxy redirect.');
}

redirects += '/*  /index.html  200\n';

mkdirSync(publicDir, { recursive: true });
writeFileSync(join(publicDir, '_redirects'), redirects);
console.log('[gen-redirects] Wrote SPA fallback -> /index.html');
