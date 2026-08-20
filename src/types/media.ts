export type MediaKind = 'audio' | 'video';

export type MediaOrigin =
  | 'local'
  | 'direct'
  | 'youtube-export'
  | 'facebook-export'
  | 'spotify-catalog';

export type VoxaTrack = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  uri: string;
  mimeType: string;
  kind: MediaKind;
  origin: MediaOrigin;
  downloaded: boolean;
  favorite: boolean;
  rightsConfirmed: boolean;
  addedAt: string;
  lastPlayedAt?: string;
  playCount: number;
  size?: number;
};

export type VoxaPlaylist = {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: string;
};
