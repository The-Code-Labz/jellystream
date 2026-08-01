import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check, ListVideo, SkipBack, SkipForward, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchItem, fetchEpisodes, getPlaybackInfo, getStreamUrl, getImageUrl, resolveMediaUrl, selectTrickplayResolution, stopEncoding } from '@/lib/jellyfin';
import { VideoPlayer, type QualityOption, type NextUpInfo } from '@/components/VideoPlayer';
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
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<JellyfinItem | null>(null);
  const [source, setSource] = useState<MediaSource | null>(null);
  const [playSessionId, setPlaySessionId] = useState('');
  const [quality, setQuality] = useState<QualityOption>(QUALITY_OPTIONS[0]);
  const [audioIndex, setAudioIndex] = useState<number | undefined>(undefined);
  const [subtitleIndex, setSubtitleIndex] = useState<number | undefined>(undefined);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [episodes, setEpisodes] = useState<JellyfinItem[]>([]);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const prevSessionRef = useRef<{ token: string; playSessionId: string } | null>(null);

  const load = useCallback(async (bitrate?: number, audio?: number, subtitle?: number) => {
    if (!user || !id) return;
    setLoading(true);
    setError('');
    setSource(null);
    try {
      const detail = await fetchItem(user.AccessToken, user.Id, id);
      setItem(detail);
      const info = await getPlaybackInfo(user.AccessToken, user.Id, id, bitrate, audio, subtitle);
      const best = info.MediaSources?.[0];
      if (!best) {
        setError('No playable media source was found for this title.');
        return;
      }
      setSource(best);
      setPlaySessionId(info.PlaySessionId || '');
      // On first load (no explicit selection yet) sync local state to whatever Jellyfin picked as default,
      // so the dropdown reflects reality and subsequent switches send the right "from" index.
      if (audio === undefined) setAudioIndex(best.DefaultAudioStreamIndex);
      if (subtitle === undefined) setSubtitleIndex(best.DefaultSubtitleStreamIndex);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load video.');
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    setAudioIndex(undefined);
    setSubtitleIndex(undefined);
    load(quality.maxStreamingBitrate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  // Load the full episode list for the series once, so we can compute prev/next and offer an episode picker.
  useEffect(() => {
    if (!user || !item || item.Type !== 'Episode' || !item.SeriesId) {
      setEpisodes([]);
      return;
    }
    fetchEpisodes(user.AccessToken, user.Id, item.SeriesId)
      .then((res) => {
        const sorted = [...res.Items].sort((a, b) => {
          const sa = a.ParentIndexNumber ?? 0;
          const sb = b.ParentIndexNumber ?? 0;
          if (sa !== sb) return sa - sb;
          return (a.IndexNumber ?? 0) - (b.IndexNumber ?? 0);
        });
        setEpisodes(sorted);
      })
      .catch(() => setEpisodes([]));
  }, [user, item?.SeriesId, item?.Type]);

  const episodeIndex = item ? episodes.findIndex((e) => e.Id === item.Id) : -1;
  const prevEpisode = episodeIndex > 0 ? episodes[episodeIndex - 1] : null;
  const nextEpisode =
    episodeIndex >= 0 && episodeIndex < episodes.length - 1 ? episodes[episodeIndex + 1] : null;

  const goToEpisode = (episodeId: string) => {
    setShowEpisodes(false);
    navigate(`/watch/${episodeId}`);
  };

  const nextUp: NextUpInfo | null = useMemo(() => {
    if (!nextEpisode) return null;
    return {
      id: nextEpisode.Id,
      title: nextEpisode.Name,
      subtitle: nextEpisode.IndexNumber ? `Episode ${nextEpisode.IndexNumber}` : undefined,
      image: getImageUrl(nextEpisode.Id, 'Primary', { maxWidth: 300 }),
    };
  }, [nextEpisode]);

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
    load(next.maxStreamingBitrate, audioIndex, subtitleIndex);
  };

  // Switching audio/subtitle requires a fresh PlaybackInfo negotiation (new TranscodingUrl) —
  // Jellyfin bakes the selected streams into the transcode job, it isn't a client-side track swap.
  const handleAudioChange = (next: number) => {
    setAudioIndex(next);
    load(quality.maxStreamingBitrate, next, subtitleIndex);
  };

  const handleSubtitleChange = (next: number | undefined) => {
    setSubtitleIndex(next);
    load(quality.maxStreamingBitrate, audioIndex, next);
  };

  const title = item ? (item.SeriesName ? `${item.SeriesName}: ${item.Name}` : item.Name) : 'This title';
  const backHref = item ? `/item/${item.SeriesId || item.Id}` : '/';

  const buildSrc = () => {
    if (!source || !id || !user) return '';
    // TranscodingUrl already has the requested AudioStreamIndex/SubtitleStreamIndex baked in
    // by Jellyfin (we sent them in the PlaybackInfo POST body) — nothing extra to append.
    if (source.SupportsDirectStream) {
      return getStreamUrl(id, user.AccessToken, source.Id, playSessionId, quality.maxStreamingBitrate, audioIndex, subtitleIndex);
    }
    if (source.TranscodingUrl) {
      return resolveMediaUrl(source.TranscodingUrl);
    }
    return getStreamUrl(id, user.AccessToken, source.Id, playSessionId, quality.maxStreamingBitrate, audioIndex, subtitleIndex);
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

        {item?.Type === 'Episode' && (
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => prevEpisode && goToEpisode(prevEpisode.Id)}
              disabled={!prevEpisode}
              aria-label="Previous episode"
              className="flex h-9 w-9 items-center justify-center rounded text-ink hover:text-accent disabled:opacity-30 disabled:hover:text-ink"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowEpisodes(true)}
              aria-label="Episode list"
              className="flex h-9 w-9 items-center justify-center rounded text-ink hover:text-accent"
            >
              <ListVideo className="h-4 w-4" />
            </button>
            <button
              onClick={() => nextEpisode && goToEpisode(nextEpisode.Id)}
              disabled={!nextEpisode}
              aria-label="Next episode"
              className="flex h-9 w-9 items-center justify-center rounded text-ink hover:text-accent disabled:opacity-30 disabled:hover:text-ink"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {showEpisodes && (
        <div className="fixed inset-0 z-30 flex justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowEpisodes(false)} />
          <div className="relative flex h-full w-full max-w-sm flex-col overflow-y-auto bg-[#0c0d0f] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Episodes</h2>
              <button onClick={() => setShowEpisodes(false)} aria-label="Close episode list" className="text-ink hover:text-accent">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="space-y-2">
              {episodes.map((ep) => (
                <li key={ep.Id}>
                  <button
                    onClick={() => goToEpisode(ep.Id)}
                    className={`flex w-full gap-3 rounded-lg p-2 text-left transition-colors duration-180 ${
                      ep.Id === id ? 'bg-accent/15 ring-1 ring-accent/40' : 'bg-surface hover:bg-surfaceHover'
                    }`}
                  >
                    <img
                      src={getImageUrl(ep.Id, 'Primary', { maxWidth: 200 })}
                      alt=""
                      loading="lazy"
                      className="h-14 w-24 flex-shrink-0 rounded object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/placeholder-poster.svg';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="truncate text-sm font-semibold text-ink">
                          {ep.IndexNumber != null ? `${ep.IndexNumber}. ` : ''}{ep.Name}
                        </p>
                        {ep.UserData?.Played && <Check className="h-3.5 w-3.5 flex-shrink-0 text-success" aria-label="Watched" />}
                      </div>
                      {ep.ParentIndexNumber != null && (
                        <p className="text-xs text-muted">Season {ep.ParentIndexNumber}</p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

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
              chapters={item.Chapters || []}
              trickplayInfo={selectTrickplayResolution(item.Trickplay?.[source.Id])}
              startPositionTicks={item.UserData?.PlaybackPositionTicks}
              poster={getImageUrl(item.Id, 'Primary', { maxWidth: 1280 })}
              qualityOptions={QUALITY_OPTIONS}
              selectedQuality={quality}
              onQualityChange={handleQualityChange}
              selectedAudioIndex={audioIndex}
              onAudioChange={handleAudioChange}
              selectedSubtitleIndex={subtitleIndex}
              onSubtitleChange={handleSubtitleChange}
              nextUp={nextUp}
              onPlayNext={() => nextEpisode && goToEpisode(nextEpisode.Id)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
