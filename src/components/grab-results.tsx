import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { formatSize, resolveGrabLink, type GrabFile } from '@/lib/grab';

type Props = {
  url: string;
  /** Nom de la playlist cible, pour que l'utilisateur sache où atterrit l'ajout. */
  targetPlaylistName?: string | null;
  onImport: (file: GrabFile, keepOffline: boolean) => Promise<void>;
};

/**
 * Deuxième temps du Grab : analyser le lien, puis choisir quoi importer.
 * Un transfert contient souvent plusieurs fichiers — on ne prend pas tout
 * d'office, l'utilisateur pioche.
 */
export function GrabResults({ url, targetPlaylistName, onImport }: Props) {
  const [files, setFiles] = useState<GrabFile[] | null>(null);
  const [source, setSource] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [working, setWorking] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);

  const analyse = useCallback(async () => {
    setBusy(true);
    setError('');
    setFiles(null);
    setDone([]);
    try {
      const resolution = await resolveGrabLink(url);
      setFiles(resolution.files);
      setSource(resolution.source);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analyse impossible.');
    } finally {
      setBusy(false);
    }
  }, [url]);

  const grabOne = useCallback(async (file: GrabFile, keepOffline: boolean) => {
    setWorking(file.url);
    try {
      await onImport(file, keepOffline);
      setDone((existing) => [...existing, file.url]);
    } catch {
      // Le message d'erreur est affiché par l'écran parent.
    } finally {
      setWorking(null);
    }
  }, [onImport]);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headCopy}>
          <Text style={styles.eyebrow}>Analyse du lien</Text>
          <Text style={styles.title}>Que contient ce lien ?</Text>
        </View>
        <Pressable
          disabled={!url.trim() || busy}
          onPress={analyse}
          accessibilityLabel="Analyser le lien"
          style={[styles.analyse, (!url.trim() || busy) && styles.dim]}>
          {busy ? <ActivityIndicator size="small" color={Colors.text} /> : <Ionicons name="scan-outline" size={17} color={Colors.text} />}
          <Text style={styles.analyseText}>Analyser</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.error}>
          <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {files?.length ? (
        <>
          <Text style={styles.summary}>
            {files.length} fichier{files.length > 1 ? 's' : ''} exploitable{files.length > 1 ? 's' : ''}
            {source === 'swisstransfer' ? ' · SwissTransfer' : ' · lien direct'}
            {targetPlaylistName ? ` · vers « ${targetPlaylistName} »` : ''}
          </Text>

          {files.map((file) => {
            const isDone = done.includes(file.url);
            const isWorking = working === file.url;
            return (
              <View key={file.url} style={styles.row}>
                <View style={[styles.kind, file.kind === 'video' && styles.kindVideo]}>
                  <Ionicons name={file.kind === 'audio' ? 'musical-note' : 'videocam'} size={16} color={Colors.text} />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowName} numberOfLines={2}>{file.name}</Text>
                  <Text style={styles.rowMeta}>{formatSize(file.sizeBytes)} · {file.kind === 'audio' ? 'Audio' : 'Vidéo'}</Text>
                </View>

                {isDone ? (
                  <View style={styles.doneBadge}>
                    <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                  </View>
                ) : isWorking ? (
                  <ActivityIndicator size="small" color={Colors.cyan} style={styles.doneBadge} />
                ) : (
                  <View style={styles.rowActions}>
                    <Pressable
                      accessibilityLabel={`Ajouter ${file.name}`}
                      onPress={() => grabOne(file, false)}
                      hitSlop={6}
                      style={styles.iconBtn}>
                      <Ionicons name="play" size={17} color={Colors.text} />
                    </Pressable>
                    {Platform.OS !== 'web' ? (
                      <Pressable
                        accessibilityLabel={`Télécharger ${file.name} hors ligne`}
                        onPress={() => grabOne(file, true)}
                        hitSlop={6}
                        style={[styles.iconBtn, styles.iconBtnOn]}>
                        <Ionicons name="cloud-download-outline" size={17} color={Colors.cyan} />
                      </Pressable>
                    ) : null}
                  </View>
                )}
              </View>
            );
          })}

          {Platform.OS === 'web' ? (
            <Text style={styles.note}>Le stockage hors ligne est réservé aux applications iOS et Android.</Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 11, padding: 16, borderRadius: 20, backgroundColor: Colors.surface },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headCopy: { flex: 1, gap: 2 },
  eyebrow: { color: Colors.purple, fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
  title: { color: Colors.text, fontSize: 15, fontWeight: '900' },
  analyse: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, borderRadius: 13, backgroundColor: Colors.blue },
  analyseText: { color: Colors.text, fontSize: 11, fontWeight: '800' },
  dim: { opacity: 0.4 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 12, backgroundColor: '#241019' },
  errorText: { flex: 1, color: Colors.text, fontSize: 11, lineHeight: 16 },
  summary: { color: Colors.textMuted, fontSize: 10 },
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 13, backgroundColor: Colors.surfaceRaised },
  kind: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#1B2B45' },
  kindVideo: { backgroundColor: '#2A1B45' },
  rowCopy: { flex: 1, minWidth: 0, gap: 2 },
  rowName: { color: Colors.text, fontSize: 12, fontWeight: '800', lineHeight: 16 },
  rowMeta: { color: Colors.textMuted, fontSize: 9 },
  rowActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: Colors.blue },
  iconBtnOn: { backgroundColor: '#0B2630' },
  doneBadge: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  note: { color: Colors.textMuted, fontSize: 9, lineHeight: 14 },
});
