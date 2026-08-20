import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { Colors, Gradients } from '@/constants/theme';

const BARS = [10, 18, 30, 22, 38, 58, 42, 70, 48, 32, 54, 76, 45, 31, 62, 86, 58, 35, 50, 74, 46, 30, 44, 64, 39, 26, 48, 72, 46, 28, 18, 12];

export function Waveform({ progress = 0 }: { progress?: number }) {
  return (
    <View style={styles.container} accessibilityLabel={`Progression ${Math.round(progress * 100)} %`}>
      {BARS.map((height, index) => {
        const active = index / BARS.length <= progress;
        return active ? (
          <LinearGradient key={index} colors={Gradients.brand} style={[styles.bar, { height }]} />
        ) : (
          <View key={index} style={[styles.bar, styles.inactive, { height }]} />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 94, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  bar: { width: 4, borderRadius: 4 },
  inactive: { backgroundColor: Colors.border },
});
