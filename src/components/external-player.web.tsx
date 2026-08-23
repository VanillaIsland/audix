import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
        <View style={styles.meta}>
          <Text style={styles.eyebrow}>Lecteur officiel {platform?.label ?? 'web'}</Text>
          <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
          <Text style={styles.subtitle}>Lecture par le lecteur officiel de la plateforme, avec ses propres règles.</Text>
        </View>
        <Pressable onPress={() => onToggleFavorite(track.id)} style={styles.iconButton}><Ionicons name={track.favorite ? 'heart' : 'heart-outline'} size={21} color={track.favorite ? Colors.purple : Colors.textMuted} /></Pressable>
      </View>
      {embedUrl ? React.createElement('iframe', {
        src: embedUrl,
        title: `${platform?.label ?? 'Source'} player`,
        allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',
        allowFullScreen: true,
        style: { width: '100%', height: platform?.key === 'spotify' ? 352 : 360, border: 0, borderRadius: 20, background: '#050609' },
      }) : <View style={styles.unavailable}><Text style={styles.subtitle}>Cette URL ne fournit pas de lecteur embarqué.</Text></View>}
      <View style={styles.footer}>
        <View style={styles.note}><Ionicons name="shield-checkmark-outline" size={17} color={Colors.success} /><Text style={styles.noteText}>La connexion, la publicité et la disponibilité dépendent de la plateforme.</Text></View>
        <Pressable style={styles.openButton} onPress={() => Linking.openURL(source)}><Ionicons name="open-outline" size={16} color={Colors.cyan} /><Text style={styles.openText}>Ouvrir la source</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 16, padding: 20, borderRadius: 28, borderWidth: 1, borderColor: '#2A3248', backgroundColor: '#0B0F18' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  platformDot: { width: 9, height: 48, borderRadius: 6 },
  meta: { flex: 1, gap: 3 },
  eyebrow: { color: Colors.cyan, fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
  title: { color: Colors.text, fontSize: 19, fontWeight: '900' },
  subtitle: { color: Colors.textMuted, fontSize: 10, lineHeight: 15 },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: '#111625' },
  unavailable: { minHeight: 220, alignItems: 'center', justifyContent: 'center', borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: '#2B3348' },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  note: { flex: 1, minWidth: 220, flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteText: { flex: 1, color: Colors.textMuted, fontSize: 9, lineHeight: 14 },
  openButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, borderRadius: Radius.pill, borderWidth: 1, borderColor: '#285066', backgroundColor: '#0C1A23' },
  openText: { color: Colors.text, fontSize: 10, fontWeight: '800' },
});
