import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PosterCard } from './PosterCard';
import type { JellyfinItem } from '@/lib/types';

interface CarouselProps {
  title: string;
  items: JellyfinItem[];
}

export function Carousel({ title, items }: CarouselProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!rowRef.current) return;
    const amount = rowRef.current.clientWidth * 0.8;
    rowRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  if (items.length === 0) return null;

  return (
    <section className="py-6">
      <div className="mb-3 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <h2 className="text-lg font-bold text-white sm:text-xl">{title}</h2>
        <div className="flex gap-1">
          <button onClick={() => scroll('left')} className="rounded-full bg-surface p-1.5 text-white hover:bg-surfaceHover">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => scroll('right')} className="rounded-full bg-surface p-1.5 text-white hover:bg-surfaceHover">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div
        ref={rowRef}
        className="flex gap-4 overflow-x-auto px-4 pb-4 sm:px-6 lg:px-8 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item) => (
          <PosterCard key={item.Id} item={item} />
        ))}
      </div>
    </section>
  );
}
