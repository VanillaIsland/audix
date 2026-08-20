import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { ExternalPlayer } from '@/components/external-player';
import { Waveform } from '@/components/waveform';
import { Colors, Gradients } from '@/constants/theme';
import { PLAYBACK_RATES, usePlayback } from '@/lib/playback';
import type { AudixTrack } from '@/types/media';

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
};

const REPEAT_ICON = {
  none: 'repeat-outline',
  all: 'repeat',
  one: 'repeat',
} as const;

type Props = {
  track: AudixTrack | null;
  onImport: () => void;
  onToggleFavorite: (id: string) => void;
};

export function Player({ track, onImport, onToggleFavorite }: Props) {
  const playback = usePlayback();

  // Platform references (YouTube / Spotify / Facebook) are streamed by their
  // official embed, never by the audio engine.
  if (track?.externalUrl) {
    return <ExternalPlayer track={track} onToggleFavorite={onToggleFavorite} />;
  }

  const { currentTime, duration, playing, isBuffering, rate, shuffle, repeat } = playback;
  const progress = duration > 0 ? currentTime / duration : 0;
  const active = playback.current ?? track;

  const cycleRate = () => {
    const position = PLAYBACK_RATES.indexOf(rate as (typeof PLAYBACK_RATES)[number]);
    playback.setRate(PLAYBACK_RATES[(position + 1) % PLAYBACK_RATES.length]);
  };

  return (
    <View style={styles.card}>

      <View style={styles.topRow}>
        <View style={styles.coverWrap}>
          <Image source={require('@/assets/brand/audix-app-icon.png')} style={styles.cover} />
        </View>
        <View style={styles.meta}>
          <View style={styles.liveRow}>
            <View style={[styles.liveDot, playing && styles.liveDotOn]} />
            <Text style={styles.eyebrow}>
              {isBuffering ? 'CHARGEMENT' : playing ? 'NOW PLAYING' : active ? 'EN PAUSE' : 'PRÊT À LIRE'}
            </Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>{active?.title ?? 'Importe ton premier master'}</Text>
          <Text style={styles.artist} numberOfLines={1}>{active?.artist ?? 'Audio & vidéo propriétaire'}</Text>
        </View>
        <Pressable
          disabled={!active}
          accessibilityLabel={active?.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          onPress={() => active && onToggleFavorite(active.id)}
          style={styles.iconButton}>
          <Ionicons
            name={active?.favorite ? 'heart' : 'heart-outline'}
            size={22}
            color={active?.favorite ? Colors.purple : Colors.textMuted}
          />
        </Pressable>
      </View>

      <Waveform progress={progress} />
      <Slider
        value={currentTime}
        minimumValue={0}
        maximumValue={Math.max(duration, 1)}
        onSlidingComplete={playback.seekTo}
        minimumTrackTintColor={Colors.cyan}
        maximumTrackTintColor="transparent"
        thumbTintColor={Colors.text}
        style={styles.slider}
      />
      <View style={styles.timeRow}>
        <Text style={styles.time}>{formatTime(currentTime)}</Text>
        <Text style={styles.quality}>
          {active?.kind === 'video' ? 'VIDEO · AUDIO MODE' : 'LOCAL · ORIGINAL'}
          {playback.queue.length > 1 ? ` · ${playback.index + 1}/${playback.queue.length}` : ''}
        </Text>
        <Text style={styles.time}>{formatTime(duration)}</Text>
      </View>

      <View style={styles.controls}>
        <Pressable
          accessibilityLabel="Lecture aléatoire"
          accessibilityState={{ selected: shuffle }}
          onPress={playback.toggleShuffle}
          style={styles.iconButton}>
          <Ionicons name="shuffle" size={21} color={shuffle ? Colors.cyan : Colors.textMuted} />
        </Pressable>
        <Pressable
          disabled={!playback.hasPrevious && !active}
          accessibilityLabel="Titre précédent"
          onPress={playback.previous}
          style={styles.iconButton}>
          <Ionicons name="play-skip-back" size={23} color={Colors.text} />
        </Pressable>
        <Pressable
          accessibilityLabel={playing ? 'Pause' : 'Lecture'}
          onPress={() => (active ? playback.toggle() : onImport())}
          style={styles.playButton}>
          <LinearGradient colors={Gradients.brand} style={styles.playGradient}>
            <Ionicons name={playing ? 'pause' : 'play'} size={29} color={Colors.text} />
          </LinearGradient>
        </Pressable>
        <Pressable
          disabled={!playback.hasNext}
          accessibilityLabel="Titre suivant"
          onPress={playback.next}
          style={styles.iconButton}>
          <Ionicons name="play-skip-forward" size={23} color={playback.hasNext ? Colors.text : Colors.textMuted} />
        </Pressable>
        <Pressable
          accessibilityLabel={`Répétition : ${repeat}`}
          accessibilityState={{ selected: repeat !== 'none' }}
          onPress={playback.cycleRepeat}
          style={styles.iconButton}>
          <Ionicons name={REPEAT_ICON[repeat]} size={21} color={repeat === 'none' ? Colors.textMuted : Colors.cyan} />
          {repeat === 'one' ? <View style={styles.repeatOneDot} /> : null}
        </Pressable>
      </View>

      <View style={styles.secondaryRow}>
        <Pressable accessibilityLabel="Reculer de 15 secondes" onPress={() => playback.seekBy(-15)} style={styles.pill}>
          <Ionicons name="play-back" size={15} color={Colors.text} />
          <Text style={styles.pillText}>15</Text>
        </Pressable>
        <Pressable accessibilityLabel={`Vitesse ${rate}×`} onPress={cycleRate} style={styles.pill}>
          <Ionicons name="speedometer-outline" size={15} color={Colors.cyan} />
          <Text style={styles.pillText}>{rate}×</Text>
        </Pressable>
        <Pressable accessibilityLabel="Avancer de 15 secondes" onPress={() => playback.seekBy(15)} style={styles.pill}>
          <Text style={styles.pillText}>15</Text>
          <Ionicons name="play-forward" size={15} color={Colors.text} />
        </Pressable>
        <Pressable accessibilityLabel="Importer des fichiers" onPress={onImport} style={styles.pill}>
          <Ionicons name="add" size={16} color={Colors.cyan} />
          <Text style={styles.pillText}>Importer</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 18, backgroundColor: Colors.surface },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  coverWrap: { width: 64, height: 64, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#343A50' },
  cover: { width: '100%', height: '100%' },
  meta: { flex: 1, gap: 4 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.textMuted },
  liveDotOn: { backgroundColor: Colors.cyan },
  eyebrow: { color: Colors.cyan, fontWeight: '800', fontSize: 10, letterSpacing: 1.5 },
  title: { color: Colors.text, fontSize: 20, fontWeight: '800' },
  artist: { color: Colors.textMuted, fontSize: 13 },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21 },
  slider: { height: 16, marginTop: -14 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { color: Colors.textMuted, fontVariant: ['tabular-nums'], fontSize: 11 },
  quality: { color: Colors.textMuted, fontWeight: '700', fontSize: 9, letterSpacing: 1.1 },
  controls: { marginTop: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  playButton: { borderRadius: 32 },
  playGradient: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  repeatOneDot: { position: 'absolute', bottom: 8, width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.cyan },
  secondaryRow: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  pill: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 17, backgroundColor: Colors.surfaceRaised },
  pillText: { color: Colors.text, fontWeight: '800', fontSize: 11 },
});
