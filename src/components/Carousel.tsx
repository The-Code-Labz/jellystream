import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PosterCard } from './PosterCard';
import type { JellyfinItem } from '@/lib/types';

interface CarouselProps {
  title: string;
  items: JellyfinItem[];
  variant?: 'portrait' | 'landscape';
  count?: number;
  viewAllHref?: string;
}

export function Carousel({ title, items, variant = 'portrait', count, viewAllHref }: CarouselProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!rowRef.current) return;
    const amount = rowRef.current.clientWidth * 0.8;
    rowRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  if (items.length === 0) return null;

  const headingId = `shelf-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <section className="py-6" aria-labelledby={headingId}>
      <div className="mb-3 flex items-center justify-between px-5 sm:px-8 lg:px-12">
        <div className="flex items-baseline gap-2">
          <h2 id={headingId} className="text-lg font-bold text-ink sm:text-xl">
            {title}
          </h2>
          {count !== undefined && <span className="text-sm text-muted">{count}</span>}
        </div>
        <div className="flex items-center gap-3">
          {viewAllHref && (
            <Link to={viewAllHref} className="text-sm font-medium text-muted hover:text-accent">
              View all
            </Link>
          )}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => scroll('left')}
              aria-label={`Scroll ${title} left`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink hover:bg-surfaceHover"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              aria-label={`Scroll ${title} right`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink hover:bg-surfaceHover"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      <div ref={rowRef} className="no-scrollbar flex gap-4 overflow-x-auto px-5 pb-1 sm:px-8 lg:px-12">
        {items.map((item) => (
          <PosterCard key={item.Id} item={item} variant={variant} progress={progressFor(item)} />
        ))}
      </div>
    </section>
  );
}

function progressFor(item: JellyfinItem): number | undefined {
  const ticks = item.UserData?.PlaybackPositionTicks;
  const runtime = item.RuntimeTicks;
  if (!ticks || !runtime) return undefined;
  return Math.min(100, Math.round((ticks / runtime) * 100));
}
