import type { JellyfinUser, JellyfinItem, JellyfinItemsResponse, PlaybackInfo } from './types';

const JELLYFIN_URL = import.meta.env.VITE_JELLYFIN_URL || 'http://localhost:8096';
const APP_NAME = import.meta.env.VITE_JELLYFIN_APP_NAME || 'JellyStream';
const APP_VERSION = import.meta.env.VITE_JELLYFIN_APP_VERSION || '1.0.0';
const USE_PROXY = import.meta.env.VITE_USE_PROXY === 'true';

function getBaseUrl(): string {
  if (USE_PROXY) return '/jellyfin';
  return JELLYFIN_URL.replace(/\/$/, '');
}

function getDeviceId(): string {
  let id = localStorage.getItem('jellyfin-device-id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('jellyfin-device-id', id);
  }
  return id;
}

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

export async function getPlaybackInfo(token: string, itemId: string): Promise<PlaybackInfo> {
  return request(`/Items/${itemId}/PlaybackInfo?UserId=me`, { token }) as Promise<PlaybackInfo>;
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
  playSessionId?: string
): Promise<void> {
  await request('/Sessions/Playing/Progress', {
    method: 'POST',
    token,
    body: JSON.stringify({
      ItemId: itemId,
      PositionTicks: Math.round(positionTicks),
      IsPaused: false,
      PlaySessionId: playSessionId || '',
      Played: played,
    }),
  });
}

export function getImageUrl(itemId: string, type: 'Primary' | 'Backdrop' | 'Logo' = 'Primary', options: { maxWidth?: number; tag?: string } = {}): string {
  const base = getBaseUrl();
  const query = new URLSearchParams();
  if (options.maxWidth) query.set('maxWidth', String(options.maxWidth));
  if (options.tag) query.set('tag', options.tag);
  const qs = query.toString();
  return `${base}/Items/${itemId}/Images/${type}${qs ? `?${qs}` : ''}`;
}

export function getStreamUrl(itemId: string, token: string, mediaSourceId?: string): string {
  const base = getBaseUrl();
  let url = `${base}/Videos/${itemId}/master.m3u8?api_key=${encodeURIComponent(token)}`;
  if (mediaSourceId) url += `&MediaSourceId=${encodeURIComponent(mediaSourceId)}`;
  return url;
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
