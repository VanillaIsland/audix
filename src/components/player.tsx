import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Waveform } from '@/components/waveform';
import { Colors, Gradients, Radius } from '@/constants/theme';
import type { VoxaTrack } from '@/types/media';

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
};

type Props = {
  track: VoxaTrack | null;
  onImport: () => void;
  onPlayed: (id: string) => void;
  onToggleFavorite: (id: string) => void;
};

export function Player({ track, onImport, onPlayed, onToggleFavorite }: Props) {
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [rate, setRate] = useState(1);
  const playedId = useRef<string | null>(null);

  useEffect(() => {
    player.pause();
    if (!track) return;
    player.replace(track.uri);
    if (Platform.OS !== 'web') {
      player.setActiveForLockScreen(true, {
        title: track.title,
        artist: track.artist,
        albumTitle: track.album ?? 'Voxa — Catalogue propriétaire',
      });
    }
  }, [player, track]);

  const progress = useMemo(() => (status.duration ? status.currentTime / status.duration : 0), [status.currentTime, status.duration]);

  const togglePlay = () => {
    if (!track) return onImport();
    if (status.playing) return player.pause();
    if (playedId.current !== track.id) {
      playedId.current = track.id;
      onPlayed(track.id);
    }
    player.play();
  };

  const cycleRate = () => {
    const rates = [0.5, 1, 1.25, 1.5, 2];
    const next = rates[(rates.indexOf(rate) + 1) % rates.length];
    setRate(next);
    player.setPlaybackRate(next);
  };

  return (
    <LinearGradient colors={Gradients.card} style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.coverWrap}>
          <Image source={require('@/assets/brand/voxa-app-icon.png')} style={styles.cover} />
        </View>
        <View style={styles.meta}>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.eyebrow}>{track ? 'NOW PLAYING' : 'PRÊT À LIRE'}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>{track?.title ?? 'Importe ton premier master'}</Text>
          <Text style={styles.artist} numberOfLines={1}>{track?.artist ?? 'Audio & vidéo propriétaire'}</Text>
        </View>
        <Pressable disabled={!track} onPress={() => track && onToggleFavorite(track.id)} style={styles.iconButton}>
          <Ionicons name={track?.favorite ? 'heart' : 'heart-outline'} size={22} color={track?.favorite ? Colors.purple : Colors.textMuted} />
        </Pressable>
      </View>

      <Waveform progress={progress} />
      <Slider
        value={status.currentTime}
        minimumValue={0}
        maximumValue={Math.max(status.duration, 1)}
        onSlidingComplete={(value) => player.seekTo(value)}
        minimumTrackTintColor={Colors.cyan}
        maximumTrackTintColor="transparent"
        thumbTintColor={Colors.text}
        style={styles.slider}
      />
      <View style={styles.timeRow}>
        <Text style={styles.time}>{formatTime(status.currentTime)}</Text>
        <Text style={styles.quality}>{track?.kind === 'video' ? 'VIDEO · AUDIO MODE' : 'LOCAL · ORIGINAL'}</Text>
        <Text style={styles.time}>{formatTime(status.duration)}</Text>
      </View>

      <View style={styles.controls}>
        <Pressable onPress={cycleRate} style={styles.rateButton}><Text style={styles.rateText}>{rate}×</Text></Pressable>
        <Pressable disabled={!track} onPress={() => player.seekTo(Math.max(status.currentTime - 15, 0))} style={styles.iconButton}>
          <Ionicons name="play-back" size={25} color={Colors.text} />
        </Pressable>
        <Pressable onPress={togglePlay} style={styles.playButton}>
          <LinearGradient colors={Gradients.brand} style={styles.playGradient}>
            <Ionicons name={status.playing ? 'pause' : 'play'} size={29} color={Colors.text} />
          </LinearGradient>
        </Pressable>
        <Pressable disabled={!track} onPress={() => player.seekTo(Math.min(status.currentTime + 15, status.duration || 0))} style={styles.iconButton}>
          <Ionicons name="play-forward" size={25} color={Colors.text} />
        </Pressable>
        <Pressable onPress={onImport} style={styles.iconButton}><Ionicons name="add" size={26} color={Colors.cyan} /></Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.large, padding: 20, overflow: 'hidden' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  coverWrap: { width: 64, height: 64, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#343A50' },
  cover: { width: '100%', height: '100%' },
  meta: { flex: 1, gap: 4 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.cyan },
  eyebrow: { color: Colors.cyan, fontWeight: '800', fontSize: 10, letterSpacing: 1.5 },
  title: { color: Colors.text, fontSize: 20, fontWeight: '800' },
  artist: { color: Colors.textMuted, fontSize: 13 },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21 },
  slider: { height: 16, marginTop: -14 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { color: Colors.textMuted, fontVariant: ['tabular-nums'], fontSize: 11 },
  quality: { color: Colors.textMuted, fontWeight: '700', fontSize: 9, letterSpacing: 1.1 },
  controls: { marginTop: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  playButton: { borderRadius: 32, shadowColor: Colors.purple, shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 7 } },
  playGradient: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  rateButton: { minWidth: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  rateText: { color: Colors.text, fontWeight: '800', fontSize: 13 },
});
