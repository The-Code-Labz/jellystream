import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Play, Heart, Check, Clock, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchItem, fetchSimilar, fetchSeasons, fetchEpisodes, markPlayed, toggleFavorite, getImageUrl, formatRuntime } from '@/lib/jellyfin';
import { Carousel } from '@/components/Carousel';
import { SkeletonHero } from '@/components/Skeleton';
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
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);
    setError('');
    try {
      const [detail, sim] = await Promise.all([
        fetchItem(user.AccessToken, user.Id, id),
        fetchSimilar(user.AccessToken, user.Id, id, 12),
      ]);
      setItem(detail);
      setSimilar(sim.Items);
      if (detail.Type === 'Series') {
        const seas = await fetchSeasons(user.AccessToken, user.Id, id);
        setSeasons(seas.Items);
        if (seas.Items[0]) {
          setSelectedSeason(seas.Items[0].Id);
          const eps = await fetchEpisodes(user.AccessToken, user.Id, id, seas.Items[0].Id);
          setEpisodes(eps.Items);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load this title.');
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user || !item || item.Type !== 'Series' || !selectedSeason) return;
    fetchEpisodes(user.AccessToken, user.Id, item.Id, selectedSeason).then((res) => setEpisodes(res.Items)).catch(() => null);
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

  if (loading) return <SkeletonHero />;

  if (error || !item) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-5 text-center">
        <p className="text-lg font-semibold text-ink">Couldn&rsquo;t load this title</p>
        <p className="max-w-sm text-sm text-muted">{error || 'The title could not be found.'}</p>
        <button onClick={load} className="flex h-11 items-center rounded-lg bg-surface px-5 text-sm font-semibold text-ink hover:bg-surfaceHover">
          Try again
        </button>
      </div>
    );
  }

  const directors = item.People?.filter((p) => p.Type === 'Director').map((p) => p.Name) || [];
  const cast = item.People?.filter((p) => p.Type === 'Actor').slice(0, 8) || [];
  const isResuming = Boolean(item.UserData?.PlaybackPositionTicks);

  return (
    <div className="pb-16">
      <div className="relative min-h-hero w-full overflow-hidden">
        <img
          src={getImageUrl(item.Id, 'Backdrop', { maxWidth: 1920 })}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />

        <div className="relative flex min-h-hero flex-col justify-end px-5 pb-10 sm:px-8 lg:px-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-end">
            <img
              src={getImageUrl(item.Id, 'Primary', { maxWidth: 400 })}
              alt={`${item.Name} poster`}
              className="hidden w-44 flex-shrink-0 rounded-lg shadow-2xl md:block"
            />
            <div className="max-w-2xl flex-1">
              <h1 className="text-3xl font-extrabold leading-tight text-ink sm:text-5xl">{item.Name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink/90">
                {item.ProductionYear && <span>{item.ProductionYear}</span>}
                {item.OfficialRating && <span className="rounded border border-border px-1.5 text-xs">{item.OfficialRating}</span>}
                {item.RuntimeTicks && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {formatRuntime(item.RuntimeTicks)}
                  </span>
                )}
                {item.UserData?.Played && (
                  <span className="flex items-center gap-1 text-success">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" /> Watched
                  </span>
                )}
              </div>

              {item.Genres && item.Genres.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.Genres.map((g) => (
                    <span key={g} className="rounded border border-border px-2 py-0.5 text-xs text-muted">{g}</span>
                  ))}
                </div>
              )}

              {item.Overview && <p className="mt-4 text-base text-ink/80">{item.Overview}</p>}

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to={`/watch/${item.Id}`}
                  className="flex h-11 items-center gap-2 rounded-lg bg-accent px-6 font-semibold text-background transition-colors duration-180 hover:bg-accentHover"
                >
                  <Play className="h-5 w-5 fill-background" /> {isResuming ? 'Resume' : 'Play'}
                </Link>
                <button
                  onClick={handleToggleWatched}
                  aria-pressed={Boolean(item.UserData?.Played)}
                  className={`flex h-11 items-center gap-2 rounded-lg border px-5 font-medium transition-colors duration-180 ${
                    item.UserData?.Played
                      ? 'border-success/40 bg-success/10 text-success'
                      : 'border-border bg-surface text-ink hover:bg-surfaceHover'
                  }`}
                >
                  <Check className="h-5 w-5" aria-hidden="true" />
                  {item.UserData?.Played ? 'Watched' : 'Mark watched'}
                </button>
                <button
                  onClick={handleToggleFavorite}
                  aria-pressed={Boolean(item.UserData?.IsFavorite)}
                  className={`flex h-11 items-center gap-2 rounded-lg border px-5 font-medium transition-colors duration-180 ${
                    item.UserData?.IsFavorite
                      ? 'border-accent/40 bg-accent/10 text-accent'
                      : 'border-border bg-surface text-ink hover:bg-surfaceHover'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${item.UserData?.IsFavorite ? 'fill-current' : ''}`} aria-hidden="true" />
                  {item.UserData?.IsFavorite ? 'Favorited' : 'Favorite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-10 sm:px-8 lg:px-12">
        <div className="max-w-3xl space-y-8">
          {directors.length > 0 && (
            <div>
              <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">Director</h3>
              <p className="text-ink">{directors.join(', ')}</p>
            </div>
          )}

          {cast.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Cast</h3>
              <div className="flex flex-wrap gap-2">
                {cast.map((p) => (
                  <div key={p.Name} className="rounded-lg bg-surface px-3 py-2">
                    <p className="text-sm font-medium text-ink">{p.Name}</p>
                    {p.Role && <p className="text-xs text-muted">{p.Role}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {item.Type === 'Series' && (
          <div className="mt-10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-ink">Episodes</h3>
              {seasons.length > 0 && (
                <div className="relative">
                  <label htmlFor="season-select" className="sr-only">Season</label>
                  <select
                    id="season-select"
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value)}
                    className="h-10 appearance-none rounded-lg border border-border bg-surface pl-4 pr-9 text-sm text-ink outline-none focus-visible:border-accent"
                  >
                    {seasons.map((s) => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                </div>
              )}
            </div>

            <ul className="space-y-2">
              {episodes.map((ep) => {
                const epProgress =
                  ep.UserData?.PlaybackPositionTicks && ep.RuntimeTicks
                    ? Math.min(100, Math.round((ep.UserData.PlaybackPositionTicks / ep.RuntimeTicks) * 100))
                    : 0;
                return (
                  <li key={ep.Id}>
                    <Link
                      to={`/watch/${ep.Id}`}
                      className="flex gap-4 rounded-lg bg-surface p-3 transition-colors duration-180 hover:bg-surfaceHover"
                    >
                      <div className="relative aspect-video w-36 flex-shrink-0 overflow-hidden rounded sm:w-44">
                        <img
                          src={getImageUrl(ep.Id, 'Primary', { maxWidth: 300 })}
                          alt={`${ep.Name} thumbnail`}
                          loading="lazy"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/placeholder-poster.svg';
                          }}
                        />
                        {epProgress > 0 && epProgress < 100 && (
                          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/15" aria-hidden="true">
                            <div className="h-full bg-accent" style={{ width: `${epProgress}%` }} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="truncate font-semibold text-ink">
                            E{ep.IndexNumber} · {ep.Name}
                          </h4>
                          {ep.UserData?.Played && <Check className="h-4 w-4 flex-shrink-0 text-success" aria-label="Watched" />}
                        </div>
                        {ep.RuntimeTicks && <span className="text-xs text-muted">{formatRuntime(ep.RuntimeTicks)}</span>}
                        {ep.Overview && <p className="mt-1 line-clamp-2 text-sm text-muted">{ep.Overview}</p>}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {similar.length > 0 && <Carousel title="More Like This" items={similar} />}
    </div>
  );
}
