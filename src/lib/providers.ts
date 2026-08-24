import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

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

type RawItem = {
  id?: { videoId?: string } | string;
  title?: string;
  artist?: string;
  thumbnail?: string | null;
  url?: string;
  snippet?: { title?: string; channelTitle?: string; thumbnails?: { medium?: { url?: string } } };
};

const normalise = (item: RawItem): ProviderResult | null => {
  const id = typeof item.id === 'string' ? item.id : item.id?.videoId;
  if (!id) return null;
  return {
    id,
    title: item.title ?? item.snippet?.title ?? 'Sans titre',
    artist: item.artist ?? item.snippet?.channelTitle ?? 'YouTube',
    thumbnail: item.thumbnail ?? item.snippet?.thumbnails?.medium?.url ?? undefined,
    url: item.url ?? `https://www.youtube.com/watch?v=${id}`,
  };
};

/** True when the Supabase proxy can be used (works on every platform). */
export const searchReady = () => Boolean(supabase) || youtubeReady();

/**
 * Searches via the Supabase Edge Function first: the key stays server-side, so
 * one key serves iOS, Android and web. Falls back to a direct call when a local
 * key is present — useful in development, but that path is iOS-restricted.
 *
 * One search costs 100 of the 10 000 daily quota units — about a hundred a day.
 * Avoid search-as-you-type.
 */
export async function searchYouTube(query: string, maxResults = 15): Promise<ProviderResult[]> {
  const term = query.trim();
  if (!term) return [];

  // Le relais Supabase est le chemin normal : la clé reste côté serveur.
  let relayReason = '';
  if (supabase) {
    const { data, error } = await supabase.functions.invoke('youtube-search', {
      body: { q: term, maxResults },
    });
    if (!error && data?.items) {
      return (data.items as RawItem[]).map(normalise).filter(Boolean) as ProviderResult[];
    }
    relayReason = data?.error ?? error?.message ?? 'réponse vide';
    if (!youtubeReady()) {
      throw new Error(`Le relais de recherche ne répond pas : ${relayReason}`);
    }
  }

  if (!youtubeReady()) {
    throw new Error(
      supabase
        ? `Le relais de recherche ne répond pas : ${relayReason}`
        : 'Aucune source de recherche n’est configurée. Vérifie EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY dans le build.',
    );
  }

  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    videoEmbeddable: 'true',
    maxResults: String(maxResults),
    q: term,
    key: YOUTUBE_API_KEY,
  });
  const response = await fetch(`${YOUTUBE_SEARCH}?${params.toString()}`);
  if (response.status === 403) {
    throw new Error('La recherche YouTube ne répond pas : quota dépassé, ou clé restreinte à une autre plateforme.');
  }
  if (response.status === 400) {
    throw new Error(
      `La clé YouTube embarquée dans ce build n’est pas valide.${relayReason ? ` Le relais avait échoué avant : ${relayReason}` : ''}`,
    );
  }
  if (!response.ok) throw new Error(`Recherche YouTube indisponible (${response.status}).`);

  const payload = (await response.json()) as { items?: RawItem[] };
  return (payload.items ?? []).map(normalise).filter(Boolean) as ProviderResult[];
}
