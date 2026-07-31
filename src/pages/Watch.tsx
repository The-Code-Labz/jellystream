import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchItem, getPlaybackInfo, getStreamUrl, getImageUrl } from '@/lib/jellyfin';
import { VideoPlayer } from '@/components/VideoPlayer';
import { SkeletonPlayer } from '@/components/Skeleton';
import type { JellyfinItem, MediaSource } from '@/lib/types';

export function Watch() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<JellyfinItem | null>(null);
  const [source, setSource] = useState<MediaSource | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);
    setError('');
    setSource(null);
    try {
      const detail = await fetchItem(user.AccessToken, user.Id, id);
      setItem(detail);
      const info = await getPlaybackInfo(user.AccessToken, user.Id, id);
      const best = info.MediaSources?.[0];
      if (!best) {
        setError('No playable media source was found for this title.');
        return;
      }
      setSource(best);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load video.');
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    load();
  }, [load]);

  const title = item ? (item.SeriesName ? `${item.SeriesName}: ${item.Name}` : item.Name) : 'This title';
  const backHref = item ? `/item/${item.SeriesId || item.Id}` : '/';

  return (
    <div className="flex min-h-screen flex-col bg-[#050607]">
      <div className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-border/60 bg-[#050607] px-4">
        <Link
          to={backHref}
          className="flex h-9 items-center gap-2 rounded px-2 text-sm text-ink hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </Link>
        <h1 className="truncate text-sm font-semibold text-ink">{title}</h1>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden">
        {error ? (
          <div className="flex max-w-md flex-col items-center gap-3 px-6 text-center">
            <p className="text-lg font-semibold text-ink">Couldn&rsquo;t play {title}</p>
            <p className="text-sm text-muted">{error}</p>
            <div className="mt-2 flex gap-3">
              <Link
                to={backHref}
                className="flex h-11 items-center rounded-lg bg-surface px-5 text-sm font-semibold text-ink hover:bg-surfaceHover"
              >
                Back to details
              </Link>
              <button
                onClick={load}
                className="flex h-11 items-center rounded-lg bg-accent px-5 text-sm font-semibold text-background hover:bg-accentHover"
              >
                Try again
              </button>
            </div>
          </div>
        ) : loading || !item || !source ? (
          <SkeletonPlayer />
        ) : (
          <div className="aspect-video max-h-[calc(100vh-56px)] w-full">
            <VideoPlayer
              src={
                source.SupportsDirectStream
                  ? getStreamUrl(id!, user!.AccessToken, source.Id)
                  : source.TranscodingUrl
                  ? `${import.meta.env.VITE_JELLYFIN_URL || ''}${source.TranscodingUrl}`
                  : getStreamUrl(id!, user!.AccessToken, source.Id)
              }
              itemId={id!}
              token={user!.AccessToken}
              streams={item.MediaStreams || []}
              startPositionTicks={item.UserData?.PlaybackPositionTicks}
              poster={getImageUrl(item.Id, 'Primary', { maxWidth: 1280 })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
