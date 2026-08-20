import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Gradients, Radius } from '@/constants/theme';
import { describeLink } from '@/lib/media';
import type { VoxaPlaylist } from '@/types/media';

type Props = {
  url: string;
  onChangeUrl: (value: string) => void;
  rightsConfirmed: boolean;
  onChangeRights: (value: boolean) => void;
  busy: boolean;
  playlists: VoxaPlaylist[];
  targetPlaylistId: string | null;
  onChangeTargetPlaylist: (id: string | null) => void;
  onSubmit: (keepOffline: boolean) => void;
};

export function GrabPanel({
  url,
  onChangeUrl,
  rightsConfirmed,
  onChangeRights,
  busy,
  playlists,
  targetPlaylistId,
  onChangeTargetPlaylist,
  onSubmit,
}: Props) {
  const profile = describeLink(url.trim());
  const isPlatform = profile.type === 'platform';
  const isReady = Boolean(url.trim()) && profile.type !== 'invalid' && rightsConfirmed && !busy;

  return (
    <View style={styles.panel}>
      <View style={styles.glowPurple} />
      <View style={styles.glowCyan} />

      <View style={styles.heroRow}>
        <View style={styles.iconShell}>
          <LinearGradient colors={Gradients.brand} style={styles.iconGradient}>
            <Ionicons name="magnet-outline" size={25} color={Colors.text} />
          </LinearGradient>
        </View>
        <View style={styles.heroCopy}>
          <View style={styles.eyebrowRow}>
            <Text style={styles.eyebrow}>VOXA INGEST ENGINE</Text>
            <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>READY</Text></View>
          </View>
          <Text style={styles.title}>Grab your catalog</Text>
          <Text style={styles.subtitle}>Colle une source, identifie son type et route-la vers ta bibliothèque ou une playlist.</Text>
        </View>
      </View>

      <View style={styles.inputShell}>
        <Ionicons name="link-outline" size={19} color={Colors.cyan} />
        <TextInput
          value={url}
          onChangeText={onChangeUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="URL d’un master direct ou d’une référence catalogue"
          placeholderTextColor="#50586F"
          style={styles.input}
        />
        {url.trim() ? (
          <View style={[styles.detectBadge, profile.type === 'invalid' && styles.detectBadgeDanger]}>
            <Ionicons
              name={profile.type === 'platform' ? 'planet-outline' : profile.type === 'invalid' ? 'alert-circle-outline' : 'pulse-outline'}
              size={14}
              color={profile.type === 'invalid' ? Colors.danger : Colors.cyan}
            />
            <Text style={[styles.detectText, profile.type === 'invalid' && styles.detectTextDanger]}>{profile.label}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.routeGrid}>
        <View style={styles.routeCard}>
          <Text style={styles.routeLabel}>DESTINATION</Text>
          <Text style={styles.routeTitle}>Bibliothèque Voxa</Text>
          <Text style={styles.routeCopy}>Le lien est ajouté à ton catalogue local. Tu peux aussi l’envoyer directement dans une playlist.</Text>
          {playlists.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.playlistChips}>
              <Pressable onPress={() => onChangeTargetPlaylist(null)} style={[styles.playlistChip, !targetPlaylistId && styles.playlistChipActive]}>
                <Text style={[styles.playlistChipText, !targetPlaylistId && styles.playlistChipTextActive]}>Bibliothèque</Text>
              </Pressable>
              {playlists.map((playlist) => (
                <Pressable key={playlist.id} onPress={() => onChangeTargetPlaylist(playlist.id)} style={[styles.playlistChip, targetPlaylistId === playlist.id && styles.playlistChipActive]}>
                  <View style={[styles.colorDot, { backgroundColor: playlist.color }]} />
                  <Text style={[styles.playlistChipText, targetPlaylistId === playlist.id && styles.playlistChipTextActive]} numberOfLines={1}>{playlist.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : <Text style={styles.routeHint}>Crée une playlist pour activer le routage direct.</Text>}
        </View>

        <View style={styles.routeCard}>
          <Text style={styles.routeLabel}>TYPE DE SOURCE</Text>
          <Text style={styles.routeTitle}>{url.trim() ? profile.label : 'En attente d’un lien'}</Text>
          <Text style={styles.routeCopy}>
            {isPlatform
              ? 'Voxa enregistre cette page comme référence de ton catalogue et l’ouvre via le lecteur officiel.'
              : 'Un fichier direct audio/vidéo peut être lu dans Voxa. Le hors-ligne est réservé aux builds mobiles.'}
          </Text>
          {isPlatform && url.trim() ? (
            <Pressable style={styles.sourceLink} onPress={() => Linking.openURL(url.trim())}>
              <Ionicons name="open-outline" size={16} color={Colors.cyan} />
              <Text style={styles.sourceLinkText}>Ouvrir la source officielle</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: rightsConfirmed }}
        accessibilityLabel="Confirmer les droits sur ce catalogue"
        style={styles.rightsRow}
        onPress={() => onChangeRights(!rightsConfirmed)}
      >
        <View style={[styles.toggleTrack, rightsConfirmed && styles.toggleTrackActive]}>
          <View style={[styles.toggleThumb, rightsConfirmed && styles.toggleThumbActive]} />
        </View>
        <View style={styles.rightsCopy}>
          <Text style={styles.rightsTitle}>Catalogue autorisé</Text>
          <Text style={styles.rightsText}>Je confirme posséder les droits ou l’autorisation d’utiliser cette source dans Voxa.</Text>
        </View>
        <Ionicons name={rightsConfirmed ? 'shield-checkmark' : 'shield-outline'} size={22} color={rightsConfirmed ? Colors.success : Colors.textMuted} />
      </Pressable>

      <View style={styles.actions}>
        <Pressable disabled={!isReady} style={[styles.primaryButton, !isReady && styles.disabled]} onPress={() => onSubmit(false)}>
          <LinearGradient colors={Gradients.brand} style={styles.primaryGradient}>
            {busy ? <ActivityIndicator color={Colors.text} /> : <Ionicons name={isPlatform ? 'bookmark-outline' : 'play'} size={19} color={Colors.text} />}
            <Text style={styles.primaryText}>{isPlatform ? 'Ajouter la référence' : 'Ajouter et lire'}</Text>
          </LinearGradient>
        </Pressable>
        {!isPlatform && Platform.OS !== 'web' ? (
          <Pressable disabled={!isReady} style={[styles.secondaryButton, !isReady && styles.disabled]} onPress={() => onSubmit(true)}>
            <Ionicons name="cloud-download-outline" size={19} color={Colors.cyan} />
            <Text style={styles.secondaryText}>Lire & garder hors ligne</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.policyBar}>
        <Ionicons name="information-circle-outline" size={18} color={Colors.success} />
        <Text style={styles.policyText}>Les plateformes restent des références officielles. Voxa ne contourne ni publicité, ni DRM, ni contrôle d’accès.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { position: 'relative', overflow: 'hidden', gap: 20, padding: 24, borderRadius: 30, borderWidth: 1, borderColor: '#252D43', backgroundColor: 'rgba(10,13,21,0.96)' },
  glowPurple: { position: 'absolute', width: 260, height: 260, borderRadius: 130, top: -160, left: -80, backgroundColor: 'rgba(167,27,255,0.16)' },
  glowCyan: { position: 'absolute', width: 220, height: 220, borderRadius: 110, bottom: -150, right: -50, backgroundColor: 'rgba(0,216,232,0.12)' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  iconShell: { width: 58, height: 58, borderRadius: 20, padding: 1, backgroundColor: '#27304A' },
  iconGradient: { flex: 1, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, gap: 4 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 9 },
  eyebrow: { color: Colors.cyan, fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.pill, backgroundColor: '#0A211C' },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.success },
  liveText: { color: Colors.success, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  title: { color: Colors.text, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { color: Colors.textMuted, fontSize: 12, lineHeight: 18 },
  inputShell: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: '#2C354D', backgroundColor: '#070A10' },
  input: { flex: 1, minWidth: 80, color: Colors.text, fontSize: 13, height: 58 },
  detectBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 220, paddingHorizontal: 10, paddingVertical: 7, borderRadius: Radius.pill, backgroundColor: '#0B1C27' },
  detectBadgeDanger: { backgroundColor: '#27121A' },
  detectText: { color: Colors.cyan, fontSize: 9, fontWeight: '800' },
  detectTextDanger: { color: Colors.danger },
  routeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  routeCard: { flex: 1, minWidth: 260, gap: 6, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#20283B', backgroundColor: 'rgba(17,21,33,0.82)' },
  routeLabel: { color: '#59647D', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  routeTitle: { color: Colors.text, fontSize: 15, fontWeight: '800' },
  routeCopy: { color: Colors.textMuted, fontSize: 10, lineHeight: 16 },
  routeHint: { color: '#59647D', fontSize: 9, marginTop: 4 },
  playlistChips: { gap: 7, paddingTop: 5 },
  playlistChip: { maxWidth: 150, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1, borderColor: '#293147', backgroundColor: '#0A0D15' },
  playlistChipActive: { borderColor: '#277E98', backgroundColor: '#0D202B' },
  playlistChipText: { color: Colors.textMuted, fontSize: 9, fontWeight: '700' },
  playlistChipTextActive: { color: Colors.text },
  colorDot: { width: 7, height: 7, borderRadius: 4 },
  sourceLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 4 },
  sourceLinkText: { color: Colors.cyan, fontSize: 10, fontWeight: '800' },
  rightsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: '#0B101A', borderWidth: 1, borderColor: '#222A3D' },
  toggleTrack: { width: 46, height: 26, justifyContent: 'center', paddingHorizontal: 3, borderRadius: Radius.pill, backgroundColor: '#262C3D' },
  toggleTrackActive: { backgroundColor: '#3155D9' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#8991A8' },
  toggleThumbActive: { alignSelf: 'flex-end', backgroundColor: Colors.cyan },
  rightsCopy: { flex: 1, gap: 2 },
  rightsTitle: { color: Colors.text, fontSize: 12, fontWeight: '800' },
  rightsText: { color: Colors.textMuted, fontSize: 9, lineHeight: 14 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  primaryButton: { flex: 1, minWidth: 220, overflow: 'hidden', borderRadius: 18 },
  primaryGradient: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 18 },
  primaryText: { color: Colors.text, fontSize: 12, fontWeight: '900' },
  secondaryButton: { flex: 1, minWidth: 220, minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 18, borderWidth: 1, borderColor: '#2D3851', backgroundColor: '#101522' },
  secondaryText: { color: Colors.text, fontSize: 12, fontWeight: '800' },
  disabled: { opacity: 0.38 },
  policyBar: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, borderRadius: 15, backgroundColor: '#091B17' },
  policyText: { flex: 1, color: '#8ABBAE', fontSize: 9, lineHeight: 15 },
});
