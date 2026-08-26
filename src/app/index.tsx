import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConfirmDialog } from '@/components/confirm-dialog';
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
import { downloadYouTubeAudio } from '@/lib/downloader';
import { analyseBpm } from '@/lib/bpm';
import { usePlayback } from '@/lib/playback';
import { pullLibrary, pushLibrary } from '@/lib/sync';
import type { ProviderResult } from '@/lib/providers';
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
        <LinearGradient colors={active ? Gradients.brand : ['#1A2030', '#101521', '#0B0F18']} style={styles.trackIcon}>
          <Ionicons name={track.externalUrl ? 'radio-outline' : track.kind === 'audio' ? 'musical-note' : 'videocam'} size={20} color={Colors.text} />
        </LinearGradient>
        <View style={styles.trackMeta}>
          <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
          <Text style={styles.trackArtist} numberOfLines={1}>{track.artist} · {sizeLabel(track.size)}</Text>
        </View>
      </Pressable>
      <View style={styles.sourceBadge}><Text style={styles.sourceText}>{ORIGIN_LABELS[track.origin]}</Text></View>
      {track.downloaded ? <Ionicons name="checkmark-circle" color={Colors.success} size={17} /> : null}
      <Pressable accessibilityLabel={track.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} onPress={onFavorite} hitSlop={10} style={styles.rowIconButton}>
        <Ionicons name={track.favorite ? 'heart' : 'heart-outline'} color={track.favorite ? Colors.purple : Colors.textMuted} size={20} />
      </Pressable>
      <Pressable accessibilityLabel={`Lire ${track.title}`} onPress={onSelect} hitSlop={8} style={styles.rowIconButton}>
        <Ionicons name={active ? 'volume-high' : 'play'} color={Colors.cyan} size={19} />
      </Pressable>
      <Pressable accessibilityLabel={`Actions pour ${track.title}`} onPress={onMore} hitSlop={8} style={styles.rowIconButton}>
        <Ionicons name="ellipsis-horizontal" color={Colors.textMuted} size={19} />
      </Pressable>
    </View>
  );
}

