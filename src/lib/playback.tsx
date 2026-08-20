import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform } from 'react-native';
import {
  preload,
  requestNotificationPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  type AudioPlayer,
} from 'expo-audio';

import type { AudixTrack } from '@/types/media';

export type RepeatMode = 'none' | 'one' | 'all';

export const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4] as const;
export const CROSSFADE_CHOICES = [0, 2, 4, 6, 8, 12] as const;

const SEEK_STEP = 15;
const RESTART_THRESHOLD = 3;
/** Volume ramp resolution. 50ms is inaudible as steps but cheap enough. */
const FADE_TICK_MS = 50;

type PlaybackValue = {
  current: AudixTrack | null;
  queue: AudixTrack[];
  index: number;
  currentTime: number;
  duration: number;
  playing: boolean;
  isBuffering: boolean;
  isLoaded: boolean;
  rate: number;
  shuffle: boolean;
  repeat: RepeatMode;
  /** Crossfade length in seconds. 0 disables it entirely. */
  crossfade: number;
  /** Master gain, 0..1. Per-track normalisation multiplies into this. */
  volume: number;
  hasNext: boolean;
  hasPrevious: boolean;
  playTrack: (track: AudixTrack, queue?: AudixTrack[]) => void;
  toggle: () => void;
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seekTo: (seconds: number) => void;
  seekBy: (delta: number) => void;
  setRate: (rate: number) => void;
  setCrossfade: (seconds: number) => void;
  setVolume: (value: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  stop: () => void;
  onTrackStart: (handler: (track: AudixTrack) => void) => void;
};

const PlaybackContext = createContext<PlaybackValue | null>(null);

const isPlayable = (track: AudixTrack | null | undefined): track is AudixTrack =>
  Boolean(track && !track.externalUrl && track.uri);

const shuffleFrom = (tracks: AudixTrack[], pinned: AudixTrack | null) => {
  const rest = tracks.filter((track) => track.id !== pinned?.id);
  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return pinned ? [pinned, ...rest] : rest;
};

export function PlaybackProvider({ children }: { children: ReactNode }) {
  // Two decks. Deck A alone is used until crossfade is switched on, so the
  // zero-crossfade path stays byte-for-byte the single-player behaviour.
  const deckA = useAudioPlayer(null, { updateInterval: 250 });
  const deckB = useAudioPlayer(null, { updateInterval: 250 });
  const [onB, setOnB] = useState(false);

  const active = onB ? deckB : deckA;
  const idle = onB ? deckA : deckB;
  const status = useAudioPlayerStatus(active);

  const [baseQueue, setBaseQueue] = useState<AudixTrack[]>([]);
  const [queue, setQueue] = useState<AudixTrack[]>([]);
  const [index, setIndex] = useState(-1);
  const [rate, setRateState] = useState(1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('none');
  const [crossfade, setCrossfadeState] = useState(0);
  const [volume, setVolumeState] = useState(1);

  const trackStartHandler = useRef<((track: AudixTrack) => void) | null>(null);
  const startedTrackId = useRef<string | null>(null);
  const wasFinished = useRef(false);
  const fadeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fading = useRef(false);

  const repeatRef = useRef(repeat); repeatRef.current = repeat;
  const crossfadeRef = useRef(crossfade); crossfadeRef.current = crossfade;
  const volumeRef = useRef(volume); volumeRef.current = volume;
  const rateRef = useRef(rate); rateRef.current = rate;

  const current = index >= 0 ? (queue[index] ?? null) : null;
  const currentRef = useRef<AudixTrack | null>(current); currentRef.current = current;
  const queueRef = useRef(queue); queueRef.current = queue;
  const indexRef = useRef(index); indexRef.current = index;

  // --- audio session -------------------------------------------------------
  useEffect(() => {
    if (Platform.OS === 'web') return;
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      shouldRouteThroughEarpiece: false,
    }).catch(() => undefined);
    if (Platform.OS === 'android') requestNotificationPermissionsAsync().catch(() => undefined);
  }, []);

  const stopFade = useCallback(() => {
    if (fadeTimer.current) clearInterval(fadeTimer.current);
    fadeTimer.current = null;
    fading.current = false;
  }, []);

  /** Per-track gain lets a quiet master sit level with a loud one. */
  const gainFor = useCallback((track: AudixTrack | null) => {
    const raw = (track as { gain?: number } | null)?.gain;
    const trackGain = typeof raw === 'number' && raw > 0 ? Math.min(raw, 2) : 1;
    return Math.max(0, Math.min(1, volumeRef.current * trackGain));
  }, []);

  const bindLockScreen = useCallback((player: AudioPlayer, track: AudixTrack | null) => {
    try {
      if (!track) { player.clearLockScreenControls(); return; }
      player.setActiveForLockScreen(
        true,
        { title: track.title, artist: track.artist, albumTitle: track.album ?? 'DA Audix · Catalogue privé' },
        { showSeekForward: true, showSeekBackward: true, isLiveStream: false },
      );
    } catch {
      // Best effort: unsupported on some web targets.
    }
  }, []);

  const loadInto = useCallback((player: AudioPlayer, track: AudixTrack | null, autoPlay: boolean) => {
    if (!isPlayable(track)) { player.pause(); return; }
    player.replace(track.uri);
    player.setPlaybackRate(rateRef.current);
    player.volume = gainFor(track);
    if (autoPlay) player.play();
  }, [gainFor]);

  const goToIndex = useCallback((nextIndex: number, autoPlay = true) => {
    const list = queueRef.current;
    if (nextIndex < 0 || nextIndex >= list.length) return;
    stopFade();
    idle.pause();
    setIndex(nextIndex);
    loadInto(active, list[nextIndex], autoPlay);
    bindLockScreen(active, list[nextIndex]);
  }, [active, bindLockScreen, idle, loadInto, stopFade]);

  // --- crossfade -----------------------------------------------------------
  /** Ramps the outgoing deck down while the incoming deck rises, then swaps. */
  const beginCrossfade = useCallback((nextIndex: number) => {
    const list = queueRef.current;
    const incoming = list[nextIndex];
    if (!isPlayable(incoming) || fading.current) return;

    fading.current = true;
    const seconds = crossfadeRef.current;
    const steps = Math.max(1, Math.round((seconds * 1000) / FADE_TICK_MS));
    const fromDeck = active;
    const toDeck = idle;
    const target = gainFor(incoming);

    loadInto(toDeck, incoming, true);
    toDeck.volume = 0;
    // Hand the lock screen over immediately: the incoming track is what the
    // user is about to hear, so metadata should not lag behind the audio.
    bindLockScreen(toDeck, incoming);

    let step = 0;
    fadeTimer.current = setInterval(() => {
      step += 1;
      const ratio = Math.min(1, step / steps);
      try {
        fromDeck.volume = target * (1 - ratio);
        toDeck.volume = target * ratio;
      } catch {
        // Deck released mid-fade.
      }
      if (ratio >= 1) {
        stopFade();
        try { fromDeck.pause(); } catch { /* already gone */ }
        setOnB((value) => !value);
        setIndex(nextIndex);
      }
    }, FADE_TICK_MS);
  }, [active, bindLockScreen, gainFor, idle, loadInto, stopFade]);

  useEffect(() => () => stopFade(), [stopFade]);

  // Watch the tail of the current track and start the fade in time.
  useEffect(() => {
    if (crossfade <= 0 || fading.current || !current) return;
    if (!status.playing || !status.duration) return;
    const remaining = status.duration - status.currentTime;
    if (remaining > crossfade || remaining <= 0) return;
    if (repeatRef.current === 'one') return;

    const list = queueRef.current;
    const nextIndex =
      indexRef.current + 1 < list.length ? indexRef.current + 1
      : repeatRef.current === 'all' ? 0
      : -1;
    if (nextIndex >= 0) beginCrossfade(nextIndex);
  }, [beginCrossfade, crossfade, current, status.currentTime, status.duration, status.playing]);

  // --- transport -----------------------------------------------------------
  const playTrack = useCallback((track: AudixTrack, nextQueue?: AudixTrack[]) => {
    stopFade();
    idle.pause();
    const pool = (nextQueue ?? queueRef.current).filter((item) => isPlayable(item));
    const resolved = pool.some((item) => item.id === track.id) ? pool : [track, ...pool];
    const ordered = shuffle ? shuffleFrom(resolved, track) : resolved;
    const position = Math.max(ordered.findIndex((item) => item.id === track.id), 0);
    setBaseQueue(resolved);
    setQueue(ordered);
    setIndex(position);
    loadInto(active, ordered[position], true);
    bindLockScreen(active, ordered[position]);
  }, [active, bindLockScreen, idle, loadInto, shuffle, stopFade]);

  const play = useCallback(() => { if (isPlayable(currentRef.current)) active.play(); }, [active]);
  const pause = useCallback(() => { stopFade(); active.pause(); }, [active, stopFade]);
  const toggle = useCallback(() => {
    if (!isPlayable(currentRef.current)) return;
    if (status.playing) pause(); else active.play();
  }, [active, pause, status.playing]);

  const next = useCallback(() => {
    const list = queueRef.current;
    if (!list.length) return;
    if (indexRef.current + 1 < list.length) return goToIndex(indexRef.current + 1);
    if (repeatRef.current === 'all') return goToIndex(0);
    active.pause();
  }, [active, goToIndex]);

  const previous = useCallback(() => {
    const list = queueRef.current;
    if (!list.length) return;
    if (status.currentTime > RESTART_THRESHOLD) { active.seekTo(0); return; }
    if (indexRef.current - 1 >= 0) return goToIndex(indexRef.current - 1);
    if (repeatRef.current === 'all') return goToIndex(list.length - 1);
    active.seekTo(0);
  }, [active, goToIndex, status.currentTime]);

  const seekTo = useCallback((seconds: number) => {
    const max = status.duration || 0;
    active.seekTo(Math.min(Math.max(seconds, 0), max || seconds));
  }, [active, status.duration]);
  const seekBy = useCallback((delta: number) => seekTo(status.currentTime + delta), [seekTo, status.currentTime]);

  const setRate = useCallback((value: number) => {
    setRateState(value);
    active.setPlaybackRate(value, 'high');
  }, [active]);

  const setCrossfade = useCallback((seconds: number) => {
    if (seconds <= 0) stopFade();
    setCrossfadeState(seconds);
  }, [stopFade]);

  const setVolume = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setVolumeState(clamped);
    volumeRef.current = clamped;
    if (!fading.current) {
      try { active.volume = gainFor(currentRef.current); } catch { /* not loaded */ }
    }
  }, [active, gainFor]);

  const stop = useCallback(() => {
    stopFade();
    deckA.pause(); deckB.pause();
    bindLockScreen(active, null);
    setIndex(-1); setQueue([]); setBaseQueue([]);
  }, [active, bindLockScreen, deckA, deckB, stopFade]);

  const toggleShuffle = useCallback(() => {
    setShuffle((wasOn) => {
      const nowOn = !wasOn;
      const pinned = currentRef.current;
      const reordered = nowOn ? shuffleFrom(baseQueue, pinned) : baseQueue;
      setQueue(reordered);
      setIndex(pinned ? Math.max(reordered.findIndex((t) => t.id === pinned.id), 0) : -1);
      return nowOn;
    });
  }, [baseQueue]);

  const cycleRepeat = useCallback(() => {
    setRepeat((mode) => (mode === 'none' ? 'all' : mode === 'all' ? 'one' : 'none'));
  }, []);

  // --- auto-advance (crossfade off, or last track) --------------------------
  useEffect(() => {
    const finished = Boolean(status.didJustFinish);
    const isEdge = finished && !wasFinished.current;
    wasFinished.current = finished;
    if (!isEdge || !current || fading.current) return;
    if (repeatRef.current === 'one') { active.seekTo(0); active.play(); return; }
    next();
  }, [active, current, next, status.didJustFinish]);

  // --- gapless: warm the next source ---------------------------------------
  useEffect(() => {
    const upcoming = queue[index + 1] ?? (repeat === 'all' ? queue[0] : null);
    if (!isPlayable(upcoming)) return;
    preload(upcoming.uri, { preferredForwardBufferDuration: 20 }).catch(() => undefined);
  }, [index, queue, repeat]);

  // --- play-count ----------------------------------------------------------
  useEffect(() => {
    if (!current || !status.playing) return;
    if (startedTrackId.current === current.id) return;
    startedTrackId.current = current.id;
    trackStartHandler.current?.(current);
  }, [current, status.playing]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && currentRef.current) bindLockScreen(active, currentRef.current);
    });
    return () => sub.remove();
  }, [active, bindLockScreen]);

  const onTrackStart = useCallback((handler: (track: AudixTrack) => void) => {
    trackStartHandler.current = handler;
  }, []);

  const value = useMemo<PlaybackValue>(() => ({
    current, queue, index,
    currentTime: status.currentTime ?? 0,
    duration: status.duration ?? 0,
    playing: status.playing ?? false,
    isBuffering: status.isBuffering ?? false,
    isLoaded: status.isLoaded ?? false,
    rate, shuffle, repeat, crossfade, volume,
    hasNext: index >= 0 && (index + 1 < queue.length || repeat === 'all'),
    hasPrevious: index > 0 || repeat === 'all',
    playTrack, toggle, play, pause, next, previous, seekTo, seekBy,
    setRate, setCrossfade, setVolume, toggleShuffle, cycleRepeat, stop, onTrackStart,
  }), [
    current, queue, index, status.currentTime, status.duration, status.playing,
    status.isBuffering, status.isLoaded, rate, shuffle, repeat, crossfade, volume,
    playTrack, toggle, play, pause, next, previous, seekTo, seekBy,
    setRate, setCrossfade, setVolume, toggleShuffle, cycleRepeat, stop, onTrackStart,
  ]);

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback() {
  const value = useContext(PlaybackContext);
  if (!value) throw new Error('usePlayback must be used inside <PlaybackProvider>.');
  return value;
}
