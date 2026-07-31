export function SkeletonPosterGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-2">
          <div className="aspect-[2/3] rounded-md bg-surface" />
          <div className="h-4 w-3/4 rounded bg-surface" />
          <div className="h-3 w-1/2 rounded bg-surface" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div className="relative h-[60vh] w-full animate-pulse bg-surface">
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background to-transparent" />
      <div className="absolute bottom-12 left-4 right-4 sm:left-6 lg:left-8">
        <div className="mb-4 h-10 w-2/3 rounded bg-white/10" />
        <div className="mb-2 h-4 w-full max-w-xl rounded bg-white/10" />
        <div className="mb-6 h-4 w-5/6 max-w-lg rounded bg-white/10" />
        <div className="h-10 w-32 rounded bg-white/10" />
      </div>
    </div>
  );
}
