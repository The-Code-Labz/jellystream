import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Info, LibraryBig } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLibrary } from '@/context/LibraryContext';
import { fetchRecentlyAdded, fetchContinueWatching, fetchNextUp, fetchItems, getImageUrl, formatRuntime } from '@/lib/jellyfin';
import { Carousel } from '@/components/Carousel';
import { SkeletonHero, SkeletonShelf } from '@/components/Skeleton';
import type { JellyfinItem } from '@/lib/types';

export function Home() {
  const { user } = useAuth();
  const { libraryId } = useLibrary();
  const [hero, setHero] = useState<JellyfinItem | null>(null);
  const [recentlyAdded, setRecentlyAdded] = useState<JellyfinItem[]>([]);
  const [continueWatching, setContinueWatching] = useState<JellyfinItem[]>([]);
  const [nextUp, setNextUp] = useState<JellyfinItem[]>([]);
  const [movies, setMovies] = useState<JellyfinItem[]>([]);
  const [shows, setShows] = useState<JellyfinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logoFailed, setLogoFailed] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [recent, resume, upcoming, movieRes, showRes] = await Promise.all([
        fetchRecentlyAdded(user.AccessToken, user.Id, 20, libraryId || undefined),
        fetchContinueWatching(user.AccessToken, user.Id, 20, libraryId || undefined),
        fetchNextUp(user.AccessToken, user.Id, 20, libraryId || undefined),
        fetchItems(user.AccessToken, user.Id, {
          Recursive: true,
          IncludeItemTypes: 'Movie',
          SortBy: 'SortName',
          Limit: 20,
          ...(libraryId && { ParentId: libraryId }),
        }),
        fetchItems(user.AccessToken, user.Id, {
          Recursive: true,
          IncludeItemTypes: 'Series',
          SortBy: 'SortName',
          Limit: 20,
          ...(libraryId && { ParentId: libraryId }),
        }),
      ]);
      setRecentlyAdded(recent.Items);
      setContinueWatching(resume.Items);
      setNextUp(upcoming.Items);
      setMovies(movieRes.Items);
      setShows(showRes.Items);
      setHero(resume.Items[0] || recent.Items[0] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your library.');
    } finally {
      setLoading(false);
    }
  }, [user, libraryId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setLogoFailed(false);
  }, [hero?.Id]);

  if (loading) {
    return (
      <div className="pb-16">
        <SkeletonHero />
        <SkeletonShelf variant="landscape" count={5} />
        <SkeletonShelf count={7} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-5 text-center">
        <p className="text-lg font-semibold text-ink">Couldn&rsquo;t load your library</p>
        <p className="max-w-sm text-sm text-muted">{error}</p>
        <button
          onClick={load}
          className="flex h-11 items-center rounded-lg bg-surface px-5 text-sm font-semibold text-ink hover:bg-surfaceHover"
        >
          Try again
        </button>
      </div>
    );
  }

  const isResuming = Boolean(hero?.UserData?.PlaybackPositionTicks);
  const heroMeta = hero
    ? [
        hero.ProductionYear ? String(hero.ProductionYear) : null,
        hero.OfficialRating,
        hero.RuntimeTicks ? formatRuntime(hero.RuntimeTicks) : null,
        ...(hero.Genres?.slice(0, 3) || []),
      ].filter(Boolean)
    : [];

  const overlapContinueWatching = Boolean(hero) && continueWatching.length > 0;

  return (
    <div className="pb-16">
      {hero ? (
        <div className="relative min-h-hero w-full overflow-hidden">
          <img
            src={getImageUrl(hero.Id, 'Backdrop', { maxWidth: 1920 })}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/30 to-transparent" />

          <div className="relative flex min-h-hero flex-col justify-end px-5 pb-14 sm:px-8 lg:px-12">
            <div className="max-w-[620px]">
              {!logoFailed ? (
                <img
                  src={getImageUrl(hero.Id, 'Logo', { maxWidth: 500 })}
                  alt={hero.Name}
                  onError={() => setLogoFailed(true)}
                  className="mb-4 max-h-24 max-w-full object-contain object-left"
                />
              ) : (
                <h1 className="mb-3 text-4xl font-extrabold leading-tight text-ink sm:text-5xl lg:text-6xl">{hero.Name}</h1>
              )}

              <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink/90">
                {heroMeta.map((m, i) => (
                  <span key={`${m}-${i}`} className="flex items-center gap-2">
                    {i > 0 && <span className="text-muted" aria-hidden="true">·</span>}
                    {m}
                  </span>
                ))}
              </div>

              {hero.Overview && <p className="mb-6 line-clamp-2 max-w-lg text-base text-ink/80">{hero.Overview}</p>}

              <div className="flex flex-wrap gap-3">
                <Link
                  to={`/watch/${hero.Id}`}
                  className="flex h-11 items-center gap-2 rounded-lg bg-accent px-6 font-semibold text-background transition-colors duration-180 hover:bg-accentHover"
                >
                  <Play className="h-5 w-5 fill-background" /> {isResuming ? 'Resume' : 'Play'}
                </Link>
                <Link
                  to={`/item/${hero.Id}`}
                  className="flex h-11 items-center gap-2 rounded-lg bg-surface/80 px-6 font-semibold text-ink hover:bg-surfaceHover"
                >
                  <Info className="h-5 w-5" /> Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-hero flex-col items-center justify-center gap-3 px-5 text-center">
          <LibraryBig className="h-10 w-10 text-muted" aria-hidden="true" />
          <p className="text-lg font-semibold text-ink">Your library is empty</p>
          <p className="max-w-sm text-sm text-muted">Add movies or series in Jellyfin and they&rsquo;ll show up here.</p>
        </div>
      )}

      <div className={overlapContinueWatching ? 'relative z-10 -mt-16 sm:-mt-20' : ''}>
        {continueWatching.length > 0 && <Carousel title="Continue Watching" items={continueWatching} variant="landscape" />}
      </div>
      {nextUp.length > 0 && <Carousel title="Next Up" items={nextUp} variant="landscape" />}
      <Carousel title="Recently Added" items={recentlyAdded} viewAllHref="/catalog" />
      <Carousel title="Movies" items={movies} viewAllHref="/movies" />
      <Carousel title="Series" items={shows} viewAllHref="/shows" />
    </div>
  );
}
