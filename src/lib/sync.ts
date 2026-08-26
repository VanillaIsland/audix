import { supabase } from '@/lib/supabase';
import type { AudixPlaylist, AudixTrack, SmartRule, SystemPlaylist } from '@/types/media';

/**
 * Synchronisation des métadonnées uniquement : aucun fichier audio ne quitte
 * l'appareil. En changeant de téléphone tu retrouves ton catalogue décrit
 * (titres, artistes, favoris, playlists, règles) et tu relances les
 * téléchargements depuis les sources d'origine.
 */

/**
 * Ouvre une session anonyme si aucune n'existe. Idempotent. L'erreur remonte
 * telle quelle : « Anonymous sign-ins are disabled » veut dire que l'option
 * n'est pas activée côté Supabase, et c'est utile de le lire.
 */
export async function ensureSession(): Promise<string | null> {
  if (!supabase) throw new Error('Supabase n’est pas configuré dans ce build.');
  const { data } = await supabase.auth.getSession();
  if (data.session?.user?.id) return data.session.user.id;

  const { data: created, error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(`Connexion au compte de synchronisation : ${error.message}`);
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
  bpm: track.bpm ?? null,
  genre: track.genre ?? null,
  favorite: track.favorite,
  // `downloaded` décrit l'appareil courant, pas le catalogue : on repart de zéro.
  downloaded: false,
  rights_confirmed: track.rightsConfirmed,
  play_count: track.playCount,
  last_played_at: track.lastPlayedAt ?? null,
  metadata: { addedAt: track.addedAt, thumbnail: track.thumbnail ?? null, year: track.year ?? null },
});

const playlistRow = (playlist: AudixPlaylist, userId: string) => ({
  user_id: userId,
  local_id: playlist.id,
  name: playlist.name,
  description: playlist.description || null,
  is_smart: Boolean(playlist.smart),
  smart_rules: { rule: playlist.smart ?? null, system: playlist.system ?? null, color: playlist.color },
});

/**
 * Envoie l'état local vers Supabase : titres, playlists, puis composition de
 * chaque playlist. Les identifiants locaux servent de clé, donc un deuxième
 * envoi met à jour au lieu de dupliquer.
 */
export async function pushLibrary(tracks: AudixTrack[], playlists: AudixPlaylist[]) {
  const userId = await ensureSession();
  if (!supabase || !userId) throw new Error('La session Supabase est indisponible.');

  // 1. Les titres, et on récupère l'identifiant serveur de chacun.
  const trackIdByLocal = new Map<string, string>();
  if (tracks.length) {
    const { data, error } = await supabase
      .from('media_items')
      .upsert(tracks.map((track) => trackRow(track, userId)), { onConflict: 'user_id,local_id' })
      .select('id,local_id');
    if (error) throw new Error(`Envoi des titres : ${error.message}`);
    (data ?? []).forEach((row) => { if (row.local_id) trackIdByLocal.set(row.local_id, row.id); });
  }

  // 2. Les playlists, même principe.
  const playlistIdByLocal = new Map<string, string>();
  if (playlists.length) {
    const { data, error } = await supabase
      .from('playlists')
      .upsert(playlists.map((playlist) => playlistRow(playlist, userId)), { onConflict: 'user_id,local_id' })
      .select('id,local_id');
    if (error) throw new Error(`Envoi des playlists : ${error.message}`);
    (data ?? []).forEach((row) => { if (row.local_id) playlistIdByLocal.set(row.local_id, row.id); });
  }

  // 3. La composition : on remplace, pour que les retraits soient répercutés.
  for (const playlist of playlists) {
    const remoteId = playlistIdByLocal.get(playlist.id);
    if (!remoteId || playlist.smart) continue;
    await supabase.from('playlist_items').delete().eq('playlist_id', remoteId);
    const rows = playlist.trackIds
      .map((localId, position) => ({ playlist_id: remoteId, media_id: trackIdByLocal.get(localId), user_id: userId, position }))
      .filter((row): row is { playlist_id: string; media_id: string; user_id: string; position: number } => Boolean(row.media_id));
    if (rows.length) {
      const { error } = await supabase.from('playlist_items').insert(rows);
      if (error) throw new Error(`Envoi de la composition : ${error.message}`);
    }
  }

  return { tracks: tracks.length, playlists: playlists.length };
}

