import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CatalogSearch } from '@/components/catalog-search';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { GrabPanel } from '@/components/grab-panel';
import { Player } from '@/components/player';
import { PlaylistsPanel } from '@/components/playlists-panel';
import { Colors, Gradients, Radius } from '@/constants/theme';
import { useLibrary } from '@/hooks/use-library';
import type { MediaOrigin, VoxaPlaylist, VoxaTrack } from '@/types/media';

type Section = 'play' | 'recent' | 'downloads' | 'favorites' | 'playlists' | 'grab';
type Notice = { tone: 'success' | 'danger' | 'info'; text: string } | null;

const SECTIONS: { key: Section; label: string; caption: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'play', label: 'Lecture', caption: 'Player', icon: 'play-circle-outline' },
  { key: 'recent', label: 'Récents', caption: 'History', icon: 'time-outline' },
  { key: 'downloads', label: 'Offline', caption: 'Vault', icon: 'cloud-download-outline' },
  { key: 'favorites', label: 'Favoris', caption: 'Loved', icon: 'heart-outline' },
  { key: 'playlists', label: 'Playlists', caption: 'Matrix', icon: 'albums-outline' },
  { key: 'grab', label: 'Grab', caption: 'Ingest', icon: 'magnet-outline' },
];

const ORIGIN_LABELS: Record<MediaOrigin, string> = {
  local: 'LOCAL', direct: 'DIRECT', 'youtube-export': 'YOUTUBE', 'facebook-export': 'FACEBOOK', 'spotify-catalog': 'SPOTIFY',
};

