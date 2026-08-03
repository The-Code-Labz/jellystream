import type { JellyfinUser, JellyfinItem, JellyfinItemsResponse, PlaybackInfo, TrickplayInfo } from './types';

const JELLYFIN_URL = import.meta.env.VITE_JELLYFIN_URL || 'http://localhost:8096';
const APP_NAME = import.meta.env.VITE_JELLYFIN_APP_NAME || 'JellyStream';
const APP_VERSION = import.meta.env.VITE_JELLYFIN_APP_VERSION || '1.0.0';
const USE_PROXY = import.meta.env.VITE_USE_PROXY === 'true';

function getBaseUrl(): string {
  if (USE_PROXY) return '/jellyfin';
  return JELLYFIN_URL.replace(/\/$/, '');
}

export function getDeviceId(): string {
  let id = localStorage.getItem('jellyfin-device-id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('jellyfin-device-id', id);
  }
  return id;
}

const DEVICE_PROFILE = {
  MaxStaticBitrate: 100000000,
  MusicStreamingTranscodingBitrate: 384000,
  // NOTE: 'hevc' is deliberately EXCLUDED from VideoCodec here. Chromium/Brave/Firefox have no
  // HEVC decode support in <video>/MSE (only Safari does). Claiming hevc direct-play support
  // made Jellyfin's PlaybackInfo believe 10-bit HEVC bluray sources were directly playable,
  // so it returned NO TranscodingUrl at all — the player then fell back to a raw, unnegotiated
  // master.m3u8 request with no bitrate/DeviceProfile context, producing severe macroblocking
  // (same failure family as the earlier 416x234 downscale bug, different trigger).
  DirectPlayProfiles: [
    { Container: 'mp4,m4v', Type: 'Video', VideoCodec: 'h264,vp9,av1', AudioCodec: 'aac,mp3,ac3,eac3,opus,flac,vorbis' },
    { Container: 'mkv', Type: 'Video', VideoCodec: 'h264,vp9,av1', AudioCodec: 'aac,mp3,ac3,eac3,opus,flac,vorbis' },
    { Container: 'webm', Type: 'Video', VideoCodec: 'vp8,vp9,av1', AudioCodec: 'vorbis,opus' },
  ],
  TranscodingProfiles: [
    {
      Container: 'ts',
      Type: 'Video',
      AudioCodec: 'aac,mp3',
      VideoCodec: 'h264',
      Context: 'Streaming',
      Protocol: 'hls',
      MaxAudioChannels: '6',
      MinSegments: 1,
      BreakOnNonKeyFrames: true,
    },
    {
      Container: 'aac',
      Type: 'Audio',
      AudioCodec: 'aac',
      Context: 'Streaming',
      Protocol: 'hls',
      MaxAudioChannels: '2',
    },
  ],
  CodecProfiles: [
    {
      Type: 'Video',
      Codec: 'h264',
      Conditions: [
        { Condition: 'NotEquals', Property: 'IsAnamorphic', Value: 'true', IsRequired: false },
        { Condition: 'EqualsAny', Property: 'VideoProfile', Value: 'high|main|baseline|constrained baseline', IsRequired: false },
        { Condition: 'LessThanEqual', Property: 'VideoLevel', Value: '51', IsRequired: false },
      ],
    },
  ],
  // Deliberately empty: claiming 'External' support for vtt/srt here (as before) tells Jellyfin
  // to hand back a sidecar subtitle URL instead of burning it into the video — but this player has
  // no <track>/WebVTT rendering at all, so those subtitles silently never appeared. Leaving this
  // empty means Jellyfin finds no matching profile for ANY subtitle format and falls back to
  // server-side burn-in (Encode), the same proven path already used for .ass sources.
  SubtitleProfiles: [],
};

function authHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Emby-Authorization': `MediaBrowser Client="${APP_NAME}", Device="Browser", DeviceId="${getDeviceId()}", Version="${APP_VERSION}"`,
  };
  if (token) {
    headers.Authorization = `MediaBrowser Token="${token}"`;
  }
  return headers;
}

