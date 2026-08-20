import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Gradients } from '@/constants/theme';
import { usePlayback } from '@/lib/playback';

/**
 * Persistent transport bar shown on every section except the full player.
 * The audio itself lives in PlaybackProvider, so this is pure UI — navigating
 * away from it never interrupts playback.
 */
export function MiniPlayer({ onOpen }: { onOpen: () => void }) {
  const playback = usePlayback();
  const insets = useSafeAreaInsets();
  const track = playback.current;
  if (!track) return null;

  const progress = playback.duration > 0 ? playback.currentTime / playback.duration : 0;

  return (
    // 55 = hauteur de la barre d'onglets, pour que le mini player se pose dessus
    <View style={[styles.wrap, { bottom: 55 + Math.max(insets.bottom, 10) + 8 }]}>
      <View style={styles.progressTrack}>
        <LinearGradient
          colors={Gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${Math.min(Math.max(progress, 0), 1) * 100}%` }]}
        />
      </View>
      <Pressable accessibilityLabel="Ouvrir le lecteur" onPress={onOpen} style={styles.main}>
        <Image source={require('@/assets/brand/audix-app-icon.png')} style={styles.cover} />
        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>
            {playback.isBuffering ? 'Chargement…' : track.artist}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel="Titre précédent"
        onPress={playback.previous}
        hitSlop={8}
        style={styles.iconButton}>
        <Ionicons name="play-skip-back" size={19} color={Colors.text} />
      </Pressable>
      <Pressable
        accessibilityLabel={playback.playing ? 'Pause' : 'Lecture'}
        onPress={playback.toggle}
        hitSlop={8}
        style={styles.playButton}>
        <LinearGradient colors={Gradients.brand} style={styles.playGradient}>
          <Ionicons name={playback.playing ? 'pause' : 'play'} size={19} color={Colors.text} />
        </LinearGradient>
      </Pressable>
      <Pressable
        accessibilityLabel="Titre suivant"
        disabled={!playback.hasNext}
        onPress={playback.next}
        hitSlop={8}
        style={styles.iconButton}>
        <Ionicons name="play-skip-forward" size={19} color={playback.hasNext ? Colors.text : Colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute', left: 12, right: 12, alignSelf: 'center', maxWidth: 720,
    minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10,
    paddingLeft: 8, borderRadius: 20, borderWidth: 1, borderColor: '#2A3248',
    backgroundColor: 'rgba(9,12,20,0.97)', overflow: 'hidden', zIndex: 15,
  },
  progressTrack: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#1B2233' },
  progressFill: { height: 2 },
  main: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  cover: { width: 42, height: 42, borderRadius: 13 },
  meta: { flex: 1, minWidth: 0 },
  title: { color: Colors.text, fontSize: 12, fontWeight: '900' },
  artist: { color: Colors.textMuted, fontSize: 9, marginTop: 2 },
  iconButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17 },
  playButton: { borderRadius: 20 },
  playGradient: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
