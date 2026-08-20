import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Player } from '@/components/player';
import { Colors, Gradients, Radius } from '@/constants/theme';
import { useLibrary } from '@/hooks/use-library';
import type { MediaOrigin, VoxaTrack } from '@/types/media';

type Section = 'play' | 'recent' | 'downloads' | 'favorites' | 'playlists' | 'grab';

const SECTIONS: { key: Section; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'play', label: 'Lecture', icon: 'play-circle-outline' },
  { key: 'recent', label: 'Récents', icon: 'time-outline' },
  { key: 'downloads', label: 'Downloads', icon: 'arrow-down-circle-outline' },
  { key: 'favorites', label: 'Favoris', icon: 'heart-outline' },
  { key: 'playlists', label: 'Playlists', icon: 'albums-outline' },
  { key: 'grab', label: 'Grab', icon: 'link-outline' },
];

const ORIGIN_LABELS: Record<MediaOrigin, string> = {
  local: 'LOCAL',
  direct: 'DIRECT',
  'youtube-export': 'YT EXPORT',
  'facebook-export': 'FB EXPORT',
  'spotify-catalog': 'SPOTIFY REF',
};

const sizeLabel = (bytes?: number) => {
  if (!bytes) return '—';
  return bytes > 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.round(bytes / 1_000)} KB`;
};

function TrackRow({
  track,
  active,
  onSelect,
  onFavorite,
}: {
  track: VoxaTrack;
  active: boolean;
  onSelect: () => void;
  onFavorite: () => void;
}) {
  return (
    <Pressable onPress={onSelect} style={[styles.trackRow, active && styles.trackRowActive]}>
      <LinearGradient colors={active ? Gradients.brand : ['#181C29', '#11141D', '#0D1018']} style={styles.trackIcon}>
        <Ionicons name={track.kind === 'audio' ? 'musical-note' : 'videocam'} size={20} color={Colors.text} />
      </LinearGradient>
      <View style={styles.trackMeta}>
        <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>{track.artist} · {sizeLabel(track.size)}</Text>
      </View>
      <View style={styles.sourceBadge}><Text style={styles.sourceText}>{ORIGIN_LABELS[track.origin]}</Text></View>
      {track.downloaded && <Ionicons name="checkmark-circle" color={Colors.success} size={17} />}
      <Pressable onPress={onFavorite} hitSlop={10}>
        <Ionicons name={track.favorite ? 'heart' : 'heart-outline'} color={track.favorite ? Colors.purple : Colors.textMuted} size={20} />
      </Pressable>
    </Pressable>
  );
}

function EmptyState({ icon, title, copy, action, onAction }: { icon: keyof typeof Ionicons.glyphMap; title: string; copy: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={26} color={Colors.cyan} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyCopy}>{copy}</Text>
      {action && onAction && <Pressable style={styles.secondaryButton} onPress={onAction}><Text style={styles.secondaryButtonText}>{action}</Text></Pressable>}
    </View>
  );
}

export default function HomeScreen() {
  const library = useLibrary();
  const [section, setSection] = useState<Section>('play');
  const [query, setQuery] = useState('');
  const [grabUrl, setGrabUrl] = useState('');
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [grabBusy, setGrabBusy] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  const visibleTracks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let items = library.tracks;
    if (section === 'recent') items = items.filter((track) => track.lastPlayedAt).sort((a, b) => (b.lastPlayedAt ?? '').localeCompare(a.lastPlayedAt ?? ''));
    if (section === 'downloads') items = items.filter((track) => track.downloaded);
    if (section === 'favorites') items = items.filter((track) => track.favorite);
    if (normalized) items = items.filter((track) => `${track.title} ${track.artist} ${track.album ?? ''}`.toLowerCase().includes(normalized));
    return items;
  }, [library.tracks, query, section]);

  const importFiles = async () => {
    try {
      const count = await library.importFiles();
      if (count) Alert.alert('Import terminé', `${count} média${count > 1 ? 's' : ''} ajouté${count > 1 ? 's' : ''} à Voxa.`);
    } catch (error) {
      Alert.alert('Import impossible', error instanceof Error ? error.message : 'Une erreur est survenue.');
    }
  };

  const grab = async (keepOffline: boolean) => {
    if (!rightsConfirmed) return Alert.alert('Confirmation requise', 'Confirme que tu possèdes les droits sur ce média.');
    setGrabBusy(true);
    try {
      await library.importUrl(grabUrl.trim(), keepOffline);
      setGrabUrl('');
      setSection('play');
      Alert.alert('Ajouté à Voxa', keepOffline ? 'Le média est conservé hors ligne.' : 'Le flux direct est prêt à lire.');
    } catch (error) {
      Alert.alert('Lien refusé', error instanceof Error ? error.message : 'Le lien ne peut pas être importé.');
    } finally {
      setGrabBusy(false);
    }
  };

  const createPlaylist = () => {
    try {
      const playlist = library.createPlaylist(playlistName);
      setPlaylistName('');
      setSelectedPlaylistId(playlist.id);
    } catch (error) {
      Alert.alert('Playlist non créée', error instanceof Error ? error.message : 'Une erreur est survenue.');
    }
  };

  const selectedPlaylist = library.playlists.find((playlist) => playlist.id === selectedPlaylistId) ?? null;

  return (
    <View style={styles.screen}>
      <View style={styles.orbPurple} />
      <View style={styles.orbCyan} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Image source={require('@/assets/brand/voxa-wordmark.png')} style={styles.wordmark} resizeMode="contain" />
            <View style={styles.privateBadge}>
              <Ionicons name="lock-closed" size={11} color={Colors.success} />
              <Text style={styles.privateText}>PRIVATE CATALOG</Text>
            </View>
          </View>

          <Text style={styles.kicker}>INTELLIGENT · IMMERSIVE · YOURS</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nav}>
            {SECTIONS.map((item) => {
              const active = section === item.key;
              return (
                <Pressable key={item.key} onPress={() => setSection(item.key)} style={[styles.navItem, active && styles.navItemActive]}>
                  <Ionicons name={item.icon} size={17} color={active ? Colors.cyan : Colors.textMuted} />
                  <Text style={[styles.navText, active && styles.navTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {section === 'play' && (
            <>
              <Player track={library.current} onImport={importFiles} onPlayed={library.markPlayed} onToggleFavorite={library.toggleFavorite} />
              <View style={styles.actionsRow}>
                <Pressable style={styles.primaryButton} onPress={importFiles}>
                  <LinearGradient colors={Gradients.brand} style={styles.primaryGradient}>
                    <Ionicons name="add-circle-outline" size={20} color={Colors.text} />
                    <Text style={styles.primaryButtonText}>Importer mes masters</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => setSection('grab')}>
                  <Ionicons name="link-outline" size={18} color={Colors.cyan} />
                  <Text style={styles.secondaryButtonText}>Grab autorisé</Text>
                </Pressable>
              </View>
            </>
          )}

          {section === 'grab' && (
            <View style={styles.grabCard}>
              <View style={styles.sectionHeading}>
                <View style={styles.grabIcon}><Ionicons name="link" size={24} color={Colors.cyan} /></View>
                <View style={styles.headingCopy}>
                  <Text style={styles.sectionTitle}>Grab</Text>
                  <Text style={styles.sectionSubtitle}>Importe un lien direct signé vers un fichier audio ou vidéo que tu possèdes.</Text>
                </View>
              </View>
              <TextInput
                value={grabUrl}
                onChangeText={setGrabUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder="https://storage.example.com/master.flac"
                placeholderTextColor="#555B70"
                style={styles.urlInput}
              />
              <View style={styles.rightsRow}>
                <Switch value={rightsConfirmed} onValueChange={setRightsConfirmed} trackColor={{ false: '#292E3F', true: Colors.blue }} thumbColor={rightsConfirmed ? Colors.cyan : '#8B91A7'} />
                <Text style={styles.rightsText}>J’atteste posséder les droits et l’autorisation de télécharger ce média.</Text>
              </View>
              <View style={styles.actionsRow}>
                <Pressable disabled={!grabUrl || grabBusy} style={styles.secondaryButton} onPress={() => grab(false)}>
                  <Ionicons name="play-outline" size={18} color={Colors.cyan} />
                  <Text style={styles.secondaryButtonText}>Lire seulement</Text>
                </Pressable>
                <Pressable disabled={!grabUrl || grabBusy} style={[styles.primaryButton, (!grabUrl || grabBusy) && styles.disabled]} onPress={() => grab(true)}>
                  <LinearGradient colors={Gradients.brand} style={styles.primaryGradient}>
                    {grabBusy ? <ActivityIndicator color={Colors.text} /> : <Ionicons name="download-outline" size={19} color={Colors.text} />}
                    <Text style={styles.primaryButtonText}>{Platform.OS === 'web' ? 'Disponible sur mobile' : 'Lire & garder'}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
              <View style={styles.guardrail}>
                <Ionicons name="shield-checkmark-outline" size={18} color={Colors.success} />
                <Text style={styles.guardrailText}>Pas d’extraction Spotify/YouTube/Facebook, pas de DRM ni de contournement publicitaire. Utilise tes exports officiels ou ton stockage source.</Text>
              </View>
            </View>
          )}

          {section === 'playlists' && (
            <View style={styles.playlistsSection}>
              <View style={styles.sectionHeading}>
                <View style={styles.grabIcon}><Ionicons name="albums" size={24} color={Colors.cyan} /></View>
                <View style={styles.headingCopy}>
                  <Text style={styles.sectionTitle}>Mes playlists</Text>
                  <Text style={styles.sectionSubtitle}>Crée tes sélections privées et ajoute ou retire des titres en un geste.</Text>
                </View>
              </View>

              <View style={styles.playlistCreator}>
                <TextInput
                  value={playlistName}
                  onChangeText={setPlaylistName}
                  onSubmitEditing={createPlaylist}
                  placeholder="Nom de la playlist"
                  placeholderTextColor="#555B70"
                  style={styles.playlistInput}
                  returnKeyType="done"
                />
                <Pressable disabled={!playlistName.trim()} style={[styles.createPlaylistButton, !playlistName.trim() && styles.disabled]} onPress={createPlaylist}>
                  <LinearGradient colors={Gradients.brand} style={styles.createPlaylistGradient}>
                    <Ionicons name="add" size={20} color={Colors.text} />
                    <Text style={styles.primaryButtonText}>Créer</Text>
                  </LinearGradient>
                </Pressable>
              </View>

              {library.playlists.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.playlistCards}>
                  {library.playlists.map((playlist) => {
                    const selected = playlist.id === selectedPlaylistId;
                    return (
                      <Pressable key={playlist.id} onPress={() => setSelectedPlaylistId(playlist.id)} style={[styles.playlistCard, selected && styles.playlistCardActive]}>
                        <LinearGradient colors={selected ? Gradients.brand : ['#181C29', '#11141D', '#0D1018']} style={styles.playlistCover}>
                          <Ionicons name="musical-notes" size={25} color={Colors.text} />
                        </LinearGradient>
                        <Text style={styles.playlistTitle} numberOfLines={1}>{playlist.name}</Text>
                        <Text style={styles.playlistCount}>{playlist.trackIds.length} titre{playlist.trackIds.length !== 1 ? 's' : ''}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : (
                <EmptyState icon="albums-outline" title="Crée ta première playlist" copy="Tes playlists restent enregistrées dans Voxa et pourront ensuite être synchronisées avec ton espace privé." />
              )}

              {selectedPlaylist && (
                <View style={styles.playlistEditor}>
                  <View style={styles.sectionHeaderRow}>
                    <View>
                      <Text style={styles.sectionTitle}>{selectedPlaylist.name}</Text>
                      <Text style={styles.sectionSubtitle}>Sélectionne les titres à inclure dans cette playlist.</Text>
                    </View>
                    <Pressable
                      hitSlop={10}
                      onPress={() => Alert.alert(
                        'Supprimer la playlist ?',
                        `« ${selectedPlaylist.name} » sera supprimée. Les fichiers audio resteront dans ta bibliothèque.`,
                        [
                          { text: 'Annuler', style: 'cancel' },
                          { text: 'Supprimer', style: 'destructive', onPress: () => {
                            library.deletePlaylist(selectedPlaylist.id);
                            setSelectedPlaylistId(null);
                          } },
                        ],
                      )}>
                      <Ionicons name="trash-outline" size={20} color={Colors.textMuted} />
                    </Pressable>
                  </View>
                  {library.tracks.length ? library.tracks.map((track) => {
                    const included = selectedPlaylist.trackIds.includes(track.id);
                    return (
                      <Pressable key={track.id} onPress={() => library.toggleTrackInPlaylist(selectedPlaylist.id, track.id)} style={[styles.playlistTrack, included && styles.playlistTrackActive]}>
                        <Ionicons name={included ? 'checkmark-circle' : 'add-circle-outline'} size={21} color={included ? Colors.success : Colors.textMuted} />
                        <View style={styles.trackMeta}>
                          <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
                          <Text style={styles.trackArtist} numberOfLines={1}>{track.artist}</Text>
                        </View>
                        <Pressable onPress={() => library.setCurrentId(track.id)} hitSlop={8}>
                          <Ionicons name="play-circle-outline" size={23} color={Colors.cyan} />
                        </Pressable>
                      </Pressable>
                    );
                  }) : (
                    <EmptyState icon="musical-notes-outline" title="Aucun titre disponible" copy="Importe tes masters, puis reviens ici pour les ajouter à cette playlist." action="Importer un média" onAction={importFiles} />
                  )}
                </View>
              )}

              <View style={styles.smartPlaylistCard}>
                <Ionicons name="sparkles-outline" size={22} color={Colors.purple} />
                <View style={styles.headingCopy}>
                  <Text style={styles.smartPlaylistTitle}>Playlists intelligentes</Text>
                  <Text style={styles.sectionSubtitle}>Les règles automatiques par genre, BPM, année et durée arrivent dans le lot Audio Intelligence.</Text>
                </View>
              </View>
            </View>
          )}

          {section !== 'grab' && section !== 'playlists' && (
            <View style={styles.librarySection}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>{section === 'play' ? 'Bibliothèque' : SECTIONS.find((item) => item.key === section)?.label}</Text>
                  <Text style={styles.sectionSubtitle}>{visibleTracks.length} élément{visibleTracks.length !== 1 ? 's' : ''}</Text>
                </View>
                <View style={styles.searchBox}>
                  <Ionicons name="search" size={16} color={Colors.textMuted} />
                  <TextInput value={query} onChangeText={setQuery} placeholder="Rechercher" placeholderTextColor="#555B70" style={styles.searchInput} />
                </View>
              </View>
              {visibleTracks.length ? (
                visibleTracks.map((track) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    active={track.id === library.currentId}
                    onSelect={() => library.setCurrentId(track.id)}
                    onFavorite={() => library.toggleFavorite(track.id)}
                  />
                ))
              ) : (
                <EmptyState
                  icon={section === 'favorites' ? 'heart-outline' : section === 'downloads' ? 'download-outline' : 'musical-notes-outline'}
                  title={section === 'favorites' ? 'Aucun favori' : section === 'downloads' ? 'Aucun média hors ligne' : 'Ta bibliothèque est vide'}
                  copy="Voxa garde les fichiers dans l’espace privé de l’appareil et refuse les autres formats."
                  action="Importer un média"
                  onAction={importFiles}
                />
              )}
            </View>
          )}

          <View style={styles.footer}>
            <Image source={require('@/assets/brand/voxa-app-icon.png')} style={styles.footerIcon} />
            <Text style={styles.footerText}>VOXA · SMART AUDIO PLAYER · MVP 0.1</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background, overflow: 'hidden' },
  safeArea: { flex: 1 },
  page: { width: '100%', maxWidth: 920, alignSelf: 'center', paddingHorizontal: 18, paddingBottom: 52, gap: 18 },
  orbPurple: { position: 'absolute', width: 360, height: 360, borderRadius: 180, backgroundColor: 'rgba(167,27,255,0.09)', top: -150, left: -180 },
  orbCyan: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(0,216,232,0.07)', top: 80, right: -210 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  wordmark: { width: 142, height: 70 },
  privateBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#24483F', backgroundColor: '#0B1B18', paddingHorizontal: 10, paddingVertical: 7, borderRadius: Radius.pill },
  privateText: { color: Colors.success, fontSize: 9, letterSpacing: 1.1, fontWeight: '800' },
  kicker: { color: Colors.textMuted, letterSpacing: 3, fontWeight: '700', fontSize: 9, marginTop: -24 },
  nav: { gap: 8, paddingVertical: 3 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 10, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(13,16,24,0.86)' },
  navItemActive: { borderColor: '#255B74', backgroundColor: '#101D28' },
  navText: { color: Colors.textMuted, fontWeight: '700', fontSize: 12 },
  navTextActive: { color: Colors.text },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  primaryButton: { flex: 1, minWidth: 180, borderRadius: Radius.medium, overflow: 'hidden' },
  primaryGradient: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 16 },
  primaryButtonText: { color: Colors.text, fontWeight: '800', fontSize: 13 },
  secondaryButton: { flex: 1, minWidth: 145, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 15, borderRadius: Radius.medium, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  secondaryButtonText: { color: Colors.text, fontWeight: '700', fontSize: 12 },
  disabled: { opacity: 0.45 },
  librarySection: { gap: 10 },
  playlistsSection: { gap: 16, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.large, padding: 18, backgroundColor: 'rgba(13,16,24,0.9)' },
  playlistCreator: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  playlistInput: { flex: 1, minWidth: 210, height: 50, borderRadius: Radius.medium, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#090B10', color: Colors.text, paddingHorizontal: 15, fontSize: 13 },
  createPlaylistButton: { minWidth: 124, borderRadius: Radius.medium, overflow: 'hidden' },
  createPlaylistGradient: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 17 },
  playlistCards: { gap: 10, paddingVertical: 2 },
  playlistCard: { width: 132, borderRadius: Radius.medium, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#0B0E15', padding: 9, gap: 5 },
  playlistCardActive: { borderColor: '#3D6C87', backgroundColor: '#111827' },
  playlistCover: { width: '100%', height: 92, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  playlistTitle: { color: Colors.text, fontSize: 13, fontWeight: '800' },
  playlistCount: { color: Colors.textMuted, fontSize: 10 },
  playlistEditor: { gap: 9, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 16 },
  playlistTrack: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.medium, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#0A0D13' },
  playlistTrackActive: { borderColor: '#245A4E', backgroundColor: '#0C1917' },
  smartPlaylistCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: Radius.medium, backgroundColor: '#140E20', padding: 14, borderWidth: 1, borderColor: '#332143' },
  smartPlaylistTitle: { color: Colors.text, fontWeight: '800', fontSize: 13 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { color: Colors.text, fontSize: 20, fontWeight: '800' },
  sectionSubtitle: { color: Colors.textMuted, fontSize: 12, lineHeight: 18 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 7, width: 160, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, borderRadius: Radius.pill, paddingHorizontal: 12 },
  searchInput: { flex: 1, color: Colors.text, fontSize: 12, height: 38 },
  trackRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: Radius.medium, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(13,16,24,0.88)' },
  trackRowActive: { borderColor: '#334A70', backgroundColor: '#111827' },
  trackIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  trackMeta: { flex: 1, minWidth: 0 },
  trackTitle: { color: Colors.text, fontWeight: '700', fontSize: 14 },
  trackArtist: { color: Colors.textMuted, fontSize: 11, marginTop: 3 },
  sourceBadge: { backgroundColor: '#171C2A', paddingHorizontal: 7, paddingVertical: 5, borderRadius: Radius.pill },
  sourceText: { color: Colors.textMuted, fontWeight: '800', fontSize: 8, letterSpacing: 0.5 },
  emptyState: { alignItems: 'center', gap: 9, paddingHorizontal: 24, paddingVertical: 34, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.border, borderRadius: Radius.large, backgroundColor: 'rgba(13,16,24,0.65)' },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#10202A', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: Colors.text, fontSize: 16, fontWeight: '800' },
  emptyCopy: { color: Colors.textMuted, textAlign: 'center', lineHeight: 19, fontSize: 12, maxWidth: 480 },
  grabCard: { gap: 18, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.large, padding: 20, backgroundColor: 'rgba(13,16,24,0.9)' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  grabIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: '#10202A', alignItems: 'center', justifyContent: 'center' },
  headingCopy: { flex: 1, gap: 3 },
  urlInput: { height: 52, borderRadius: Radius.medium, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#090B10', color: Colors.text, paddingHorizontal: 15, fontSize: 13 },
  rightsRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  rightsText: { flex: 1, color: Colors.textMuted, fontSize: 11, lineHeight: 17 },
  guardrail: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderRadius: Radius.medium, backgroundColor: '#0B1B18', padding: 13 },
  guardrailText: { flex: 1, color: '#93BDB2', fontSize: 10, lineHeight: 16 },
  footer: { alignItems: 'center', gap: 7, marginTop: 12 },
  footerIcon: { width: 32, height: 32, borderRadius: 9 },
  footerText: { color: '#52586B', fontWeight: '800', fontSize: 8, letterSpacing: 1.5 },
});
