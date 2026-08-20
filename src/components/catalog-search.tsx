import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Gradients, Radius } from '@/constants/theme';
import { PLATFORM_PROFILES, searchUrlFor } from '@/lib/platforms';

type YouTubeResult = { id: string; title: string; channel: string; thumbnail: string };

export function CatalogSearch({ onAddLink }: { onAddLink: (url: string) => Promise<void> }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YouTubeResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const youtubeKey = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;

  const searchYouTube = async () => {
    if (!query.trim()) return;
    if (!youtubeKey) {
      setMessage('La clé YouTube Data API n’est pas encore configurée. La recherche officielle s’ouvre dans YouTube.');
      await Linking.openURL(searchUrlFor('youtube', query));
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=8&q=${encodeURIComponent(query.trim())}&key=${encodeURIComponent(youtubeKey)}`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`YouTube API ${response.status}`);
      const payload = await response.json() as { items?: { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string; thumbnails?: { medium?: { url?: string } } } }[] };
      setResults((payload.items ?? []).flatMap((item) => item.id?.videoId ? [{ id: item.id.videoId, title: item.snippet?.title ?? 'Vidéo YouTube', channel: item.snippet?.channelTitle ?? 'YouTube', thumbnail: item.snippet?.thumbnails?.medium?.url ?? '' }] : []));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Recherche indisponible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.searchIcon}><Ionicons name="search" size={22} color={Colors.cyan} /></View>
        <View style={styles.headingCopy}><Text style={styles.eyebrow}>CATALOG ORBIT</Text><Text style={styles.title}>Recherche titre + artiste</Text><Text style={styles.subtitle}>Trouve une référence officielle, puis ajoute-la au lecteur Audix.</Text></View>
        <View style={[styles.apiPill, youtubeKey ? styles.apiPillOn : null]}><View style={[styles.apiDot, youtubeKey ? styles.apiDotOn : null]} /><Text style={styles.apiText}>YT API {youtubeKey ? 'ON' : 'À CONNECTER'}</Text></View>
      </View>
      <View style={styles.searchBar}>
        <Ionicons name="musical-notes-outline" size={18} color={Colors.purple} />
        <TextInput value={query} onChangeText={setQuery} onSubmitEditing={searchYouTube} placeholder="Ex. T6B Heart Reboot" placeholderTextColor="#50586F" style={styles.input} returnKeyType="search" />
        <Pressable disabled={!query.trim() || busy} onPress={searchYouTube} style={[styles.searchButton, (!query.trim() || busy) && styles.disabled]}><LinearGradient colors={Gradients.brand} style={styles.searchGradient}>{busy ? <ActivityIndicator color={Colors.text} /> : <><Ionicons name="sparkles" size={16} color={Colors.text} /><Text style={styles.searchText}>Rechercher</Text></>}</LinearGradient></Pressable>
      </View>
      <View style={styles.platformRow}>
        {PLATFORM_PROFILES.map((platform) => (
          <Pressable key={platform.key} disabled={!query.trim()} onPress={() => Linking.openURL(searchUrlFor(platform.key, query))} style={[styles.platformButton, !query.trim() && styles.disabled]}><View style={[styles.platformDot, { backgroundColor: platform.color }]} /><Text style={styles.platformText}>{platform.label}</Text><Ionicons name="open-outline" size={14} color={Colors.textMuted} /></Pressable>
        ))}
      </View>
      {message ? <View style={styles.message}><Ionicons name="information-circle-outline" size={16} color={Colors.warning} /><Text style={styles.messageText}>{message}</Text></View> : null}
      {results.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.results}>{results.map((result) => <View key={result.id} style={styles.resultCard}>{result.thumbnail ? <Image source={{ uri: result.thumbnail }} style={styles.thumbnail} /> : null}<Text style={styles.resultTitle} numberOfLines={2}>{result.title}</Text><Text style={styles.resultChannel} numberOfLines={1}>{result.channel}</Text><Pressable onPress={() => onAddLink(`https://www.youtube.com/watch?v=${result.id}`)} style={styles.addButton}><Ionicons name="play-circle-outline" size={17} color={Colors.cyan} /><Text style={styles.addText}>Ajouter & lire</Text></Pressable></View>)}</ScrollView> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 15, padding: 20, borderRadius: 28, borderWidth: 1, borderColor: '#242C40', backgroundColor: 'rgba(11,15,24,0.94)' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#0B202A' },
  headingCopy: { flex: 1, gap: 2 },
  eyebrow: { color: Colors.purple, fontSize: 8, fontWeight: '900', letterSpacing: 1.6 },
  title: { color: Colors.text, fontSize: 18, fontWeight: '900' },
  subtitle: { color: Colors.textMuted, fontSize: 10 },
  apiPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: '#261A12' },
  apiPillOn: { backgroundColor: '#0A211C' },
  apiDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.warning },
  apiDotOn: { backgroundColor: Colors.success },
  apiText: { color: Colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  searchBar: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 15, borderRadius: 18, borderWidth: 1, borderColor: '#2B344C', backgroundColor: '#070A10', overflow: 'hidden' },
  input: { flex: 1, minWidth: 80, color: Colors.text, fontSize: 13, height: 54 },
  searchButton: { alignSelf: 'stretch', minWidth: 120 },
  searchGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 14 },
  searchText: { color: Colors.text, fontSize: 10, fontWeight: '900' },
  platformRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  platformButton: { flex: 1, minWidth: 130, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderColor: '#252D41', backgroundColor: '#10141F' },
  platformDot: { width: 7, height: 7, borderRadius: 4 },
  platformText: { color: Colors.text, fontSize: 10, fontWeight: '800' },
  disabled: { opacity: 0.38 },
  message: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 13, backgroundColor: '#241B0F' },
  messageText: { flex: 1, color: '#C5A56F', fontSize: 9, lineHeight: 14 },
  results: { gap: 10 },
  resultCard: { width: 210, gap: 6, padding: 9, borderRadius: 17, backgroundColor: '#111622', borderWidth: 1, borderColor: '#273047' },
  thumbnail: { width: '100%', height: 112, borderRadius: 12, backgroundColor: '#070A10' },
  resultTitle: { color: Colors.text, fontSize: 11, lineHeight: 15, fontWeight: '800' },
  resultChannel: { color: Colors.textMuted, fontSize: 9 },
  addButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 3, borderRadius: 12, backgroundColor: '#0B202A' },
  addText: { color: Colors.text, fontSize: 9, fontWeight: '800' },
});
