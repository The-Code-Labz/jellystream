import { Link } from 'react-router-dom';
import { Play, Star } from 'lucide-react';
import { getImageUrl, formatRuntime } from '@/lib/jellyfin';
import type { JellyfinItem } from '@/lib/types';

interface PosterCardProps {
  item: JellyfinItem;
  progress?: number;
}

export function PosterCard({ item, progress }: PosterCardProps) {
  const isEpisode = item.Type === 'Episode';
  const title = isEpisode ? item.SeriesName || item.Name : item.Name;
  const subtitle = isEpisode ? `S${item.ParentIndexNumber || 0}:E${item.IndexNumber || 0} · ${item.Name}` : '';

  return (
    <Link
      to={item.Type === 'Movie' || item.Type === 'Series' ? `/item/${item.Id}` : `/watch/${item.Id}`}
      className="group relative flex-shrink-0 w-36 sm:w-44 md:w-52 overflow-hidden rounded-md bg-surface transition-transform duration-300 hover:scale-105 hover:z-10"
    >
      <div className="aspect-[2/3] relative overflow-hidden">
        <img
          src={getImageUrl(item.Id, 'Primary', { maxWidth: 400 })}
          alt={item.Name}
          loading="lazy"
          className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-75"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder-poster.svg'; }}
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="rounded-full bg-accent/90 p-3">
            <Play className="h-6 w-6 fill-white text-white" />
          </div>
        </div>
        {progress !== undefined && progress > 0 && progress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
          </div>
        )}
        <div className="absolute top-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
          {item.Type === 'Movie' ? formatRuntime(item.RuntimeTicks) : 'Series'}
        </div>
      </div>
      <div className="p-2">
        <h3 className="truncate text-sm font-semibold text-white">{title}</h3>
        {subtitle ? (
          <p className="truncate text-xs text-muted">{subtitle}</p>
        ) : (
          <div className="mt-1 flex items-center gap-2 text-xs text-muted">
            {item.ProductionYear && <span>{item.ProductionYear}</span>}
            {item.OfficialRating && <span className="rounded border border-white/20 px-1">{item.OfficialRating}</span>}
            {item.UserData?.IsFavorite && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
          </div>
        )}
      </div>
    </Link>
  );
}