async function request(path: string, options: RequestInit & { token?: string } = {}): Promise<unknown> {
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(options.token),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Jellyfin ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function authenticate(username: string, password: string): Promise<JellyfinUser> {
  const data = (await request('/Users/AuthenticateByName', {
    method: 'POST',
    body: JSON.stringify({ Username: username, Pw: password }),
  })) as { User: JellyfinUser; AccessToken: string };
  return { ...data.User, AccessToken: data.AccessToken };
}

export async function fetchItems(
  token: string,
  userId: string,
  params: Record<string, string | number | boolean | undefined> = {}
): Promise<JellyfinItemsResponse> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  return request(`/Users/${userId}/Items?${query.toString()}`, { token }) as Promise<JellyfinItemsResponse>;
}

export async function fetchItem(token: string, userId: string, itemId: string): Promise<JellyfinItem> {
  return request(`/Users/${userId}/Items/${itemId}?Fields=Chapters,Trickplay,MediaStreams`, { token }) as Promise<JellyfinItem>;
}

/** Returns the libraries (Views) the user has access to — used to build the library switcher. */
export async function fetchLibraries(token: string, userId: string): Promise<JellyfinItem[]> {
  const data = (await request(`/Users/${userId}/Views`, { token })) as JellyfinItemsResponse;
  return data.Items;
}

export async function fetchNextUp(token: string, userId: string, limit = 20, libraryId?: string): Promise<JellyfinItemsResponse> {
  const query = new URLSearchParams({ UserId: userId, Limit: String(limit) });
  if (libraryId) query.set('ParentId', libraryId);
  return request(`/Shows/NextUp?${query.toString()}`, { token }) as Promise<JellyfinItemsResponse>;
}

export async function fetchContinueWatching(token: string, userId: string, limit = 20, libraryId?: string): Promise<JellyfinItemsResponse> {
  return fetchItems(token, userId, {
    Recursive: true,
    IncludeItemTypes: 'Movie,Episode',
    Filters: 'IsResumable',
    Limit: limit,
    SortBy: 'DatePlayed',
    SortOrder: 'Descending',
    ...(libraryId && { ParentId: libraryId }),
  });
}

export async function fetchRecentlyAdded(token: string, userId: string, limit = 20, libraryId?: string): Promise<JellyfinItemsResponse> {
  return fetchItems(token, userId, {
    Recursive: true,
    IncludeItemTypes: 'Movie,Series',
    SortBy: 'DateCreated',
    SortOrder: 'Descending',
    Limit: limit,
    ...(libraryId && { ParentId: libraryId }),
  });
}

export async function fetchMovies(
  token: string,
  userId: string,
  options: { genre?: string; year?: number; sortBy?: string; sortOrder?: string; startIndex?: number; limit?: number; libraryId?: string } = {}
): Promise<JellyfinItemsResponse> {
  return fetchItems(token, userId, {
    Recursive: true,
    IncludeItemTypes: 'Movie',
    ...(options.genre && { Genres: options.genre }),
    ...(options.year && { Years: options.year }),
    ...(options.libraryId && { ParentId: options.libraryId }),
    SortBy: options.sortBy || 'SortName',
    SortOrder: options.sortOrder || 'Ascending',
    StartIndex: options.startIndex || 0,
    Limit: options.limit || 50,
  });
}

export async function fetchSeries(
  token: string,
  userId: string,
  options: { genre?: string; year?: number; sortBy?: string; sortOrder?: string; startIndex?: number; limit?: number; libraryId?: string } = {}
): Promise<JellyfinItemsResponse> {
  return fetchItems(token, userId, {
    Recursive: true,
    IncludeItemTypes: 'Series',
    ...(options.genre && { Genres: options.genre }),
    ...(options.year && { Years: options.year }),
    ...(options.libraryId && { ParentId: options.libraryId }),
    SortBy: options.sortBy || 'SortName',
    SortOrder: options.sortOrder || 'Ascending',
    StartIndex: options.startIndex || 0,
    Limit: options.limit || 50,
  });
}

