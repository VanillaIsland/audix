import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  deleteTrackFile,
  importAuthorizedUrl,
  loadLibrary,
  loadPlaylists,
  pickOwnedMedia,
  saveLibrary,
  savePlaylists,
} from '@/lib/media';
import type { AudixPlaylist, AudixTrack } from '@/types/media';

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

  const importFiles = useCallback(async () => {
    const imported = await pickOwnedMedia();
    if (!imported.length) return 0;
    setTracks((existing) => [...imported, ...existing]);
    setCurrentId((value) => value ?? imported[0].id);
    return imported.length;
  }, []);

  const importUrl = useCallback(async (url: string, keepOffline: boolean) => {
    const imported = await importAuthorizedUrl(url, keepOffline);
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
  const updateTrack = useCallback((id: string, changes: Partial<Pick<AudixTrack, 'title' | 'artist' | 'album'>>) => {
    const clean = {
      ...(changes.title !== undefined ? { title: changes.title.trim() || 'Sans titre' } : {}),
      ...(changes.artist !== undefined ? { artist: changes.artist.trim() || 'Artiste inconnu' } : {}),
      ...(changes.album !== undefined ? { album: changes.album.trim() || undefined } : {}),
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
    deletePlaylist,
    ready,
  };
}
