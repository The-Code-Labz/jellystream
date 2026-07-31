export interface JellyfinUser {
  Id: string;
  Name: string;
  ServerId: string;
  AccessToken: string;
}

export interface JellyfinItem {
  Id: string;
  Name: string;
  Type: 'Movie' | 'Series' | 'Season' | 'Episode' | 'BoxSet' | 'CollectionFolder' | string;
  Overview?: string;
  OfficialRating?: string;
  ProductionYear?: number;
  RuntimeTicks?: number;
  PremiereDate?: string;
  Genres?: string[];
  People?: JellyfinPerson[];
  UserData?: {
    Played?: boolean;
    IsFavorite?: boolean;
    PlaybackPositionTicks?: number;
    UnplayedItemCount?: number;
  };
  SeriesId?: string;
  SeasonId?: string;
  SeasonName?: string;
  SeriesName?: string;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  BackdropImageTags?: string[];
  PrimaryImageAspectRatio?: number;
  MediaStreams?: MediaStream[];
  MediaSources?: MediaSource[];
  Path?: string;
  Chapters?: ChapterInfo[];
  /** Keyed by MediaSourceId, then by tile image width (as a string). */
  Trickplay?: Record<string, Record<string, TrickplayInfo>>;
}

export interface ChapterInfo {
  StartPositionTicks: number;
  Name?: string;
  ImageTag?: string;
}

export interface TrickplayInfo {
  Width: number;
  Height: number;
  TileWidth: number;
  TileHeight: number;
  ThumbnailCount: number;
  Interval: number;
  Bandwidth?: number;
}

export interface JellyfinPerson {
  Name: string;
  Type: string;
  Role?: string;
}

export interface MediaStream {
  Index: number;
  Type: 'Video' | 'Audio' | 'Subtitle';
  Codec?: string;
  Language?: string;
  Title?: string;
  DisplayTitle?: string;
  IsDefault?: boolean;
  IsForced?: boolean;
}

export interface MediaSource {
  Id: string;
  Protocol?: string;
  Path?: string;
  SupportsTranscoding?: boolean;
  SupportsDirectStream?: boolean;
  SupportsDirectPlay?: boolean;
  TranscodingUrl?: string;
}

export interface PlaybackInfo {
  MediaSources: MediaSource[];
  PlaySessionId: string;
}

export interface JellyfinItemsResponse {
  Items: JellyfinItem[];
  TotalRecordCount: number;
}

export interface JellyfinGenre {
  Name: string;
  Id: string;
}
