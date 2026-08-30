import type { SyntheticEvent } from 'react';

/**
 * Handles transient <img> load failures for Jellyfin-hosted images (posters, backdrops,
 * episode thumbnails, logos). Root cause of "sometimes no poster": a single failed image
 * request (CDN/edge blip, brief connection reset, Jellyfin image-resize hiccup) permanently
 * fell back to the placeholder with zero retry — no distinction between "this item truly has
 * no image" and "that one request happened to fail". This retries the exact same URL a couple
 * of times with a short, increasing delay and a cache-busting param before giving up.
 */
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

export function handleImageError(
  e: SyntheticEvent<HTMLImageElement, Event>,
  onExhausted?: (img: HTMLImageElement) => void
): void {
  const img = e.currentTarget;
  const original = img.dataset.originalSrc ?? img.src;
  img.dataset.originalSrc = original;
  const retries = Number(img.dataset.retryCount ?? '0');

  if (retries < MAX_RETRIES) {
    img.dataset.retryCount = String(retries + 1);
    window.setTimeout(() => {
      const sep = original.includes('?') ? '&' : '?';
      img.src = `${original}${sep}_retry=${Date.now()}`;
    }, RETRY_DELAY_MS * (retries + 1));
    return;
  }

  if (onExhausted) {
    onExhausted(img);
  } else {
    img.src = '/placeholder-poster.svg';
  }
}
