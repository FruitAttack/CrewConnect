// CrewConnect Design System - Modern Premium Theme
// Inspired by Apple, Okta, Adobe design systems

export const colors = {
  // Primary Brand
  primary: {
    orange: '#F67011',
    orangeLight: '#FF8C42',
    orangeDark: '#D45A00',
    orangeSubtle: 'rgba(246, 112, 17, 0.1)',
    orangeGlow: 'rgba(246, 112, 17, 0.4)',
  },

  // Neutrals - refined for better contrast
  neutral: {
    black: '#0A0A0F',
    darkGray: '#1A1A22',
    gray: '#6B7280',
    lightGray: '#9CA3AF',
    offWhite: '#F8F9FA',
    white: '#FFFFFF',
  },

  // Surfaces
  surface: {
    background: '#FFFFFF',
    card: '#FFFFFF',
    cardHover: '#FAFAFA',
    elevated: '#FFFFFF',
    dark: '#0A0A0F',
    darkElevated: '#1A1A22',
  },

  // Text
  text: {
    primary: '#0A0A0F',
    secondary: '#4B5563',
    tertiary: '#9CA3AF',
    inverse: '#FFFFFF',
    inverseMuted: 'rgba(255, 255, 255, 0.7)',
  },

  // Semantic
  semantic: {
    success: '#10B981',
    successLight: '#D1FAE5',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    info: '#3B82F6',
    infoLight: '#DBEAFE',
  },

  // Gradients
  gradients: {
    darkFade: ['#0A0A0F', '#1A1A22'],
    darkToLight: ['#0A0A0F', '#F8F9FA'],
    orangeGlow: ['rgba(246, 112, 17, 0.2)', 'rgba(246, 112, 17, 0)'],
    heroMesh: ['#0A0A0F', '#12121A', '#0A0A0F'],
    cardShine: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0)'],
  },

  // Overlay
  overlay: {
    light: 'rgba(255, 255, 255, 0.8)',
    dark: 'rgba(0, 0, 0, 0.5)',
    blur: 'rgba(10, 10, 15, 0.8)',
  },

  // Border
  border: {
    light: 'rgba(0, 0, 0, 0.08)',
    default: 'rgba(0, 0, 0, 0.12)',
    dark: 'rgba(0, 0, 0, 0.2)',
    focus: '#F67011',
  },
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  xxxxl: 96,
  section: 120,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  full: 9999,
};

export const typography = {
  // Font families - using Inter
  fontFamily: {
    sans: 'Inter_400Regular, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    sansMedium: 'Inter_500Medium, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    sansSemibold: 'Inter_600SemiBold, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    sansBold: 'Inter_700Bold, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 48,
    displayLg: 56,
    hero: 64,
  },

  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },

  letterSpacing: {
    tight: -1,
    normal: 0,
    wide: 0.5,
    wider: 1,
    widest: 2,
  },
};

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 48,
    elevation: 16,
  },
  glow: {
    shadowColor: colors.primary.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  glowLg: {
    shadowColor: colors.primary.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 16,
  },
};

// Animation configs for React Native Animated
export const animations = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
    verySlow: 600,
  },
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
  spring: {
    default: { damping: 15, stiffness: 150 },
    bouncy: { damping: 10, stiffness: 180 },
    smooth: { damping: 20, stiffness: 120 },
  },
};

// Breakpoints for responsive design
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
};

// Common style mixins
export const mixins = {
  flexCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexBetween: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
  },
  sectionPadding: {
    paddingVertical: spacing.section,
    paddingHorizontal: spacing.lg,
  },
};
