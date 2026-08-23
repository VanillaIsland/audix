import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Player } from '@/components/player';
import { Colors } from '@/constants/theme';
import { usePlayback } from '@/lib/playback';
import type { AudixTrack } from '@/types/media';

/**
 * Lecteur plein écran, ouvert depuis la barre du bas — modèle Spotify.
 * Il réutilise le composant Player tel quel : une seule implémentation des
 * commandes, donc aucun risque de divergence entre les deux vues.
 */
export function FullPlayer({
  visible,
  track,
  onClose,
  onImport,
  onToggleFavorite,
}: {
  visible: boolean;
  track: AudixTrack | null;
  onClose: () => void;
  onImport: () => void;
  onToggleFavorite: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const playback = usePlayback();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={[styles.screen, { paddingTop: insets.top + 6, paddingBottom: insets.bottom }]}>
        <View style={styles.bar}>
          <Pressable accessibilityLabel="Réduire le lecteur" onPress={onClose} hitSlop={12} style={styles.iconBtn}>
            <Ionicons name="chevron-down" size={26} color={Colors.text} />
          </Pressable>
          <View style={styles.barCopy}>
            <Text style={styles.eyebrow}>En lecture</Text>
            <Text style={styles.queue} numberOfLines={1}>
              {playback.queue.length > 1 ? `${playback.index + 1} sur ${playback.queue.length}` : 'Un seul titre en file'}
            </Text>
          </View>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Player track={track} onImport={onImport} onToggleFavorite={onToggleFavorite} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  barCopy: { flex: 1, alignItems: 'center' },
  eyebrow: { color: Colors.cyan, fontSize: 8, fontWeight: '900', letterSpacing: 1.6 },
  queue: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  body: { padding: 16, paddingTop: 8 },
});
