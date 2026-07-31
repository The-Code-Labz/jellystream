import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchItem, getPlaybackInfo, getStreamUrl, getImageUrl } from '@/lib/jellyfin';
import { VideoPlayer } from '@/components/VideoPlayer';
import type { JellyfinItem, MediaSource } from '@/lib/types';

export function Watch() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<JellyfinItem | null>(null);
  const [source, setSource] = useState<MediaSource | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !id) return;
    async function load() {
      try {
        const detail = await fetchItem(user!.AccessToken, user!.Id, id!);
        setItem(detail);
        const info = await getPlaybackInfo(user!.AccessToken, id!);
        const best = info.MediaSources?.[0];
        if (!best) {
          setError('No playable media source found.');
          return;
        }
        setSource(best);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load video');
      }
    }
    load();
  }, [user, id]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h2 className="text-2xl font-bold text-white">Playback Error</h2>
        <p className="mt-2 text-muted">{error}</p>
        <Link to="/" className="mt-6 text-accent hover:underline">Go Home</Link>
      </div>
    );
  }

  if (!item || !source) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  const src = source.SupportsDirectStream
    ? getStreamUrl(id!, user!.AccessToken, source.Id)
    : source.TranscodingUrl
    ? `${import.meta.env.VITE_JELLYFIN_URL || ''}${source.TranscodingUrl}`
    : getStreamUrl(id!, user!.AccessToken, source.Id);

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <div className="flex items-center gap-3 border-b border-white/10 bg-background px-4 py-3">
        <Link to={`/item/${item.SeriesId || item.Id}`} className="flex items-center gap-2 text-sm text-white hover:text-accent">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="ml-4">
          <h1 className="text-base font-semibold text-white">{item.SeriesName ? `${item.SeriesName}: ${item.Name}` : item.Name}</h1>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-7xl overflow-hidden rounded-lg bg-black shadow-2xl">
          <VideoPlayer
            src={src}
            itemId={id!}
            token={user!.AccessToken}
            streams={item.MediaStreams || []}
            startPositionTicks={item.UserData?.PlaybackPositionTicks}
            poster={getImageUrl(item.Id, 'Primary', { maxWidth: 1280 })}
          />
        </div>
      </div>
    </div>
  );
}
