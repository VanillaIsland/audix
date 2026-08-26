import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Gradients, Radius } from '@/constants/theme';
import { resolvePlaylistTracks } from '@/lib/smart';
import type { AudixPlaylist, AudixTrack, SmartRule } from '@/types/media';

const PALETTE = ['#A71BFF', '#6C32FF', '#246BFF', '#00D8E8', '#39E6A2', '#FFBE5C', '#FF5F7A'];

type Props = {
  playlists: AudixPlaylist[];
  tracks: AudixTrack[];
  currentId: string | null;
  /** Playlist dépliée. `null` = toutes repliées. */
  openId: string | null;
  onToggleOpen: (id: string | null) => void;
  onCreate: (name: string) => void;
  onCreateSmart: (name: string, rule: SmartRule) => void;
  onUpdate: (playlistId: string, changes: Partial<Pick<AudixPlaylist, 'name' | 'description' | 'color'>>) => void;
  onUpdateRule: (playlistId: string, rule: SmartRule) => void;
  onToggleVisibility: (playlistId: string) => void;
  onAddTrack: (playlistId: string, trackId: string) => void;
  onRemoveTracks: (playlistId: string, trackIds: string[]) => void;
  onPlay: (trackId: string, context: AudixTrack[]) => void;
  onRequestDelete: (playlist: AudixPlaylist) => void;
  onImport: () => void;
  onGrab: () => void;
};

/** Ligne de titre, même mise en page que l'onglet Lecture. */
function TrackLine({
  track,
  active,
  trailing,
  onPress,
}: {
  track: AudixTrack;
  active: boolean;
  trailing: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <View style={[styles.trackRow, active && styles.trackRowActive]}>
      <View style={styles.trackThumb}>
        {track.thumbnail ? (
          <Image source={{ uri: track.thumbnail }} style={styles.trackThumbImage} />
        ) : (
          <View style={styles.trackThumbFallback}>
            <Ionicons
              name={track.externalUrl ? 'radio-outline' : track.kind === 'audio' ? 'musical-note' : 'videocam'}
              size={18}
              color={Colors.textMuted}
            />
          </View>
        )}
      </View>
      <Pressable accessibilityLabel={`Lire ${track.title}`} onPress={onPress} style={styles.trackMeta}>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {track.artist} · {track.externalUrl ? 'En ligne' : track.downloaded ? 'Hors ligne' : 'Local'}
          {track.bpm ? ` · ${Math.round(track.bpm)} BPM` : ''}
          {track.genre ? ` · ${track.genre}` : ''}
        </Text>
        <Text style={styles.trackTitle} numberOfLines={2}>{track.title}</Text>
      </Pressable>
      {trailing}
    </View>
  );
}

