import type { ReactNode } from 'react';
import { PosterCard } from './PosterCard';
import { progressPercent } from '@/lib/jellyfin';
import type { JellyfinItem } from '@/lib/types';

interface PosterGridProps {
  items: JellyfinItem[];
  emptyState?: ReactNode;
  emptyText?: string;
  variant?: 'portrait' | 'landscape';
}

export function PosterGrid({ items, emptyState, emptyText = 'No items found.', variant = 'portrait' }: PosterGridProps) {
  if (items.length === 0) {
    return <>{emptyState ?? <p className="py-16 text-center text-muted">{emptyText}</p>}</>;
  }

  const gridClass =
    variant === 'landscape'
      ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
      : 'grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8';

  return (
    <div role="list" className={gridClass}>
      {items.map((item) => (
        <div key={item.Id} role="listitem">
          <PosterCard item={item} progress={progressPercent(item)} variant={variant} />
        </div>
      ))}
    </div>
  );
}
