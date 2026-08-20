import { Platform } from 'react-native';

/**
 * External playback providers. Everything here is streaming through official
 * players: no download, no DRM handling, no ad filtering.
 */

export const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ?? '';
export const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';

/** Native builds use the custom scheme; web must use the registered https URI. */
export const SPOTIFY_REDIRECT_URI =
  Platform.OS === 'web' ? 'https://audix-audio.netlify.app/' : 'audix://spotify-callback';

export const youtubeReady = () => YOUTUBE_API_KEY.length > 0;
export const spotifyReady = () => SPOTIFY_CLIENT_ID.length > 0;

/** Read-only scopes: search and playback control, never library writes. */
export const SPOTIFY_SCOPES = [
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'app-remote-control',
  'streaming',
] as const;

const YOUTUBE_SEARCH = 'https://www.googleapis.com/youtube/v3/search';

export type ProviderResult = {
  id: string;
  title: string;
  artist: string;
  thumbnail?: string;
  url: string;
};

/**
 * One search costs 100 quota units of the 10 000 daily allowance — roughly a
 * hundred searches per day. Keep maxResults tight and avoid search-as-you-type.
 */
export async function searchYouTube(query: string, maxResults = 15): Promise<ProviderResult[]> {
  if (!youtubeReady()) throw new Error('Clé API YouTube absente. Renseigne EXPO_PUBLIC_YOUTUBE_API_KEY.');
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    videoEmbeddable: 'true',
    maxResults: String(maxResults),
    q: query,
    key: YOUTUBE_API_KEY,
  });

  const response = await fetch(`${YOUTUBE_SEARCH}?${params.toString()}`);
  if (response.status === 403) {
    throw new Error('Quota YouTube dépassé ou clé restreinte. Réessaie demain ou vérifie les restrictions de la clé.');
  }
  if (!response.ok) throw new Error(`Recherche YouTube indisponible (${response.status}).`);

  const payload = (await response.json()) as {
    items?: { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string; thumbnails?: { medium?: { url?: string } } } }[];
  };

  return (payload.items ?? [])
    .filter((item) => item.id?.videoId)
    .map((item) => ({
      id: item.id!.videoId!,
      title: item.snippet?.title ?? 'Sans titre',
      artist: item.snippet?.channelTitle ?? 'YouTube',
      thumbnail: item.snippet?.thumbnails?.medium?.url,
      url: `https://www.youtube.com/watch?v=${item.id!.videoId!}`,
    }));
}
