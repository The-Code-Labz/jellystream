import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Play, Heart, Check, Clock, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchItem, fetchSimilar, fetchSeasons, fetchEpisodes, markPlayed, toggleFavorite, getImageUrl, formatRuntime } from '@/lib/jellyfin';
import { PosterGrid } from '@/components/PosterGrid';
import { SkeletonPosterGrid, SkeletonHero } from '@/components/Skeleton';
import type { JellyfinItem } from '@/lib/types';

export function Detail() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<JellyfinItem | null>(null);
  const [similar, setSimilar] = useState<JellyfinItem[]>([]);
  const [seasons, setSeasons] = useState<JellyfinItem[]>([]);
  const [episodes, setEpisodes] = useState<JellyfinItem[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    async function load() {
      setLoading(true);
      try {
        const [detail, sim] = await Promise.all([
          fetchItem(user!.AccessToken, user!.Id, id!),
          fetchSimilar(user!.AccessToken, user!.Id, id!, 12),
        ]);
        setItem(detail);
        setSimilar(sim.Items);
        if (detail.Type === 'Series') {
          const seas = await fetchSeasons(user!.AccessToken, user!.Id, id!);
          setSeasons(seas.Items);
          if (seas.Items[0]) {
            setSelectedSeason(seas.Items[0].Id);
            const eps = await fetchEpisodes(user!.AccessToken, user!.Id, id!, seas.Items[0].Id);
            setEpisodes(eps.Items);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, id]);

  useEffect(() => {
    if (!user || !item || item.Type !== 'Series' || !selectedSeason) return;
    fetchEpisodes(user!.AccessToken, user!.Id, item.Id, selectedSeason).then((res) => setEpisodes(res.Items)).catch(console.error);
  }, [user, item, selectedSeason]);

  const handleToggleWatched = async () => {
    if (!user || !item) return;
    await markPlayed(user.AccessToken, user.Id, item.Id, !item.UserData?.Played);
    const updated = await fetchItem(user.AccessToken, user.Id, item.Id);
    setItem(updated);
  };

  const handleToggleFavorite = async () => {
    if (!user || !item) return;
    await toggleFavorite(user.AccessToken, user.Id, item.Id, !item.UserData?.IsFavorite);
    const updated = await fetchItem(user.AccessToken, user.Id, item.Id);
    setItem(updated);
  };

  if (loading || !item) return <SkeletonHero />;

  const directors = (item.People?.filter((p) => p.Type === 'Director').map((p) => p.Name)) || [];
  const cast = (item.People?.filter((p) => p.Type === 'Actor').slice(0, 8)) || [];

  return (
    <div className="pb-12">
      <div className="relative h-[60vh] w-full overflow-hidden">
        <img
          src={getImageUrl(item.Id, 'Backdrop', { maxWidth: 1920 })}
          alt={item.Name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row">
            <img
              src={getImageUrl(item.Id, 'Primary', { maxWidth: 400 })}
              alt={item.Name}
              className="hidden w-48 rounded-lg shadow-2xl md:block"
            />
            <div className="flex-1">
              <h1 className="text-3xl font-black text-white sm:text-5xl">{item.Name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/90">
                {item.ProductionYear && <span>{item.ProductionYear}</span>}
                {item.OfficialRating && <span className="rounded border border-white/30 px-1">{item.OfficialRating}</span>}
                {item.RuntimeTicks && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatRuntime(item.RuntimeTicks)}</span>}
                {item.UserData?.Played && <span className="flex items-center gap-1 text-green-400"><Check className="h-3 w-3" /> Watched</span>}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {item.Genres?.map((g) => (
                  <span key={g} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white">{g}</span>
                ))}
              </div>

              <p className="mt-4 max-w-3xl text-base text-white/80">{item.Overview}</p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to={`/watch/${item.Id}`}
                  className="flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 font-semibold text-white hover:bg-accentHover"
                >
                  <Play className="h-5 w-5 fill-white" /> Play
                </Link>
                <button
                  onClick={handleToggleWatched}
                  className="flex items-center gap-2 rounded-lg bg-surface px-5 py-2.5 font-medium text-white hover:bg-surfaceHover"
                >
                  <Check className={`h-5 w-5 ${item.UserData?.Played ? 'text-green-400' : ''}`} />
                  {item.UserData?.Played ? 'Mark Unwatched' : 'Mark Watched'}
                </button>
                <button
                  onClick={handleToggleFavorite}
                  className="flex items-center gap-2 rounded-lg bg-surface px-5 py-2.5 font-medium text-white hover:bg-surfaceHover"
                >
                  <Heart className={`h-5 w-5 ${item.UserData?.IsFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                  {item.UserData?.IsFavorite ? 'Favorited' : 'Favorite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-8 sm:px-6 lg:px-8">
        {directors?.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-2 text-lg font-bold text-white">Director</h3>
            <p className="text-muted">{directors.join(', ')}</p>
          </div>
        )}

        {cast?.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-3 text-lg font-bold text-white">Cast</h3>
            <div className="flex flex-wrap gap-3">
              {cast.map((p) => (
                <div key={p.Name} className="rounded-lg bg-surface px-4 py-2">
                  <p className="text-sm font-medium text-white">{p.Name}</p>
                  {p.Role && <p className="text-xs text-muted">{p.Role}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {item.Type === 'Series' && (
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <h3 className="text-lg font-bold text-white">Episodes</h3>
              <div className="relative">
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="appearance-none rounded-lg border border-white/10 bg-surface px-4 py-2 pr-8 text-sm text-white outline-none"
                >
                  {seasons.map((s) => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              </div>
            </div>

            <div className="space-y-3">
              {episodes.map((ep) => (
                <Link
                  key={ep.Id}
                  to={`/watch/${ep.Id}`}
                  className="flex gap-4 rounded-lg bg-surface p-3 transition hover:bg-surfaceHover"
                >
                  <img
                    src={getImageUrl(ep.Id, 'Primary', { maxWidth: 300 })}
                    alt={ep.Name}
                    className="h-24 w-40 rounded object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-white">
                        E{ep.IndexNumber} · {ep.Name}
                      </h4>
                      {ep.UserData?.Played && <Check className="h-4 w-4 text-green-400" />}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{ep.Overview}</p>
                    {ep.RuntimeTicks && <span className="text-xs text-muted">{formatRuntime(ep.RuntimeTicks)}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <h3 className="mb-4 text-lg font-bold text-white">More Like This</h3>
        {similar.length > 0 ? <PosterGrid items={similar} /> : <SkeletonPosterGrid />}
      </div>
    </div>
  );
}
