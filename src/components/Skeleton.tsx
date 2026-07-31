export function SkeletonHero() {
  return (
    <div className="relative min-h-hero w-full animate-pulse bg-surface" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      <div className="absolute bottom-10 left-0 right-0 px-5 sm:left-8 sm:px-8 lg:px-12">
        <div className="max-w-[620px] space-y-4">
          <div className="h-12 w-3/4 rounded bg-white/10" />
          <div className="h-4 w-1/2 rounded bg-white/10" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-white/10" />
            <div className="h-4 w-5/6 rounded bg-white/10" />
          </div>
          <div className="flex gap-3 pt-2">
            <div className="h-11 w-32 rounded-lg bg-white/10" />
            <div className="h-11 w-32 rounded-lg bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface SkeletonShelfProps {
  title?: string;
  variant?: 'portrait' | 'landscape';
  count?: number;
}

export function SkeletonShelf({ title, variant = 'portrait', count = 6 }: SkeletonShelfProps) {
  const cardClass =
    variant === 'landscape'
      ? 'aspect-video w-56 sm:w-64 md:w-72'
      : 'aspect-[2/3] w-36 sm:w-44 md:w-48';

  return (
    <section className="py-6" aria-hidden="true">
      <div className="mb-3 flex items-center justify-between px-5 sm:px-8 lg:px-12">
        {title ? (
          <h2 className="text-lg font-bold text-ink sm:text-xl">{title}</h2>
        ) : (
          <div className="h-6 w-40 animate-pulse rounded bg-surface" />
        )}
      </div>
      <div className="flex gap-4 overflow-hidden px-5 sm:px-8 lg:px-12">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`flex-shrink-0 animate-pulse space-y-2 ${cardClass}`}>
            <div className="h-full w-full rounded bg-surface" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function SkeletonPosterGrid() {
  return (
    <div
      className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8"
      aria-hidden="true"
    >
      {Array.from({ length: 16 }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-2">
          <div className="aspect-[2/3] rounded bg-surface" />
          <div className="h-3.5 w-3/4 rounded bg-surface" />
          <div className="h-3 w-1/2 rounded bg-surface" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonPlayer() {
  return (
    <div className="flex w-full flex-1 items-center justify-center bg-[#050607] p-4" aria-hidden="true">
      <div className="aspect-video w-full max-w-7xl animate-pulse overflow-hidden rounded bg-[#121518]">
        <div className="flex h-full flex-col justify-end p-4">
          <div className="mb-3 h-1 w-full rounded bg-white/10" />
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-white/10" />
            <div className="h-9 w-9 rounded-full bg-white/10" />
            <div className="h-3 w-24 rounded bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
