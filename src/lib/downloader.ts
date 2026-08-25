import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
const SERVER = (process.env.EXPO_PUBLIC_DOWNLOAD_SERVER ?? extra.downloadServer ?? '').trim();

export function isDownloadConfigured(): boolean {
  return SERVER.length > 0;
}

/**
 * Demande au serveur yt-dlp de convertir la vidéo YouTube en MP3
 * et retourne l'URL directe du fichier prêt à télécharger.
 */
export async function downloadYouTubeAudio(videoId: string): Promise<{ url: string }> {
  if (!SERVER) {
    throw new Error('Serveur de téléchargement non configuré. Ajoute « downloadServer » dans app.json (extra).');
  }
  const response = await fetch(`${SERVER}/extract?id=${encodeURIComponent(videoId)}`);
  if (!response.ok) {
    throw new Error('Le serveur yt-dlp a répondu une erreur. Réessaie dans quelques minutes.');
  }
  const data = (await response.json()) as { url?: string; error?: string };
  if (!data.url) throw new Error(data.error ?? 'URL MP3 introuvable.');
  return { url: data.url };
}