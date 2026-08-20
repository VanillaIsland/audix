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
} from 'expo-audio';

import type { AudixTrack } from '@/types/media';

export type RepeatMode = 'none' | 'one' | 'all';

export const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4] as const;

/** Below this position, "previous" restarts the track instead of going back one. */
const RESTART_THRESHOLD = 3;

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
  hasNext: boolean;
  hasPrevious: boolean;
  /** Load a track and (optionally) the queue it belongs to, then start playing. */
  playTrack: (track: AudixTrack, queue?: AudixTrack[]) => void;
  toggle: () => void;
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seekTo: (seconds: number) => void;
  seekBy: (delta: number) => void;
  setRate: (rate: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  stop: () => void;
  /** Register a callback fired once per track when playback actually starts. */
  onTrackStart: (handler: (track: AudixTrack) => void) => void;
};

const PlaybackContext = createContext<PlaybackValue | null>(null);

const isPlayable = (track: AudixTrack | null): track is AudixTrack =>
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
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  // `baseQueue` keeps the original ordering so shuffle can be turned off again.
  const [baseQueue, setBaseQueue] = useState<AudixTrack[]>([]);
  const [queue, setQueue] = useState<AudixTrack[]>([]);
  const [index, setIndex] = useState(-1);
  const [rate, setRateState] = useState(1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('none');

  const trackStartHandler = useRef<((track: AudixTrack) => void) | null>(null);
  const startedTrackId = useRef<string | null>(null);
  const wasFinished = useRef(false);
  const repeatRef = useRef(repeat);

  const current = index >= 0 ? (queue[index] ?? null) : null;
  const currentRef = useRef<AudixTrack | null>(current);

  useEffect(() => {
    repeatRef.current = repeat;
  }, [repeat]);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  // --- audio session -------------------------------------------------------
  useEffect(() => {
    if (Platform.OS === 'web') return;
    // `doNotMix` is required by expo-audio for lock screen controls to bind.
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      shouldRouteThroughEarpiece: false,
    }).catch(() => undefined);
    if (Platform.OS === 'android') {
      // Without this the media notification (and >3min background audio) is denied.
      requestNotificationPermissionsAsync().catch(() => undefined);
    }
  }, []);

  // --- lock screen ---------------------------------------------------------
  const bindLockScreen = useCallback(
    (track: AudixTrack | null) => {
      try {
        if (!track) {
          player.clearLockScreenControls();
          return;
        }
        player.setActiveForLockScreen(
          true,
          {
            title: track.title,
            artist: track.artist,
            albumTitle: track.album ?? 'DA Audix · Catalogue privé',
          },
          { showSeekForward: true, showSeekBackward: true, isLiveStream: false },
        );
      } catch {
        // Lock screen controls are best-effort (unsupported on some web targets).
      }
    },
    [player],
  );

  // --- loading -------------------------------------------------------------
  const loadIntoPlayer = useCallback(
    (track: AudixTrack | null, autoPlay: boolean) => {
      if (!isPlayable(track)) {
        player.pause();
        bindLockScreen(null);
        return;
      }
      player.replace(track.uri);
      player.setPlaybackRate(rate);
      bindLockScreen(track);
      if (autoPlay) player.play();
    },
    [bindLockScreen, player, rate],
  );

  const goToIndex = useCallback(
    (nextIndex: number, autoPlay = true) => {
      if (nextIndex < 0 || nextIndex >= queue.length) return;
      setIndex(nextIndex);
      loadIntoPlayer(queue[nextIndex], autoPlay);
    },
    [loadIntoPlayer, queue],
  );

  const playTrack = useCallback(
    (track: AudixTrack, nextQueue?: AudixTrack[]) => {
      const pool = (nextQueue ?? queue).filter((item) => !item.externalUrl && Boolean(item.uri));
      // The requested track always belongs to its own queue, even if the
      // surrounding view was filtered down to something that excludes it.
      const resolved = pool.some((item) => item.id === track.id) ? pool : [track, ...pool];
      const ordered = shuffle ? shuffleFrom(resolved, track) : resolved;
      const position = Math.max(
        ordered.findIndex((item) => item.id === track.id),
        0,
      );
      setBaseQueue(resolved);
      setQueue(ordered);
      setIndex(position);
      loadIntoPlayer(ordered[position], true);
    },
    [loadIntoPlayer, queue, shuffle],
  );

  // --- transport -----------------------------------------------------------
  const play = useCallback(() => {
    if (!isPlayable(currentRef.current)) return;
    player.play();
  }, [player]);

  const pause = useCallback(() => player.pause(), [player]);

  const toggle = useCallback(() => {
    if (!isPlayable(currentRef.current)) return;
    if (status.playing) player.pause();
    else player.play();
  }, [player, status.playing]);

  const next = useCallback(() => {
    if (!queue.length) return;
    if (index + 1 < queue.length) return goToIndex(index + 1);
    if (repeatRef.current === 'all') return goToIndex(0);
    player.pause();
  }, [goToIndex, index, player, queue.length]);

  const previous = useCallback(() => {
    if (!queue.length) return;
    // Mirrors every mainstream player: rewind first, skip back only if near the start.
    if (status.currentTime > RESTART_THRESHOLD) {
      player.seekTo(0);
      return;
    }
    if (index - 1 >= 0) return goToIndex(index - 1);
    if (repeatRef.current === 'all') return goToIndex(queue.length - 1);
    player.seekTo(0);
  }, [goToIndex, index, player, queue.length, status.currentTime]);

  const seekTo = useCallback(
    (seconds: number) => {
      const max = status.duration || 0;
      player.seekTo(Math.min(Math.max(seconds, 0), max || seconds));
    },
    [player, status.duration],
  );

  const seekBy = useCallback(
    (delta: number) => seekTo(status.currentTime + delta),
    [seekTo, status.currentTime],
  );

  const setRate = useCallback(
    (value: number) => {
      setRateState(value);
      player.setPlaybackRate(value, 'high');
    },
    [player],
  );

  const stop = useCallback(() => {
    player.pause();
    bindLockScreen(null);
    setIndex(-1);
    setQueue([]);
    setBaseQueue([]);
  }, [bindLockScreen, player]);

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

  // --- auto-advance --------------------------------------------------------
  useEffect(() => {
    // didJustFinish stays true across several status ticks, so act only on the
    // rising edge. Keying on the track id instead would leave repeat:'one'
    // permanently armed after its first loop.
    const finished = Boolean(status.didJustFinish);
    const isEdge = finished && !wasFinished.current;
    wasFinished.current = finished;
    if (!isEdge || !current) return;

    if (repeatRef.current === 'one') {
      player.seekTo(0);
      player.play();
      return;
    }
    next();
  }, [current, next, player, status.didJustFinish]);

  // --- gapless: warm the next source while the current one plays ------------
  useEffect(() => {
    const upcoming = queue[index + 1] ?? (repeat === 'all' ? queue[0] : null);
    if (!isPlayable(upcoming)) return;
    preload(upcoming.uri, { preferredForwardBufferDuration: 20 }).catch(() => undefined);
  }, [index, queue, repeat]);

  // --- play-count callback -------------------------------------------------
  useEffect(() => {
    if (!current || !status.playing) return;
    if (startedTrackId.current === current.id) return;
    startedTrackId.current = current.id;
    trackStartHandler.current?.(current);
  }, [current, status.playing]);

  // Keep lock screen metadata alive when iOS re-activates the app.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && currentRef.current) bindLockScreen(currentRef.current);
    });
    return () => sub.remove();
  }, [bindLockScreen]);

  const onTrackStart = useCallback((handler: (track: AudixTrack) => void) => {
    trackStartHandler.current = handler;
  }, []);

  const value = useMemo<PlaybackValue>(
    () => ({
      current,
      queue,
      index,
      currentTime: status.currentTime ?? 0,
      duration: status.duration ?? 0,
      playing: status.playing ?? false,
      isBuffering: status.isBuffering ?? false,
      isLoaded: status.isLoaded ?? false,
      rate,
      shuffle,
      repeat,
      hasNext: index >= 0 && (index + 1 < queue.length || repeat === 'all'),
      hasPrevious: index > 0 || repeat === 'all',
      playTrack,
      toggle,
      play,
      pause,
      next,
      previous,
      seekTo,
      seekBy,
      setRate,
      toggleShuffle,
      cycleRepeat,
      stop,
      onTrackStart,
    }),
    [
      current, queue, index, status.currentTime, status.duration, status.playing,
      status.isBuffering, status.isLoaded, rate, shuffle, repeat, playTrack, toggle,
      play, pause, next, previous, seekTo, seekBy, setRate, toggleShuffle, cycleRepeat,
      stop, onTrackStart,
    ],
  );

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback() {
  const value = useContext(PlaybackContext);
  if (!value) throw new Error('usePlayback must be used inside <PlaybackProvider>.');
  return value;
}
