import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Maximize, Minimize, Pause, Play, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import { getTrickplayTileUrl, reportProgress } from '@/lib/jellyfin';
import type { ChapterInfo, MediaStream, TrickplayInfo } from '@/lib/types';

export interface QualityOption {
  label: string;
  maxStreamingBitrate?: number;
}

export interface NextUpInfo {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
}

const NEXT_UP_THRESHOLD_SECONDS = 30;
const NEXT_UP_COUNTDOWN_SECONDS = 15;

interface VideoPlayerProps {
  src: string;
  itemId: string;
  token: string;
  mediaSourceId?: string;
  playSessionId?: string;
  streams?: MediaStream[];
  chapters?: ChapterInfo[];
  trickplayInfo?: TrickplayInfo | null;
  startPositionTicks?: number;
  poster?: string;
  qualityOptions?: QualityOption[];
  selectedQuality?: QualityOption;
  onQualityChange?: (option: QualityOption) => void;
  selectedAudioIndex?: number;
  onAudioChange?: (index: number) => void;
  selectedSubtitleIndex?: number;
  onSubtitleChange?: (index: number | undefined) => void;
  nextUp?: NextUpInfo | null;
  onPlayNext?: () => void;
}

export function VideoPlayer({
  src,
  itemId,
  token,
  mediaSourceId,
  playSessionId,
  streams = [],
  chapters = [],
  trickplayInfo,
  startPositionTicks,
  poster,
  qualityOptions = [],
  selectedQuality,
  onQualityChange,
  selectedAudioIndex,
  onAudioChange,
  selectedSubtitleIndex,
  onSubtitleChange,
  nextUp,
  onPlayNext,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [previewTime, setPreviewTime] = useState<number | null>(null);
  const [previewRatio, setPreviewRatio] = useState(0);
  const [showNextUp, setShowNextUp] = useState(false);
  const [nextUpCountdown, setNextUpCountdown] = useState(NEXT_UP_COUNTDOWN_SECONDS);
  const hlsRef = useRef<Hls | null>(null);
  const dismissedNextUpRef = useRef(false);
  const nextUpFiredRef = useRef(false);

  const audioStreams = streams.filter((s) => s.Type === 'Audio');
  const subtitleStreams = streams.filter((s) => s.Type === 'Subtitle');

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        capLevelToPlayerSize: true,
        maxBufferLength: 60,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (startPositionTicks) {
          video.currentTime = startPositionTicks / 10_000_000;
        }
      });
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          // eslint-disable-next-line no-console
          console.error('HLS fatal error', data.type, data.details);
        }
      });
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      if (startPositionTicks) video.currentTime = startPositionTicks / 10_000_000;
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src, startPositionTicks]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playSessionId) return;

    const interval = setInterval(() => {
      if (video.currentTime > 0 && !video.paused) {
        reportProgress(
          token,
          itemId,
          video.currentTime * 10_000_000,
          video.currentTime >= video.duration - 5,
          playSessionId,
          mediaSourceId
        ).catch(() => null);
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [itemId, token, playSessionId, mediaSourceId]);

  // Reset "up next" state whenever we load a new source (i.e. a different episode).
  useEffect(() => {
    setShowNextUp(false);
    setNextUpCountdown(NEXT_UP_COUNTDOWN_SECONDS);
    dismissedNextUpRef.current = false;
    nextUpFiredRef.current = false;
  }, [src]);

  const playNextNow = () => {
    if (nextUpFiredRef.current) return;
    nextUpFiredRef.current = true;
    onPlayNext?.();
  };

  const dismissNextUp = () => {
    dismissedNextUpRef.current = true;
    setShowNextUp(false);
  };

  // Reveal the up-next card once we're within the last NEXT_UP_THRESHOLD_SECONDS of playback.
  useEffect(() => {
    if (!nextUp || dismissedNextUpRef.current || nextUpFiredRef.current || showNextUp) return;
    if (duration > 0 && duration - progress <= NEXT_UP_THRESHOLD_SECONDS) {
      setShowNextUp(true);
    }
  }, [progress, duration, nextUp, showNextUp]);

  // Auto-advance countdown once the up-next card is showing.
  useEffect(() => {
    if (!showNextUp) return;
    const interval = setInterval(() => {
      setNextUpCountdown((c) => {
        if (c <= 1) {
          playNextNow();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNextUp]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setFullscreen(true)).catch(() => null);
    } else {
      document.exitFullscreen().then(() => setFullscreen(false)).catch(() => null);
    }
  };

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const seekTo = (time: number) => {
    const video = videoRef.current;
    if (!video || !isFinite(video.duration)) return;
    const clamped = Math.min(Math.max(time, 0), video.duration);
    video.currentTime = clamped;
    setProgress(clamped);
  };

  const seekBy = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    seekTo(video.currentTime + delta);
  };

  const changeVolume = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const next = Math.min(Math.max(video.volume + delta, 0), 1);
    video.volume = next;
    setVolume(next);
    if (next > 0 && video.muted) {
      video.muted = false;
      setMuted(false);
    }
  };

  const ratioFromClientX = (clientX: number) => {
    const bar = seekBarRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  };

  const timeFromClientX = (clientX: number) => {
    const video = videoRef.current;
    if (!video || !isFinite(video.duration)) return 0;
    return ratioFromClientX(clientX) * video.duration;
  };

  const updatePreview = (clientX: number) => {
    const video = videoRef.current;
    if (!video || !isFinite(video.duration) || !video.duration) return;
    setPreviewRatio(ratioFromClientX(clientX));
    setPreviewTime(ratioFromClientX(clientX) * video.duration);
  };

  const handleSeekPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setScrubbing(true);
    seekTo(timeFromClientX(e.clientX));
    updatePreview(e.clientX);
  };

  const handleSeekPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    updatePreview(e.clientX);
  };

  const handleSeekPointerLeave = () => {
    if (!scrubbing) setPreviewTime(null);
  };

  useEffect(() => {
    if (!scrubbing) return;
    const onMove = (e: PointerEvent) => {
      seekTo(timeFromClientX(e.clientX));
      updatePreview(e.clientX);
    };
    const onUp = () => {
      setScrubbing(false);
      setPreviewTime(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrubbing]);

  // Trickplay preview thumbnail for the hovered/scrubbed position, using Jellyfin's tile-grid layout.
  const trickplayPreview = (() => {
    if (previewTime === null || !trickplayInfo || !mediaSourceId) return null;
    const currentTimeMs = previewTime * 1000;
    const currentTile = Math.floor(currentTimeMs / trickplayInfo.Interval);
    const tileSize = trickplayInfo.TileWidth * trickplayInfo.TileHeight;
    const tileIndex = Math.floor(currentTile / tileSize);
    const tileOffset = currentTile % tileSize;
    const offsetX = -(tileOffset % trickplayInfo.TileWidth) * trickplayInfo.Width;
    const offsetY = -Math.floor(tileOffset / trickplayInfo.TileWidth) * trickplayInfo.Height;
    return {
      url: getTrickplayTileUrl(itemId, token, mediaSourceId, trickplayInfo.Width, tileIndex),
      offsetX,
      offsetY,
      width: trickplayInfo.Width,
      height: trickplayInfo.Height,
    };
  })();

  const previewChapterName = (() => {
    if (previewTime === null || chapters.length === 0) return '';
    const positionTicks = previewTime * 10_000_000;
    let name = '';
    for (const chapter of chapters) {
      if (positionTicks < chapter.StartPositionTicks) break;
      name = chapter.Name || '';
    }
    return name;
  })();

  // Keyboard hotkeys: space/k play-pause, arrows/j/l seek, up/down volume, m mute, f fullscreen.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      if (!containerRef.current) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekBy(5);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekBy(-5);
          break;
        case 'l':
          e.preventDefault();
          seekBy(10);
          break;
        case 'j':
          e.preventDefault();
          seekBy(-10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(0.05);
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(-0.05);
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || scrubbing) return;
    setProgress(video.currentTime);
    setDuration(video.duration || 0);
  };

  const formatTime = (sec: number) => {
    if (!isFinite(sec) || sec < 0) return '0:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div ref={containerRef} tabIndex={0} className="group relative h-full w-full bg-black outline-none">
      <video
        ref={videoRef}
        poster={poster}
        className="h-full w-full cursor-pointer object-contain"
        onClick={togglePlay}
        onTimeUpdate={onTimeUpdate}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          if (nextUp) playNextNow();
        }}
        playsInline
      />

      {nextUp && showNextUp && (
        <div className="absolute bottom-24 right-4 z-20 w-72 rounded-lg bg-[#141414] p-3 shadow-2xl ring-1 ring-white/10 sm:w-80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Next Episode</span>
            <button onClick={dismissNextUp} aria-label="Dismiss next episode" className="text-white/60 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex gap-3">
            {nextUp.image && (
              <img src={nextUp.image} alt="" className="h-16 w-28 flex-shrink-0 rounded object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{nextUp.title}</p>
              {nextUp.subtitle && <p className="truncate text-xs text-white/60">{nextUp.subtitle}</p>}
            </div>
          </div>
          <button
            onClick={playNextNow}
            className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded bg-white text-sm font-semibold text-black hover:bg-white/90"
          >
            <SkipForward className="h-4 w-4 fill-black" /> Play now ({nextUpCountdown}s)
          </button>
        </div>
      )}

      <div className="player-controls absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 opacity-0 transition-opacity duration-220 group-hover:opacity-100 group-focus-within:opacity-100">
        <div
          ref={seekBarRef}
          onPointerDown={handleSeekPointerDown}
          onPointerMove={handleSeekPointerMove}
          onPointerLeave={handleSeekPointerLeave}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={progress}
          className="group/seek relative mb-3 h-1 cursor-pointer rounded bg-white/20 py-2"
          style={{ marginTop: '-8px' }}
        >
          {previewTime !== null && (
            <div
              className="pointer-events-none absolute bottom-full z-10 mb-2 -translate-x-1/2 overflow-hidden rounded bg-black shadow-xl ring-1 ring-white/20"
              style={{
                left: `${Math.min(Math.max(previewRatio * 100, 6), 94)}%`,
                width: trickplayPreview ? trickplayPreview.width : undefined,
              }}
            >
              {trickplayPreview && (
                <div
                  style={{
                    width: trickplayPreview.width,
                    height: trickplayPreview.height,
                    backgroundImage: `url('${trickplayPreview.url}')`,
                    backgroundPositionX: trickplayPreview.offsetX,
                    backgroundPositionY: trickplayPreview.offsetY,
                  }}
                />
              )}
              <div className="px-2 py-1 text-center text-[11px] font-medium text-white">
                {previewChapterName && <div className="truncate text-white/70">{previewChapterName}</div>}
                {formatTime(previewTime)}
              </div>
            </div>
          )}

          {chapters.map((chapter, i) => {
            const ratio = duration ? chapter.StartPositionTicks / 10_000_000 / duration : 0;
            if (i === 0 || ratio <= 0 || ratio >= 1) return null;
            return (
              <div
                key={chapter.StartPositionTicks}
                className="pointer-events-none absolute top-0 h-1 w-px bg-black/50"
                style={{ left: `${ratio * 100}%` }}
              />
            );
          })}

          <div className="pointer-events-none h-1 w-full rounded bg-white/20">
            <div
              className="h-full rounded bg-accent"
              style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
            />
          </div>
          <div
            className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full bg-accent opacity-0 group-hover/seek:opacity-100"
            style={{ left: `${duration ? (progress / duration) * 100 : 0}%` }}
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
            className="flex h-11 w-11 items-center justify-center text-white hover:text-accent"
          >
            {playing ? <Pause className="h-6 w-6 fill-white" /> : <Play className="h-6 w-6 fill-white" />}
          </button>

          <button
            onClick={toggleMute}
            aria-label={muted ? 'Unmute' : 'Mute'}
            className="flex h-11 w-11 items-center justify-center text-white hover:text-accent"
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (videoRef.current) videoRef.current.volume = v;
              setVolume(v);
              if (v > 0) setMuted(false);
            }}
            aria-label="Volume"
            className="w-24 accent-accent"
          />

          <span className="pl-1 text-xs text-white/90">
            {formatTime(progress)} / {formatTime(duration)}
          </span>

          <div className="ml-auto flex items-center gap-2">
            {qualityOptions.length > 1 && (
              <select
                value={selectedQuality?.label ?? qualityOptions[0].label}
                onChange={(e) => {
                  const next = qualityOptions.find((q) => q.label === e.target.value);
                  if (next) onQualityChange?.(next);
                }}
                aria-label="Resolution"
                className="h-9 rounded border border-white/20 bg-black/70 px-2 text-xs text-white"
              >
                {qualityOptions.map((q) => (
                  <option key={q.label} value={q.label}>{q.label}</option>
                ))}
              </select>
            )}

            {audioStreams.length > 1 && (
              <select
                value={selectedAudioIndex ?? audioStreams[0]?.Index}
                onChange={(e) => onAudioChange?.(Number(e.target.value))}
                aria-label="Audio track"
                className="h-9 rounded border border-white/20 bg-black/70 px-2 text-xs text-white"
              >
                {audioStreams.map((s) => (
                  <option key={s.Index} value={s.Index}>{s.DisplayTitle || s.Language || `Audio ${s.Index}`}</option>
                ))}
              </select>
            )}

            {subtitleStreams.length > 0 && (
              <select
                value={selectedSubtitleIndex ?? ''}
                onChange={(e) => onSubtitleChange?.(e.target.value === '' ? undefined : Number(e.target.value))}
                aria-label="Subtitles"
                className="h-9 rounded border border-white/20 bg-black/70 px-2 text-xs text-white"
              >
                <option value="">Subtitles off</option>
                {subtitleStreams.map((s) => (
                  <option key={s.Index} value={s.Index}>{s.DisplayTitle || s.Language || `Subtitle ${s.Index}`}</option>
                ))}
              </select>
            )}

            <button
              onClick={toggleFullscreen}
              aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              className="flex h-11 w-11 items-center justify-center text-white hover:text-accent"
            >
              {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
