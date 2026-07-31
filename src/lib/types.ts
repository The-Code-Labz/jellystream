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
