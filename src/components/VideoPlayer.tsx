import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Maximize, Minimize, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { reportProgress } from '@/lib/jellyfin';
import type { MediaStream } from '@/lib/types';

interface VideoPlayerProps {
  src: string;
  itemId: string;
  token: string;
  streams?: MediaStream[];
  startPositionTicks?: number;
  poster?: string;
}

export function VideoPlayer({ src, itemId, token, streams = [], startPositionTicks, poster }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState<number | undefined>(undefined);
  const [selectedSubtitle, setSelectedSubtitle] = useState<number | undefined>(undefined);
  const hlsRef = useRef<Hls | null>(null);
  const playSessionRef = useRef<string>('');

  const audioStreams = streams.filter((s) => s.Type === 'Audio');
  const subtitleStreams = streams.filter((s) => s.Type === 'Subtitle');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    playSessionRef.current = crypto.randomUUID();

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
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      if (startPositionTicks) video.currentTime = startPositionTicks / 10_000_000;
    }

    return () => {
      hlsRef.current?.destroy();
    };
  }, [src, startPositionTicks]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const interval = setInterval(() => {
      if (video.currentTime > 0 && !video.paused) {
        reportProgress(
          token,
          itemId,
          video.currentTime * 10_000_000,
          video.currentTime >= video.duration - 5,
          playSessionRef.current
        ).catch(() => null);
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [itemId, token]);

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

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
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
    <div ref={containerRef} className="group relative w-full bg-black">
      <video
        ref={videoRef}
        poster={poster}
        className="h-full w-full cursor-pointer"
        onClick={togglePlay}
        onTimeUpdate={onTimeUpdate}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        playsInline
      />

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="mb-2 h-1 cursor-pointer rounded bg-white/20">
          <div
            className="h-full bg-accent"
            style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
          />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={togglePlay} className="text-white hover:text-accent">
            {playing ? <Pause className="h-6 w-6 fill-white" /> : <Play className="h-6 w-6 fill-white" />}
          </button>

          <button onClick={toggleMute} className="text-white hover:text-accent">
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
            className="w-24 accent-accent"
          />

          <span className="text-xs text-white">
            {formatTime(progress)} / {formatTime(duration)}
          </span>

          <div className="ml-auto flex items-center gap-2">
            {audioStreams.length > 1 && (
              <select
                value={selectedAudio}
                onChange={(e) => setSelectedAudio(Number(e.target.value))}
                className="rounded bg-black/70 px-2 py-1 text-xs text-white"
              >
                {audioStreams.map((s) => (
                  <option key={s.Index} value={s.Index}>{s.DisplayTitle || s.Language || `Audio ${s.Index}`}</option>
                ))}
              </select>
            )}

            {subtitleStreams.length > 0 && (
              <select
                value={selectedSubtitle}
                onChange={(e) => setSelectedSubtitle(Number(e.target.value))}
                className="rounded bg-black/70 px-2 py-1 text-xs text-white"
              >
                <option value={undefined}>Subtitles off</option>
                {subtitleStreams.map((s) => (
                  <option key={s.Index} value={s.Index}>{s.DisplayTitle || s.Language || `Subtitle ${s.Index}`}</option>
                ))}
              </select>
            )}

            <button onClick={toggleFullscreen} className="text-white hover:text-accent">
              {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
