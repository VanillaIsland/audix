import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export interface YouTubeInfo {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  url: string;
}

/**
 * Extrait les informations d'une vidéo YouTube et obtient l'URL directe du flux audio
 * Sans publicité car on récupère le stream brut
 */
export async function getYouTubeAudioStream(videoId: string): Promise<{ url: string; info: YouTubeInfo }> {
  try {
    // Utiliser l'API YouTube Data pour les métadonnées
    const apiKey = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
    const videoInfoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Pour react-native-ytdl, on récupère les infos de la vidéo
    // Note: react-native-ytdl nécessite un setup natif
    // En attendant, on utilise une approche alternative avec ytdl-core via backend
    // ou on utilise l'API YouTube pour les métadonnées
    
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    
    if (!response.ok) {
      throw new Error('Vidéo YouTube introuvable');
    }
    
    const oembed = await response.json();
    
    // Pour obtenir le stream audio direct, on doit utiliser yt-dlp
    // Comme c'est un outil CLI, on va créer une fonction qui appelle notre backend
    // ou utiliser une API intermédiaire
    
    // Solution temporaire: utiliser une API publique pour extraire le stream
    // En production, tu devrais avoir ton propre backend avec yt-dlp
    const extractorUrl = `https://api.example.com/extract/${videoId}`; // À remplacer par ton backend
    
    return {
      url: extractorUrl, // URL du stream audio direct
      info: {
        id: videoId,
        title: oembed.title || 'Titre inconnu',
        artist: oembed.author_name || 'Artiste inconnu',
        thumbnail: oembed.thumbnail_url || '',
        duration: 0, // À récupérer via l'API YouTube Data
        url: `https://youtube.com/watch?v=${videoId}`,
      },
    };
  } catch (error) {
    console.error('Erreur extraction YouTube:', error);
    throw new Error('Impossible de récupérer la vidéo YouTube');
  }
}

/**
 * Télécharge un fichier audio depuis une URL et le stocke localement
 */
export async function downloadAudioFile(
  url: string,
  filename: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    
    // Vérifier si le fichier existe déjà
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (fileInfo.exists) {
      console.log('Fichier déjà existant:', fileUri);
      return fileUri;
    }
    
    // Télécharger le fichier avec suivi de progression
    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      fileUri,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        if (onProgress) {
          onProgress(progress);
        }
      }
    );
    
    const { uri } = await downloadResumable.downloadAsync();
    
    if (!uri) {
      throw new Error('Échec du téléchargement');
    }
    
    console.log('Fichier téléchargé:', uri);
    return uri;
  } catch (error) {
    console.error('Erreur téléchargement:', error);
    throw new Error('Échec du téléchargement du fichier audio');
  }
}

/**
 * Partage un fichier audio avec d'autres applications
 */
export async function shareAudioFile(fileUri: string): Promise<void> {
  try {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      throw new Error('Le partage n\'est pas disponible sur cet appareil');
    }
    
    await Sharing.shareAsync(fileUri, {
      mimeType: 'audio/mpeg',
      dialogTitle: 'Partager le fichier audio',
    });
  } catch (error) {
    console.error('Erreur partage:', error);
    throw new Error('Impossible de partager le fichier');
  }
}

/**
 * Nettoie un nom de fichier pour qu'il soit valide
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}

/**
 * Obtient la liste des fichiers audio téléchargés
 */
export async function getDownloadedAudioFiles(): Promise<string[]> {
  try {
    const dirPath = FileSystem.documentDirectory || '';
    const files = await FileSystem.readDirectoryAsync(dirPath);
    return files.filter((file) => file.endsWith('.mp3') || file.endsWith('.m4a'));
  } catch (error) {
    console.error('Erreur lecture dossiers:', error);
    return [];
  }
}