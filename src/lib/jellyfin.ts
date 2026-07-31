import type { JellyfinUser, JellyfinItem, JellyfinItemsResponse, PlaybackInfo } from './types';

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
  DirectPlayProfiles: [
    { Container: 'mp4,m4v', Type: 'Video', VideoCodec: 'h264,hevc,vp9,av1', AudioCodec: 'aac,mp3,ac3,eac3,opus,flac,vorbis' },
    { Container: 'mkv', Type: 'Video', VideoCodec: 'h264,hevc,vp9,av1', AudioCodec: 'aac,mp3,ac3,eac3,opus,flac,vorbis' },
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
  SubtitleProfiles: [
    { Format: 'vtt', Method: 'External' },
    { Format: 'srt', Method: 'External' },
  ],
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
  return request(`/Users/${userId}/Items/${itemId}`, { token }) as Promise<JellyfinItem>;
}

export async function fetchNextUp(token: string, userId: string, limit = 20): Promise<JellyfinItemsResponse> {
  return request(`/Shows/NextUp?UserId=${userId}&Limit=${limit}`, { token }) as Promise<JellyfinItemsResponse>;
}

export async function fetchContinueWatching(token: string, userId: string, limit = 20): Promise<JellyfinItemsResponse> {
  return fetchItems(token, userId, {
    Recursive: true,
    IncludeItemTypes: 'Movie,Episode',
    Filters: 'IsResumable',
    Limit: limit,
    SortBy: 'DatePlayed',
    SortOrder: 'Descending',
  });
}

export async function fetchRecentlyAdded(token: string, userId: string, limit = 20): Promise<JellyfinItemsResponse> {
  return fetchItems(token, userId, {
    Recursive: true,
    IncludeItemTypes: 'Movie,Series',
    SortBy: 'DateCreated',
    SortOrder: 'Descending',
    Limit: limit,
  });
}

export async function fetchMovies(
  token: string,
  userId: string,
  options: { genre?: string; year?: number; sortBy?: string; sortOrder?: string; startIndex?: number; limit?: number } = {}
): Promise<JellyfinItemsResponse> {
  return fetchItems(token, userId, {
    Recursive: true,
    IncludeItemTypes: 'Movie',
    ...(options.genre && { Genres: options.genre }),
    ...(options.year && { Years: options.year }),
    SortBy: options.sortBy || 'SortName',
    SortOrder: options.sortOrder || 'Ascending',
    StartIndex: options.startIndex || 0,
    Limit: options.limit || 50,
  });
}

export async function fetchSeries(
  token: string,
  userId: string,
  options: { genre?: string; year?: number; sortBy?: string; sortOrder?: string; startIndex?: number; limit?: number } = {}
): Promise<JellyfinItemsResponse> {
  return fetchItems(token, userId, {
    Recursive: true,
    IncludeItemTypes: 'Series',
    ...(options.genre && { Genres: options.genre }),
    ...(options.year && { Years: options.year }),
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

export async function fetchGenres(token: string): Promise<{ Items: { Name: string; Id: string }[] }> {
  return request('/Genres?SortBy=SortName', { token }) as Promise<{ Items: { Name: string; Id: string }[] }>;
}

export async function searchItems(token: string, userId: string, query: string, limit = 50): Promise<JellyfinItemsResponse> {
  return fetchItems(token, userId, {
    Recursive: true,
    SearchTerm: query,
    IncludeItemTypes: 'Movie,Series,Episode',
    Limit: limit,
  });
}

export async function getPlaybackInfo(
  token: string,
  userId: string,
  itemId: string,
  maxStreamingBitrate?: number
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
      // Note: MaxStaticBitrate (100Mbps, above) gates direct-play eligibility and is unaffected here.
      // This only caps the *transcode encode target* — when a transcode is forced for any reason
      // (subtitle burn-in, HDR tonemap, codec mismatch), Jellyfin aims VideoBitrate at
      // (this value - audio bitrate). 120Mbps is not achievable in real time by a software x264
      // encoder doing subtitle burn-in + tonemap, and Jellyfin returns 500 on segment requests
      // when ffmpeg can't keep up. 20Mbps is a realistic real-time transcode ceiling.
      DeviceProfile: { ...DEVICE_PROFILE, MaxStreamingBitrate: maxStreamingBitrate ?? 20000000 },
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
  maxStreamingBitrate?: number
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
  return `${base}/Videos/${itemId}/master.m3u8?${query.toString()}`;
}

export function getDirectStreamUrl(itemId: string, token: string, mediaSourceId: string): string {
  const base = getBaseUrl();
  return `${base}/Videos/${itemId}/stream?Static=true&api_key=${encodeURIComponent(token)}&MediaSourceId=${encodeURIComponent(mediaSourceId)}`;
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
