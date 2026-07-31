import { PosterCard } from './PosterCard';
import type { JellyfinItem } from '@/lib/types';

interface PosterGridProps {
  items: JellyfinItem[];
  emptyText?: string;
}

export function PosterGrid({ items, emptyText = 'No items found.' }: PosterGridProps) {
  if (items.length === 0) {
    return <p className="py-12 text-center text-muted">{emptyText}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item) => (
        <PosterCard key={item.Id} item={item} />
      ))}
    </div>
  );
}
