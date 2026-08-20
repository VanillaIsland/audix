import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

export type TabItem<K extends string> = {
  key: K;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
};

/**
 * Flat bottom navigation. Replaces the horizontal scroller: sections are the
 * primary axis of a player, so they stay one tap away and always visible.
 */
export function TabBar<K extends string>({
  items,
  active,
  onChange,
}: {
  items: readonly TabItem<K>[];
  active: K;
  onChange: (key: K) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {items.map((item) => {
        const selected = item.key === active;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(item.key)}
            style={styles.item}>
            <Ionicons
              name={selected ? item.iconActive : item.icon}
              size={22}
              color={selected ? Colors.cyan : Colors.textMuted}
            />
            <Text style={[styles.label, selected && styles.labelActive]} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 46 },
  label: { color: Colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.2 },
  labelActive: { color: Colors.text },
});
