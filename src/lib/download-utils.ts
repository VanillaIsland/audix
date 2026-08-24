import * as FileSystem from 'expo-file-system';

export type MediaSource = 'youtube' | 'facebook' | 'spotify' | 'unknown';

export function detectSource(url: string): MediaSource {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
  if (url.includes('spotify.com')) return 'spotify';
  return 'unknown';
}

/**
 * Récupère l'URL directe du fichier média pour téléchargement.
 * - YouTube : utilise un extractor pour obtenir le flux brut (contourne les pubs).
 * - Facebook : appelle un service d'extraction.
 * - Spotify : nécessite un backend de conversion (l'API officielle ne permet pas le téléchargement direct).
 */
export async function getDirectDownloadUrl(url: string, source: MediaSource): Promise<string> {
  if (source === 'youtube') {
    // TODO: Installer 'react-native-ytdl' ou appeler ton backend yt-dlp
    // const info = await ytdl.getInfo(url);
    // const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
    // return format.url; // Cette URL directe ne contient PAS de publicités
    throw new Error('Intégrer react-native-ytdl ou un appel backend yt-dlp ici');
  }
  
  if (source === 'facebook') {
    // TODO: Utiliser une librairie comme '@renpwn/fb-downloader'
    throw new Error('Intégrer l\'extracteur Facebook ici');
  }

  if (source === 'spotify') {
    // TODO: Appeler ton backend SpotiFLAC ou similaire avec l'ID Spotify
    throw new Error('Le téléchargement Spotify nécessite un service de conversion tiers');
  }

  return url; // Fallback pour les liens directs déjà valides
}

/**
 * Télécharge le fichier dans le système de fichiers de l'app.
 */
export async function downloadFileToApp(url: string, filename: string): Promise<string> {
  const fileUri = FileSystem.documentDirectory + filename;
  const { uri } = await FileSystem.downloadAsync(url, fileUri);
  return uri;
}