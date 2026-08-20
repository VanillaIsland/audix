import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Gradients, Radius } from '@/constants/theme';
import type { VoxaPlaylist, VoxaTrack } from '@/types/media';

const PALETTE = ['#A71BFF', '#6C32FF', '#246BFF', '#00D8E8', '#39E6A2', '#FFBE5C', '#FF5F7A'];

type Props = {
  playlists: VoxaPlaylist[];
  tracks: VoxaTrack[];
  currentId: string | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string, color: string) => VoxaPlaylist;
  onUpdate: (id: string, changes: Partial<Pick<VoxaPlaylist, 'name' | 'description' | 'color'>>) => void;
  onToggleTrack: (playlistId: string, trackId: string) => void;
  onPlay: (trackId: string) => void;
  onRequestDelete: (playlist: VoxaPlaylist) => void;
  onImport: () => void;
  onGrab: () => void;
};

export function PlaylistsPanel({ playlists, tracks, currentId, selectedId, onSelect, onCreate, onUpdate, onToggleTrack, onPlay, onRequestDelete, onImport, onGrab }: Props) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PALETTE[1]);
  const selected = playlists.find((playlist) => playlist.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && playlists[0]) onSelect(playlists[0].id);
  }, [onSelect, playlists, selectedId]);

  const create = () => {
    if (!newName.trim()) return;
    const created = onCreate(newName, newColor);
    setNewName('');
    onSelect(created.id);
  };

  return (
    <View style={styles.panel}>
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>COLLECTION MATRIX</Text>
          <Text style={styles.heroTitle}>Tes univers musicaux</Text>
          <Text style={styles.heroSubtitle}>Crée, colore, renomme et compose chaque playlist sans quitter ton flux.</Text>
        </View>
        <View style={styles.heroStats}>
          <View style={styles.stat}><Text style={styles.statValue}>{playlists.length}</Text><Text style={styles.statLabel}>PLAYLISTS</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.stat}><Text style={styles.statValue}>{tracks.length}</Text><Text style={styles.statLabel}>TITRES</Text></View>
        </View>
      </View>

      <View style={styles.creator}>
        <View style={styles.creatorTop}>
          <View style={[styles.newCover, { borderColor: newColor }]}><LinearGradient colors={[newColor, '#246BFF', '#00D8E8']} style={styles.newCoverGradient}><Ionicons name="add" size={27} color={Colors.text} /></LinearGradient></View>
          <View style={styles.creatorFields}>
            <Text style={styles.fieldLabel}>NOUVELLE PLAYLIST</Text>
            <TextInput value={newName} onChangeText={setNewName} onSubmitEditing={create} placeholder="Donne-lui une identité" placeholderTextColor="#515A70" style={styles.nameInput} returnKeyType="done" />
            <View style={styles.palette}>{PALETTE.map((color) => <Pressable accessibilityLabel={`Couleur ${color}`} key={color} onPress={() => setNewColor(color)} style={[styles.swatch, { backgroundColor: color }, newColor === color && styles.swatchActive]} />)}</View>
          </View>
          <Pressable disabled={!newName.trim()} onPress={create} style={[styles.createButton, !newName.trim() && styles.disabled]}><LinearGradient colors={Gradients.brand} style={styles.createGradient}><Ionicons name="add-circle-outline" size={19} color={Colors.text} /><Text style={styles.createText}>Créer</Text></LinearGradient></Pressable>
        </View>
      </View>

      {playlists.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
          {playlists.map((playlist, index) => {
            const active = playlist.id === selectedId;
            return (
              <Pressable key={playlist.id} onPress={() => onSelect(playlist.id)} style={[styles.card, active && { borderColor: playlist.color, backgroundColor: '#111827' }]}>
                <LinearGradient colors={[playlist.color, '#246BFF', '#00D8E8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cover}>
                  <Text style={styles.cardIndex}>{String(index + 1).padStart(2, '0')}</Text>
                  <Ionicons name="musical-notes" size={25} color={Colors.text} />
                  <View style={styles.coverCount}><Text style={styles.coverCountText}>{playlist.trackIds.length}</Text></View>
                </LinearGradient>
                <Text style={styles.cardTitle} numberOfLines={1}>{playlist.name}</Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>{playlist.description}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.empty}><Ionicons name="albums-outline" size={28} color={Colors.cyan} /><Text style={styles.emptyTitle}>Ta collection commence ici</Text><Text style={styles.emptyText}>Crée une playlist ci-dessus, puis ajoute des fichiers ou des références catalogue.</Text></View>
      )}

      {selected ? (
        <View style={styles.editor}>
          <View style={styles.editorHeader}>
            <View style={[styles.editorAccent, { backgroundColor: selected.color }]} />
            <View style={styles.editorTitleWrap}><Text style={styles.editorEyebrow}>PLAYLIST EDITOR</Text><Text style={styles.editorTitle}>{selected.name || 'Sans titre'}</Text></View>
            <Pressable accessibilityLabel="Supprimer la playlist" onPress={() => onRequestDelete(selected)} style={styles.deleteButton}><Ionicons name="trash-outline" size={18} color={Colors.danger} /><Text style={styles.deleteText}>Supprimer</Text></Pressable>
          </View>

          <View style={styles.editorFields}>
            <View style={styles.fieldGroup}><Text style={styles.fieldLabel}>NOM</Text><TextInput value={selected.name} onChangeText={(name) => onUpdate(selected.id, { name })} placeholder="Nom" placeholderTextColor="#515A70" style={styles.editorInput} /></View>
            <View style={styles.fieldGroup}><Text style={styles.fieldLabel}>DESCRIPTION</Text><TextInput value={selected.description} onChangeText={(description) => onUpdate(selected.id, { description })} placeholder="Ambiance, projet, usage…" placeholderTextColor="#515A70" style={styles.editorInput} /></View>
          </View>
          <View style={styles.paletteRow}><Text style={styles.fieldLabel}>COULEUR SIGNAL</Text><View style={styles.palette}>{PALETTE.map((color) => <Pressable accessibilityLabel={`Appliquer ${color}`} key={color} onPress={() => onUpdate(selected.id, { color })} style={[styles.swatch, { backgroundColor: color }, selected.color === color && styles.swatchActive]} />)}</View></View>

          <View style={styles.trackHeader}><View><Text style={styles.trackHeading}>Composition</Text><Text style={styles.trackSubheading}>{selected.trackIds.length} titre{selected.trackIds.length !== 1 ? 's' : ''} dans cette playlist</Text></View><View style={styles.trackActions}><Pressable onPress={onImport} style={styles.smallAction}><Ionicons name="folder-open-outline" size={16} color={Colors.cyan} /><Text style={styles.smallActionText}>Importer</Text></Pressable><Pressable onPress={onGrab} style={styles.smallAction}><Ionicons name="link-outline" size={16} color={Colors.purple} /><Text style={styles.smallActionText}>Ajouter un lien</Text></Pressable></View></View>

          {tracks.length ? <View style={styles.trackList}>{tracks.map((track) => {
            const included = selected.trackIds.includes(track.id);
            return (
              <View key={track.id} style={[styles.trackRow, included && styles.trackRowIncluded]}>
                <Pressable accessibilityLabel={included ? `Retirer ${track.title}` : `Ajouter ${track.title}`} onPress={() => onToggleTrack(selected.id, track.id)} style={[styles.toggleButton, included && { backgroundColor: selected.color }]}><Ionicons name={included ? 'checkmark' : 'add'} size={18} color={Colors.text} /></Pressable>
                <View style={styles.trackMeta}><Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text><Text style={styles.trackArtist} numberOfLines={1}>{track.artist}</Text></View>
                <View style={styles.sourcePill}><Text style={styles.sourceText}>{track.externalUrl ? 'STREAM' : track.downloaded ? 'OFFLINE' : 'LOCAL'}</Text></View>
                <Pressable accessibilityLabel={`Lire ${track.title}`} onPress={() => onPlay(track.id)} style={[styles.playButton, currentId === track.id && styles.playButtonActive]}><Ionicons name={currentId === track.id ? 'volume-high' : 'play'} size={18} color={Colors.cyan} /></Pressable>
              </View>
            );
          })}</View> : <View style={styles.emptyTracks}><View style={styles.emptyTrackIcon}><Ionicons name="musical-notes-outline" size={27} color={Colors.cyan} /></View><Text style={styles.emptyTitle}>Cette playlist attend son premier titre</Text><Text style={styles.emptyText}>Importe un master ou ajoute un lien YouTube, Spotify ou Facebook comme référence officielle.</Text><View style={styles.emptyActions}><Pressable onPress={onImport} style={styles.outlineAction}><Ionicons name="folder-open-outline" size={17} color={Colors.cyan} /><Text style={styles.outlineActionText}>Importer mes masters</Text></Pressable><Pressable onPress={onGrab} style={styles.outlineAction}><Ionicons name="link-outline" size={17} color={Colors.purple} /><Text style={styles.outlineActionText}>Ouvrir Grab</Text></Pressable></View></View>}
        </View>
      ) : null}

      <LinearGradient colors={['rgba(167,27,255,0.16)', 'rgba(36,107,255,0.08)', 'rgba(0,216,232,0.10)']} style={styles.smartCard}><View style={styles.smartIcon}><Ionicons name="sparkles" size={21} color={Colors.purple} /></View><View style={styles.smartCopy}><Text style={styles.smartTitle}>Smart playlists · prochain module</Text><Text style={styles.smartText}>Des règles automatiques par BPM, tonalité, année, durée et genre viendront compléter tes playlists manuelles.</Text></View><View style={styles.soonBadge}><Text style={styles.soonText}>SOON</Text></View></LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 18 },
  hero: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, paddingHorizontal: 3 },
  heroCopy: { flex: 1, minWidth: 260, gap: 4 },
  eyebrow: { color: Colors.cyan, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  heroTitle: { color: Colors.text, fontSize: 29, fontWeight: '900', letterSpacing: -0.8 },
  heroSubtitle: { color: Colors.textMuted, fontSize: 12 },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 18, borderWidth: 1, borderColor: '#283149', backgroundColor: '#0C101A' },
  stat: { alignItems: 'center', minWidth: 50 },
  statValue: { color: Colors.text, fontSize: 19, fontWeight: '900' },
  statLabel: { color: Colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  statDivider: { width: 1, height: 30, backgroundColor: '#293149' },
  creator: { padding: 16, borderRadius: 24, borderWidth: 1, borderColor: '#293149', backgroundColor: 'rgba(12,16,26,0.94)' },
  creatorTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14 },
  newCover: { width: 72, height: 72, padding: 2, borderRadius: 20, borderWidth: 1 },
  newCoverGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  creatorFields: { flex: 1, minWidth: 210, gap: 7 },
  fieldLabel: { color: '#646E87', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  nameInput: { height: 34, padding: 0, color: Colors.text, fontSize: 18, fontWeight: '800' },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: Colors.text, transform: [{ scale: 1.16 }] },
  createButton: { minWidth: 125, overflow: 'hidden', borderRadius: 17 },
  createGradient: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 18 },
  createText: { color: Colors.text, fontSize: 11, fontWeight: '900' },
  disabled: { opacity: 0.38 },
  cards: { gap: 11, paddingVertical: 2 },
  card: { width: 158, gap: 6, padding: 9, borderRadius: 21, borderWidth: 1, borderColor: '#283149', backgroundColor: '#0C1019' },
  cover: { height: 112, justifyContent: 'space-between', padding: 13, borderRadius: 15 },
  cardIndex: { color: 'rgba(255,255,255,0.68)', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  coverCount: { position: 'absolute', right: 9, bottom: 9, minWidth: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: 'rgba(4,6,10,0.52)' },
  coverCountText: { color: Colors.text, fontSize: 9, fontWeight: '900' },
  cardTitle: { color: Colors.text, fontSize: 12, fontWeight: '900' },
  cardSubtitle: { color: Colors.textMuted, fontSize: 8 },
  empty: { alignItems: 'center', gap: 8, padding: 30, borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', borderColor: '#293149' },
  emptyTitle: { color: Colors.text, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  emptyText: { maxWidth: 500, color: Colors.textMuted, fontSize: 10, lineHeight: 16, textAlign: 'center' },
  editor: { gap: 16, padding: 20, borderRadius: 28, borderWidth: 1, borderColor: '#293149', backgroundColor: 'rgba(10,13,21,0.96)' },
  editorHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  editorAccent: { width: 5, height: 44, borderRadius: 4 },
  editorTitleWrap: { flex: 1, gap: 2 },
  editorEyebrow: { color: Colors.cyan, fontSize: 8, fontWeight: '900', letterSpacing: 1.6 },
  editorTitle: { color: Colors.text, fontSize: 21, fontWeight: '900' },
  deleteButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: '#4A2230', backgroundColor: '#211019' },
  deleteText: { color: Colors.danger, fontSize: 9, fontWeight: '900' },
  editorFields: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fieldGroup: { flex: 1, minWidth: 240, gap: 6 },
  editorInput: { height: 46, paddingHorizontal: 13, borderRadius: 14, borderWidth: 1, borderColor: '#283149', backgroundColor: '#070A10', color: Colors.text, fontSize: 12 },
  paletteRow: { gap: 8 },
  trackHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 4 },
  trackHeading: { color: Colors.text, fontSize: 16, fontWeight: '900' },
  trackSubheading: { color: Colors.textMuted, fontSize: 9, marginTop: 2 },
  trackActions: { flexDirection: 'row', gap: 7 },
  smallAction: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, borderRadius: 13, borderWidth: 1, borderColor: '#283149', backgroundColor: '#101521' },
  smallActionText: { color: Colors.text, fontSize: 9, fontWeight: '800' },
  trackList: { gap: 8 },
  trackRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 17, borderWidth: 1, borderColor: '#252D41', backgroundColor: '#0B0F18' },
  trackRowIncluded: { borderColor: '#345168', backgroundColor: '#0D1620' },
  toggleButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#1A2030' },
  trackMeta: { flex: 1, minWidth: 0 },
  trackTitle: { color: Colors.text, fontSize: 12, fontWeight: '800' },
  trackArtist: { color: Colors.textMuted, fontSize: 9, marginTop: 2 },
  sourcePill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: Radius.pill, backgroundColor: '#111827' },
  sourceText: { color: Colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  playButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19 },
  playButtonActive: { backgroundColor: '#0C2630' },
  emptyTracks: { alignItems: 'center', gap: 9, padding: 28, borderRadius: 22, borderWidth: 1, borderStyle: 'dashed', borderColor: '#293149' },
  emptyTrackIcon: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#0B202A' },
  emptyActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 4 },
  outlineAction: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, borderRadius: 14, borderWidth: 1, borderColor: '#2B354D', backgroundColor: '#101521' },
  outlineActionText: { color: Colors.text, fontSize: 9, fontWeight: '800' },
  smartCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderRadius: 20, borderWidth: 1, borderColor: '#37264D' },
  smartIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#21102F' },
  smartCopy: { flex: 1, gap: 3 },
  smartTitle: { color: Colors.text, fontSize: 12, fontWeight: '900' },
  smartText: { color: Colors.textMuted, fontSize: 9, lineHeight: 14 },
  soonBadge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: '#1E1230' },
  soonText: { color: Colors.purple, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
});
