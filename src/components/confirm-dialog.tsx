import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({ visible, title, message, confirmLabel = 'Supprimer', onCancel, onConfirm }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <View style={styles.icon}><Ionicons name="trash-outline" size={25} color={Colors.danger} /></View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Annuler la suppression" style={styles.cancelButton} onPress={onCancel}><Text style={styles.cancelText}>Annuler</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Confirmer la suppression" style={styles.confirmButton} onPress={onConfirm}>
              <LinearGradient colors={['#FF3868', '#A71BFF']} style={styles.confirmGradient}>
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(1,2,6,0.82)' },
  card: { width: '100%', maxWidth: 430, alignItems: 'center', gap: 12, padding: 26, borderRadius: 28, borderWidth: 1, borderColor: '#343B52', backgroundColor: '#0D111C' },
  icon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#2A101A' },
  title: { color: Colors.text, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  message: { color: Colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  actions: { width: '100%', flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.medium, borderWidth: 1, borderColor: '#2A3144' },
  cancelText: { color: Colors.text, fontSize: 12, fontWeight: '800' },
  confirmButton: { flex: 1, overflow: 'hidden', borderRadius: Radius.medium },
  confirmGradient: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: Colors.text, fontSize: 12, fontWeight: '900' },
});
