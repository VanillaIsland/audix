import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import type { MediaKind, VoxaPlaylist, VoxaTrack } from '@/types/media';

const LIBRARY_KEY = 'voxa.library.v1';
const PLAYLISTS_KEY = 'voxa.playlists.v1';
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'flac', 'aac', 'alac', 'ogg', 'opus', 'm4a', 'aiff', 'aif'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'm4v', 'webm', 'mkv'];

type LinkProfile = {
  origin: VoxaTrack['origin'];
  label: string;
};

const PLATFORM_HOSTS: { match: (host: string) => boolean; profile: LinkProfile }[] = [
  {
    match: (host) => host === 'youtu.be' || host.endsWith('.youtube.com') || host === 'youtube.com',
    profile: { origin: 'youtube-export', label: 'YouTube · Référence catalogue' },
  },
  {
    match: (host) => host.endsWith('.spotify.com') || host === 'spotify.com' || host === 'open.spotify.com',
    profile: { origin: 'spotify-catalog', label: 'Spotify · Référence catalogue' },
  },
  {
    match: (host) => host.endsWith('.facebook.com') || host === 'facebook.com' || host === 'fb.watch',
    profile: { origin: 'facebook-export', label: 'Facebook · Référence catalogue' },
  },
];

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
    const parsed = JSON.parse(raw) as Partial<VoxaPlaylist>[];
    return parsed.map((playlist, index) => ({
      id: playlist.id ?? `${Date.now()}-${index}`,
      name: playlist.name ?? 'Playlist sans titre',
      description: playlist.description ?? 'Sélection personnelle',
      color: playlist.color ?? '#6C32FF',
      trackIds: playlist.trackIds ?? [],
      createdAt: playlist.createdAt ?? new Date().toISOString(),
      updatedAt: playlist.updatedAt ?? playlist.createdAt ?? new Date().toISOString(),
    }));
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

  const host = parsed.hostname.toLowerCase();
  const platform = PLATFORM_HOSTS.find((entry) => entry.match(host));
  if (platform) {
    if (keepOffline) {
      throw new Error('Cette plateforme ne fournit pas un fichier direct téléchargeable. Ajoute-la comme référence, puis importe ton master ou ton export officiel pour le mode hors ligne.');
    }

    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: platform.profile.label,
      artist: host.replace(/^www\./, ''),
      uri: url,
      externalUrl: url,
      mimeType: 'text/html',
      kind: 'audio',
      origin: platform.profile.origin,
      downloaded: false,
      favorite: false,
      rightsConfirmed: true,
      addedAt: new Date().toISOString(),
      playCount: 0,
    };
  }

  const kindFromPath = isSupportedMedia(parsed.pathname);
  let response: Response | null = null;
  let mimeType = '';
  if (!kindFromPath) {
    try {
      response = await fetch(url, { method: 'HEAD' });
      if (response.ok) mimeType = response.headers.get('content-type')?.split(';')[0] ?? '';
    } catch {
      throw new Error('Le serveur ne permet pas à Voxa de vérifier ce lien. Utilise une URL directe terminant par .mp3, .wav, .flac, .m4a, .mp4 ou un autre format accepté.');
    }
  }
  const kind = kindFromPath ?? isSupportedMedia(parsed.pathname, mimeType);
  if (!kind) throw new Error('Ce lien ne pointe pas vers un fichier audio ou vidéo direct.');
  if (!mimeType) mimeType = `${kind}/${extensionOf(parsed.pathname) || 'unknown'}`;

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
    size: Number(response?.headers.get('content-length')) || undefined,
  };
}

export function describeLink(url: string) {
  try {
    const parsed = new URL(url);
    const platform = PLATFORM_HOSTS.find((entry) => entry.match(parsed.hostname.toLowerCase()));
    if (platform) return { type: 'platform' as const, label: platform.profile.label, origin: platform.profile.origin };
    const kind = isSupportedMedia(parsed.pathname);
    if (kind) return { type: 'direct' as const, label: `${kind === 'audio' ? 'Audio' : 'Vidéo'} direct`, origin: 'direct' as const };
    return { type: 'unknown' as const, label: 'Lien à analyser', origin: 'direct' as const };
  } catch {
    return { type: 'invalid' as const, label: 'URL invalide', origin: 'direct' as const };
  }
}
