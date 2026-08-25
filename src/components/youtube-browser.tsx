import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YouTubeSurface } from '@/components/youtube-surface';
import { Colors, Radius } from '@/constants/theme';
import { searchYouTube, type ProviderResult } from '@/lib/providers';

type Props = {
  /** Ajoute la référence à la bibliothèque, éventuellement en favori. */
  onSave: (result: ProviderResult, favorite: boolean) => void;
  /** Télécharge le média YouTube et l'ajoute à la bibliothèque hors ligne. */
  onDownload?: (result: ProviderResult) => Promise<void>;
  /** Ouvre le choix de playlist au lieu d'un ajout direct à la bibliothèque. */
  onAddToPlaylist?: (result: ProviderResult) => void;
};

/**
 * L'onglet Lecture est démonté quand on change d'onglet. Ce cache garde la
 * recherche, les résultats et la vidéo en cours pour qu'on les retrouve au
 * retour, au lieu de repartir d'un écran vide.
 */
const memory: {
  query: string;
  results: ProviderResult[];
  message: string;
  playing: ProviderResult | null;
} = { query: '', results: [], message: '', playing: null };

export function YouTubeBrowser({ onSave, onDownload, onAddToPlaylist }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQueryState] = useState(memory.query);
  const [results, setResultsState] = useState<ProviderResult[]>(memory.results);
  const [busy, setBusy] = useState(false);
  const [message, setMessageState] = useState(memory.message);
  const [playing, setPlayingState] = useState<ProviderResult | null>(memory.playing);
  const [expanded, setExpanded] = useState(false);

  // Chaque écriture passe par le cache : au retour sur l'onglet, tout est là.
  const setQuery = useCallback((value: string) => { memory.query = value; setQueryState(value); }, []);
  const setResults = useCallback((value: ProviderResult[]) => { memory.results = value; setResultsState(value); }, []);
  const setMessage = useCallback((value: string) => { memory.message = value; setMessageState(value); }, []);
  const setPlaying = useCallback((value: ProviderResult | null) => { memory.playing = value; setPlayingState(value); }, []);

  const run = useCallback(async () => {
    const term = query.trim();
    if (!term) return;
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
  }, [query, setMessage, setResults]);

  const renderRow = useCallback(({ item }: { item: ProviderResult }) => {
    const active = playing?.id === item.id;
    return (
      <View style={[styles.row, active && styles.rowActive]}>
        <Pressable onPress={() => setPlaying(item)} style={styles.thumbWrap}>
          {item.thumbnail ? <Image source={{ uri: item.thumbnail }} style={styles.thumb} /> : <View style={styles.thumb} />}
          {active ? (
            <View style={styles.thumbBadge}>
              <Ionicons name="volume-high" size={13} color={Colors.text} />
            </View>
          ) : null}
        </Pressable>
        <Pressable onPress={() => setPlaying(item)} style={styles.rowCopy}>
          <Text style={styles.rowArtist} numberOfLines={1}>{item.artist}</Text>
          <Text style={styles.rowTitle} numberOfLines={2}>{item.title}</Text>
        </Pressable>
        <View style={styles.rowActions}>
          <Pressable accessibilityLabel={`Lire ${item.title}`} onPress={() => setPlaying(item)} hitSlop={6} style={[styles.playBtn, active && styles.playBtnOn]}>
            <Ionicons name={active ? 'pause' : 'play'} size={17} color={Colors.text} />
          </Pressable>
          <Pressable accessibilityLabel="Ajouter aux favoris" onPress={() => onSave(item, true)} hitSlop={6} style={styles.iconBtn}>
            <Ionicons name="heart-outline" size={18} color={Colors.purple} />
          </Pressable>
          <Pressable
            accessibilityLabel="Ajouter à la bibliothèque ou à une playlist"
            onPress={() => (onAddToPlaylist ? onAddToPlaylist(item) : onSave(item, false))}
            hitSlop={6}
            style={styles.iconBtn}>
            <Ionicons name="add" size={20} color={Colors.cyan} />
          </Pressable>
          {/* NOUVEAU BOUTON : TÉLÉCHARGER */}
          {onDownload && (
            <Pressable accessibilityLabel="Télécharger et ajouter hors ligne" onPress={() => onDownload(item)} hitSlop={6} style={styles.iconBtn}>
              <Ionicons name="cloud-download-outline" size={18} color={Colors.success} />
            </Pressable>
          )}
        </View>
      </View>
    );
  }, [onSave, onDownload, onAddToPlaylist, playing?.id, setPlaying]);

  return (
    <View style={styles.screen}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={17} color={Colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={run}
          placeholder="Rechercher un titre, un artiste…"
          placeholderTextColor="#50586F"
          style={styles.input}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query ? (
          <Pressable onPress={() => { setQuery(''); setResults([]); setMessage(''); }} hitSlop={8}>
            <Ionicons name="close-circle" size={17} color={Colors.textMuted} />
          </Pressable>
        ) : null}
        <Pressable disabled={!query.trim() || busy} onPress={run} style={[styles.go, (!query.trim() || busy) && styles.dim]}>
          {busy ? <ActivityIndicator size="small" color={Colors.text} /> : <Ionicons name="arrow-forward" size={18} color={Colors.text} />}
        </Pressable>
      </View>

      {playing ? (
        <Pressable onPress={() => setExpanded(true)} style={styles.miniWrap}>
          <View style={styles.miniVideo}><YouTubeSurface videoId={playing.id} /></View>
          <View style={styles.miniCopy}>
            <Text style={styles.miniArtist} numberOfLines={1}>{playing.artist}</Text>
            <Text style={styles.miniTitle} numberOfLines={2}>{playing.title}</Text>
            <Text style={styles.miniHint}>Appuie sur la vidéo pour l’agrandir</Text>
            <Pressable
              accessibilityLabel="Ouvrir dans YouTube"
              onPress={() => Linking.openURL(playing.url)}
              hitSlop={6}
              style={styles.openRow}>
              <Ionicons name="open-outline" size={13} color={Colors.cyan} />
              <Text style={styles.openText}>Vidéo bloquée ici ? Ouvrir dans YouTube</Text>
            </Pressable>
          </View>
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
                Tape un titre ou un artiste. Les résultats se lisent ici même, en miniature, pendant que tu continues de parcourir la liste.
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
            <View style={styles.fullCopy}>
              <Text style={styles.miniArtist} numberOfLines={1}>{playing?.artist}</Text>
              <Text style={styles.fullTitle} numberOfLines={1}>{playing?.title}</Text>
            </View>
            
            {/* NOUVEAU BOUTON : TÉLÉCHARGER (MODE PLEIN ÉCRAN) */}
            {onDownload && playing && (
              <Pressable accessibilityLabel="Télécharger ce titre" onPress={() => onDownload(playing)} hitSlop={10} style={styles.iconBtn}>
                <Ionicons name="cloud-download-outline" size={21} color={Colors.success} />
              </Pressable>
            )}

            <Pressable accessibilityLabel="Ajouter aux favoris" onPress={() => playing && onSave(playing, true)} hitSlop={10} style={styles.iconBtn}>
              <Ionicons name="heart-outline" size={21} color={Colors.purple} />
            </Pressable>
            <Pressable accessibilityLabel="Ouvrir dans YouTube" onPress={() => playing && Linking.openURL(playing.url)} hitSlop={10} style={styles.iconBtn}>
              <Ionicons name="open-outline" size={20} color={Colors.cyan} />
            </Pressable>
          </View>
          <View style={styles.fullVideo}>{playing ? <YouTubeSurface videoId={playing.id} /> : null}</View>
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
  openRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  openText: { color: Colors.cyan, fontSize: 9, fontWeight: '700' },
  list: { gap: 8, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 14, backgroundColor: Colors.surface },
  rowActive: { backgroundColor: '#12233A' },
  thumbWrap: { width: 96, height: 54, borderRadius: 9, overflow: 'hidden', backgroundColor: Colors.surfaceRaised },
  thumb: { width: '100%', height: '100%' },
  thumbBadge: { position: 'absolute', right: 4, bottom: 4, width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.65)' },
  rowCopy: { flex: 1, minWidth: 0, gap: 2 },
  rowArtist: { color: Colors.textMuted, fontSize: 9, fontWeight: '800' },
  rowTitle: { color: Colors.text, fontSize: 12, fontWeight: '800', lineHeight: 16 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  playBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: Colors.blue },
  playBtnOn: { backgroundColor: Colors.purple },
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
