import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchItem, getPlaybackInfo, getStreamUrl, getImageUrl, resolveMediaUrl, stopEncoding } from '@/lib/jellyfin';
import { VideoPlayer, type QualityOption } from '@/components/VideoPlayer';
import { SkeletonPlayer } from '@/components/Skeleton';
import type { JellyfinItem, MediaSource } from '@/lib/types';

const QUALITY_OPTIONS: QualityOption[] = [
  { label: 'Auto', maxStreamingBitrate: undefined },
  { label: '1080p', maxStreamingBitrate: 8_000_000 },
  { label: '720p', maxStreamingBitrate: 4_000_000 },
  { label: '480p', maxStreamingBitrate: 2_000_000 },
  { label: '360p', maxStreamingBitrate: 800_000 },
];

export function Watch() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<JellyfinItem | null>(null);
  const [source, setSource] = useState<MediaSource | null>(null);
  const [playSessionId, setPlaySessionId] = useState('');
  const [quality, setQuality] = useState<QualityOption>(QUALITY_OPTIONS[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const prevSessionRef = useRef<{ token: string; playSessionId: string } | null>(null);

  const load = useCallback(async (bitrate?: number) => {
    if (!user || !id) return;
    setLoading(true);
    setError('');
    setSource(null);
    try {
      const detail = await fetchItem(user.AccessToken, user.Id, id);
      setItem(detail);
      const info = await getPlaybackInfo(user.AccessToken, user.Id, id, bitrate);
      const best = info.MediaSources?.[0];
      if (!best) {
        setError('No playable media source was found for this title.');
        return;
      }
      setSource(best);
      setPlaySessionId(info.PlaySessionId || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load video.');
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    load(quality.maxStreamingBitrate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  // Stop the server-side transcode job whenever we leave this session (unmount, item change, quality change).
  useEffect(() => {
    if (user && playSessionId) {
      prevSessionRef.current = { token: user.AccessToken, playSessionId };
    }
    return () => {
      const prev = prevSessionRef.current;
      if (prev) stopEncoding(prev.token, prev.playSessionId);
    };
  }, [user, playSessionId]);

  const handleQualityChange = (next: QualityOption) => {
    setQuality(next);
    load(next.maxStreamingBitrate);
  };

  const title = item ? (item.SeriesName ? `${item.SeriesName}: ${item.Name}` : item.Name) : 'This title';
  const backHref = item ? `/item/${item.SeriesId || item.Id}` : '/';

  const buildSrc = () => {
    if (!source || !id || !user) return '';
    if (source.SupportsDirectStream) {
      return getStreamUrl(id, user.AccessToken, source.Id, playSessionId, quality.maxStreamingBitrate);
    }
    if (source.TranscodingUrl) {
      return resolveMediaUrl(source.TranscodingUrl);
    }
    return getStreamUrl(id, user.AccessToken, source.Id, playSessionId, quality.maxStreamingBitrate);
  };

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
                onClick={() => load(quality.maxStreamingBitrate)}
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
              src={buildSrc()}
              itemId={id!}
              token={user!.AccessToken}
              mediaSourceId={source.Id}
              playSessionId={playSessionId}
              streams={item.MediaStreams || []}
              startPositionTicks={item.UserData?.PlaybackPositionTicks}
              poster={getImageUrl(item.Id, 'Primary', { maxWidth: 1280 })}
              qualityOptions={QUALITY_OPTIONS}
              selectedQuality={quality}
              onQualityChange={handleQualityChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
