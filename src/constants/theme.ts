export const Colors = {
  background: '#050609',
  surface: '#0D1018',
  surfaceRaised: '#131724',
  border: '#252A3B',
  text: '#F8FAFF',
  textMuted: '#8B91A7',
  purple: '#A71BFF',
  blue: '#246BFF',
  cyan: '#00D8E8',
  success: '#39E6A2',
  warning: '#FFBE5C',
  danger: '#FF5F7A',
} as const;

export const Gradients = {
  brand: [Colors.purple, Colors.blue, Colors.cyan] as const,
  card: ['rgba(167,27,255,0.24)', 'rgba(36,107,255,0.12)', 'rgba(0,216,232,0.06)'] as const,
};

export const Radius = { small: 12, medium: 18, large: 28, pill: 999 } as const;

// Compatibilité avec les composants de démonstration Expo conservés dans le template.
export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 } as const;
export const BottomTabInset = 80;
export const MaxContentWidth = 920;
export const Fonts = { sans: 'system-ui', serif: 'serif', rounded: 'system-ui', mono: 'monospace' } as const;
export type ThemeColor = 'text' | 'background' | 'backgroundElement' | 'backgroundSelected' | 'textSecondary';
export const LegacyColors = {
  light: { text: '#000', background: '#fff', backgroundElement: '#F0F0F3', backgroundSelected: '#E0E1E6', textSecondary: '#60646C' },
  dark: { text: Colors.text, background: Colors.background, backgroundElement: Colors.surface, backgroundSelected: Colors.surfaceRaised, textSecondary: Colors.textMuted },
} as const;
