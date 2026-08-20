import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { PLATFORM_PROFILES, searchUrlFor } from '@/lib/platforms';
import { searchYouTube, youtubeReady, type ProviderResult } from '@/lib/providers';

export function CatalogSearch({ onAddLink }: { onAddLink: (url: string) => Promise<void> }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProviderResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const ready = youtubeReady();

  const run = async () => {
    const term = query.trim();
    if (!term) return;
    // No key configured: fall back to the official site rather than failing.
    if (!ready) {
      setMessage("Clé YouTube absente. La recherche s'ouvre sur le site officiel.");
      await Linking.openURL(searchUrlFor('youtube', term));
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      setResults(await searchYouTube(term));
    } catch (error) {
      setResults([]);
      setMessage(error instanceof Error ? error.message : 'Recherche indisponible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>RECHERCHE CATALOGUE</Text>
          <Text style={styles.title}>Titre + artiste</Text>
        </View>
        <View style={[styles.apiPill, ready && styles.apiPillOn]}>
          <View style={[styles.apiDot, ready && styles.apiDotOn]} />
          <Text style={styles.apiText}>{ready ? 'YT API ON' : 'YT API À CONNECTER'}</Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={17} color={Colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={run}
          placeholder="Ex. T6B Heart Reboot"
          placeholderTextColor="#50586F"
          style={styles.input}
          returnKeyType="search"
        />
        <Pressable
          disabled={!query.trim() || busy}
          onPress={run}
          accessibilityLabel="Lancer la recherche"
          style={[styles.searchButton, (!query.trim() || busy) && styles.disabled]}>
          {busy ? <ActivityIndicator color={Colors.text} size="small" /> : <Ionicons name="arrow-forward" size={18} color={Colors.text} />}
        </Pressable>
      </View>

      <View style={styles.platformRow}>
        {PLATFORM_PROFILES.map((platform) => (
          <Pressable
            key={platform.key}
            disabled={!query.trim()}
            accessibilityLabel={`Chercher sur ${platform.label}`}
            onPress={() => Linking.openURL(searchUrlFor(platform.key, query))}
            style={[styles.platformButton, !query.trim() && styles.disabled]}>
            <View style={[styles.platformDot, { backgroundColor: platform.color }]} />
            <Text style={styles.platformText}>{platform.label}</Text>
            <Ionicons name="open-outline" size={13} color={Colors.textMuted} />
          </Pressable>
        ))}
      </View>

      {message ? (
        <View style={styles.message}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.warning} />
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}

      {results.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.results}>
          {results.map((result) => (
            <View key={result.id} style={styles.resultCard}>
              {result.thumbnail ? <Image source={{ uri: result.thumbnail }} style={styles.thumbnail} /> : null}
              <Text style={styles.resultTitle} numberOfLines={2}>{result.title}</Text>
              <Text style={styles.resultChannel} numberOfLines={1}>{result.artist}</Text>
              <Pressable onPress={() => onAddLink(result.url)} style={styles.addButton}>
                <Ionicons name="play-circle-outline" size={16} color={Colors.cyan} />
                <Text style={styles.addText}>Ajouter & lire</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 13, padding: 16, borderRadius: 20, backgroundColor: Colors.surface },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headingCopy: { flex: 1, gap: 2 },
  eyebrow: { color: Colors.purple, fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: Colors.text, fontSize: 16, fontWeight: '900' },
  apiPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: '#261A12' },
  apiPillOn: { backgroundColor: '#0A211C' },
  apiDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.warning },
  apiDotOn: { backgroundColor: Colors.success },
  apiText: { color: Colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  searchBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, paddingLeft: 13, paddingRight: 6, borderRadius: 14, backgroundColor: Colors.surfaceRaised },
  input: { flex: 1, minWidth: 80, color: Colors.text, fontSize: 13, height: 46 },
  searchButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: Colors.blue },
  platformRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  platformButton: { flex: 1, minWidth: 118, minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, backgroundColor: Colors.surfaceRaised },
  platformDot: { width: 7, height: 7, borderRadius: 4 },
  platformText: { color: Colors.text, fontSize: 10, fontWeight: '800' },
  disabled: { opacity: 0.38 },
  message: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 12, backgroundColor: '#241B0F' },
  messageText: { flex: 1, color: '#C5A56F', fontSize: 10, lineHeight: 15 },
  results: { gap: 9 },
  resultCard: { width: 196, gap: 5, padding: 8, borderRadius: 14, backgroundColor: Colors.surfaceRaised },
  thumbnail: { width: '100%', height: 104, borderRadius: 10, backgroundColor: Colors.background },
  resultTitle: { color: Colors.text, fontSize: 11, lineHeight: 15, fontWeight: '800' },
  resultChannel: { color: Colors.textMuted, fontSize: 9 },
  addButton: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 2, borderRadius: 11, backgroundColor: '#0B2630' },
  addText: { color: Colors.text, fontSize: 9, fontWeight: '800' },
});