type RemoteTrack = {
  id: string;
  local_id: string | null;
  title: string;
  artist: string;
  album: string | null;
  kind: 'audio' | 'video';
  origin: AudixTrack['origin'];
  mime_type: string;
  source_url: string | null;
  size_bytes: number | null;
  bpm: number | null;
  genre: string | null;
  favorite: boolean;
  rights_confirmed: boolean;
  play_count: number;
  last_played_at: string | null;
  metadata: { addedAt?: string; thumbnail?: string | null; year?: number | null } | null;
};

/**
 * Récupère le catalogue décrit sur le serveur, playlists comprises. Les titres
 * reviennent en `downloaded: false` : le fichier n'existe pas sur ce nouvel
 * appareil, il faudra relancer le téléchargement.
 */
export async function pullLibrary(): Promise<{ tracks: AudixTrack[]; playlists: AudixPlaylist[] }> {
  const userId = await ensureSession();
  if (!supabase || !userId) throw new Error('La session Supabase est indisponible.');

  const { data: mediaRows, error: mediaError } = await supabase
    .from('media_items')
    .select('id,local_id,title,artist,album,kind,origin,mime_type,source_url,size_bytes,bpm,genre,favorite,rights_confirmed,play_count,last_played_at,metadata')
    .order('created_at', { ascending: false });
  if (mediaError) throw new Error(`Récupération impossible : ${mediaError.message}`);

  const localIdByRemote = new Map<string, string>();
  const tracks = ((mediaRows ?? []) as RemoteTrack[])
    // Sans URL source, le titre serait injouable : autant ne pas le remonter.
    .filter((row) => row.source_url)
    .map((row) => {
      const id = row.local_id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      localIdByRemote.set(row.id, id);
      const track: AudixTrack = {
        id,
        title: row.title,
        artist: row.artist,
        album: row.album ?? undefined,
        uri: row.source_url as string,
        externalUrl: row.origin === 'direct' || row.origin === 'local' ? undefined : (row.source_url as string),
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
        thumbnail: row.metadata?.thumbnail ?? undefined,
        genre: row.genre ?? undefined,
        bpm: row.bpm ?? undefined,
        year: row.metadata?.year ?? undefined,
      };
      return track;
    });

  const { data: playlistRows, error: playlistError } = await supabase
    .from('playlists')
    .select('id,local_id,name,description,is_smart,smart_rules,created_at,updated_at')
    .order('created_at', { ascending: false });
  if (playlistError) throw new Error(`Récupération des playlists : ${playlistError.message}`);

  const { data: itemRows } = await supabase
    .from('playlist_items')
    .select('playlist_id,media_id,position')
    .order('position', { ascending: true });

  const playlists: AudixPlaylist[] = (playlistRows ?? []).map((row) => {
    const rules = (row.smart_rules ?? {}) as { rule?: SmartRule | null; system?: SystemPlaylist | null; color?: string };
    const members = (itemRows ?? [])
      .filter((item) => item.playlist_id === row.id)
      .map((item) => localIdByRemote.get(item.media_id))
      .filter((value): value is string => Boolean(value));
    return {
      id: row.local_id ?? row.id,
      name: row.name,
      description: row.description ?? 'Sélection personnelle',
      color: rules.color ?? '#6C32FF',
      trackIds: members,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      system: rules.system ?? undefined,
      smart: row.is_smart ? (rules.rule ?? undefined) : undefined,
    };
  });

  return { tracks, playlists };
}
