export type MediaKind = 'audio' | 'video';

export type MediaOrigin =
  | 'local'
  | 'direct'
  | 'youtube-export'
  | 'facebook-export'
  | 'spotify-catalog';

export type AudixTrack = {
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
  externalUrl?: string;
  /** Vignette distante, renseignee par la recherche YouTube. */
  thumbnail?: string;
  /** Metadonnees servant aux playlists intelligentes et au mode DJ. */
  genre?: string;
  bpm?: number;
  year?: number;
};

/** Regles d'une playlist intelligente. Tous les criteres remplis sont combines. */
export type SmartRule = {
  genre?: string;
  artist?: string;
  yearFrom?: number;
  yearTo?: number;
  bpmFrom?: number;
  bpmTo?: number;
  favoriteOnly?: boolean;
  offlineOnly?: boolean;
};

/** Playlists creees et remplies par l'app elle-meme. */
export type SystemPlaylist = 'grab' | 'local' | 'downloaded';

export type AudixPlaylist = {
  id: string;
  name: string;
  description: string;
  color: string;
  trackIds: string[];
  createdAt: string;
  updatedAt: string;
  /** Marque les playlists automatiques : elles se remplissent a l'import. */
  system?: SystemPlaylist;
  /** Presente uniquement sur les playlists intelligentes. */
  smart?: SmartRule;
  /**
   * Privee par defaut : le serveur ne garde alors que le nom, pas la
   * composition. Une playlist publique envoie aussi la liste de ses titres.
   */
  isPublic?: boolean;
};
