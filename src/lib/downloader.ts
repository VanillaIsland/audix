import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
const SERVER = (process.env.EXPO_PUBLIC_DOWNLOAD_SERVER ?? extra.downloadServer ?? '').trim();

export function isDownloadConfigured(): boolean {
  return SERVER.length > 0;
}

/** RAPIDE : URL de flux direct (pas de conversion) → lecture immédiate sans pub. */
export async function streamYouTubeAudio(videoId: string): Promise<{ url: string; cached?: boolean }> {
  if (!SERVER) throw new Error('Serveur non configuré. Ajoute « downloadServer » dans app.json (extra).');
  const response = await fetch(`${SERVER}/stream?id=${encodeURIComponent(videoId)}`);
  if (!response.ok) throw new Error('Flux YouTube indisponible. Réessaie dans quelques minutes.');
  const data = (await response.json()) as { url?: string; error?: string; cached?: boolean };
  if (!data.url) throw new Error(data.error ?? 'URL de flux introuvable.');
  return { url: data.url, cached: data.cached };
}

/** LENT : convertit en MP3 qualité éco et renvoie l'URL Supabase persistante. */
export async function downloadYouTubeAudio(videoId: string): Promise<{ url: string; cached?: boolean }> {
  if (!SERVER) throw new Error('Serveur non configuré. Ajoute « downloadServer » dans app.json (extra).');
  const response = await fetch(`${SERVER}/extract?id=${encodeURIComponent(videoId)}`);
  if (!response.ok) throw new Error('Le serveur yt-dlp a répondu une erreur. Réessaie dans quelques minutes.');
  const data = (await response.json()) as { url?: string; error?: string; cached?: boolean };
  if (!data.url) throw new Error(data.error ?? 'URL MP3 introuvable.');
  return { url: data.url, cached: data.cached };
}