export async function fetchEpisodes(
  token: string,
  userId: string,
  seriesId: string,
  seasonId?: string
): Promise<JellyfinItemsResponse> {
  const params: Record<string, string | number | undefined> = {
    UserId: userId,
    SeriesId: seriesId,
    Fields: 'Overview,MediaStreams',
  };
  if (seasonId) params.SeasonId = seasonId;
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && query.set(k, String(v)));
  return request(`/Shows/${seriesId}/Episodes?${query.toString()}`, { token }) as Promise<JellyfinItemsResponse>;
}

export async function fetchSeasons(token: string, userId: string, seriesId: string): Promise<JellyfinItemsResponse> {
  return request(`/Shows/${seriesId}/Seasons?UserId=${userId}`, { token }) as Promise<JellyfinItemsResponse>;
}

export async function fetchSimilar(token: string, userId: string, itemId: string, limit = 12): Promise<JellyfinItemsResponse> {
  return request(`/Items/${itemId}/Similar?UserId=${userId}&Limit=${limit}`, { token }) as Promise<JellyfinItemsResponse>;
}

export async function fetchGenres(token: string, libraryId?: string): Promise<{ Items: { Name: string; Id: string }[] }> {
  const query = new URLSearchParams({ SortBy: 'SortName' });
  if (libraryId) query.set('ParentId', libraryId);
  return request(`/Genres?${query.toString()}`, { token }) as Promise<{ Items: { Name: string; Id: string }[] }>;
}

export async function searchItems(token: string, userId: string, query: string, limit = 50, libraryId?: string): Promise<JellyfinItemsResponse> {
  return fetchItems(token, userId, {
    Recursive: true,
    SearchTerm: query,
    IncludeItemTypes: 'Movie,Series,Episode',
    Limit: limit,
    ...(libraryId && { ParentId: libraryId }),
  });
}

export async function getPlaybackInfo(
  token: string,
  userId: string,
  itemId: string,
  maxStreamingBitrate?: number,
  audioStreamIndex?: number,
  subtitleStreamIndex?: number
): Promise<PlaybackInfo> {
  return request(`/Items/${itemId}/PlaybackInfo?UserId=${userId}`, {
    method: 'POST',
    token,
    body: JSON.stringify({
      UserId: userId,
      StartTimeTicks: 0,
      IsPlayback: true,
      AutoOpenLiveStream: true,
      MediaSourceId: itemId,
      MaxStreamingBitrate: maxStreamingBitrate,
      AudioStreamIndex: audioStreamIndex,
      SubtitleStreamIndex: subtitleStreamIndex,
      // Note: MaxStaticBitrate (100Mbps, above) gates direct-play eligibility and is unaffected here.
      // This caps the *transcode encode target* — when a transcode is forced for any reason
      // (subtitle burn-in, HDR tonemap, codec mismatch), Jellyfin aims VideoBitrate at
      // (this value - audio bitrate). Previously this hard-floored Auto quality at 20Mbps for
      // EVERY title, which starved high-bitrate 4K/HDR sources (forced macroblocking/downscale)
      // even though hardware (NVENC) transcode has no trouble keeping up in real time. Auto now
      // only caps at MaxStaticBitrate (100Mbps) as a sane upper bound — explicit quality presets
      // (1080p/720p/etc.) still pass their own lower ceiling as before.
      DeviceProfile: { ...DEVICE_PROFILE, MaxStreamingBitrate: maxStreamingBitrate ?? DEVICE_PROFILE.MaxStaticBitrate },
    }),
  }) as Promise<PlaybackInfo>;
}

export async function stopEncoding(token: string, playSessionId: string): Promise<void> {
  await request(`/Videos/ActiveEncodings?DeviceId=${encodeURIComponent(getDeviceId())}&PlaySessionId=${encodeURIComponent(playSessionId)}`, {
    method: 'DELETE',
    token,
  }).catch(() => null);
}

export async function markPlayed(token: string, userId: string, itemId: string, played: boolean): Promise<void> {
  await request(`/Users/${userId}/PlayedItems/${itemId}`, {
    method: played ? 'POST' : 'DELETE',
    token,
  });
}

export async function toggleFavorite(token: string, userId: string, itemId: string, favorite: boolean): Promise<void> {
  await request(`/Users/${userId}/FavoriteItems/${itemId}`, {
    method: favorite ? 'POST' : 'DELETE',
    token,
  });
}

