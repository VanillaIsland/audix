import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Colors, Radius } from '@/constants/theme';
import { embedUrlFor, platformFromUrl } from '@/lib/platforms';
import type { AudixTrack } from '@/types/media';

export function ExternalPlayer({ track, onToggleFavorite }: { track: AudixTrack; onToggleFavorite: (id: string) => void }) {
  const source = track.externalUrl ?? track.uri;
  const embedUrl = embedUrlFor(source);
  const platform = platformFromUrl(source);
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.platformDot, { backgroundColor: platform?.color ?? Colors.cyan }]} />
        <View style={styles.meta}><Text style={styles.eyebrow}>OFFICIAL EMBED · {platform?.label.toUpperCase() ?? 'WEB'}</Text><Text style={styles.title} numberOfLines={1}>{track.title}</Text><Text style={styles.subtitle}>La lecture suit les règles de la plateforme.</Text></View>
        <Pressable onPress={() => onToggleFavorite(track.id)} style={styles.iconButton}><Ionicons name={track.favorite ? 'heart' : 'heart-outline'} size={21} color={track.favorite ? Colors.purple : Colors.textMuted} /></Pressable>
      </View>
      {embedUrl ? <WebView source={{ uri: embedUrl }} allowsInlineMediaPlayback mediaPlaybackRequiresUserAction style={styles.webview} /> : null}
      <Pressable style={styles.openButton} onPress={() => Linking.openURL(source)}><Ionicons name="open-outline" size={16} color={Colors.cyan} /><Text style={styles.openText}>Ouvrir la source officielle</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14, padding: 16, borderRadius: 26, borderWidth: 1, borderColor: '#2A3248', backgroundColor: '#0B0F18' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  platformDot: { width: 8, height: 44, borderRadius: 5 },
  meta: { flex: 1, gap: 3 },
  eyebrow: { color: Colors.cyan, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: Colors.text, fontSize: 17, fontWeight: '900' },
  subtitle: { color: Colors.textMuted, fontSize: 9 },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  webview: { minHeight: 330, borderRadius: 18, overflow: 'hidden', backgroundColor: Colors.background },
  openButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: Radius.pill, borderWidth: 1, borderColor: '#285066', backgroundColor: '#0C1A23' },
  openText: { color: Colors.text, fontSize: 10, fontWeight: '800' },
});
