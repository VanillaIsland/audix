import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
export default function HomeScreen() {
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
const downloadFromBrowser = useCallback(async (result: ProviderResult) => {
    try {
      showNotice({ tone: 'info', text: 'Préparation du téléchargement...' });
      
      // Détection de la source pour un traitement spécifique si nécessaire
      let source = 'unknown';
      if (result.url.includes('youtube.com') || result.url.includes('youtu.be')) source = 'youtube';
      else if (result.url.includes('facebook.com') || result.url.includes('fb.watch')) source = 'facebook';
      else if (result.url.includes('spotify.com')) source = 'spotify';
import { SafeAreaView } from 'react-native-safe-area-context';
// On importe l'URL avec keepOffline = true pour forcer le téléchargement local
      // La logique complexe (yt-dlp, etc.) peut être branchée dans library.importUrl 
      // ou via un utilitaire dédié avant cet appel.
      const imported = await library.importUrl(result.url, true);
      
      showNotice({ 
        tone: 'success', 
        text: `"${result.title}" est maintenant disponible hors ligne.` 
      });
    } catch (error) {
      showNotice({ 
        tone: 'danger', 
        text: error instanceof Error ? error.message : 'Le téléchargement a échoué.' 
      });
    }
  }, [library]);
import { ConfirmDialog } from '@/components/confirm-dialog';
// ... (garder le reste de tes fonctions : saveFromBrowser, importGrabFile, etc.)

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          {/* ... (garder toute la partie header/topbar) */}

          {section === 'play' ? (
            <View style={styles.sectionStack}>
              {library.current && !library.current.externalUrl ? (
                <Player track={library.current} onImport={importFiles} onToggleFavorite={library.toggleFavorite} />
              ) : null}
              
              {/* MODIFICATION ICI : on passe la nouvelle prop onDownload */}
              <YouTubeBrowser 
                onSave={saveFromBrowser} 
                onDownload={downloadFromBrowser} 
              />
            </View>
          ) : null}
          {     
import { FullPlayer } from '@/components/full-player';
import { GrabPanel } from '@/components/grab-panel';
import { GrabResults } from '@/components/grab-results';
import { MiniPlayer } from '@/components/mini-player';
import { Player } from '@/components/player';
import { PlaylistsPanel } from '@/components/playlists-panel';
import { TabBar, type TabItem } from '@/components/tab-bar';
import { TrackActions } from '@/components/track-actions';
import { YouTubeBrowser } from '@/components/youtube-browser';
import { Colors, Gradients, Radius } from '@/constants/theme';
import { useLibrary } from '@/hooks/use-library';
import { usePlayback } from '@/lib/playback';
import type { MediaOrigin, AudixPlaylist, AudixTrack } from '@/types/media';

type Section = 'play' | 'recent' | 'downloads' | 'favorites' | 'playlists' | 'grab';
type Notice = { tone: 'success' | 'danger' | 'info'; text: string } | null;

const SECTIONS: { key: Section; label: string; caption: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'play', label: 'Lecture', caption: 'Ce que tu écoutes', icon: 'play-circle-outline' },
  { key: 'recent', label: 'Récents', caption: 'Tes dernières écoutes', icon: 'time-outline' },
  { key: 'downloads', label: 'Hors ligne', caption: 'Tes fichiers gardés sur le téléphone', icon: 'cloud-download-outline' },
  { key: 'favorites', label: 'Favoris', caption: 'Les titres que tu as aimés', icon: 'heart-outline' },
  { key: 'playlists', label: 'Playlists', caption: 'Tes sélections', icon: 'albums-outline' },
  { key: 'grab', label: 'Grab', caption: 'Récupérer un titre', icon: 'magnet-outline' },
];

// Grab est une action, pas une destination : il vit dans l'en-tete.
const TABS: readonly TabItem<Exclude<Section, 'grab'>>[] = [
  { key: 'play', label: 'Lecture', icon: 'play-circle-outline', iconActive: 'play-circle' },
  { key: 'recent', label: 'Récents', icon: 'time-outline', iconActive: 'time' },
  { key: 'downloads', label: 'Hors ligne', icon: 'cloud-download-outline', iconActive: 'cloud-download' },
  { key: 'favorites', label: 'Favoris', icon: 'heart-outline', iconActive: 'heart' },
  { key: 'playlists', label: 'Playlists', icon: 'albums-outline', iconActive: 'albums' },
];

const ORIGIN_LABELS: Record<MediaOrigin, string> = {
  local: 'Local', direct: 'Direct', 'youtube-export': 'YouTube', 'facebook-export': 'Facebook', 'spotify-catalog': 'Spotify',
};

const sizeLabel = (bytes?: number) => !bytes ? 'En ligne' : bytes > 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} Mo` : `${Math.round(bytes / 1_000)} Ko`;

function TrackRow({ track, active, onSelect, onFavorite, onMore }: { track: AudixTrack; active: boolean; onSelect: () => void; onFavorite: () => void; onMore: () => void }) {
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
      <Pressable accessibilityLabel={`Actions pour ${track.title}`} onPress={onMore} hitSlop={8} style={styles.rowIconButton}><Ionicons name="ellipsis-horizontal" color={Colors.textMuted} size={19} /></Pressable>
    </View>
  );
}

function EmptyState({ icon, title, copy, action, onAction }: { icon: keyof typeof Ionicons.glyphMap; title: string; copy: string; action?: string; onAction?: () => void }) {
  return <View style={styles.emptyState}><View style={styles.emptyOrbit}><LinearGradient colors={Gradients.brand} style={styles.emptyIcon}><Ionicons name={icon} size={25} color={Colors.text} /></LinearGradient></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyCopy}>{copy}</Text>{action && onAction ? <Pressable style={styles.emptyAction} onPress={onAction}><Ionicons name="add-circle-outline" size={17} color={Colors.cyan} /><Text style={styles.emptyActionText}>{action}</Text></Pressable> : null}</View>;
}

export default function HomeScreen() {
  const router = useRouter();
  const library = useLibrary();
  const playback = usePlayback();
  const [section, setSection] = useState<Section>('play');
  const [query, setQuery] = useState('');
  const [grabUrl, setGrabUrl] = useState('');
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [grabBusy, setGrabBusy] = useState(false);
  const [grabPlaylistId, setGrabPlaylistId] = useState<string | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [deletePlaylist, setDeletePlaylist] = useState<AudixPlaylist | null>(null);
  const [actionTrack, setActionTrack] = useState<AudixTrack | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
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

  // Only tracks the audio engine can actually play become the queue.
  const playableQueue = useMemo(() => visibleTracks.filter((track) => !track.externalUrl), [visibleTracks]);

  // Play counts are incremented when playback really starts, not on selection.
  useEffect(() => {
    playback.onTrackStart((track) => library.markPlayed(track.id));
  }, [library, playback]);

  const selectTrack = useCallback((id: string, jumpToPlayer = false) => {
    const track = library.tracks.find((item) => item.id === id);
    if (!track) return;
    library.setCurrentId(id);
    if (jumpToPlayer) setSection('play');
    if (track.externalUrl) return;
    playback.playTrack(track, playableQueue.length ? playableQueue : [track]);
  }, [library, playableQueue, playback]);

  const showNotice = (next: Notice) => { setNotice(next); if (next) setTimeout(() => setNotice(null), 4200); };
  const navigate = (next: Section) => { setSection(next); if (next === 'playlists' && !selectedPlaylistId && library.playlists[0]) setSelectedPlaylistId(library.playlists[0].id); };

  const importFiles = async () => {
    try {
      const count = await library.importFiles(grabPlaylistId);
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

  const saveFromBrowser = useCallback(async (result: { url: string; title: string }, favorite: boolean) => {
    try {
      const imported = await library.importUrl(result.url, false);
      if (favorite) library.toggleFavorite(imported.id);
      showNotice({ tone: 'success', text: favorite ? 'Ajouté aux favoris.' : 'Ajouté à la bibliothèque.' });
    } catch (error) {
      showNotice({ tone: 'danger', text: error instanceof Error ? error.message : 'Ajout impossible.' });
    }
  }, [library]);

  const importGrabFile = useCallback(async (file: { url: string; name: string }, keepOffline: boolean) => {
    if (!rightsConfirmed) {
      showNotice({ tone: 'danger', text: 'Active « Catalogue autorisé » avant l\u2019ajout.' });
      throw new Error('rights');
    }
    try {
      const imported = await library.importUrl(file.url, keepOffline);
      if (grabPlaylistId) library.addTrackToPlaylist(grabPlaylistId, imported.id);
      showNotice({ tone: 'success', text: keepOffline ? `${file.name} téléchargé et prêt hors ligne.` : `${file.name} ajouté à la bibliothèque.` });
    } catch (error) {
      showNotice({ tone: 'danger', text: error instanceof Error ? error.message : 'Import impossible.' });
      throw error;
    }
  }, [grabPlaylistId, library, rightsConfirmed]);

  const addCatalogResult = async (url: string) => {
    try { await importLink(url); showNotice({ tone: 'success', text: 'Résultat YouTube ajouté au lecteur officiel Audix.' }); }
    catch (error) { showNotice({ tone: 'danger', text: error instanceof Error ? error.message : 'Ajout impossible.' }); }
  };

  const currentSection = SECTIONS.find((item) => item.key === section) ?? SECTIONS[0];

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          <View style={styles.topbar}>
            <Image source={require('@/assets/brand/audix-wordmark.png')} style={styles.wordmark} resizeMode="contain" />
            <View style={styles.topbarCopy}>
              <Text style={styles.topbarTitle}>{currentSection.label}</Text>
              <Text style={styles.topbarMeta}>
                {library.tracks.length} titre{library.tracks.length !== 1 ? 's' : ''} · {library.playlists.length} playlist{library.playlists.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Ouvrir Grab"
              accessibilityState={{ selected: section === 'grab' }}
              onPress={() => navigate('grab')}
              style={[styles.headerAction, section === 'grab' && styles.headerActionOn]}>
              <Ionicons name="magnet-outline" size={20} color={section === 'grab' ? Colors.cyan : Colors.text} />
            </Pressable>
            <Pressable
              accessibilityLabel="Conditions d’utilisation et confidentialité"
              onPress={() => router.push('/legal')}
              style={styles.headerAction}>
              <Ionicons name="document-text-outline" size={19} color={Colors.text} />
            </Pressable>
          </View>




          {section === 'play' ? <View style={styles.sectionStack}>
            {library.current && !library.current.externalUrl
              ? <Player track={library.current} onImport={importFiles} onToggleFavorite={library.toggleFavorite} />
              : null}
            <YouTubeBrowser onSave={saveFromBrowser} />
          </View> : null}

          {section === 'grab' ? <GrabPanel url={grabUrl} onChangeUrl={setGrabUrl} rightsConfirmed={rightsConfirmed} onChangeRights={setRightsConfirmed} busy={grabBusy} playlists={library.playlists} targetPlaylistId={grabPlaylistId} onChangeTargetPlaylist={setGrabPlaylistId} onSubmit={grab} /> : null}
          {section === 'grab' ? (
            <GrabResults
              url={grabUrl}
              targetPlaylistName={library.playlists.find((p) => p.id === grabPlaylistId)?.name ?? null}
              onImport={importGrabFile}
            />
          ) : null}

          {section === 'playlists' ? <PlaylistsPanel playlists={library.playlists} tracks={library.tracks} currentId={library.currentId} selectedId={selectedPlaylistId} onSelect={setSelectedPlaylistId} onCreate={library.createPlaylist} onUpdate={library.updatePlaylist} onToggleTrack={library.toggleTrackInPlaylist} onPlay={(id) => selectTrack(id, true)} onRequestDelete={setDeletePlaylist} onImport={importFiles} onGrab={() => { setGrabPlaylistId(selectedPlaylistId); setSection('grab'); }} /> : null}

          {section !== 'play' && section !== 'grab' && section !== 'playlists' ? <LibraryPanel title={currentSection.label} eyebrow={currentSection.caption} tracks={visibleTracks} currentId={library.currentId} query={query} onQuery={setQuery} onSelect={(id) => selectTrack(id, true)} onFavorite={library.toggleFavorite} onMore={setActionTrack} emptyIcon={section === 'favorites' ? 'heart-outline' : section === 'downloads' ? 'cloud-download-outline' : 'time-outline'} emptyTitle={section === 'favorites' ? 'Aucun favori pour le moment' : section === 'downloads' ? 'Aucun titre gardé hors ligne' : 'Tu n’as encore rien écouté'} onEmptyAction={() => navigate('grab')} /> : null}


          <View style={styles.footer}><Image source={require('@/assets/brand/audix-app-icon.png')} style={styles.footerIcon} /><Text style={styles.footerBrand}>DA Audix, ton lecteur privé</Text><Pressable onPress={() => router.push('/legal')} hitSlop={8}><Text style={styles.footerLink}>Conditions d’utilisation et confidentialité</Text></Pressable></View>
        </ScrollView>
      </SafeAreaView>

      <MiniPlayer onOpen={() => setPlayerOpen(true)} />
      <TabBar
        items={TABS}
        active={(section === 'grab' ? 'play' : section) as Exclude<Section, 'grab'>}
        onChange={navigate}
      />
      {notice ? <Pressable onPress={() => setNotice(null)} style={[styles.notice, notice.tone === 'danger' ? styles.noticeDanger : notice.tone === 'success' ? styles.noticeSuccess : styles.noticeInfo]}><Ionicons name={notice.tone === 'danger' ? 'alert-circle' : notice.tone === 'success' ? 'checkmark-circle' : 'information-circle'} size={20} color={notice.tone === 'danger' ? Colors.danger : notice.tone === 'success' ? Colors.success : Colors.cyan} /><Text style={styles.noticeText}>{notice.text}</Text><Ionicons name="close" size={16} color={Colors.textMuted} /></Pressable> : null}
      <FullPlayer
        visible={playerOpen}
        track={library.current}
        onClose={() => setPlayerOpen(false)}
        onImport={importFiles}
        onToggleFavorite={library.toggleFavorite}
      />
      <TrackActions
        track={actionTrack}
        onClose={() => setActionTrack(null)}
        onSave={(id, changes) => { library.updateTrack(id, changes); showNotice({ tone: 'success', text: 'Informations mises à jour.' }); }}
        onDelete={(id) => {
          library.deleteTrack(id).catch(() => undefined);
          showNotice({ tone: 'success', text: 'Titre supprimé de la bibliothèque.' });
        }}
        onToggleFavorite={(id) => { library.toggleFavorite(id); setActionTrack((t) => (t ? { ...t, favorite: !t.favorite } : t)); }}
      />
      <ConfirmDialog visible={Boolean(deletePlaylist)} title="Supprimer cette playlist ?" message={deletePlaylist ? `« ${deletePlaylist.name} » sera supprimée. Les titres resteront dans ta bibliothèque Audix.` : ''} onCancel={() => setDeletePlaylist(null)} onConfirm={() => { if (deletePlaylist) library.deletePlaylist(deletePlaylist.id); setSelectedPlaylistId(null); setDeletePlaylist(null); showNotice({ tone: 'success', text: 'Playlist supprimée. Tes médias sont intacts.' }); }} />
    </View>
  );
}

function LibraryPanel({ title, eyebrow, tracks, currentId, query, onQuery, onSelect, onFavorite, onMore, emptyIcon, emptyTitle, onEmptyAction }: { title: string; eyebrow: string; tracks: AudixTrack[]; currentId: string | null; query: string; onQuery: (value: string) => void; onSelect: (id: string) => void; onFavorite: (id: string) => void; onMore: (track: AudixTrack) => void; emptyIcon: keyof typeof Ionicons.glyphMap; emptyTitle: string; onEmptyAction: () => void }) {
  return <View style={styles.librarySection}><View style={styles.libraryHeader}><View><Text style={styles.libraryEyebrow}>{eyebrow}</Text><Text style={styles.libraryTitle}>{title}</Text><Text style={styles.librarySubtitle}>{tracks.length} source{tracks.length !== 1 ? 's' : ''}</Text></View><View style={styles.searchBox}><Ionicons name="search" size={16} color={Colors.textMuted} /><TextInput value={query} onChangeText={onQuery} placeholder="Titre, artiste, album" placeholderTextColor="#50586F" style={styles.searchInput} /></View></View>{tracks.length ? tracks.map((track) => <TrackRow key={track.id} track={track} active={track.id === currentId} onSelect={() => onSelect(track.id)} onFavorite={() => onFavorite(track.id)} onMore={() => onMore(track)} />) : <EmptyState icon={emptyIcon} title={emptyTitle} copy="Importe un fichier depuis ton téléphone, ou ajoute un lien YouTube, Spotify ou Facebook avec Grab." action="Ouvrir Grab" onAction={onEmptyAction} />}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden', backgroundColor: Colors.background }, safeArea: { flex: 1 }, page: { width: '100%', maxWidth: 1180, alignSelf: 'center', gap: 20, paddingHorizontal: 18, paddingBottom: 24 },
  gridBackdrop: { position: 'absolute', inset: 0, flexDirection: 'row', justifyContent: 'space-around', opacity: 0.22 }, gridLine: { width: 1, height: '100%', backgroundColor: '#141A28' },
  orbPurple: { position: 'absolute', width: 520, height: 520, borderRadius: 260, top: -280, left: -300, backgroundColor: 'rgba(167,27,255,0.11)' }, orbBlue: { position: 'absolute', width: 400, height: 400, borderRadius: 200, top: 300, left: '38%', backgroundColor: 'rgba(36,107,255,0.045)' }, orbCyan: { position: 'absolute', width: 460, height: 460, borderRadius: 230, top: 70, right: -330, backgroundColor: 'rgba(0,216,232,0.09)' },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 },
  topbarCopy: { flex: 1, minWidth: 0 },
  topbarTitle: { color: Colors.text, fontSize: 20, fontWeight: '800' },
  topbarMeta: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  headerAction: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  headerActionOn: { borderColor: Colors.cyan, backgroundColor: '#0B2630' }, brandBlock: { width: '100%', alignItems: 'center', justifyContent: 'center', gap: 9 }, wordmark: { width: 40, height: 40, borderRadius: 12 },
  versionPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 15, paddingVertical: 9, borderRadius: Radius.pill, borderWidth: 1, borderColor: '#263047', backgroundColor: '#0B0F18' }, versionDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success }, versionText: { color: Colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1.3, textAlign: 'center' },
  topStats: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10 }, topStat: { minWidth: 66, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 15, backgroundColor: '#0B0F18' }, topStatValue: { color: Colors.text, fontSize: 15, fontWeight: '900' }, topStatLabel: { color: Colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  privateBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 9, borderRadius: Radius.pill, borderWidth: 1, borderColor: '#245346', backgroundColor: '#091B17' }, privateText: { color: Colors.success, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  heroBand: { minHeight: 140, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 22, padding: 23, borderRadius: 30, borderWidth: 1, borderColor: '#242C40', backgroundColor: 'rgba(10,13,21,0.86)' }, heroCopy: { flex: 1, minWidth: 280, alignItems: 'center', gap: 5 }, heroEyebrow: { color: Colors.cyan, fontSize: 8, fontWeight: '900', letterSpacing: 2.2, textAlign: 'center' }, heroTitle: { color: Colors.text, fontSize: 34, lineHeight: 39, fontWeight: '900', letterSpacing: -1.1, textAlign: 'center' }, heroAccent: { color: Colors.purple }, heroText: { width: '100%', maxWidth: 620, color: Colors.textMuted, fontSize: 11, lineHeight: 17, textAlign: 'center' }, heroWave: { height: 92, minWidth: 260, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 15 }, heroBar: { width: 6, borderRadius: 6 },
  nav: { gap: 9, paddingVertical: 1 }, navItem: { position: 'relative', minWidth: 145, minHeight: 61, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: '#252D41', backgroundColor: 'rgba(11,15,24,0.91)' }, navItemActive: { borderColor: '#31516B', backgroundColor: '#101925' }, navSignal: { position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, borderRadius: 3 }, navIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#121725' }, navIconActive: { backgroundColor: '#0B2630' }, navText: { color: Colors.textMuted, fontSize: 11, fontWeight: '800' }, navTextActive: { color: Colors.text }, navCaption: { color: '#4F586F', fontSize: 7, fontWeight: '800', letterSpacing: 0.8, marginTop: 2 },
  sectionMarker: { flexDirection: 'row', alignItems: 'center', gap: 10 }, sectionMarkerLine: { flex: 1, height: 1, backgroundColor: '#1B2233' }, sectionMarkerText: { color: '#566078', fontSize: 7, fontWeight: '900', letterSpacing: 1.8 }, sectionStack: { gap: 16 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, quickAction: { flex: 1, minWidth: 240, minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, borderRadius: 16, backgroundColor: Colors.surface }, quickIcon: { width: 43, height: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#0B202A' }, quickIconPurple: { backgroundColor: '#21102F' }, quickCopy: { flex: 1, gap: 2 }, quickTitle: { color: Colors.text, fontSize: 11, fontWeight: '900' }, quickText: { color: Colors.textMuted, fontSize: 8 },
  librarySection: { gap: 10, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface }, libraryHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 3 }, libraryEyebrow: { color: Colors.cyan, fontSize: 10, fontWeight: '700', letterSpacing: 0.2 }, libraryTitle: { color: Colors.text, fontSize: 23, fontWeight: '900', marginTop: 3 }, librarySubtitle: { color: Colors.textMuted, fontSize: 9, marginTop: 2 }, searchBox: { width: 230, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: Radius.pill, borderWidth: 1, borderColor: '#283149', backgroundColor: '#080B12' }, searchInput: { flex: 1, height: 40, color: Colors.text, fontSize: 10 },
  trackRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 8, borderRadius: 14, backgroundColor: Colors.surfaceRaised }, trackRowActive: { backgroundColor: '#12233A' }, trackMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }, trackIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 15 }, trackMeta: { flex: 1, minWidth: 0 }, trackTitle: { color: Colors.text, fontSize: 12, fontWeight: '900' }, trackArtist: { color: Colors.textMuted, fontSize: 9, marginTop: 3 }, sourceBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: Radius.pill, backgroundColor: '#121827' }, sourceText: { color: Colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.2 }, rowIconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  emptyState: { alignItems: 'center', gap: 9, padding: 35, borderRadius: 23, borderWidth: 1, borderStyle: 'dashed', borderColor: '#293149', backgroundColor: 'rgba(8,11,18,0.72)' }, emptyOrbit: { width: 62, height: 62, padding: 2, borderRadius: 22, borderWidth: 1, borderColor: '#303951' }, emptyIcon: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 20 }, emptyTitle: { color: Colors.text, fontSize: 16, fontWeight: '900', textAlign: 'center' }, emptyCopy: { maxWidth: 520, color: Colors.textMuted, fontSize: 10, lineHeight: 16, textAlign: 'center' }, emptyAction: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: '#2D3851', backgroundColor: '#101521' }, emptyActionText: { color: Colors.text, fontSize: 9, fontWeight: '900' },
  footer: { width: '100%', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 18 }, footerIcon: { width: 46, height: 46, borderRadius: 15 }, footerBrand: { color: '#626B82', fontSize: 10, fontWeight: '700', letterSpacing: 0.2, textAlign: 'center' }, footerLink: { color: Colors.textMuted, fontSize: 10, fontWeight: '600', textDecorationLine: 'underline', textAlign: 'center' },
  notice: { position: 'absolute', left: 16, right: 16, bottom: 150, alignSelf: 'center', maxWidth: 640, minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, borderRadius: 18, borderWidth: 1, zIndex: 20 }, noticeSuccess: { borderColor: '#28604F', backgroundColor: '#0B211B' }, noticeDanger: { borderColor: '#5C2737', backgroundColor: '#241019' }, noticeInfo: { borderColor: '#27566A', backgroundColor: '#0B1E27' }, noticeText: { flex: 1, color: Colors.text, fontSize: 10, lineHeight: 15, fontWeight: '700' },
});
