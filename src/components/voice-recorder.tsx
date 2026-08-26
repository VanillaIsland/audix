import { Ionicons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';

type Props = {
  /** Appelé quand un mémo est terminé : l'appelant le range dans la bibliothèque. */
  onSaved: (uri: string, seconds: number) => void;
  onError: (message: string) => void;
};

const twoDigits = (value: number) => String(Math.floor(value)).padStart(2, '0');
const formatClock = (seconds: number) => `${twoDigits(seconds / 60)}:${twoDigits(seconds % 60)}`;

/**
 * Mémo vocal. L'enregistrement continue quand l'app passe en arrière-plan ou
 * que l'écran se verrouille, grâce au mode audio d'arrière-plan déclaré dans
 * app.json. Si une autre application prend la main sur le son, iOS interrompt
 * la capture : on le détecte et on referme proprement le mémo au lieu de
 * laisser un enregistrement mort.
 */
export function VoiceRecorder({ onSaved, onError }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [busy, setBusy] = useState(false);
  const wanted = useRef(false);

  const restoreAudioMode = useCallback(() => {
    setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    }).catch(() => undefined);
  }, []);

  const finish = useCallback(async () => {
    wanted.current = false;
    setBusy(true);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      restoreAudioMode();
      if (uri) onSaved(uri, Math.round((state.durationMillis ?? 0) / 1000));
      else onError('Enregistrement vide.');
    } catch (error) {
      restoreAudioMode();
      onError(error instanceof Error ? error.message : 'Arrêt de l’enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  }, [onError, onSaved, recorder, restoreAudioMode, state.durationMillis]);

  // Interruption par une autre app : la capture s'arrête sans qu'on l'ait demandé.
  useEffect(() => {
    if (wanted.current && !state.isRecording && !busy) {
      wanted.current = false;
      restoreAudioMode();
      const uri = recorder.uri;
      if (uri) onSaved(uri, Math.round((state.durationMillis ?? 0) / 1000));
      onError('Enregistrement arrêté : une autre application a pris le son.');
    }
  }, [busy, onError, onSaved, recorder, restoreAudioMode, state.durationMillis, state.isRecording]);

  const start = useCallback(async () => {
    if (Platform.OS === 'web') { onError('Le mémo vocal est disponible sur iOS et Android.'); return; }
    setBusy(true);
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) { onError('Autorise le micro pour enregistrer un mémo.'); return; }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      wanted.current = true;
    } catch (error) {
      restoreAudioMode();
      onError(error instanceof Error ? error.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  }, [onError, recorder, restoreAudioMode]);

  const seconds = Math.round((state.durationMillis ?? 0) / 1000);

  return (
    <View style={styles.card}>
      <View style={styles.copy}>
        <Text style={styles.title}>Mémo vocal</Text>
        <Text style={styles.hint}>
          {state.isRecording
            ? 'Enregistrement en cours. Tu peux verrouiller l’écran ou changer d’app.'
            : 'Capte une idée, une mélodie, une prise rapide. Le fichier rejoint ta bibliothèque.'}
        </Text>
      </View>
      {state.isRecording ? <Text style={styles.clock}>{formatClock(seconds)}</Text> : null}
      <Pressable
        accessibilityLabel={state.isRecording ? 'Arrêter le mémo vocal' : 'Démarrer un mémo vocal'}
        disabled={busy}
        onPress={state.isRecording ? finish : start}
        style={[styles.button, state.isRecording && styles.buttonOn, busy && styles.dim]}>
        <Ionicons name={state.isRecording ? 'stop' : 'mic'} size={20} color={Colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  copy: { flex: 1, gap: 3 },
  title: { color: Colors.text, fontSize: 13, fontWeight: '800' },
  hint: { color: Colors.textMuted, fontSize: 10, lineHeight: 15 },
  clock: { color: Colors.danger, fontSize: 14, fontWeight: '900', fontVariant: ['tabular-nums'] },
  button: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: Colors.blue },
  buttonOn: { backgroundColor: Colors.danger },
  dim: { opacity: 0.5 },
});