export async function reportProgress(
  token: string,
  itemId: string,
  positionTicks: number,
  played: boolean,
  playSessionId?: string,
  mediaSourceId?: string
): Promise<void> {
  await request('/Sessions/Playing/Progress', {
    method: 'POST',
    token,
    body: JSON.stringify({
      ItemId: itemId,
      MediaSourceId: mediaSourceId || itemId,
      PositionTicks: Math.round(positionTicks),
      IsPaused: false,
      PlaySessionId: playSessionId || '',
      Played: played,
    }),
  });
}

export function resolveMediaUrl(path: string): string {
  return `${getBaseUrl()}${path}`;
}

export function getImageUrl(itemId: string, type: 'Primary' | 'Backdrop' | 'Logo' = 'Primary', options: { maxWidth?: number; tag?: string } = {}): string {
  const base = getBaseUrl();
  const query = new URLSearchParams();
  if (options.maxWidth) query.set('maxWidth', String(options.maxWidth));
  if (options.tag) query.set('tag', options.tag);
  const qs = query.toString();
  return `${base}/Items/${itemId}/Images/${type}${qs ? `?${qs}` : ''}`;
}

export function getStreamUrl(
  itemId: string,
  token: string,
  mediaSourceId?: string,
  playSessionId?: string,
  maxStreamingBitrate?: number,
  audioStreamIndex?: number,
  subtitleStreamIndex?: number
): string {
  const base = getBaseUrl();
  const query = new URLSearchParams({
    api_key: token,
    DeviceId: getDeviceId(),
    VideoCodec: 'h264',
    AudioCodec: 'aac,mp3',
    TranscodingMaxAudioChannels: '6',
    SegmentContainer: 'ts',
  });
  if (mediaSourceId) query.set('MediaSourceId', mediaSourceId);
  if (playSessionId) query.set('PlaySessionId', playSessionId);
  if (maxStreamingBitrate) query.set('MaxStreamingBitrate', String(maxStreamingBitrate));
  if (audioStreamIndex !== undefined) query.set('AudioStreamIndex', String(audioStreamIndex));
  if (subtitleStreamIndex !== undefined) query.set('SubtitleStreamIndex', String(subtitleStreamIndex));
  return `${base}/Videos/${itemId}/master.m3u8?${query.toString()}`;
}

export function getDirectStreamUrl(itemId: string, token: string, mediaSourceId: string): string {
  const base = getBaseUrl();
  return `${base}/Videos/${itemId}/stream?Static=true&api_key=${encodeURIComponent(token)}&MediaSourceId=${encodeURIComponent(mediaSourceId)}`;
}

/**
 * Picks the trickplay tile resolution to use for scrub previews: the highest resolution
 * that's still <= ~20% of the screen width, ported from Jellyfin's own web client logic.
 */
export function selectTrickplayResolution(
  resolutions: Record<string, TrickplayInfo> | undefined
): TrickplayInfo | null {
  if (!resolutions) return null;
  const maxWidth = window.screen.width * (window.devicePixelRatio || 1) * 0.2;
  let best: TrickplayInfo | null = null;
  for (const info of Object.values(resolutions)) {
    if (!best || (info.Width < best.Width && best.Width > maxWidth) || (info.Width > best.Width && info.Width <= maxWidth)) {
      best = info;
    }
  }
  return best;
}

/** Builds the URL for a trickplay tile image (a grid of TileWidth x TileHeight thumbnails). */
export function getTrickplayTileUrl(
  itemId: string,
  token: string,
  mediaSourceId: string,
  width: number,
  tileIndex: number
): string {
  const base = getBaseUrl();
  const query = new URLSearchParams({ ApiKey: token, MediaSourceId: mediaSourceId });
  return `${base}/Videos/${itemId}/Trickplay/${width}/${tileIndex}.jpg?${query.toString()}`;
}

export function ticksToMinutes(ticks?: number): number {
  if (!ticks) return 0;
  return Math.round(ticks / 10_000_000 / 60);
}

export function formatRuntime(ticks?: number): string {
  const minutes = ticksToMinutes(ticks);
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}
