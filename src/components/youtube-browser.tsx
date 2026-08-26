import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Linking, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YouTubeSurface } from '@/components/youtube-surface';
import { Colors, Radius } from '@/constants/theme';
import { searchYouTube, type ProviderResult } from '@/lib/providers';

type Props = {
  onSave: (result: ProviderResult, favorite: boolean) => void;
  onStream?: (result: ProviderResult) => void;
  onDownload?: (result: ProviderResult) => void;
  onAddToPlaylist?: (result: ProviderResult) => void;
  savedQuery?: string;
  onQueryChange?: (query: string) => void;
};

export function YouTubeBrowser({ onSave, onStream, onDownload, onAddToPlaylist, savedQuery = '', onQueryChange }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState(savedQuery);
  const [results, setResults] = useState<ProviderResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [playing, setPlaying] = useState<ProviderResult | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => { setQuery(savedQuery); }, [savedQuery]);

  const run = useCallback(async () => {
    const term = query.trim();
    if (!term) return;
    if (onQueryChange) onQueryChange(term);
    setBusy(true);
    setMessage('');
    try {
      const found = await searchYouTube(term, 25);
      setResults(found);
      if (!found.length) setMessage('Aucun résultat pour cette recherche.');
    } catch (error) {
      setResults([]);
      setMessage(error instanceof Error ? error.message : 'Recherche indisponible.');
    } finally {
      setBusy(false);
    }
  }, [query, onQueryChange]);

  /**
   * Suivant et précédent dans l'aperçu : on avance dans les résultats de la
   * recherche en cours, comme une file de lecture.
   */
  const step = useCallback((delta: number) => {
    setPlaying((currentItem) => {
      if (!currentItem || !results.length) return currentItem;
      const position = results.findIndex((item) => item.id === currentItem.id);
      if (position === -1) return currentItem;
      const target = (position + delta + results.length) % results.length;
      return results[target];
    });
  }, [results]);

  const playAudio = useCallback((item: ProviderResult) => {
    if (onStream) onStream(item);
    else setPlaying(item);
  }, [onStream]);

  const renderRow = useCallback(({ item }: { item: ProviderResult }) => {
    return (
      <View style={styles.row}>
        <Pressable onPress={() => setPlaying(item)} style={styles.thumbWrap}>
          {item.thumbnail ? <Image source={{ uri: item.thumbnail }} style={styles.thumb} /> : <View style={styles.thumb} />}
        </Pressable>
        <Pressable onPress={() => setPlaying(item)} style={styles.rowCopy}>
          <Text style={styles.rowArtist} numberOfLines={1}>{item.artist}</Text>
          <Text style={styles.rowTitle} numberOfLines={2}>{item.title}</Text>
        </Pressable>
        <View style={styles.rowActions}>
          <Pressable accessibilityLabel={`Écouter ${item.title} sans pub`} onPress={() => playAudio(item)} hitSlop={6} style={styles.playBtn}>
            <Ionicons name="play" size={17} color={Colors.text} />
          </Pressable>
          <Pressable accessibilityLabel="Ajouter aux favoris" onPress={() => onSave(item, true)} hitSlop={6} style={styles.iconBtn}>
            <Ionicons name="heart-outline" size={18} color={Colors.purple} />
          </Pressable>
          <Pressable accessibilityLabel="Ajouter à la bibliothèque" onPress={() => onSave(item, false)} hitSlop={6} style={styles.iconBtn}>
            <Ionicons name="add" size={20} color={Colors.cyan} />
          </Pressable>
          {onAddToPlaylist ? (
            <Pressable accessibilityLabel="Ajouter à une playlist" onPress={() => onAddToPlaylist(item)} hitSlop={6} style={styles.iconBtn}>
              <Ionicons name="albums-outline" size={18} color={Colors.blue} />
            </Pressable>
          ) : null}
          {onDownload ? (
            <Pressable accessibilityLabel="Télécharger en MP3" onPress={() => onDownload(item)} hitSlop={6} style={styles.iconBtn}>
              <Ionicons name="cloud-download-outline" size={18} color={Colors.success} />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }, [onSave, onDownload, onAddToPlaylist, playAudio]);

  return (
    <View style={styles.screen}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={17} color={Colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={(text) => { setQuery(text); if (onQueryChange) onQueryChange(text); }}
          onSubmitEditing={run}
          placeholder="Rechercher un titre, un artiste…"
          placeholderTextColor="#50586F"
          style={styles.input}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query ? (
          <Pressable onPress={() => { setQuery(''); setResults([]); setMessage(''); if (onQueryChange) onQueryChange(''); }} hitSlop={8}>
            <Ionicons name="close-circle" size={17} color={Colors.textMuted} />
          </Pressable>
        ) : null}
        <Pressable disabled={!query.trim() || busy} onPress={run} style={[styles.go, (!query.trim() || busy) && styles.dim]}>
          {busy ? <ActivityIndicator size="small" color={Colors.text} /> : <Ionicons name="arrow-forward" size={18} color={Colors.text} />}
        </Pressable>
      </View>

      {playing ? (
        <Pressable onPress={() => setExpanded(true)} style={styles.miniWrap}>
          <View style={styles.miniVideo}><YouTubeSurface videoId={playing.id} onAudio={() => playAudio(playing)} /></View>
          <View style={styles.miniCopy}>
            <Text style={styles.miniArtist} numberOfLines={1}>{playing.artist}</Text>
            <Text style={styles.miniTitle} numberOfLines={2}>{playing.title}</Text>
            <Text style={styles.miniHint}>Aperçu vidéo · ▶ lance l’audio sans pub</Text>
            <Pressable onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${playing.id}`)} hitSlop={8} style={styles.miniLink}>
              <Ionicons name="open-outline" size={12} color={Colors.cyan} />
              <Text style={styles.miniLinkText}>Vidéo bloquée ici ? Ouvrir dans YouTube</Text>
            </Pressable>
          </View>
          <Pressable accessibilityLabel="Résultat précédent" onPress={() => step(-1)} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="play-skip-back" size={16} color={Colors.textMuted} />
          </Pressable>
          <Pressable accessibilityLabel="Résultat suivant" onPress={() => step(1)} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="play-skip-forward" size={16} color={Colors.textMuted} />
          </Pressable>
          <Pressable accessibilityLabel="Fermer le lecteur" onPress={() => setPlaying(null)} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="close" size={19} color={Colors.textMuted} />
          </Pressable>
        </Pressable>
      ) : null}

      {message ? (
        <View style={styles.message}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.warning} />
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderRow}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          busy || message ? null : (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={26} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Cherche dans ton catalogue</Text>
              <Text style={styles.emptyCopy}>
                ▶ = écoute immédiate sans pub · nuage = téléchargement MP3 hors ligne · miniature = aperçu vidéo.
              </Text>
            </View>
          )
        }
      />

      <Modal visible={expanded && Boolean(playing)} animationType="slide" onRequestClose={() => setExpanded(false)}>
        <View style={[styles.full, { paddingTop: insets.top }]}>
          <View style={styles.fullBar}>
            <Pressable accessibilityLabel="Réduire" onPress={() => setExpanded(false)} hitSlop={10} style={styles.iconBtn}>
              <Ionicons name="chevron-down" size={24} color={Colors.text} />
            </Pressable>
            <Pressable accessibilityLabel="Résultat précédent" onPress={() => step(-1)} hitSlop={10} style={styles.iconBtn}>
              <Ionicons name="play-skip-back" size={19} color={Colors.text} />
            </Pressable>
            <Pressable accessibilityLabel="Résultat suivant" onPress={() => step(1)} hitSlop={10} style={styles.iconBtn}>
              <Ionicons name="play-skip-forward" size={19} color={Colors.text} />
            </Pressable>
            <View style={styles.fullCopy}>
              <Text style={styles.miniArtist} numberOfLines={1}>{playing?.artist}</Text>
              <Text style={styles.fullTitle} numberOfLines={1}>{playing?.title}</Text>
            </View>
            {playing ? (
              <Pressable accessibilityLabel="Écouter sans pub" onPress={() => playAudio(playing)} hitSlop={10} style={styles.playBtn}>
                <Ionicons name="play" size={17} color={Colors.text} />
              </Pressable>
            ) : null}
            {onDownload && playing ? (
              <Pressable accessibilityLabel="Télécharger en MP3" onPress={() => onDownload(playing)} hitSlop={10} style={styles.iconBtn}>
                <Ionicons name="cloud-download-outline" size={21} color={Colors.success} />
              </Pressable>
            ) : null}
            <Pressable accessibilityLabel="Ajouter aux favoris" onPress={() => playing && onSave(playing, true)} hitSlop={10} style={styles.iconBtn}>
              <Ionicons name="heart-outline" size={21} color={Colors.purple} />
            </Pressable>
          </View>
          <View style={styles.fullVideo}>{playing ? <YouTubeSurface videoId={playing.id} autoPlay onAudio={() => playAudio(playing)} /> : null}</View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 10 },
  searchBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, paddingLeft: 13, paddingRight: 6, borderRadius: 14, backgroundColor: Colors.surfaceRaised },
  input: { flex: 1, minWidth: 60, color: Colors.text, fontSize: 13, height: 46 },
  go: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: Colors.blue },
  dim: { opacity: 0.4 },
  miniWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 16, backgroundColor: Colors.surface },
  miniVideo: { width: 132, height: 76, borderRadius: 10, overflow: 'hidden', backgroundColor: '#000' },
  miniCopy: { flex: 1, minWidth: 0, gap: 2 },
  miniArtist: { color: Colors.cyan, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  miniTitle: { color: Colors.text, fontSize: 12, fontWeight: '800', lineHeight: 16 },
  miniHint: { color: Colors.textMuted, fontSize: 8, marginTop: 1 },
  miniLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  miniLinkText: { color: Colors.cyan, fontSize: 9, fontWeight: '800' },
  list: { gap: 8, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 14, backgroundColor: Colors.surface },
  thumbWrap: { width: 96, height: 54, borderRadius: 9, overflow: 'hidden', backgroundColor: Colors.surfaceRaised },
  thumb: { width: '100%', height: '100%' },
  rowCopy: { flex: 1, minWidth: 0, gap: 2 },
  rowArtist: { color: Colors.textMuted, fontSize: 9, fontWeight: '800' },
  rowTitle: { color: Colors.text, fontSize: 12, fontWeight: '800', lineHeight: 16 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  playBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: Colors.blue },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17 },
  message: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 12, backgroundColor: '#241B0F' },
  messageText: { flex: 1, color: '#C5A56F', fontSize: 10, lineHeight: 15 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 42, paddingHorizontal: 20 },
  emptyTitle: { color: Colors.text, fontSize: 15, fontWeight: '900' },
  emptyCopy: { maxWidth: 340, color: Colors.textMuted, fontSize: 11, lineHeight: 17, textAlign: 'center' },
  full: { flex: 1, backgroundColor: Colors.background },
  fullBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 8 },
  fullCopy: { flex: 1, minWidth: 0 },
  fullTitle: { color: Colors.text, fontSize: 14, fontWeight: '800' },
  fullVideo: { flex: 1, backgroundColor: '#000', borderRadius: Radius.medium, margin: 10, overflow: 'hidden' },
});
