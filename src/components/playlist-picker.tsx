import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors } from '@/constants/theme';
import type { AudixPlaylist } from '@/types/media';

type Props = {
  visible: boolean;
  /** Titre du morceau qu'on est en train de ranger. */
  trackTitle: string;
  playlists: AudixPlaylist[];
  onCancel: () => void;
  /** playlistId null = bibliotheque seule. newName renseigne = creer puis ranger. */
  onConfirm: (playlistId: string | null, newName?: string) => void;
};

/**
 * Feuille de choix affichee au moment d'ajouter un titre : bibliotheque seule,
 * une playlist existante, ou une nouvelle playlist creee dans la foulee.
 */
export function PlaylistPicker({ visible, trackTitle, playlists, onCancel, onConfirm }: Props) {
  const [newName, setNewName] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setNewName('');
      setSelected(null);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <View style={styles.sheet}>
        <View style={styles.grip} />
        <Text style={styles.eyebrow}>Où ranger ce titre ?</Text>
        <Text style={styles.title} numberOfLines={2}>{trackTitle}</Text>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => setSelected(null)} style={[styles.option, selected === null && styles.optionOn]}>
            <Ionicons name="library-outline" size={19} color={selected === null ? Colors.cyan : Colors.textMuted} />
            <Text style={[styles.optionText, selected === null && styles.optionTextOn]}>Bibliothèque seulement</Text>
            {selected === null ? <Ionicons name="checkmark" size={18} color={Colors.cyan} /> : null}
          </Pressable>

          {playlists.map((playlist) => {
            const on = selected === playlist.id;
            return (
              <Pressable key={playlist.id} onPress={() => setSelected(playlist.id)} style={[styles.option, on && styles.optionOn]}>
                <View style={[styles.colorDot, { backgroundColor: playlist.color }]} />
                <Text style={[styles.optionText, on && styles.optionTextOn]} numberOfLines={1}>{playlist.name}</Text>
                <Text style={styles.optionCount}>{playlist.trackIds.length}</Text>
                {on ? <Ionicons name="checkmark" size={18} color={Colors.cyan} /> : null}
              </Pressable>
            );
          })}

          <View style={styles.newRow}>
            <Ionicons name="add-circle-outline" size={19} color={Colors.purple} />
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Nouvelle playlist"
              placeholderTextColor="#515A70"
              style={styles.newInput}
              autoCorrect={false}
            />
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <Pressable onPress={onCancel} style={styles.ghost}>
            <Text style={styles.ghostText}>Annuler</Text>
          </Pressable>
          <Pressable onPress={() => onConfirm(selected, newName.trim() || undefined)} style={styles.confirm}>
            <Ionicons name="checkmark" size={18} color={Colors.text} />
            <Text style={styles.confirmText}>Ajouter</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(3,5,10,0.72)' },
  sheet: { maxHeight: '76%', gap: 10, padding: 18, paddingBottom: 30, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: Colors.surface },
  grip: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: '#2C3448' },
  eyebrow: { color: Colors.cyan, fontSize: 11, fontWeight: '700' },
  title: { color: Colors.text, fontSize: 15, fontWeight: '800', lineHeight: 20 },
  list: { marginTop: 4 },
  listContent: { gap: 8, paddingBottom: 6 },
  option: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceRaised },
  optionOn: { borderColor: '#277E98', backgroundColor: '#0D202B' },
  optionText: { flex: 1, color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
  optionTextOn: { color: Colors.text },
  optionCount: { color: '#59647D', fontSize: 10, fontWeight: '700' },
  colorDot: { width: 11, height: 11, borderRadius: 6 },
  newRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#3A2A55', backgroundColor: '#12101E' },
  newInput: { flex: 1, height: 48, color: Colors.text, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 10, paddingTop: 4 },
  ghost: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 1, borderColor: Colors.border },
  ghostText: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
  confirm: { flex: 2, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 15, backgroundColor: Colors.blue },
  confirmText: { color: Colors.text, fontSize: 12, fontWeight: '800' },
});