const sizeLabel = (bytes?: number) => !bytes ? 'STREAM' : bytes > 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.round(bytes / 1_000)} KB`;

function TrackRow({ track, active, onSelect, onFavorite }: { track: VoxaTrack; active: boolean; onSelect: () => void; onFavorite: () => void }) {
  return (
    <View style={[styles.trackRow, active && styles.trackRowActive]}>
      <Pressable onPress={onSelect} style={styles.trackMain}>
        <LinearGradient colors={active ? Gradients.brand : ['#1A2030', '#101521', '#0B0F18']} style={styles.trackIcon}><Ionicons name={track.externalUrl ? 'radio-outline' : track.kind === 'audio' ? 'musical-note' : 'videocam'} size={20} color={Colors.text} /></LinearGradient>
        <View style={styles.trackMeta}><Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text><Text style={styles.trackArtist} numberOfLines={1}>{track.artist} · {sizeLabel(track.size)}</Text></View>
      </Pressable>
      <View style={styles.sourceBadge}><Text style={styles.sourceText}>{ORIGIN_LABELS[track.origin]}</Text></View>
      {track.downloaded ? <Ionicons name="checkmark-circle" color={Colors.success} size={17} /> : null}
      <Pressable accessibilityLabel={track.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} onPress={onFavorite} hitSlop={10} style={styles.rowIconButton}><Ionicons name={track.favorite ? 'heart' : 'heart-outline'} color={track.favorite ? Colors.purple : Colors.textMuted} size={20} /></Pressable>
      <Pressable accessibilityLabel={`Lire ${track.title}`} onPress={onSelect} hitSlop={8} style={styles.rowIconButton}><Ionicons name={active ? 'volume-high' : 'play'} color={Colors.cyan} size={19} /></Pressable>
    </View>
  );
}

function EmptyState({ icon, title, copy, action, onAction }: { icon: keyof typeof Ionicons.glyphMap; title: string; copy: string; action?: string; onAction?: () => void }) {
  return <View style={styles.emptyState}><View style={styles.emptyOrbit}><LinearGradient colors={Gradients.brand} style={styles.emptyIcon}><Ionicons name={icon} size={25} color={Colors.text} /></LinearGradient></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyCopy}>{copy}</Text>{action && onAction ? <Pressable style={styles.emptyAction} onPress={onAction}><Ionicons name="add-circle-outline" size={17} color={Colors.cyan} /><Text style={styles.emptyActionText}>{action}</Text></Pressable> : null}</View>;
}

export default function HomeScreen() {
  const library = useLibrary();
  const [section, setSection] = useState<Section>('play');
  const [query, setQuery] = useState('');
  const [grabUrl, setGrabUrl] = useState('');
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [grabBusy, setGrabBusy] = useState(false);
  const [grabPlaylistId, setGrabPlaylistId] = useState<string | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [deletePlaylist, setDeletePlaylist] = useState<VoxaPlaylist | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const visibleTracks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let items = [...library.tracks];
    if (section === 'recent') items = items.filter((track) => track.lastPlayedAt).sort((a, b) => (b.lastPlayedAt ?? '').localeCompare(a.lastPlayedAt ?? ''));
    if (section === 'downloads') items = items.filter((track) => track.downloaded);
    if (section === 'favorites') items = items.filter((track) => track.favorite);
    if (normalized) items = items.filter((track) => `${track.title} ${track.artist} ${track.album ?? ''}`.toLowerCase().includes(normalized));
    return items;
  }, [library.tracks, query, section]);

  const showNotice = (next: Notice) => { setNotice(next); if (next) setTimeout(() => setNotice(null), 4200); };
  const navigate = (next: Section) => { setSection(next); if (next === 'playlists' && !selectedPlaylistId && library.playlists[0]) setSelectedPlaylistId(library.playlists[0].id); };

  const importFiles = async () => {
    try {
      const count = await library.importFiles();
      if (count) showNotice({ tone: 'success', text: `${count} média${count > 1 ? 's' : ''} ajouté${count > 1 ? 's' : ''} à la bibliothèque.` });
    } catch (error) { showNotice({ tone: 'danger', text: error instanceof Error ? error.message : 'Import impossible.' }); }
  };

  const importLink = async (url: string, keepOffline = false, playlistId: string | null = null) => {
    const imported = await library.importUrl(url, keepOffline);
    if (playlistId) library.addTrackToPlaylist(playlistId, imported.id);
    return imported;
  };

  const grab = async (keepOffline: boolean) => {
    if (!rightsConfirmed) { showNotice({ tone: 'danger', text: 'Active la confirmation « Catalogue autorisé » avant l’ajout.' }); return; }
    setGrabBusy(true);
    try {
      const imported = await importLink(grabUrl.trim(), keepOffline, grabPlaylistId);
      setGrabUrl(''); setSection('play');
      showNotice({ tone: 'success', text: imported.externalUrl ? 'Référence officielle ajoutée. Le lecteur embarqué est prêt.' : keepOffline ? 'Master téléchargé et prêt hors ligne.' : 'Média direct ajouté et prêt à lire.' });
    } catch (error) { showNotice({ tone: 'danger', text: error instanceof Error ? error.message : 'Ce lien ne peut pas être ajouté.' }); }
    finally { setGrabBusy(false); }
  };

  const addCatalogResult = async (url: string) => {
    try { await importLink(url); showNotice({ tone: 'success', text: 'Résultat YouTube ajouté au lecteur officiel Voxa.' }); }
    catch (error) { showNotice({ tone: 'danger', text: error instanceof Error ? error.message : 'Ajout impossible.' }); }
  };

  const currentSection = SECTIONS.find((item) => item.key === section) ?? SECTIONS[0];

  return (
    <View style={styles.screen}>
      <View style={styles.gridBackdrop}>{Array.from({ length: 10 }).map((_, index) => <View key={index} style={styles.gridLine} />)}</View>
      <View style={styles.orbPurple} /><View style={styles.orbBlue} /><View style={styles.orbCyan} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          <View style={styles.topbar}>
            <View style={styles.brandBlock}><Image source={require('@/assets/brand/voxa-wordmark.png')} style={styles.wordmark} resizeMode="contain" /><View style={styles.versionPill}><View style={styles.versionDot} /><Text style={styles.versionText}>CORE 0.2 · ONLINE</Text></View></View>
            <View style={styles.topStats}><View style={styles.topStat}><Text style={styles.topStatValue}>{library.tracks.length}</Text><Text style={styles.topStatLabel}>TITRES</Text></View><View style={styles.topStat}><Text style={styles.topStatValue}>{library.playlists.length}</Text><Text style={styles.topStatLabel}>PLAYLISTS</Text></View><View style={styles.privateBadge}><Ionicons name="lock-closed" size={11} color={Colors.success} /><Text style={styles.privateText}>PRIVATE CATALOG</Text></View></View>
          </View>

          <View style={styles.heroBand}><View style={styles.heroCopy}><Text style={styles.heroEyebrow}>INTELLIGENT · IMMERSIVE · YOURS</Text><Text style={styles.heroTitle}>Your sound. <Text style={styles.heroAccent}>One orbit.</Text></Text><Text style={styles.heroText}>Masters locaux, streams officiels et collections privées réunis dans une seule interface audio.</Text></View><View style={styles.heroWave}>{[14, 26, 44, 66, 35, 78, 48, 28, 56, 36, 18].map((height, index) => <LinearGradient key={index} colors={Gradients.brand} style={[styles.heroBar, { height }]} />)}</View></View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nav}>{SECTIONS.map((item) => { const active = section === item.key; return <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={`Ouvrir ${item.label}`} accessibilityState={{ selected: active }} onPress={() => navigate(item.key)} style={[styles.navItem, active && styles.navItemActive]}>{active ? <LinearGradient colors={Gradients.brand} style={styles.navSignal} /> : null}<View style={[styles.navIcon, active && styles.navIconActive]}><Ionicons name={item.icon} size={18} color={active ? Colors.cyan : Colors.textMuted} /></View><View><Text style={[styles.navText, active && styles.navTextActive]}>{item.label}</Text><Text style={styles.navCaption}>{item.caption}</Text></View></Pressable>; })}</ScrollView>

          <View style={styles.sectionMarker}><View style={styles.sectionMarkerLine} /><Text style={styles.sectionMarkerText}>{currentSection.caption.toUpperCase()} MODULE</Text><View style={styles.sectionMarkerLine} /></View>

          {section === 'play' ? <View style={styles.sectionStack}>
            <Player track={library.current} onImport={importFiles} onPlayed={library.markPlayed} onToggleFavorite={library.toggleFavorite} />
            <CatalogSearch onAddLink={addCatalogResult} />
            <View style={styles.quickActions}><Pressable style={styles.quickAction} onPress={importFiles}><View style={styles.quickIcon}><Ionicons name="folder-open-outline" size={20} color={Colors.cyan} /></View><View style={styles.quickCopy}><Text style={styles.quickTitle}>Importer mes masters</Text><Text style={styles.quickText}>Audio et vidéo depuis ton appareil</Text></View><Ionicons name="arrow-forward" size={17} color={Colors.textMuted} /></Pressable><Pressable style={styles.quickAction} onPress={() => navigate('grab')}><View style={[styles.quickIcon, styles.quickIconPurple]}><Ionicons name="magnet-outline" size={20} color={Colors.purple} /></View><View style={styles.quickCopy}><Text style={styles.quickTitle}>Grab une source</Text><Text style={styles.quickText}>Lien direct ou référence plateforme</Text></View><Ionicons name="arrow-forward" size={17} color={Colors.textMuted} /></Pressable></View>
          </View> : null}

          {section === 'grab' ? <GrabPanel url={grabUrl} onChangeUrl={setGrabUrl} rightsConfirmed={rightsConfirmed} onChangeRights={setRightsConfirmed} busy={grabBusy} playlists={library.playlists} targetPlaylistId={grabPlaylistId} onChangeTargetPlaylist={setGrabPlaylistId} onSubmit={grab} /> : null}

          {section === 'playlists' ? <PlaylistsPanel playlists={library.playlists} tracks={library.tracks} currentId={library.currentId} selectedId={selectedPlaylistId} onSelect={setSelectedPlaylistId} onCreate={library.createPlaylist} onUpdate={library.updatePlaylist} onToggleTrack={library.toggleTrackInPlaylist} onPlay={(id) => { library.setCurrentId(id); setSection('play'); }} onRequestDelete={setDeletePlaylist} onImport={importFiles} onGrab={() => { setGrabPlaylistId(selectedPlaylistId); setSection('grab'); }} /> : null}

          {section !== 'play' && section !== 'grab' && section !== 'playlists' ? <LibraryPanel title={currentSection.label} eyebrow={`${currentSection.caption.toUpperCase()} VAULT`} tracks={visibleTracks} currentId={library.currentId} query={query} onQuery={setQuery} onSelect={(id) => { library.setCurrentId(id); setSection('play'); }} onFavorite={library.toggleFavorite} emptyIcon={section === 'favorites' ? 'heart-outline' : section === 'downloads' ? 'cloud-download-outline' : 'time-outline'} emptyTitle={section === 'favorites' ? 'Aucun favori signalé' : section === 'downloads' ? 'Le coffre offline est vide' : 'Aucune écoute récente'} onEmptyAction={() => navigate('grab')} /> : null}

          {section === 'play' ? <LibraryPanel title="Bibliothèque" eyebrow="LOCAL-FIRST VAULT" tracks={visibleTracks} currentId={library.currentId} query={query} onQuery={setQuery} onSelect={library.setCurrentId} onFavorite={library.toggleFavorite} emptyIcon="pulse-outline" emptyTitle="Ton univers audio attend son premier signal" onEmptyAction={() => navigate('grab')} /> : null}

          <View style={styles.footer}><Image source={require('@/assets/brand/voxa-app-icon.png')} style={styles.footerIcon} /><View><Text style={styles.footerBrand}>VOXA · SMART AUDIO PLAYER</Text><Text style={styles.footerMeta}>LOCAL-FIRST · OFFICIAL STREAMS · PRIVATE BY DESIGN</Text></View><View style={styles.footerPulse}><View style={styles.footerDot} /><Text style={styles.footerStatus}>SYSTEM NOMINAL</Text></View></View>
        </ScrollView>
      </SafeAreaView>

      {notice ? <Pressable onPress={() => setNotice(null)} style={[styles.notice, notice.tone === 'danger' ? styles.noticeDanger : notice.tone === 'success' ? styles.noticeSuccess : styles.noticeInfo]}><Ionicons name={notice.tone === 'danger' ? 'alert-circle' : notice.tone === 'success' ? 'checkmark-circle' : 'information-circle'} size={20} color={notice.tone === 'danger' ? Colors.danger : notice.tone === 'success' ? Colors.success : Colors.cyan} /><Text style={styles.noticeText}>{notice.text}</Text><Ionicons name="close" size={16} color={Colors.textMuted} /></Pressable> : null}
      <ConfirmDialog visible={Boolean(deletePlaylist)} title="Supprimer cette playlist ?" message={deletePlaylist ? `« ${deletePlaylist.name} » sera supprimée. Les titres resteront dans ta bibliothèque Voxa.` : ''} onCancel={() => setDeletePlaylist(null)} onConfirm={() => { if (deletePlaylist) library.deletePlaylist(deletePlaylist.id); setSelectedPlaylistId(null); setDeletePlaylist(null); showNotice({ tone: 'success', text: 'Playlist supprimée. Tes médias sont intacts.' }); }} />
    </View>
  );
}

function LibraryPanel({ title, eyebrow, tracks, currentId, query, onQuery, onSelect, onFavorite, emptyIcon, emptyTitle, onEmptyAction }: { title: string; eyebrow: string; tracks: VoxaTrack[]; currentId: string | null; query: string; onQuery: (value: string) => void; onSelect: (id: string) => void; onFavorite: (id: string) => void; emptyIcon: keyof typeof Ionicons.glyphMap; emptyTitle: string; onEmptyAction: () => void }) {
  return <View style={styles.librarySection}><View style={styles.libraryHeader}><View><Text style={styles.libraryEyebrow}>{eyebrow}</Text><Text style={styles.libraryTitle}>{title}</Text><Text style={styles.librarySubtitle}>{tracks.length} source{tracks.length !== 1 ? 's' : ''}</Text></View><View style={styles.searchBox}><Ionicons name="search" size={16} color={Colors.textMuted} /><TextInput value={query} onChangeText={onQuery} placeholder="Titre, artiste, album" placeholderTextColor="#50586F" style={styles.searchInput} /></View></View>{tracks.length ? tracks.map((track) => <TrackRow key={track.id} track={track} active={track.id === currentId} onSelect={() => onSelect(track.id)} onFavorite={() => onFavorite(track.id)} />) : <EmptyState icon={emptyIcon} title={emptyTitle} copy="Importe un master ou ajoute une référence YouTube, Spotify ou Facebook avec Grab." action="Lancer Grab" onAction={onEmptyAction} />}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden', backgroundColor: Colors.background }, safeArea: { flex: 1 }, page: { width: '100%', maxWidth: 1180, alignSelf: 'center', gap: 20, paddingHorizontal: 22, paddingBottom: 60 },
  gridBackdrop: { position: 'absolute', inset: 0, flexDirection: 'row', justifyContent: 'space-around', opacity: 0.22 }, gridLine: { width: 1, height: '100%', backgroundColor: '#141A28' },
  orbPurple: { position: 'absolute', width: 520, height: 520, borderRadius: 260, top: -280, left: -300, backgroundColor: 'rgba(167,27,255,0.11)' }, orbBlue: { position: 'absolute', width: 400, height: 400, borderRadius: 200, top: 300, left: '38%', backgroundColor: 'rgba(36,107,255,0.045)' }, orbCyan: { position: 'absolute', width: 460, height: 460, borderRadius: 230, top: 70, right: -330, backgroundColor: 'rgba(0,216,232,0.09)' },
  topbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14, paddingTop: 6 }, brandBlock: { flexDirection: 'row', alignItems: 'center', gap: 13 }, wordmark: { width: 154, height: 78 },
  versionPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1, borderColor: '#263047', backgroundColor: '#0B0F18' }, versionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success }, versionText: { color: Colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  topStats: { flexDirection: 'row', alignItems: 'center', gap: 10 }, topStat: { minWidth: 58, alignItems: 'center', paddingHorizontal: 9, paddingVertical: 7, borderRadius: 13, backgroundColor: '#0B0F18' }, topStatValue: { color: Colors.text, fontSize: 14, fontWeight: '900' }, topStatLabel: { color: Colors.textMuted, fontSize: 6, fontWeight: '900', letterSpacing: 1 },
  privateBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 9, borderRadius: Radius.pill, borderWidth: 1, borderColor: '#245346', backgroundColor: '#091B17' }, privateText: { color: Colors.success, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  heroBand: { minHeight: 140, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 22, padding: 23, borderRadius: 30, borderWidth: 1, borderColor: '#242C40', backgroundColor: 'rgba(10,13,21,0.86)' }, heroCopy: { flex: 1, minWidth: 280, gap: 5 }, heroEyebrow: { color: Colors.cyan, fontSize: 8, fontWeight: '900', letterSpacing: 2.2 }, heroTitle: { color: Colors.text, fontSize: 34, lineHeight: 39, fontWeight: '900', letterSpacing: -1.1 }, heroAccent: { color: Colors.purple }, heroText: { maxWidth: 620, color: Colors.textMuted, fontSize: 11, lineHeight: 17 }, heroWave: { height: 92, minWidth: 260, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 15 }, heroBar: { width: 6, borderRadius: 6 },
  nav: { gap: 9, paddingVertical: 1 }, navItem: { position: 'relative', minWidth: 145, minHeight: 61, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: '#252D41', backgroundColor: 'rgba(11,15,24,0.91)' }, navItemActive: { borderColor: '#31516B', backgroundColor: '#101925' }, navSignal: { position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, borderRadius: 3 }, navIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#121725' }, navIconActive: { backgroundColor: '#0B2630' }, navText: { color: Colors.textMuted, fontSize: 11, fontWeight: '800' }, navTextActive: { color: Colors.text }, navCaption: { color: '#4F586F', fontSize: 7, fontWeight: '800', letterSpacing: 0.8, marginTop: 2 },
  sectionMarker: { flexDirection: 'row', alignItems: 'center', gap: 10 }, sectionMarkerLine: { flex: 1, height: 1, backgroundColor: '#1B2233' }, sectionMarkerText: { color: '#566078', fontSize: 7, fontWeight: '900', letterSpacing: 1.8 }, sectionStack: { gap: 16 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, quickAction: { flex: 1, minWidth: 260, minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, borderRadius: 20, borderWidth: 1, borderColor: '#252D41', backgroundColor: '#0C1019' }, quickIcon: { width: 43, height: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#0B202A' }, quickIconPurple: { backgroundColor: '#21102F' }, quickCopy: { flex: 1, gap: 2 }, quickTitle: { color: Colors.text, fontSize: 11, fontWeight: '900' }, quickText: { color: Colors.textMuted, fontSize: 8 },
  librarySection: { gap: 10, padding: 20, borderRadius: 28, borderWidth: 1, borderColor: '#242C40', backgroundColor: 'rgba(10,13,21,0.9)' }, libraryHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 3 }, libraryEyebrow: { color: Colors.cyan, fontSize: 8, fontWeight: '900', letterSpacing: 1.7 }, libraryTitle: { color: Colors.text, fontSize: 23, fontWeight: '900', marginTop: 3 }, librarySubtitle: { color: Colors.textMuted, fontSize: 9, marginTop: 2 }, searchBox: { width: 230, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: Radius.pill, borderWidth: 1, borderColor: '#283149', backgroundColor: '#080B12' }, searchInput: { flex: 1, height: 40, color: Colors.text, fontSize: 10 },
  trackRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 9, borderRadius: 19, borderWidth: 1, borderColor: '#242C40', backgroundColor: '#0B0F18' }, trackRowActive: { borderColor: '#31516B', backgroundColor: '#0F1824' }, trackMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }, trackIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 15 }, trackMeta: { flex: 1, minWidth: 0 }, trackTitle: { color: Colors.text, fontSize: 12, fontWeight: '900' }, trackArtist: { color: Colors.textMuted, fontSize: 9, marginTop: 3 }, sourceBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: Radius.pill, backgroundColor: '#121827' }, sourceText: { color: Colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 0.6 }, rowIconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  emptyState: { alignItems: 'center', gap: 9, padding: 35, borderRadius: 23, borderWidth: 1, borderStyle: 'dashed', borderColor: '#293149', backgroundColor: 'rgba(8,11,18,0.72)' }, emptyOrbit: { width: 62, height: 62, padding: 2, borderRadius: 22, borderWidth: 1, borderColor: '#303951' }, emptyIcon: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 20 }, emptyTitle: { color: Colors.text, fontSize: 16, fontWeight: '900', textAlign: 'center' }, emptyCopy: { maxWidth: 520, color: Colors.textMuted, fontSize: 10, lineHeight: 16, textAlign: 'center' }, emptyAction: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: '#2D3851', backgroundColor: '#101521' }, emptyActionText: { color: Colors.text, fontSize: 9, fontWeight: '900' },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 12 }, footerIcon: { width: 34, height: 34, borderRadius: 10 }, footerBrand: { color: '#626B82', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 }, footerMeta: { color: '#3E4659', fontSize: 6, fontWeight: '800', letterSpacing: 0.8, marginTop: 2 }, footerPulse: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: Radius.pill, backgroundColor: '#091B17' }, footerDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.success }, footerStatus: { color: Colors.success, fontSize: 6, fontWeight: '900', letterSpacing: 0.8 },
  notice: { position: 'absolute', left: 20, right: 20, bottom: 22, alignSelf: 'center', maxWidth: 640, minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, borderRadius: 18, borderWidth: 1, zIndex: 20 }, noticeSuccess: { borderColor: '#28604F', backgroundColor: '#0B211B' }, noticeDanger: { borderColor: '#5C2737', backgroundColor: '#241019' }, noticeInfo: { borderColor: '#27566A', backgroundColor: '#0B1E27' }, noticeText: { flex: 1, color: Colors.text, fontSize: 10, lineHeight: 15, fontWeight: '700' },
});
