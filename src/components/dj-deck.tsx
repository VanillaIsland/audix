import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { usePlayback } from '@/lib/playback';

/**
 * Platine DJ : ce qui arrive derrière, et les jingles à balancer par-dessus.
 * Elle ne s'affiche que quand le mode DJ est actif.
 */
export function DjDeck({ onNotice }: { onNotice: (message: string) => void }) {
  const playback = usePlayback();
  const upcoming = playback.queue.slice(playback.index + 1, playback.index + 6);

  const addDrop = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true, multiple: true });
    if (result.canceled) return;
    result.assets.forEach((asset) => playback.addDjDrop(asset.uri));
    onNotice(`${result.assets.length} jingle${result.assets.length > 1 ? 's' : ''} chargé${result.assets.length > 1 ? 's' : ''}.`);
  }, [onNotice, playback]);

  return (
    <View style={styles.deck}>
      <View style={styles.head}>
        <Ionicons name="sparkles" size={15} color={Colors.purple} />
        <Text style={styles.title}>Platine DJ</Text>
        <Text style={styles.meta}>
          Raccord automatique {Math.max(playback.crossfade, 6)} s avant la fin
        </Text>
      </View>

      <View style={styles.dropRow}>
        <Pressable onPress={() => playback.fireDjDrop()} disabled={!playback.djDrops.length} style={[styles.fire, !playback.djDrops.length && styles.dim]}>
          <Ionicons name="megaphone" size={16} color={Colors.text} />
          <Text style={styles.fireText}>Balancer un jingle</Text>
        </Pressable>
        <Pressable onPress={addDrop} style={styles.addDrop}>
          <Ionicons name="add" size={17} color={Colors.cyan} />
        </Pressable>
      </View>

      {playback.djDrops.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.drops}>
          {playback.djDrops.map((uri, position) => (
            <View key={uri} style={styles.drop}>
              <Pressable onPress={() => playback.fireDjDrop(uri)} hitSlop={6} style={styles.dropPlay}>
                <Ionicons name="play" size={13} color={Colors.text} />
              </Pressable>
              <Text style={styles.dropName}>Jingle {position + 1}</Text>
              <Pressable onPress={() => playback.removeDjDrop(uri)} hitSlop={6}>
                <Ionicons name="close" size={13} color={Colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.hint}>Charge tes jingles : ils partiront tout seuls sur chaque raccord.</Text>
      )}

      <Text style={styles.queueLabel}>À suivre</Text>
      {upcoming.length ? (
        upcoming.map((track, position) => (
          <View key={track.id} style={styles.queueRow}>
            <Text style={styles.queueIndex}>{position + 1}</Text>
            <View style={styles.queueCopy}>
              <Text style={styles.queueTitle} numberOfLines={1}>{track.title}</Text>
              <Text style={styles.queueMeta} numberOfLines={1}>
                {track.artist}
                {track.bpm ? ` · ${Math.round(track.bpm)} BPM` : ''}
                {track.genre ? ` · ${track.genre}` : ''}
              </Text>
            </View>
            <Pressable accessibilityLabel={`Passer à ${track.title}`} onPress={() => playback.playTrack(track)} hitSlop={8}>
              <Ionicons name="play-forward" size={17} color={Colors.cyan} />
            </Pressable>
          </View>
        ))
      ) : (
        <Text style={styles.hint}>La file est vide : lance un titre depuis une playlist.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  deck: { gap: 9, padding: 13, borderRadius: 18, borderWidth: 1, borderColor: '#2A2140', backgroundColor: '#120E1D' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: { color: Colors.text, fontSize: 13, fontWeight: '800' },
  meta: { flex: 1, color: Colors.textMuted, fontSize: 9, textAlign: 'right' },
  dropRow: { flexDirection: 'row', gap: 8 },
  fire: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 13, backgroundColor: Colors.purple },
  fireText: { color: Colors.text, fontSize: 11, fontWeight: '800' },
  dim: { opacity: 0.4 },
  addDrop: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 13, borderWidth: 1, borderColor: '#2C2444', backgroundColor: '#0A0812' },
  drops: { gap: 7 },
  drop: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 11, backgroundColor: '#0A0812' },
  dropPlay: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: Colors.blue },
  dropName: { color: Colors.textMuted, fontSize: 10, fontWeight: '700' },
  hint: { color: Colors.textMuted, fontSize: 10, lineHeight: 15 },
  queueLabel: { color: Colors.cyan, fontSize: 10, fontWeight: '700', marginTop: 3 },
  queueRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingHorizontal: 9, borderRadius: 12, backgroundColor: '#0A0812' },
  queueIndex: { width: 16, color: '#59647D', fontSize: 11, fontWeight: '800' },
  queueCopy: { flex: 1, minWidth: 0 },
  queueTitle: { color: Colors.text, fontSize: 11, fontWeight: '700' },
  queueMeta: { color: Colors.textMuted, fontSize: 9, marginTop: 1 },
});
