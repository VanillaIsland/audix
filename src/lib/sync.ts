import { supabase } from '@/lib/supabase';
import type { AudixPlaylist, AudixTrack } from '@/types/media';

/**
 * Synchronisation des métadonnées uniquement — aucun fichier audio ne quitte
 * l'appareil. En changeant de téléphone tu retrouves ton catalogue décrit
 * (titres, artistes, favoris, playlists) et tu relances les téléchargements.
 */

/** Ouvre une session anonyme si aucune n'existe. Idempotent. */
export async function ensureSession(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (data.session?.user?.id) return data.session.user.id;

  const { data: created, error } = await supabase.auth.signInAnonymously();
  if (error) return null;
  return created.session?.user?.id ?? null;
}

const trackRow = (track: AudixTrack, userId: string) => ({
  user_id: userId,
  local_id: track.id,
  title: track.title,
  artist: track.artist,
  album: track.album ?? null,
  kind: track.kind,
  origin: track.origin,
  mime_type: track.mimeType,
  // On stocke la référence, jamais le fichier : un chemin local n'a aucun
  // sens sur un autre appareil.
  source_url: track.externalUrl ?? (track.uri.startsWith('file:') ? null : track.uri),
  size_bytes: track.size ?? null,
  favorite: track.favorite,
  // `downloaded` décrit l'appareil courant, pas le catalogue : on repart de zéro.
  downloaded: false,
  rights_confirmed: track.rightsConfirmed,
  play_count: track.playCount,
  last_played_at: track.lastPlayedAt ?? null,
  metadata: { addedAt: track.addedAt },
});

const playlistRow = (playlist: AudixPlaylist, userId: string) => ({
  user_id: userId,
  local_id: playlist.id,
  name: playlist.name,
  description: playlist.description || null,
});

/** Envoie l'état local vers Supabase. Renvoie le nombre de lignes traitées. */
export async function pushLibrary(tracks: AudixTrack[], playlists: AudixPlaylist[]) {
  const userId = await ensureSession();
  if (!supabase || !userId) throw new Error('Session Supabase indisponible.');

  if (tracks.length) {
    const { error } = await supabase
      .from('media_items')
      .upsert(tracks.map((track) => trackRow(track, userId)), { onConflict: 'user_id,local_id' });
    if (error) throw new Error(`Envoi des titres : ${error.message}`);
  }

  if (playlists.length) {
    const { error } = await supabase
      .from('playlists')
      .upsert(playlists.map((playlist) => playlistRow(playlist, userId)), { onConflict: 'user_id,local_id' });
    if (error) throw new Error(`Envoi des playlists : ${error.message}`);
  }

  return { tracks: tracks.length, playlists: playlists.length };
}

export type RemoteTrack = {
  local_id: string | null;
  title: string;
  artist: string;
  album: string | null;
  kind: 'audio' | 'video';
  origin: AudixTrack['origin'];
  mime_type: string;
  source_url: string | null;
  size_bytes: number | null;
  favorite: boolean;
  rights_confirmed: boolean;
  play_count: number;
  last_played_at: string | null;
  metadata: { addedAt?: string } | null;
};

/**
 * Récupère le catalogue décrit sur le serveur. Les titres reviennent en
 * `downloaded: false` : le fichier n'existe pas sur ce nouvel appareil, il
 * faudra relancer le téléchargement.
 */
export async function pullLibrary(): Promise<AudixTrack[]> {
  const userId = await ensureSession();
  if (!supabase || !userId) throw new Error('Session Supabase indisponible.');

  const { data, error } = await supabase
    .from('media_items')
    .select('local_id,title,artist,album,kind,origin,mime_type,source_url,size_bytes,favorite,rights_confirmed,play_count,last_played_at,metadata')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Récupération impossible : ${error.message}`);

  return ((data ?? []) as RemoteTrack[])
    // Sans URL source, le titre serait injouable : autant ne pas le remonter.
    .filter((row) => row.source_url)
    .map((row) => ({
      id: row.local_id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: row.title,
      artist: row.artist,
      album: row.album ?? undefined,
      uri: row.source_url!,
      externalUrl: row.origin === 'direct' || row.origin === 'local' ? undefined : row.source_url!,
      mimeType: row.mime_type,
      kind: row.kind,
      origin: row.origin,
      downloaded: false,
      favorite: row.favorite,
      rightsConfirmed: row.rights_confirmed,
      addedAt: row.metadata?.addedAt ?? new Date().toISOString(),
      lastPlayedAt: row.last_played_at ?? undefined,
      playCount: row.play_count,
      size: row.size_bytes ?? undefined,
    }));
}
