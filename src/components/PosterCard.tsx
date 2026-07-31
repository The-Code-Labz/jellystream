import { Link } from 'react-router-dom';
import { Play, Star, Check } from 'lucide-react';
import { getImageUrl, formatRuntime } from '@/lib/jellyfin';
import type { JellyfinItem } from '@/lib/types';

interface PosterCardProps {
  item: JellyfinItem;
  progress?: number;
  variant?: 'portrait' | 'landscape';
}

export function PosterCard({ item, progress, variant = 'portrait' }: PosterCardProps) {
  const isEpisode = item.Type === 'Episode';
  const title = isEpisode ? item.SeriesName || item.Name : item.Name;
  const subtitle = isEpisode ? `S${item.ParentIndexNumber || 0}:E${item.IndexNumber || 0} · ${item.Name}` : '';
  const imageType = variant === 'landscape' && !isEpisode ? 'Backdrop' : 'Primary';
  const typeLabel =
    item.Type === 'Series'
      ? 'Series'
      : item.RuntimeTicks
      ? formatRuntime(item.RuntimeTicks)
      : undefined;

  const showProgress = progress !== undefined && progress > 0 && progress < 100;
  const alt = isEpisode ? `${title} — ${subtitle}` : `${title}${item.ProductionYear ? `, ${item.ProductionYear}` : ''}`;

  const sizeClass =
    variant === 'landscape'
      ? 'w-56 sm:w-64 md:w-72'
      : 'w-36 sm:w-44 md:w-48';
  const aspectClass = variant === 'landscape' ? 'aspect-video' : 'aspect-[2/3]';

  return (
    <Link
      to={item.Type === 'Movie' || item.Type === 'Series' ? `/item/${item.Id}` : `/watch/${item.Id}`}
      className={`group relative flex-shrink-0 rounded transition-transform duration-220 hover:scale-102 focus-visible:scale-102 ${sizeClass}`}
    >
      <div className={`relative overflow-hidden rounded bg-surface ${aspectClass}`}>
        <img
          src={getImageUrl(item.Id, imageType, { maxWidth: variant === 'landscape' ? 500 : 400 })}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/placeholder-poster.svg';
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded ring-1 ring-inset ring-transparent transition-colors duration-220 group-hover:ring-accent group-focus-visible:ring-accent"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/70 opacity-0 transition-opacity duration-220 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <Play className="h-4 w-4 fill-ink text-ink" />
        </div>

        <div className="absolute left-2 top-2 flex items-center gap-1">
          {item.UserData?.Played && (
            <span
              className="flex h-6 w-6 items-center justify-center rounded bg-background/70 text-success"
              aria-label="Watched"
              title="Watched"
            >
              <Check className="h-3.5 w-3.5" />
            </span>
          )}
          {item.UserData?.IsFavorite && (
            <span
              className="flex h-6 w-6 items-center justify-center rounded bg-background/70 text-accent"
              aria-label="Favorite"
              title="Favorite"
            >
              <Star className="h-3.5 w-3.5 fill-current" />
            </span>
          )}
        </div>

        {typeLabel && (
          <div className="absolute right-2 top-2 rounded bg-background/70 px-1.5 py-0.5 text-[11px] font-medium text-ink">
            {typeLabel}
          </div>
        )}

        {showProgress && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/15" aria-hidden="true">
            <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <div className="pt-2">
        <h3 className="truncate text-sm font-semibold text-ink">{title}</h3>
        {subtitle ? (
          <p className="truncate text-xs text-muted">{subtitle}</p>
        ) : (
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
            {item.ProductionYear && <span>{item.ProductionYear}</span>}
            {item.OfficialRating && <span className="rounded border border-border px-1">{item.OfficialRating}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