/** Éditeur de règles d'une playlist intelligente. */
function RuleEditor({ rule, onChange }: { rule: SmartRule; onChange: (next: SmartRule) => void }) {
  const number = (value: string) => {
    const parsed = Number(value.replace(/[^0-9]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  };
  return (
    <View style={styles.ruleBox}>
      <Text style={styles.fieldLabel}>Règles</Text>
      <View style={styles.ruleRow}>
        <TextInput
          value={rule.genre ?? ''}
          onChangeText={(genre) => onChange({ ...rule, genre: genre || undefined })}
          placeholder="Genre"
          placeholderTextColor="#515A70"
          style={styles.ruleInput}
        />
        <TextInput
          value={rule.artist ?? ''}
          onChangeText={(artist) => onChange({ ...rule, artist: artist || undefined })}
          placeholder="Artiste"
          placeholderTextColor="#515A70"
          style={styles.ruleInput}
        />
      </View>
      <View style={styles.ruleRow}>
        <TextInput
          value={rule.bpmFrom ? String(rule.bpmFrom) : ''}
          onChangeText={(value) => onChange({ ...rule, bpmFrom: number(value) })}
          placeholder="BPM min"
          placeholderTextColor="#515A70"
          keyboardType="number-pad"
          style={styles.ruleInput}
        />
        <TextInput
          value={rule.bpmTo ? String(rule.bpmTo) : ''}
          onChangeText={(value) => onChange({ ...rule, bpmTo: number(value) })}
          placeholder="BPM max"
          placeholderTextColor="#515A70"
          keyboardType="number-pad"
          style={styles.ruleInput}
        />
      </View>
      <View style={styles.ruleRow}>
        <Pressable
          onPress={() => onChange({ ...rule, favoriteOnly: !rule.favoriteOnly })}
          style={[styles.ruleChip, rule.favoriteOnly && styles.ruleChipOn]}>
          <Ionicons name="heart" size={13} color={rule.favoriteOnly ? Colors.purple : Colors.textMuted} />
          <Text style={[styles.ruleChipText, rule.favoriteOnly && styles.ruleChipTextOn]}>Favoris seulement</Text>
        </Pressable>
        <Pressable
          onPress={() => onChange({ ...rule, offlineOnly: !rule.offlineOnly })}
          style={[styles.ruleChip, rule.offlineOnly && styles.ruleChipOn]}>
          <Ionicons name="cloud-download" size={13} color={rule.offlineOnly ? Colors.success : Colors.textMuted} />
          <Text style={[styles.ruleChipText, rule.offlineOnly && styles.ruleChipTextOn]}>Hors ligne</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function PlaylistsPanel({
  playlists,
  tracks,
  currentId,
  openId,
  onToggleOpen,
  onCreate,
  onCreateSmart,
  onUpdate,
  onUpdateRule,
  onToggleVisibility,
  onAddTrack,
  onRemoveTracks,
  onPlay,
  onRequestDelete,
  onImport,
  onGrab,
}: Props) {
  const [newName, setNewName] = useState('');
  const [newSmart, setNewSmart] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [addMode, setAddMode] = useState(false);

  const open = playlists.find((playlist) => playlist.id === openId) ?? null;
  const openTracks = useMemo(() => (open ? resolvePlaylistTracks(open, tracks) : []), [open, tracks]);
  const outsideTracks = useMemo(
    () => (open ? tracks.filter((track) => !openTracks.some((item) => item.id === track.id)) : []),
    [open, openTracks, tracks],
  );

  const toggleCard = (playlist: AudixPlaylist) => {
    setSelection([]);
    setAddMode(false);
    onToggleOpen(openId === playlist.id ? null : playlist.id);
  };

  const create = () => {
    const name = newName.trim();
    if (!name) return;
    if (newSmart) onCreateSmart(name, {});
    else onCreate(name);
    setNewName('');
    setNewSmart(false);
  };

  const toggleSelected = (trackId: string) => {
    setSelection((existing) =>
      existing.includes(trackId) ? existing.filter((id) => id !== trackId) : [...existing, trackId],
    );
  };

  return (
    <View style={styles.panel}>
      <View style={styles.createRow}>
        <View style={styles.createField}>
          <Ionicons name="albums-outline" size={17} color={Colors.textMuted} />
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Nouvelle playlist"
            placeholderTextColor="#515A70"
            style={styles.createInput}
          />
        </View>
        <Pressable
          accessibilityLabel="Playlist intelligente"
          onPress={() => setNewSmart((value) => !value)}
          style={[styles.smartToggle, newSmart && styles.smartToggleOn]}>
          <Ionicons name="sparkles" size={16} color={newSmart ? Colors.purple : Colors.textMuted} />
        </Pressable>
        <Pressable disabled={!newName.trim()} onPress={create} style={[styles.createButton, !newName.trim() && styles.disabled]}>
          <LinearGradient colors={Gradients.brand} style={styles.createGradient}>
            <Ionicons name="add" size={19} color={Colors.text} />
          </LinearGradient>
        </Pressable>
      </View>
      {newSmart ? (
        <Text style={styles.smartHint}>
          Playlist intelligente : elle se remplit toute seule à partir des règles que tu définiras après la création.
        </Text>
      ) : null}

      {playlists.length ? (
        <View style={styles.grid}>
          {playlists.map((playlist) => {
            const count = resolvePlaylistTracks(playlist, tracks).length;
            const isOpen = playlist.id === openId;
            return (
              <Pressable
                key={playlist.id}
                accessibilityLabel={`${isOpen ? 'Replier' : 'Déplier'} ${playlist.name}`}
                onPress={() => toggleCard(playlist)}
                style={[styles.card, isOpen && { borderColor: playlist.color }]}>
                <LinearGradient colors={[playlist.color, '#0B0F18']} style={styles.cardArt}>
                  <Ionicons
                    name={playlist.smart ? 'sparkles' : playlist.system ? 'flash' : 'musical-notes'}
                    size={20}
                    color={Colors.text}
                  />
                  <View style={styles.cardCount}><Text style={styles.cardCountText}>{count}</Text></View>
                </LinearGradient>
                <Text style={styles.cardName} numberOfLines={1}>{playlist.name}</Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {playlist.smart ? 'Intelligente' : playlist.system ? 'Automatique' : 'Manuelle'}
                </Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={Colors.textMuted}
                  style={styles.cardChevron}
                />
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.empty}>
          <Ionicons name="albums-outline" size={26} color={Colors.cyan} />
          <Text style={styles.emptyTitle}>Ta collection commence ici</Text>
          <Text style={styles.emptyText}>Crée une playlist ci-dessus, puis ajoute des fichiers ou des liens de plateforme.</Text>
        </View>
      )}

      {open ? (
        <View style={styles.editor}>
          <View style={styles.editorHead}>
            <View style={styles.editorTitleWrap}>
              <Text style={styles.editorEyebrow}>
                {open.smart ? 'Playlist intelligente' : open.system ? 'Playlist automatique' : 'Modifier la playlist'}
              </Text>
              <Text style={styles.editorTitle} numberOfLines={1}>{open.name}</Text>
            </View>
            <Pressable accessibilityLabel="Replier" onPress={() => onToggleOpen(null)} hitSlop={10} style={styles.iconBtn}>
              <Ionicons name="chevron-up" size={20} color={Colors.textMuted} />
            </Pressable>
            <Pressable accessibilityLabel="Supprimer la playlist" onPress={() => onRequestDelete(open)} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={17} color={Colors.danger} />
            </Pressable>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nom</Text>
            <TextInput
              value={open.name}
              onChangeText={(name) => onUpdate(open.id, { name })}
              placeholder="Nom"
              placeholderTextColor="#515A70"
              style={styles.editorInput}
            />
          </View>

          <View style={styles.paletteRow}>
            <Text style={styles.fieldLabel}>Couleur</Text>
            <View style={styles.palette}>
              {PALETTE.map((color) => (
                <Pressable
                  key={color}
                  accessibilityLabel={`Appliquer ${color}`}
                  onPress={() => onUpdate(open.id, { color })}
                  style={[styles.swatch, { backgroundColor: color }, open.color === color && styles.swatchActive]}
                />
              ))}
            </View>
          </View>

          <Pressable onPress={() => onToggleVisibility(open.id)} style={[styles.visibility, open.isPublic && styles.visibilityOn]}>
            <Ionicons name={open.isPublic ? 'globe-outline' : 'lock-closed-outline'} size={16} color={open.isPublic ? Colors.cyan : Colors.textMuted} />
            <View style={styles.visibilityCopy}>
              <Text style={styles.visibilityTitle}>{open.isPublic ? 'Playlist publique' : 'Playlist privée'}</Text>
              <Text style={styles.visibilityHint}>
                {open.isPublic
                  ? 'Le serveur garde son nom et la liste de ses titres.'
                  : 'Le serveur ne garde que son nom. Sa composition reste sur l’appareil.'}
              </Text>
            </View>
          </Pressable>

          {open.smart ? <RuleEditor rule={open.smart} onChange={(rule) => onUpdateRule(open.id, rule)} /> : null}

          <View style={styles.trackHeader}>
            <View>
              <Text style={styles.trackHeading}>Composition</Text>
              <Text style={styles.trackSubheading}>
                {openTracks.length} titre{openTracks.length !== 1 ? 's' : ''}
                {open.smart ? ' selon les règles' : ''}
              </Text>
            </View>
            {!open.smart ? (
              <Pressable onPress={() => { setAddMode((value) => !value); setSelection([]); }} style={styles.smallAction}>
                <Ionicons name={addMode ? 'close' : 'add-circle-outline'} size={16} color={Colors.cyan} />
                <Text style={styles.smallActionText}>{addMode ? 'Terminer' : 'Ajouter des titres'}</Text>
              </Pressable>
            ) : null}
          </View>

          {selection.length && !open.smart ? (
            <View style={styles.selectionBar}>
              <Text style={styles.selectionText}>
                {selection.length} titre{selection.length > 1 ? 's' : ''} sélectionné{selection.length > 1 ? 's' : ''}
              </Text>
              <Pressable onPress={() => setSelection([])} style={styles.ghostSmall}>
                <Text style={styles.ghostSmallText}>Annuler</Text>
              </Pressable>
              <Pressable
                onPress={() => { onRemoveTracks(open.id, selection); setSelection([]); }}
                style={styles.removeBtn}>
                <Ionicons name="remove-circle-outline" size={16} color={Colors.text} />
                <Text style={styles.removeBtnText}>Retirer</Text>
              </Pressable>
            </View>
          ) : null}

          {addMode && !open.smart ? (
            <ScrollView style={styles.addList} nestedScrollEnabled contentContainerStyle={styles.trackList}>
              {outsideTracks.length ? (
                outsideTracks.map((track) => (
                  <TrackLine
                    key={track.id}
                    track={track}
                    active={false}
                    onPress={() => onAddTrack(open.id, track.id)}
                    trailing={
                      <Pressable
                        accessibilityLabel={`Ajouter ${track.title}`}
                        onPress={() => onAddTrack(open.id, track.id)}
                        style={styles.addBtn}>
                        <Ionicons name="add" size={18} color={Colors.text} />
                      </Pressable>
                    }
                  />
                ))
              ) : (
                <Text style={styles.trackSubheading}>Tous tes titres sont déjà dans cette playlist.</Text>
              )}
            </ScrollView>
          ) : openTracks.length ? (
            <View style={styles.trackList}>
              {openTracks.map((track) => {
                const picked = selection.includes(track.id);
                return (
                  <TrackLine
                    key={track.id}
                    track={track}
                    active={currentId === track.id}
                    onPress={() => onPlay(track.id, openTracks)}
                    trailing={
                      <View style={styles.trailing}>
                        {!open.smart ? (
                          <Pressable
                            accessibilityLabel={picked ? `Désélectionner ${track.title}` : `Sélectionner ${track.title}`}
                            onPress={() => toggleSelected(track.id)}
                            style={[styles.checkbox, picked && styles.checkboxOn]}>
                            {picked ? <Ionicons name="checkmark" size={15} color={Colors.text} /> : null}
                          </Pressable>
                        ) : null}
                        <Pressable
                          accessibilityLabel={`Lire ${track.title}`}
                          onPress={() => onPlay(track.id, openTracks)}
                          style={[styles.playButton, currentId === track.id && styles.playButtonActive]}>
                          <Ionicons name={currentId === track.id ? 'volume-high' : 'play'} size={17} color={Colors.text} />
                        </Pressable>
                      </View>
                    }
                  />
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyTracks}>
              <Text style={styles.emptyTitle}>
                {open.smart ? 'Aucun titre ne correspond encore à ces règles' : 'Cette playlist attend son premier titre'}
              </Text>
              {!open.smart ? (
                <View style={styles.emptyActions}>
                  <Pressable onPress={onImport} style={styles.outlineAction}>
                    <Ionicons name="folder-open-outline" size={17} color={Colors.cyan} />
                    <Text style={styles.outlineActionText}>Importer un fichier</Text>
                  </Pressable>
                  <Pressable onPress={onGrab} style={styles.outlineAction}>
                    <Ionicons name="link-outline" size={17} color={Colors.purple} />
                    <Text style={styles.outlineActionText}>Ouvrir Grab</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 12 },
  createRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  createField: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, borderRadius: 14, backgroundColor: Colors.surfaceRaised },
  createInput: { flex: 1, height: 46, color: Colors.text, fontSize: 13 },
  smartToggle: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  smartToggleOn: { borderColor: Colors.purple, backgroundColor: '#1A0F26' },
  createButton: { width: 48, height: 48, borderRadius: 14, overflow: 'hidden' },
  createGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  smartHint: { color: Colors.textMuted, fontSize: 10, lineHeight: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: 150, gap: 5, padding: 10, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  cardArt: { height: 96, borderRadius: 13, padding: 10, justifyContent: 'space-between' },
  cardCount: { alignSelf: 'flex-end', minWidth: 24, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.45)' },
  cardCountText: { color: Colors.text, fontSize: 10, fontWeight: '800', textAlign: 'center' },
  cardName: { color: Colors.text, fontSize: 12, fontWeight: '800' },
  cardMeta: { color: Colors.textMuted, fontSize: 9 },
  cardChevron: { position: 'absolute', right: 10, bottom: 10 },
  empty: { alignItems: 'center', gap: 7, padding: 24, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: '#293149' },
  emptyTitle: { color: Colors.text, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 10, lineHeight: 15, textAlign: 'center' },
  editor: { gap: 11, padding: 15, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  editorHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  editorTitleWrap: { flex: 1, minWidth: 0 },
  editorEyebrow: { color: Colors.cyan, fontSize: 10, fontWeight: '700' },
  editorTitle: { color: Colors.text, fontSize: 17, fontWeight: '900', marginTop: 2 },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  deleteButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#5C2737', backgroundColor: '#241019' },
  fieldGroup: { gap: 5 },
  fieldLabel: { color: '#646E87', fontSize: 10, fontWeight: '700' },
  editorInput: { minHeight: 44, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, borderColor: '#232B3E', backgroundColor: '#0A0D15', color: Colors.text, fontSize: 12 },
  paletteRow: { gap: 6 },
  palette: { flexDirection: 'row', gap: 8 },
  swatch: { width: 26, height: 26, borderRadius: 13 },
  swatchActive: { borderWidth: 2, borderColor: Colors.text },
  visibility: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceRaised },
  visibilityOn: { borderColor: '#277E98', backgroundColor: '#0D202B' },
  visibilityCopy: { flex: 1, gap: 2 },
  visibilityTitle: { color: Colors.text, fontSize: 11, fontWeight: '800' },
  visibilityHint: { color: Colors.textMuted, fontSize: 9, lineHeight: 13 },
  ruleBox: { gap: 8, padding: 11, borderRadius: 15, borderWidth: 1, borderColor: '#2A2140', backgroundColor: '#120E1D' },
  ruleRow: { flexDirection: 'row', gap: 8 },
  ruleInput: { flex: 1, minHeight: 40, paddingHorizontal: 11, borderRadius: 11, borderWidth: 1, borderColor: '#2C2444', backgroundColor: '#0A0812', color: Colors.text, fontSize: 11 },
  ruleChip: { flex: 1, minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 11, borderWidth: 1, borderColor: '#2C2444', backgroundColor: '#0A0812' },
  ruleChipOn: { borderColor: Colors.purple },
  ruleChipText: { color: Colors.textMuted, fontSize: 10, fontWeight: '700' },
  ruleChipTextOn: { color: Colors.text },
  trackHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  trackHeading: { color: Colors.text, fontSize: 14, fontWeight: '800' },
  trackSubheading: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  smallAction: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceRaised },
  smallActionText: { color: Colors.text, fontSize: 10, fontWeight: '700' },
  selectionBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 9, borderRadius: 13, backgroundColor: '#12233A' },
  selectionText: { flex: 1, color: Colors.text, fontSize: 11, fontWeight: '700' },
  ghostSmall: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 11, borderWidth: 1, borderColor: Colors.border },
  ghostSmallText: { color: Colors.textMuted, fontSize: 10, fontWeight: '700' },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 11, backgroundColor: Colors.danger },
  removeBtnText: { color: Colors.text, fontSize: 10, fontWeight: '800' },
  addList: { maxHeight: 320 },
  trackList: { gap: 8 },
  trackRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 14, backgroundColor: Colors.surfaceRaised },
  trackRowActive: { backgroundColor: '#12233A' },
  trackThumb: { width: 96, height: 54, borderRadius: 9, overflow: 'hidden', backgroundColor: '#141A28' },
  trackThumbImage: { width: '100%', height: '100%' },
  trackThumbFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  trackMeta: { flex: 1, minWidth: 0, gap: 2 },
  trackTitle: { color: Colors.text, fontSize: 12, fontWeight: '800', lineHeight: 16 },
  trackArtist: { color: Colors.textMuted, fontSize: 9, fontWeight: '800' },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  checkbox: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#2E3750' },
  checkboxOn: { borderColor: Colors.purple, backgroundColor: Colors.purple },
  addBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: Colors.blue },
  playButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: Colors.blue },
  playButtonActive: { backgroundColor: Colors.purple },
  emptyTracks: { alignItems: 'center', gap: 9, padding: 20, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: '#293149' },
  emptyActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, justifyContent: 'center' },
  outlineAction: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 13, borderWidth: 1, borderColor: '#2D3851', backgroundColor: '#101521' },
  outlineActionText: { color: Colors.text, fontSize: 10, fontWeight: '700' },
  pill: { borderRadius: Radius.pill },
});
