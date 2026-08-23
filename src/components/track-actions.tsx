import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import type { AudixTrack } from '@/types/media';

type Props = {
  track: AudixTrack | null;
  onClose: () => void;
  onSave: (id: string, changes: { title: string; artist: string; album: string }) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
};

/**
 * Per-track sheet: edit descriptive metadata, toggle favourite, or remove the
 * track. Deletion asks for confirmation in-place because it also erases the
 * offline file.
 */
export function TrackActions({ track, onClose, onSave, onDelete, onToggleFavorite }: Props) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [confirming, setConfirming] = useState(false);

  // Refill the form whenever a different track opens the sheet.
  useEffect(() => {
    setTitle(track?.title ?? '');
    setArtist(track?.artist ?? '');
    setAlbum(track?.album ?? '');
    setConfirming(false);
  }, [track]);

  if (!track) return null;
  const dirty = title !== track.title || artist !== track.artist || (album || undefined) !== track.album;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.dock}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            <Text style={styles.eyebrow}>Modifier les informations</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Titre</Text>
              <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholderTextColor="#50586F" placeholder="Titre du morceau" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Artiste</Text>
              <TextInput value={artist} onChangeText={setArtist} style={styles.input} placeholderTextColor="#50586F" placeholder="Artiste principal" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Album</Text>
              <TextInput value={album} onChangeText={setAlbum} style={styles.input} placeholderTextColor="#50586F" placeholder="Album (facultatif)" />
            </View>

            <Pressable style={styles.row} onPress={() => onToggleFavorite(track.id)}>
              <Ionicons name={track.favorite ? 'heart' : 'heart-outline'} size={19} color={track.favorite ? Colors.purple : Colors.textMuted} />
              <Text style={styles.rowText}>{track.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</Text>
            </Pressable>

            {confirming ? (
              <View style={styles.danger}>
                <Text style={styles.dangerText}>
                  {track.downloaded
                    ? 'Le titre et le fichier gardé sur le téléphone seront supprimés définitivement.'
                    : 'Le titre sera retiré de ta bibliothèque et de tes playlists.'}
                </Text>
                <View style={styles.dangerRow}>
                  <Pressable style={styles.ghost} onPress={() => setConfirming(false)}>
                    <Text style={styles.ghostText}>Annuler</Text>
                  </Pressable>
                  <Pressable style={styles.dangerBtn} onPress={() => { onDelete(track.id); onClose(); }}>
                    <Ionicons name="trash" size={16} color={Colors.text} />
                    <Text style={styles.dangerBtnText}>Supprimer</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={styles.row} onPress={() => setConfirming(true)}>
                <Ionicons name="trash-outline" size={19} color={Colors.danger} />
                <Text style={[styles.rowText, { color: Colors.danger }]}>Supprimer de la bibliothèque</Text>
              </Pressable>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.ghost} onPress={onClose}>
              <Text style={styles.ghostText}>Fermer</Text>
            </Pressable>
            <Pressable
              disabled={!dirty}
              style={[styles.save, !dirty && styles.saveOff]}
              onPress={() => { onSave(track.id, { title, artist, album }); onClose(); }}>
              <Text style={styles.saveText}>Enregistrer</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  dock: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '86%', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: Colors.surface, paddingTop: 8 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, marginBottom: 6 },
  body: { padding: 18, gap: 14 },
  eyebrow: { color: Colors.cyan, fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  field: { gap: 6 },
  label: { color: Colors.textMuted, fontSize: 10, fontWeight: '700' },
  input: { minHeight: 46, paddingHorizontal: 14, borderRadius: 14, backgroundColor: Colors.surfaceRaised, color: Colors.text, fontSize: 14 },
  row: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, borderRadius: 14, backgroundColor: Colors.surfaceRaised },
  rowText: { color: Colors.text, fontSize: 13, fontWeight: '700' },
  danger: { gap: 11, padding: 14, borderRadius: 14, backgroundColor: '#241019' },
  dangerText: { color: Colors.text, fontSize: 12, lineHeight: 18 },
  dangerRow: { flexDirection: 'row', gap: 9 },
  dangerBtn: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 14, backgroundColor: Colors.danger },
  dangerBtnText: { color: Colors.text, fontSize: 13, fontWeight: '800' },
  footer: { flexDirection: 'row', gap: 9, padding: 18, paddingTop: 8, paddingBottom: 26 },
  ghost: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.small, backgroundColor: Colors.surfaceRaised },
  ghostText: { color: Colors.text, fontSize: 13, fontWeight: '700' },
  save: { flex: 2, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.small, backgroundColor: Colors.blue },
  saveOff: { opacity: 0.4 },
  saveText: { color: Colors.text, fontSize: 13, fontWeight: '800' },
});
