import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  deleteTrackFile,
  importAuthorizedUrl,
  type ImportMeta,
  loadLibrary,
  loadPlaylists,
  pickOwnedMedia,
  saveLibrary,
  savePlaylists,
} from '@/lib/media';
import type { AudixPlaylist, AudixTrack, SmartRule, SystemPlaylist } from '@/types/media';

/** Nom et couleur des playlists que l'app entretient toute seule. */
const SYSTEM_META: Record<SystemPlaylist, { name: string; color: string }> = {
  grab: { name: 'Grab', color: '#00D8E8' },
  local: { name: 'Local', color: '#39E6A2' },
  downloaded: { name: 'Downloaded', color: '#6C32FF' },
};

export function useLibrary() {
  const [tracks, setTracks] = useState<AudixTrack[]>([]);
  const [playlists, setPlaylists] = useState<AudixPlaylist[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([loadLibrary(), loadPlaylists()]).then(([savedTracks, savedPlaylists]) => {
      setTracks(savedTracks);
      setPlaylists(savedPlaylists);
      setCurrentId(savedTracks[0]?.id ?? null);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready) saveLibrary(tracks).catch(() => undefined);
  }, [ready, tracks]);

  useEffect(() => {
    if (ready) savePlaylists(playlists).catch(() => undefined);
  }, [playlists, ready]);

  const current = useMemo(() => tracks.find((track) => track.id === currentId) ?? null, [currentId, tracks]);

  /** Import depuis le téléphone. Une playlist cible classe les titres à l'ajout. */
  const importFiles = useCallback(async (playlistId?: string | null) => {
    const imported = await pickOwnedMedia();
    if (!imported.length) return 0;
    setTracks((existing) => [...imported, ...existing]);
    setCurrentId((value) => value ?? imported[0].id);
    if (playlistId) {
      const ids = imported.map((track) => track.id);
      setPlaylists((existing) => existing.map((playlist) => (
        playlist.id === playlistId
          ? { ...playlist, trackIds: [...playlist.trackIds, ...ids.filter((id) => !playlist.trackIds.includes(id))], updatedAt: new Date().toISOString() }
          : playlist
      )));
    }
    return imported.length;
  }, []);

  const importUrl = useCallback(async (url: string, keepOffline: boolean, meta?: ImportMeta) => {
    const imported = await importAuthorizedUrl(url, keepOffline, meta);
    setTracks((existing) => [imported, ...existing]);
    setCurrentId(imported.id);
    return imported;
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setTracks((existing) => existing.map((track) => (track.id === id ? { ...track, favorite: !track.favorite } : track)));
  }, []);

  const markPlayed = useCallback((id: string) => {
    const now = new Date().toISOString();
    setTracks((existing) =>
      existing.map((track) =>
        track.id === id ? { ...track, lastPlayedAt: now, playCount: track.playCount + 1 } : track,
      ),
    );
  }, []);

  /** Drops a track everywhere: disk, library, playlists, and current selection. */
  const deleteTrack = useCallback(async (id: string) => {
    const target = tracks.find((track) => track.id === id);
    if (!target) return;
    await deleteTrackFile(target);
    setTracks((existing) => existing.filter((track) => track.id !== id));
    setPlaylists((existing) => existing.map((playlist) => (
      playlist.trackIds.includes(id)
        ? { ...playlist, trackIds: playlist.trackIds.filter((trackId) => trackId !== id), updatedAt: new Date().toISOString() }
        : playlist
    )));
    setCurrentId((value) => (value === id ? null : value));
  }, [tracks]);

  /** Metadata edit. Only descriptive fields — never uri, origin or id. */
  const updateTrack = useCallback((id: string, changes: Partial<Pick<AudixTrack, 'title' | 'artist' | 'album' | 'genre' | 'bpm' | 'year'>>) => {
    const clean = {
      ...(changes.title !== undefined ? { title: changes.title.trim() || 'Sans titre' } : {}),
      ...(changes.artist !== undefined ? { artist: changes.artist.trim() || 'Artiste inconnu' } : {}),
      ...(changes.album !== undefined ? { album: changes.album.trim() || undefined } : {}),
      ...(changes.genre !== undefined ? { genre: changes.genre?.trim() || undefined } : {}),
      ...(changes.bpm !== undefined ? { bpm: changes.bpm || undefined } : {}),
      ...(changes.year !== undefined ? { year: changes.year || undefined } : {}),
    };
    setTracks((existing) => existing.map((track) => (track.id === id ? { ...track, ...clean } : track)));
  }, []);

  const createPlaylist = useCallback((name: string, color = '#6C32FF') => {
    const normalized = name.trim();
    if (!normalized) throw new Error('Donne un nom à la playlist.');
    if (playlists.some((playlist) => playlist.name.toLowerCase() === normalized.toLowerCase())) {
      throw new Error('Une playlist porte déjà ce nom.');
    }
    const playlist: AudixPlaylist = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: normalized,
      description: 'Sélection personnelle',
      color,
      trackIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setPlaylists((existing) => [playlist, ...existing]);
    return playlist;
  }, [playlists]);

  const updatePlaylist = useCallback((playlistId: string, changes: Partial<Pick<AudixPlaylist, 'name' | 'description' | 'color'>>) => {
    setPlaylists((existing) => existing.map((playlist) => (
      playlist.id === playlistId
        ? { ...playlist, ...changes, name: changes.name?.slice(0, 80) ?? playlist.name, updatedAt: new Date().toISOString() }
        : playlist
    )));
  }, []);

  const toggleTrackInPlaylist = useCallback((playlistId: string, trackId: string) => {
    setPlaylists((existing) => existing.map((playlist) => {
      if (playlist.id !== playlistId) return playlist;
      const hasTrack = playlist.trackIds.includes(trackId);
      return {
        ...playlist,
        trackIds: hasTrack
          ? playlist.trackIds.filter((id) => id !== trackId)
          : [...playlist.trackIds, trackId],
        updatedAt: new Date().toISOString(),
      };
    }));
  }, []);

  const addTrackToPlaylist = useCallback((playlistId: string, trackId: string) => {
    setPlaylists((existing) => existing.map((playlist) => (
      playlist.id === playlistId && !playlist.trackIds.includes(trackId)
        ? { ...playlist, trackIds: [...playlist.trackIds, trackId], updatedAt: new Date().toISOString() }
        : playlist
    )));
  }, []);

  /**
   * Range un titre dans une playlist automatique, en la creant au passage si
   * elle n'existe pas encore. Tout se fait dans une seule mise a jour d'etat
   * pour eviter les doublons quand plusieurs imports arrivent ensemble.
   */
  const addToSystemPlaylist = useCallback((kind: SystemPlaylist, trackIds: string[]) => {
    if (!trackIds.length) return;
    setPlaylists((existing) => {
      const meta = SYSTEM_META[kind];
      const found = existing.find((playlist) => playlist.system === kind)
        ?? existing.find((playlist) => playlist.name.toLowerCase() === meta.name.toLowerCase());
      const now = new Date().toISOString();
      if (!found) {
        const created: AudixPlaylist = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: meta.name,
          description: 'Remplie automatiquement par Audix',
          color: meta.color,
          trackIds: [...trackIds],
          createdAt: now,
          updatedAt: now,
          system: kind,
        };
        return [created, ...existing];
      }
      return existing.map((playlist) => (
        playlist.id === found.id
          ? {
              ...playlist,
              system: kind,
              trackIds: [...playlist.trackIds, ...trackIds.filter((id) => !playlist.trackIds.includes(id))],
              updatedAt: now,
            }
          : playlist
      ));
    });
  }, []);

  /** Retire un ou plusieurs titres d'une playlist, sans toucher a la bibliotheque. */
  const removeTracksFromPlaylist = useCallback((playlistId: string, trackIds: string[]) => {
    if (!trackIds.length) return;
    setPlaylists((existing) => existing.map((playlist) => (
      playlist.id === playlistId
        ? { ...playlist, trackIds: playlist.trackIds.filter((id) => !trackIds.includes(id)), updatedAt: new Date().toISOString() }
        : playlist
    )));
  }, []);

  /** Playlist intelligente : pas de liste figee, seulement des regles. */
  const createSmartPlaylist = useCallback((name: string, smart: SmartRule, color = '#A71BFF') => {
    const normalized = name.trim();
    if (!normalized) throw new Error('Donne un nom à la playlist.');
    if (playlists.some((playlist) => playlist.name.toLowerCase() === normalized.toLowerCase())) {
      throw new Error('Une playlist porte déjà ce nom.');
    }
    const now = new Date().toISOString();
    const playlist: AudixPlaylist = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: normalized,
      description: 'Sélection automatique par règles',
      color,
      trackIds: [],
      createdAt: now,
      updatedAt: now,
      smart,
    };
    setPlaylists((existing) => [playlist, ...existing]);
    return playlist;
  }, [playlists]);

  const updatePlaylistRule = useCallback((playlistId: string, smart: SmartRule) => {
    setPlaylists((existing) => existing.map((playlist) => (
      playlist.id === playlistId ? { ...playlist, smart, updatedAt: new Date().toISOString() } : playlist
    )));
  }, []);

  /**
   * Fusionne ce qui vient du serveur avec ce qui est deja la. Les titres et
   * playlists connus sont mis a jour, les inconnus ajoutes, et rien de local
   * n'est supprime : un appareil qui a plus de contenu ne perd rien.
   */
  const mergeFromRemote = useCallback((remoteTracks: AudixTrack[], remotePlaylists: AudixPlaylist[]) => {
    setTracks((existing) => {
      const merged = [...existing];
      remoteTracks.forEach((incoming) => {
        const position = merged.findIndex((track) => track.id === incoming.id);
        if (position === -1) merged.push(incoming);
        // Le fichier local et l'etat hors ligne appartiennent a cet appareil.
        else merged[position] = { ...incoming, uri: merged[position].uri, downloaded: merged[position].downloaded };
      });
      return merged;
    });
    setPlaylists((existing) => {
      const merged = [...existing];
      remotePlaylists.forEach((incoming) => {
        const position = merged.findIndex((playlist) => playlist.id === incoming.id);
        if (position === -1) merged.push(incoming);
        else merged[position] = { ...merged[position], ...incoming };
      });
      return merged;
    });
    return { tracks: remoteTracks.length, playlists: remotePlaylists.length };
  }, []);

  const deletePlaylist = useCallback((playlistId: string) => {
    setPlaylists((existing) => existing.filter((playlist) => playlist.id !== playlistId));
  }, []);

  return {
    tracks,
    playlists,
    current,
    currentId,
    setCurrentId,
    importFiles,
    importUrl,
    toggleFavorite,
    markPlayed,
    deleteTrack,
    updateTrack,
    createPlaylist,
    updatePlaylist,
    toggleTrackInPlaylist,
    addTrackToPlaylist,
    addToSystemPlaylist,
    removeTracksFromPlaylist,
    createSmartPlaylist,
    updatePlaylistRule,
    mergeFromRemote,
    deletePlaylist,
    ready,
  };
}
