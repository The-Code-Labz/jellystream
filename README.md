# JellyStream

An FMovies-style streaming catalog frontend for a self-hosted [Jellyfin](https://jellyfin.org) server.

Clone it, point it at your Jellyfin URL, sign in with your Jellyfin credentials, and browse your movies and TV shows with a cinematic dark UI.

## Features

- Jellyfin username/password authentication
- Home page with hero banner, continue watching, next up, recently added, movies, and TV shows
- Catalog pages with genre, year, and sort filters
- Search across your library
- Movie/series detail pages with cast, similar titles, and season/episode lists
- Watch page with `hls.js` playback, progress reporting, audio/subtitle selection, and fullscreen
- Responsive dark theme with poster hover zoom and loading skeletons

## Tech Stack

- React 18 + Vite + TypeScript
- Tailwind CSS
- React Router
- hls.js
- lucide-react

## Quick Start

```bash
git clone https://github.com/The-Code-Labz/jellystream.git
cd jellystream
cp .env.example .env.local
# Edit .env.local and set VITE_JELLYFIN_URL to your Jellyfin server
npm install
npm run dev
```

Open `http://localhost:5173` and sign in.

## Environment Variables

```bash
# Jellyfin server URL (no trailing slash)
VITE_JELLYFIN_URL=http://localhost:8096

# App metadata sent in Jellyfin auth headers
VITE_JELLYFIN_APP_NAME=JellyStream
VITE_JELLYFIN_APP_VERSION=1.0.0

# Use the Vite dev proxy at /jellyfin to avoid CORS during development
VITE_USE_PROXY=false
```

## Jellyfin CORS / Deployment

Jellyfin's default CORS settings are restrictive. You have three options:

1. **Same origin** — serve the built app from the same origin as Jellyfin.
2. **Reverse proxy** — put both Jellyfin and this app behind the same domain (e.g., Nginx, Caddy, Traefik).
3. **Dev proxy** — set `VITE_USE_PROXY=true` during development to forward `/jellyfin` to your Jellyfin server.

For production, the recommended setup is a reverse proxy so the frontend and Jellyfin share a domain.

## Production Build

```bash
npm run build
npm run preview
```

The `dist/` folder contains the static frontend. Serve it with any static host or CDN.

## License

MIT
