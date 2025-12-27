export type ThemeMode = 'dark' | 'light';

export type ThemeColors = {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  background: string;
  backgroundAlt: string;
  card: string;
  cardAlt: string;
  muted: string;
  mutedForeground: string;
  foreground: string;
  border: string;
  borderLight: string;
  destructive: string;
  success: string;
  warning: string;
  info: string;
  neonBlue: string;
  neonPurple: string;
  neonCyan: string;
  neonPink: string;
  online: string;
  offline: string;
};

// Dark futuristic neon-blue/purple theme (main theme)
export const darkColors: ThemeColors = {
  primary: '#4F6EF7',
  primaryLight: '#7B93FF',
  primaryDark: '#2A3A8F',
  secondary: '#0D1129',
  background: '#060816',
  backgroundAlt: '#0A0E1F',
  card: '#0F1428',
  cardAlt: '#141A35',
  muted: '#1A2142',
  mutedForeground: '#8B9AC9',
  foreground: '#E8ECFF',
  border: 'rgba(79, 110, 247, 0.15)',
  borderLight: 'rgba(79, 110, 247, 0.25)',
  destructive: '#FF5A7E',
  success: '#00E5A0',
  warning: '#FFB547',
  info: '#00C2FF',
  neonBlue: '#00C2FF',
  neonPurple: '#B366FF',
  neonCyan: '#00FFF0',
  neonPink: '#FF66B2',
  online: '#00E5A0',
  offline: '#374151', // Darker grey for better contrast with online green
};

// Light theme variant (kept for compatibility but not primary)
export const lightColors: ThemeColors = {
  primary: '#4F6EF7',
  primaryLight: '#7B93FF',
  primaryDark: '#2E338E',
  secondary: '#F0F2FF',
  background: '#F7F9FF',
  backgroundAlt: '#EBEEFF',
  card: '#FFFFFF',
  cardAlt: '#F5F7FF',
  muted: '#E0E4FB',
  mutedForeground: '#4F5784',
  foreground: '#11142D',
  border: 'rgba(15, 18, 45, 0.12)',
  borderLight: 'rgba(15, 18, 45, 0.08)',
  destructive: '#E54858',
  success: '#13A480',
  warning: '#E8A04D',
  info: '#2E6BFF',
  neonBlue: '#2E6BFF',
  neonPurple: '#7C3AED',
  neonCyan: '#06B6D4',
  neonPink: '#EC4899',
  online: '#13A480',
  offline: '#374151', // Darker grey for better contrast with online green
};

export const getThemeColors = (mode: ThemeMode): ThemeColors =>
  mode === 'light' ? lightColors : darkColors;

// Default to dark theme for the futuristic neon look
export const colors = darkColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
};

export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 40,
};

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Expanded gradients for futuristic UI (dark mode)
export const darkGradients = {
  background: ['#060816', '#0A1025'] as const,
  backgroundRadial: ['#0D1129', '#060816'] as const,
  card: ['rgba(15, 20, 40, 0.95)', 'rgba(10, 14, 31, 0.98)'] as const,
  cardHover: ['rgba(20, 26, 53, 0.95)', 'rgba(15, 20, 40, 0.98)'] as const,
  cardActive: ['rgba(79, 110, 247, 0.15)', 'rgba(15, 20, 40, 0.95)'] as const,
  accent: ['#4F6EF7', '#7B93FF'] as const,
  accentAlt: ['#B366FF', '#4F6EF7'] as const,
  neonBlue: ['#00C2FF', '#4F6EF7'] as const,
  neonPurple: ['#B366FF', '#7C3AED'] as const,
  neonCyan: ['#00FFF0', '#00C2FF'] as const,
  neonPink: ['#FF66B2', '#B366FF'] as const,
  success: ['#00E5A0', '#00B880'] as const,
  warning: ['#FFB547', '#FF9500'] as const,
  destructive: ['#FF5A7E', '#E54858'] as const,
  glass: ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)'] as const,
  glassEdge: ['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.04)'] as const,
  overlay: ['rgba(6, 8, 22, 0)', 'rgba(6, 8, 22, 0.95)'] as const,
  overlayTop: ['rgba(6, 8, 22, 0.9)', 'rgba(6, 8, 22, 0)'] as const,
};

// Light mode gradients
export const lightGradients = {
  background: ['#F8FAFC', '#EEF2FF'] as const,
  backgroundRadial: ['#FFFFFF', '#F1F5F9'] as const,
  card: ['rgba(255, 255, 255, 0.95)', 'rgba(248, 250, 252, 0.98)'] as const,
  cardHover: ['rgba(255, 255, 255, 0.98)', 'rgba(241, 245, 249, 0.98)'] as const,
  cardActive: ['rgba(79, 110, 247, 0.1)', 'rgba(255, 255, 255, 0.95)'] as const,
  accent: ['#4F6EF7', '#7B93FF'] as const,
  accentAlt: ['#B366FF', '#4F6EF7'] as const,
  neonBlue: ['#00C2FF', '#4F6EF7'] as const,
  neonPurple: ['#B366FF', '#7C3AED'] as const,
  neonCyan: ['#00FFF0', '#00C2FF'] as const,
  neonPink: ['#FF66B2', '#B366FF'] as const,
  success: ['#00E5A0', '#00B880'] as const,
  warning: ['#FFB547', '#FF9500'] as const,
  destructive: ['#FF5A7E', '#E54858'] as const,
  glass: ['rgba(0, 0, 0, 0.03)', 'rgba(0, 0, 0, 0.01)'] as const,
  glassEdge: ['rgba(0, 0, 0, 0.06)', 'rgba(0, 0, 0, 0.02)'] as const,
  overlay: ['rgba(255, 255, 255, 0)', 'rgba(248, 250, 252, 0.95)'] as const,
  overlayTop: ['rgba(248, 250, 252, 0.9)', 'rgba(255, 255, 255, 0)'] as const,
};

// For backwards compatibility, export gradients as dark gradients
export const gradients = darkGradients;

// Get theme gradients based on mode
export type ThemeGradients = typeof darkGradients;
export const getThemeGradients = (mode: ThemeMode): ThemeGradients =>
  mode === 'light' ? lightGradients : darkGradients;

// Shadow presets for depth and glow effects
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  neonBlue: {
    shadowColor: '#00C2FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  neonPurple: {
    shadowColor: '#B366FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  neonPrimary: {
    shadowColor: '#4F6EF7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: '#4F6EF7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
};

// Animation presets
export const animations = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: {
    damping: 15,
    stiffness: 150,
  },
};