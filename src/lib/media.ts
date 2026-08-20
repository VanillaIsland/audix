import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import type { MediaKind, VoxaPlaylist, VoxaTrack } from '@/types/media';

const LIBRARY_KEY = 'voxa.library.v1';
const PLAYLISTS_KEY = 'voxa.playlists.v1';
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'flac', 'aac', 'alac', 'ogg', 'opus', 'm4a', 'aiff', 'aif'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'm4v', 'webm', 'mkv'];

const extensionOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';

export function isSupportedMedia(name: string, mimeType?: string): MediaKind | null {
  const extension = extensionOf(name);
  if (mimeType?.startsWith('audio/') || AUDIO_EXTENSIONS.includes(extension)) return 'audio';
  if (mimeType?.startsWith('video/') || VIDEO_EXTENSIONS.includes(extension)) return 'video';
  return null;
}

export async function loadLibrary(): Promise<VoxaTrack[]> {
  const raw = await AsyncStorage.getItem(LIBRARY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as VoxaTrack[];
  } catch {
    return [];
  }
}

export async function saveLibrary(tracks: VoxaTrack[]) {
  await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(tracks));
}

export async function loadPlaylists(): Promise<VoxaPlaylist[]> {
  const raw = await AsyncStorage.getItem(PLAYLISTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as VoxaPlaylist[];
  } catch {
    return [];
  }
}

export async function savePlaylists(playlists: VoxaPlaylist[]) {
  await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
}

function safeName(name: string) {
  return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
}

function titleFromName(name: string) {
  return name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Sans titre';
}

async function persistAsset(asset: DocumentPicker.DocumentPickerAsset, id: string) {
  if (Platform.OS === 'web') return asset.uri;
  const directory = new Directory(Paths.document, 'voxa-library');
  directory.create({ idempotent: true, intermediates: true });
  const destination = new File(directory, `${id}-${safeName(asset.name)}`);
  const source = new File(asset.uri);
  source.copy(destination);
  return destination.uri;
}

export async function pickOwnedMedia(): Promise<VoxaTrack[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['audio/*', 'video/*'],
    copyToCacheDirectory: true,
    multiple: true,
  });

  if (result.canceled) return [];

  const imported: VoxaTrack[] = [];
  for (const asset of result.assets) {
    const kind = isSupportedMedia(asset.name, asset.mimeType);
    if (!kind) continue;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const uri = await persistAsset(asset, id);
    imported.push({
      id,
      title: titleFromName(asset.name),
      artist: 'Catalogue propriétaire',
      uri,
      mimeType: asset.mimeType ?? `${kind}/unknown`,
      kind,
      origin: 'local',
      downloaded: Platform.OS !== 'web',
      favorite: false,
      rightsConfirmed: true,
      addedAt: new Date().toISOString(),
      playCount: 0,
      size: asset.size,
    });
  }
  return imported;
}

export async function importAuthorizedUrl(url: string, keepOffline: boolean): Promise<VoxaTrack> {
  const parsed = new URL(url);
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Seuls les liens HTTP(S) sont acceptés.');

  const response = await fetch(url, { method: 'HEAD' });
  if (!response.ok) throw new Error(`Le serveur a refusé la vérification (${response.status}).`);
  const mimeType = response.headers.get('content-type')?.split(';')[0] ?? '';
  const kind = isSupportedMedia(parsed.pathname, mimeType);
  if (!kind) throw new Error('Voxa accepte uniquement un fichier audio ou vidéo direct.');

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  let uri = url;
  if (keepOffline) {
    if (Platform.OS === 'web') throw new Error('Le stockage hors ligne est disponible dans l’app iOS/Android.');
    const directory = new Directory(Paths.document, 'voxa-library');
    directory.create({ idempotent: true, intermediates: true });
    const extension = extensionOf(parsed.pathname) || (kind === 'audio' ? 'm4a' : 'mp4');
    const destination = new File(directory, `${id}.${extension}`);
    uri = (await File.downloadFileAsync(url, destination)).uri;
  }

  return {
    id,
    title: decodeURIComponent(parsed.pathname.split('/').pop() || 'Import distant').replace(/\.[^/.]+$/, ''),
    artist: parsed.hostname,
    uri,
    mimeType,
    kind,
    origin: 'direct',
    downloaded: keepOffline,
    favorite: false,
    rightsConfirmed: true,
    addedAt: new Date().toISOString(),
    playCount: 0,
    size: Number(response.headers.get('content-length')) || undefined,
  };
}