function EmptyState({ icon, title, copy, action, onAction }: { icon: keyof typeof Ionicons.glyphMap; title: string; copy: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyOrbit}>
        <LinearGradient colors={Gradients.brand} style={styles.emptyIcon}>
          <Ionicons name={icon} size={25} color={Colors.text} />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyCopy}>{copy}</Text>
      {action && onAction ? (
        <Pressable style={styles.emptyAction} onPress={onAction}>
          <Ionicons name="add-circle-outline" size={17} color={Colors.cyan} />
          <Text style={styles.emptyActionText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const library = useLibrary();
  const playback = usePlayback();
  const [section, setSection] = useState<Section>('play');
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [grabUrl, setGrabUrl] = useState('');
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [grabBusy, setGrabBusy] = useState(false);
  const [grabPlaylistId, setGrabPlaylistId] = useState<string | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [deletePlaylist, setDeletePlaylist] = useState<AudixPlaylist | null>(null);
  const [actionTrack, setActionTrack] = useState<AudixTrack | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [pickerFor, setPickerFor] = useState<ProviderResult | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [newPlOpen, setNewPlOpen] = useState(false);
  const [newPlName, setNewPlName] = useState('');

  // La session audio (écran verrouillé, arrière-plan) est configurée une seule
  // fois, dans PlaybackProvider. Un second appel avec des clés d'un ancien SDK
  // écrasait ce réglage et laissait le lecteur bloqué sur « Chargement ».

  const visibleTracks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let items = [...library.tracks];
    if (section === 'recent') items = items.filter((track) => track.lastPlayedAt).sort((a, b) => (b.lastPlayedAt ?? '').localeCompare(a.lastPlayedAt ?? ''));
    if (section === 'downloads') items = items.filter((track) => track.downloaded);
    if (section === 'favorites') items = items.filter((track) => track.favorite);
    if (normalized) items = items.filter((track) => `${track.title} ${track.artist} ${track.album ?? ''}`.toLowerCase().includes(normalized));
    return items;
  }, [library.tracks, query, section]);

  const playableQueue = useMemo(() => visibleTracks.filter((track) => !track.externalUrl), [visibleTracks]);

  useEffect(() => {
    playback.onTrackStart((track) => library.markPlayed(track.id));
  }, [library, playback]);

  /**
   * `context` est la liste d'où part la lecture : la playlist ouverte, les
   * favoris, le hors ligne… C'est elle qui devient la file, pour que suivant
   * et précédent enchaînent dans la liste qu'on regardait.
   */
  const selectTrack = useCallback((id: string, jumpToPlayer = false, context?: AudixTrack[]) => {
    const track = library.tracks.find((item) => item.id === id);
    if (!track) return;
    library.setCurrentId(id);
    if (jumpToPlayer) setSection('play');
    if (track.externalUrl) return;
    const pool = (context ?? playableQueue).filter((item) => !item.externalUrl);
    playback.playTrack(track, pool.length ? pool : [track]);
  }, [library, playableQueue, playback]);

  const showNotice = (next: Notice) => { setNotice(next); if (next) setTimeout(() => setNotice(null), 4200); };

  /**
   * Synchronisation manuelle : on envoie ce qu'on a, puis on récupère ce que
   * les autres appareils ont envoyé. Seules les métadonnées circulent, jamais
   * les fichiers.
   */
  const syncNow = useCallback(async () => {
    if (syncBusy) return;
    setSyncBusy(true);
    showNotice({ tone: 'info', text: 'Synchronisation en cours…' });
    try {
      const sent = await pushLibrary(library.tracks, library.playlists);
      const remote = await pullLibrary();
      const received = library.mergeFromRemote(remote.tracks, remote.playlists);
      showNotice({
        tone: 'success',
        text: `${sent.tracks} titre${sent.tracks > 1 ? 's' : ''} envoyé${sent.tracks > 1 ? 's' : ''}, ${received.tracks} reçu${received.tracks > 1 ? 's' : ''}.`,
      });
    } catch (error) {
      showNotice({ tone: 'danger', text: error instanceof Error ? error.message : 'Synchronisation impossible.' });
    } finally {
      setSyncBusy(false);
    }
  }, [library, syncBusy]);
  // Les playlists restent repliées tant qu'on n'en ouvre pas une.
  const navigate = (next: Section) => { setSection(next); };

  const importFiles = async () => {
    try {
      const count = await library.importFiles(grabPlaylistId);
      if (count) {
        // Les imports depuis le téléphone se retrouvent aussi dans « Local ».
        const imported = library.tracks.slice(0, count);
        library.addToSystemPlaylist('local', imported.map((track) => track.id));
        // Le tempo se calcule en arrière-plan, sans bloquer l'import.
        imported.forEach((track) => {
          analyseBpm(track.uri)
            .then((bpm) => { if (bpm) library.updateTrack(track.id, { bpm }); })
            .catch(() => undefined);
        });
        showNotice({ tone: 'success', text: `${count} média${count > 1 ? 's' : ''} ajouté${count > 1 ? 's' : ''} à la bibliothèque.` });
      }
    } catch (error) { showNotice({ tone: 'danger', text: error instanceof Error ? error.message : 'Import impossible.' }); }
  };

  const importLink = async (url: string, keepOffline = false, playlistId: string | null = null) => {
    const imported = await library.importUrl(url, keepOffline);
    if (playlistId) library.addTrackToPlaylist(playlistId, imported.id);
    // Tout ce qui entre par Grab est rangé dans la playlist « Grab ».
    library.addToSystemPlaylist('grab', [imported.id]);
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

  const saveFromBrowser = useCallback(async (result: ProviderResult, favorite: boolean) => {
    try {
      const imported = await library.importUrl(result.url, false, {
        title: result.title,
        artist: result.artist,
        thumbnail: result.thumbnail,
      });
      if (favorite) library.toggleFavorite(imported.id);
      showNotice({ tone: 'success', text: favorite ? 'Ajouté aux favoris.' : 'Ajouté à la bibliothèque.' });
    } catch (error) {
      showNotice({ tone: 'danger', text: error instanceof Error ? error.message : 'Ajout impossible.' });
    }
  }, [library]);

  const streamFromBrowser = useCallback(async (result: ProviderResult) => {
    try {
      showNotice({ tone: 'info', text: 'Préparation du flux audio sans pub…' });
      const direct = await downloadYouTubeAudio(result.id);
      const imported = await library.importUrl(direct.url, false);
      library.updateTrack(imported.id, { title: result.title, artist: result.artist });
      library.setCurrentId(imported.id);
      playback.playTrack(imported, [imported]);
    } catch (error) {
      showNotice({ tone: 'danger', text: error instanceof Error ? error.message : 'Lecture impossible.' });
    }
  }, [library, playback]);

  const downloadFromBrowser = useCallback(async (result: ProviderResult) => {
    try {
      showNotice({ tone: 'info', text: 'Conversion MP3 en cours… (1-2 min)' });
      const direct = await downloadYouTubeAudio(result.id);
      const imported = await library.importUrl(direct.url, true);
      library.updateTrack(imported.id, { title: result.title, artist: result.artist });
      let dl = library.playlists.find((p) => p.name.toLowerCase() === 'downloaded');
      if (!dl) {
        const created: any = await library.createPlaylist('Downloaded');
        dl = created?.id ? created : library.playlists.find((p) => p.name.toLowerCase() === 'downloaded');
      }
      if (dl) library.addTrackToPlaylist(dl.id, imported.id);
      showNotice({ tone: 'success', text: `« ${result.title} » téléchargé — dispo dans Hors ligne${dl ? ' + playlist Downloaded' : ''}.` });
    } catch (error) {
      showNotice({ tone: 'danger', text: error instanceof Error ? error.message : 'Téléchargement impossible.' });
    }
  }, [library]);

  const addToPlaylistFromBrowser = useCallback((result: ProviderResult) => {
    setNewPlOpen(false);
    setNewPlName('');
    setPickerFor(result);
  }, []);

  const addToPlaylist = async (result: ProviderResult, playlistId: string) => {
    try {
      const imported = await library.importUrl(result.url, false);
      library.addTrackToPlaylist(playlistId, imported.id);
      const name = library.playlists.find((p) => p.id === playlistId)?.name ?? 'playlist';
      showNotice({ tone: 'success', text: `« ${result.title} » ajouté à « ${name} ».` });
      setPickerFor(null);
    } catch (error) {
      showNotice({ tone: 'danger', text: error instanceof Error ? error.message : 'Ajout impossible.' });
    }
  };

  const createAndAdd = async () => {
    const name = newPlName.trim();
    if (!name || !pickerFor) return;
    try {
      await library.createPlaylist(name);
      const created = library.playlists.find((p) => p.name === name);
      if (created) {
        await addToPlaylist(pickerFor, created.id);
      } else {
        showNotice({ tone: 'info', text: 'Playlist créée. Rouvre le choix pour y ajouter le titre.' });
      }
      setNewPlOpen(false);
      setNewPlName('');
    } catch (error) {
      showNotice({ tone: 'danger', text: error instanceof Error ? error.message : 'Création impossible.' });
    }
  };

  const importGrabFile = useCallback(async (file: { url: string; name: string }, keepOffline: boolean) => {
    if (!rightsConfirmed) {
      showNotice({ tone: 'danger', text: 'Active « Catalogue autorisé » avant l’ajout.' });
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

  /** Analyse manuelle du tempo, depuis la feuille d'un titre. */
  const analyseTrackBpm = useCallback(async (track: AudixTrack) => {
    showNotice({ tone: 'info', text: 'Analyse du tempo en cours…' });
    try {
      const bpm = await analyseBpm(track.uri);
      if (!bpm) {
        showNotice({ tone: 'danger', text: 'Tempo introuvable sur ce fichier. Saisis-le à la main.' });
        return;
      }
      library.updateTrack(track.id, { bpm });
      setActionTrack((open) => (open && open.id === track.id ? { ...open, bpm } : open));
      showNotice({ tone: 'success', text: `Tempo détecté : ${bpm} BPM.` });
    } catch {
      showNotice({ tone: 'danger', text: 'Analyse impossible sur ce fichier.' });
    }
  }, [library]);

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
            <Pressable accessibilityLabel="Ouvrir Grab" accessibilityState={{ selected: section === 'grab' }} onPress={() => navigate('grab')} style={[styles.headerAction, section === 'grab' && styles.headerActionOn]}>
              <Ionicons name="magnet-outline" size={20} color={section === 'grab' ? Colors.cyan : Colors.text} />
            </Pressable>
            <Pressable accessibilityLabel="Synchroniser avec mes autres appareils" disabled={syncBusy} onPress={syncNow} style={[styles.headerAction, syncBusy && styles.headerActionBusy]}>
              <Ionicons name={syncBusy ? 'sync' : 'cloud-upload-outline'} size={19} color={syncBusy ? Colors.textMuted : Colors.text} />
            </Pressable>
            <Pressable accessibilityLabel="Conditions d’utilisation et confidentialité" onPress={() => router.push('/legal')} style={styles.headerAction}>
              <Ionicons name="document-text-outline" size={19} color={Colors.text} />
            </Pressable>
          </View>

          <View style={[styles.sectionStack, section !== 'play' && { display: 'none' }]}>
            {library.current && !library.current.externalUrl ? (
              <Player track={library.current} onImport={importFiles} onToggleFavorite={library.toggleFavorite} />
            ) : null}
            <YouTubeBrowser
              onSave={saveFromBrowser}
              onStream={streamFromBrowser}
              onDownload={downloadFromBrowser}
              onAddToPlaylist={addToPlaylistFromBrowser}
              savedQuery={searchQuery}
              onQueryChange={setSearchQuery}
            />
          </View>

          {section === 'grab' ? <GrabPanel url={grabUrl} onChangeUrl={setGrabUrl} rightsConfirmed={rightsConfirmed} onChangeRights={setRightsConfirmed} busy={grabBusy} playlists={library.playlists} targetPlaylistId={grabPlaylistId} onChangeTargetPlaylist={setGrabPlaylistId} onSubmit={grab} /> : null}
          {section === 'grab' ? (
            <GrabResults url={grabUrl} targetPlaylistName={library.playlists.find((p) => p.id === grabPlaylistId)?.name ?? null} onImport={importGrabFile} />
          ) : null}
          {section === 'playlists' ? (
            <PlaylistsPanel
              playlists={library.playlists}
              tracks={library.tracks}
              currentId={library.currentId}
              openId={selectedPlaylistId}
              onToggleOpen={setSelectedPlaylistId}
              onCreate={(name) => { try { library.createPlaylist(name); } catch (error) { showNotice({ tone: 'danger', text: error instanceof Error ? error.message : 'Création impossible.' }); } }}
              onCreateSmart={(name, rule) => { try { library.createSmartPlaylist(name, rule); } catch (error) { showNotice({ tone: 'danger', text: error instanceof Error ? error.message : 'Création impossible.' }); } }}
              onUpdate={library.updatePlaylist}
              onUpdateRule={library.updatePlaylistRule}
              onAddTrack={library.addTrackToPlaylist}
              onRemoveTracks={(playlistId, ids) => { library.removeTracksFromPlaylist(playlistId, ids); showNotice({ tone: 'success', text: `${ids.length} titre${ids.length > 1 ? 's' : ''} retiré${ids.length > 1 ? 's' : ''} de la playlist.` }); }}
              onPlay={(id, context) => selectTrack(id, true, context)}
              onRequestDelete={setDeletePlaylist}
              onImport={importFiles}
              onGrab={() => { setGrabPlaylistId(selectedPlaylistId); setSection('grab'); }}
            />
          ) : null}
          {section !== 'play' && section !== 'grab' && section !== 'playlists' ? (
            <LibraryPanel tracks={visibleTracks} currentId={library.currentId} query={query} onQuery={setQuery} onSelect={(id) => selectTrack(id, true)} onFavorite={library.toggleFavorite} onMore={setActionTrack} emptyIcon={section === 'favorites' ? 'heart-outline' : section === 'downloads' ? 'cloud-download-outline' : 'time-outline'} emptyTitle={section === 'favorites' ? 'Aucun favori pour le moment' : section === 'downloads' ? 'Aucun titre gardé hors ligne' : 'Tu n’as encore rien écouté'} onEmptyAction={() => navigate('grab')} />
          ) : null}

          <View style={styles.footer}>
            <Image source={require('@/assets/brand/audix-app-icon.png')} style={styles.footerIcon} />
            <Text style={styles.footerBrand}>DA Audix, ton lecteur privé</Text>
            <Pressable onPress={() => router.push('/legal')} hitSlop={8}>
              <Text style={styles.footerLink}>Conditions d’utilisation et confidentialité</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      <MiniPlayer onOpen={() => setPlayerOpen(true)} />
      <TabBar items={TABS} active={(section === 'grab' ? 'play' : section) as Exclude<Section, 'grab'>} onChange={navigate} />

      {notice ? (
        <Pressable onPress={() => setNotice(null)} style={[styles.notice, notice.tone === 'danger' ? styles.noticeDanger : notice.tone === 'success' ? styles.noticeSuccess : styles.noticeInfo]}>
          <Ionicons name={notice.tone === 'danger' ? 'alert-circle' : notice.tone === 'success' ? 'checkmark-circle' : 'information-circle'} size={20} color={notice.tone === 'danger' ? Colors.danger : notice.tone === 'success' ? Colors.success : Colors.cyan} />
          <Text style={styles.noticeText}>{notice.text}</Text>
          <Ionicons name="close" size={16} color={Colors.textMuted} />
        </Pressable>
      ) : null}

      <FullPlayer visible={playerOpen} track={library.current} onClose={() => setPlayerOpen(false)} onImport={importFiles} onToggleFavorite={library.toggleFavorite} />

      <TrackActions
        track={actionTrack}
        onClose={() => setActionTrack(null)}
        onSave={(id, changes) => { library.updateTrack(id, changes); showNotice({ tone: 'success', text: 'Informations mises à jour.' }); }}
        onDelete={(id) => { library.deleteTrack(id).catch(() => undefined); showNotice({ tone: 'success', text: 'Titre supprimé de la bibliothèque.' }); }}
        onToggleFavorite={(id) => { library.toggleFavorite(id); setActionTrack((t) => (t ? { ...t, favorite: !t.favorite } : t)); }}
        onAnalyseBpm={analyseTrackBpm}
      />

      <ConfirmDialog
        visible={Boolean(deletePlaylist)}
        title="Supprimer cette playlist ?"
        message={deletePlaylist ? `« ${deletePlaylist.name} » sera supprimée. Les titres resteront dans ta bibliothèque Audix.` : ''}
        onCancel={() => setDeletePlaylist(null)}
        onConfirm={() => { if (deletePlaylist) library.deletePlaylist(deletePlaylist.id); setSelectedPlaylistId(null); setDeletePlaylist(null); showNotice({ tone: 'success', text: 'Playlist supprimée. Tes médias sont intacts.' }); }}
      />

      <Modal visible={Boolean(pickerFor)} transparent animationType="fade" onRequestClose={() => setPickerFor(null)}>
        <View style={styles.pickerBackdrop}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Ajouter à une playlist</Text>
            <Text style={styles.pickerSub} numberOfLines={1}>{pickerFor?.title}</Text>
            {library.playlists.map((pl) => (
              <Pressable key={pl.id} style={styles.pickerRow} onPress={() => pickerFor && addToPlaylist(pickerFor, pl.id)}>
                <Ionicons name="albums-outline" size={18} color={Colors.cyan} />
                <Text style={styles.pickerRowText} numberOfLines={1}>{pl.name}</Text>
              </Pressable>
            ))}
            {newPlOpen ? (
              <View style={styles.pickerNewRow}>
                <TextInput value={newPlName} onChangeText={setNewPlName} placeholder="Nom de la playlist" placeholderTextColor="#50586F" style={styles.pickerInput} />
                <Pressable style={styles.pickerGo} onPress={() => createAndAdd()}>
                  <Ionicons name="checkmark" size={16} color={Colors.text} />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.pickerRow} onPress={() => setNewPlOpen(true)}>
                <Ionicons name="add-circle-outline" size={18} color={Colors.purple} />
                <Text style={styles.pickerRowText}>Nouvelle playlist…</Text>
              </Pressable>
            )}
            <Pressable style={styles.pickerClose} onPress={() => setPickerFor(null)}>
              <Text style={styles.pickerCloseText}>Fermer</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** Même mise en page que l'onglet Lecture : barre de recherche, puis lignes. */
function LibraryPanel({ tracks, currentId, query, onQuery, onSelect, onFavorite, onMore, emptyIcon, emptyTitle, onEmptyAction }: { tracks: AudixTrack[]; currentId: string | null; query: string; onQuery: (value: string) => void; onSelect: (id: string) => void; onFavorite: (id: string) => void; onMore: (track: AudixTrack) => void; emptyIcon: keyof typeof Ionicons.glyphMap; emptyTitle: string; onEmptyAction: () => void }) {
  return (
    <View style={styles.flatSection}>
      <View style={styles.flatSearch}>
        <Ionicons name="search" size={17} color={Colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={onQuery}
          placeholder="Rechercher un titre, un artiste…"
          placeholderTextColor="#50586F"
          style={styles.flatSearchInput}
          autoCorrect={false}
        />
        {query ? (
          <Pressable onPress={() => onQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={17} color={Colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {tracks.length ? (
        tracks.map((track) => (
          <TrackRow key={track.id} track={track} active={track.id === currentId} onSelect={() => onSelect(track.id)} onFavorite={() => onFavorite(track.id)} onMore={() => onMore(track)} />
        ))
      ) : (
        <EmptyState icon={emptyIcon} title={emptyTitle} copy="Importe un fichier depuis ton téléphone, ou ajoute un lien YouTube, Spotify ou Facebook avec Grab." action="Ouvrir Grab" onAction={onEmptyAction} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden', backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  page: { width: '100%', maxWidth: 1180, alignSelf: 'center', gap: 20, paddingHorizontal: 18, paddingBottom: 24 },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 },
  topbarCopy: { flex: 1, minWidth: 0 },
  topbarTitle: { color: Colors.text, fontSize: 20, fontWeight: '800' },
  topbarMeta: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  headerAction: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  headerActionBusy: { opacity: 0.5 },
  headerActionOn: { borderColor: Colors.cyan, backgroundColor: '#0B2630' },
  wordmark: { width: 40, height: 40, borderRadius: 12 },
  sectionStack: { gap: 16 },
  flatSection: { gap: 10 },
  flatSearch: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, paddingLeft: 13, paddingRight: 13, borderRadius: 14, backgroundColor: Colors.surfaceRaised },
  flatSearchInput: { flex: 1, minWidth: 60, color: Colors.text, fontSize: 13, height: 46 },
  librarySection: { gap: 10, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  libraryHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 3 },
  libraryEyebrow: { color: Colors.cyan, fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
  libraryTitle: { color: Colors.text, fontSize: 23, fontWeight: '900', marginTop: 3 },
  librarySubtitle: { color: Colors.textMuted, fontSize: 9, marginTop: 2 },
  searchBox: { width: 230, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: Radius.pill, borderWidth: 1, borderColor: '#283149', backgroundColor: '#080B12' },
  searchInput: { flex: 1, height: 40, color: Colors.text, fontSize: 10 },
  trackRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 8, borderRadius: 14, backgroundColor: Colors.surfaceRaised },
  trackRowActive: { backgroundColor: '#12233A' },
  trackMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  trackIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 15 },
  trackMeta: { flex: 1, minWidth: 0 },
  trackTitle: { color: Colors.text, fontSize: 12, fontWeight: '900' },
  trackArtist: { color: Colors.textMuted, fontSize: 9, marginTop: 3 },
  sourceBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: Radius.pill, backgroundColor: '#121827' },
  sourceText: { color: Colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.2 },
  rowIconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  emptyState: { alignItems: 'center', gap: 9, padding: 35, borderRadius: 23, borderWidth: 1, borderStyle: 'dashed', borderColor: '#293149', backgroundColor: 'rgba(8,11,18,0.72)' },
  emptyOrbit: { width: 62, height: 62, padding: 2, borderRadius: 22, borderWidth: 1, borderColor: '#303951' },
  emptyIcon: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  emptyTitle: { color: Colors.text, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  emptyCopy: { maxWidth: 520, color: Colors.textMuted, fontSize: 10, lineHeight: 16, textAlign: 'center' },
  emptyAction: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: '#2D3851', backgroundColor: '#101521' },
  emptyActionText: { color: Colors.text, fontSize: 9, fontWeight: '900' },
  footer: { width: '100%', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 18 },
  footerIcon: { width: 46, height: 46, borderRadius: 15 },
  footerBrand: { color: '#626B82', fontSize: 10, fontWeight: '700', letterSpacing: 0.2, textAlign: 'center' },
  footerLink: { color: Colors.textMuted, fontSize: 10, fontWeight: '600', textDecorationLine: 'underline', textAlign: 'center' },
  notice: { position: 'absolute', left: 16, right: 16, bottom: 150, alignSelf: 'center', maxWidth: 640, minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, borderRadius: 18, borderWidth: 1, zIndex: 20 },
  noticeSuccess: { borderColor: '#28604F', backgroundColor: '#0B211B' },
  noticeDanger: { borderColor: '#5C2737', backgroundColor: '#241019' },
  noticeInfo: { borderColor: '#27566A', backgroundColor: '#0B1E27' },
  noticeText: { flex: 1, color: Colors.text, fontSize: 10, lineHeight: 15, fontWeight: '700' },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  pickerCard: { width: '100%', maxWidth: 420, gap: 8, padding: 16, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  pickerTitle: { color: Colors.text, fontSize: 15, fontWeight: '900' },
  pickerSub: { color: Colors.textMuted, fontSize: 10, marginBottom: 4 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: Colors.surfaceRaised },
  pickerRowText: { flex: 1, color: Colors.text, fontSize: 12, fontWeight: '800' },
  pickerNewRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerInput: { flex: 1, height: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: Colors.surfaceRaised, color: Colors.text, fontSize: 12 },
  pickerGo: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: Colors.blue },
  pickerClose: { alignItems: 'center', paddingVertical: 10 },
  pickerCloseText: { color: Colors.textMuted, fontSize: 11, fontWeight: '800' },
});
