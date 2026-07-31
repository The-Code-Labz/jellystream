import type { ReactNode } from 'react';
import { PosterCard } from './PosterCard';
import type { JellyfinItem } from '@/lib/types';

interface PosterGridProps {
  items: JellyfinItem[];
  emptyState?: ReactNode;
  emptyText?: string;
}

export function PosterGrid({ items, emptyState, emptyText = 'No items found.' }: PosterGridProps) {
  if (items.length === 0) {
    return <>{emptyState ?? <p className="py-16 text-center text-muted">{emptyText}</p>}</>;
  }

  return (
    <div
      role="list"
      className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8"
    >
      {items.map((item) => (
        <div key={item.Id} role="listitem">
          <PosterCard item={item} />
        </div>
      ))}
    </div>
  );
}
