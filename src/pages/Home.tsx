import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchRecentlyAdded, fetchContinueWatching, fetchNextUp, fetchItems, getImageUrl } from '@/lib/jellyfin';
import { Carousel } from '@/components/Carousel';
import { SkeletonHero } from '@/components/Skeleton';
import type { JellyfinItem } from '@/lib/types';

export function Home() {
  const { user } = useAuth();
  const [hero, setHero] = useState<JellyfinItem | null>(null);
  const [recentlyAdded, setRecentlyAdded] = useState<JellyfinItem[]>([]);
  const [continueWatching, setContinueWatching] = useState<JellyfinItem[]>([]);
  const [nextUp, setNextUp] = useState<JellyfinItem[]>([]);
  const [movies, setMovies] = useState<JellyfinItem[]>([]);
  const [shows, setShows] = useState<JellyfinItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const [recent, resume, upcoming, movieRes, showRes] = await Promise.all([
          fetchRecentlyAdded(user!.AccessToken, user!.Id, 20),
          fetchContinueWatching(user!.AccessToken, user!.Id, 20),
          fetchNextUp(user!.AccessToken, user!.Id, 20),
          fetchItems(user!.AccessToken, user!.Id, { Recursive: true, IncludeItemTypes: 'Movie', SortBy: 'SortName', Limit: 20 }),
          fetchItems(user!.AccessToken, user!.Id, { Recursive: true, IncludeItemTypes: 'Series', SortBy: 'SortName', Limit: 20 }),
        ]);
        setRecentlyAdded(recent.Items);
        setContinueWatching(resume.Items);
        setNextUp(upcoming.Items);
        setMovies(movieRes.Items);
        setShows(showRes.Items);
        setHero(recent.Items[0] || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (loading) return <SkeletonHero />;

  return (
    <div className="pb-12">
      {hero && (
        <div className="relative h-[70vh] w-full overflow-hidden">
          <img
            src={getImageUrl(hero.Id, 'Backdrop', { maxWidth: 1920 })}
            alt={hero.Name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-12 sm:px-6 lg:px-8">
            <h1 className="mb-2 text-4xl font-black text-white sm:text-5xl lg:text-6xl">{hero.Name}</h1>
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-white/90">
              {hero.ProductionYear && <span>{hero.ProductionYear}</span>}
              {hero.OfficialRating && <span className="rounded border border-white/30 px-1">{hero.OfficialRating}</span>}
              {hero.Genres?.slice(0, 3).map((g) => <span key={g}>{g}</span>)}
            </div>
            <p className="mb-6 line-clamp-3 max-w-2xl text-base text-white/80 sm:text-lg">{hero.Overview}</p>
            <div className="flex gap-3">
              <Link
                to={`/watch/${hero.Id}`}
                className="flex items-center gap-2 rounded-lg bg-accent px-6 py-3 font-semibold text-white hover:bg-accentHover"
              >
                <Play className="h-5 w-5 fill-white" /> Play Now
              </Link>
              <Link
                to={`/item/${hero.Id}`}
                className="flex items-center gap-2 rounded-lg bg-white/20 px-6 py-3 font-semibold text-white backdrop-blur hover:bg-white/30"
              >
                <Info className="h-5 w-5" /> More Info
              </Link>
            </div>
          </div>
        </div>
      )}

      {continueWatching.length > 0 && <Carousel title="Continue Watching" items={continueWatching} />}
      {nextUp.length > 0 && <Carousel title="Next Up" items={nextUp} />}
      <Carousel title="Recently Added" items={recentlyAdded} />
      <Carousel title="Movies" items={movies} />
      <Carousel title="TV Shows" items={shows} />
    </div>
  );
}
