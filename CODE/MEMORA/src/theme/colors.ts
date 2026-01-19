/**
 * Modern color palette inspired by fitness app design
 * Features: Dark theme with orange/coral accents, gradient support, colorblind modes
 */

export interface ColorPalette {
  // Primary accent colors
  accent: string;
  accentLight: string;
  accentDark: string;
  accentGradientStart: string;
  accentGradientEnd: string;

  // Background colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  backgroundCard: string;
  backgroundElevated: string;

  // Surface colors
  surface: string;
  surfaceSecondary: string;
  surfacePressed: string;
  surfaceHover: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  textAccent: string;

  // Border colors
  border: string;
  borderLight: string;
  borderAccent: string;

  // Status colors
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
  info: string;
  infoLight: string;

  // Special colors
  overlay: string;
  overlayLight: string;
  shadow: string;
  divider: string;

  // Chart/Graph colors
  chartLine: string;
  chartFill: string;
  chartGrid: string;

  // Tab bar
  tabActive: string;
  tabInactive: string;
  tabBackground: string;
}

// Main dark theme with orange/coral accent
export const darkOrangeTheme: ColorPalette = {
  // Primary accent - Coral/Orange
  accent: '#FF6B4A',
  accentLight: '#FF8A6B',
  accentDark: '#E55A3A',
  accentGradientStart: '#FF6B4A',
  accentGradientEnd: '#FF9966',

  // Backgrounds - Deep dark with warm undertones
  background: '#0D0D0D',
  backgroundSecondary: '#141414',
  backgroundTertiary: '#1A1A1A',
  backgroundCard: '#1E1E1E',
  backgroundElevated: '#252525',

  // Surfaces
  surface: '#1E1E1E',
  surfaceSecondary: '#2A2A2A',
  surfacePressed: '#333333',
  surfaceHover: '#303030',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textTertiary: '#666666',
  textInverse: '#0D0D0D',
  textAccent: '#FF6B4A',

  // Borders
  border: '#2A2A2A',
  borderLight: '#333333',
  borderAccent: '#FF6B4A',

  // Status
  success: '#4ADE80',
  successLight: 'rgba(74, 222, 128, 0.15)',
  warning: '#FBBF24',
  warningLight: 'rgba(251, 191, 36, 0.15)',
  error: '#F87171',
  errorLight: 'rgba(248, 113, 113, 0.15)',
  info: '#60A5FA',
  infoLight: 'rgba(96, 165, 250, 0.15)',

  // Special
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.5)',
  divider: '#2A2A2A',

  // Charts
  chartLine: '#FF6B4A',
  chartFill: 'rgba(255, 107, 74, 0.2)',
  chartGrid: '#2A2A2A',

  // Tab bar
  tabActive: '#FF6B4A',
  tabInactive: '#666666',
  tabBackground: '#141414',
};

// Light theme variant
export const lightOrangeTheme: ColorPalette = {
  accent: '#FF6B4A',
  accentLight: '#FF8A6B',
  accentDark: '#E55A3A',
  accentGradientStart: '#FF6B4A',
  accentGradientEnd: '#FF9966',

  background: '#F5F5F5',
  backgroundSecondary: '#FFFFFF',
  backgroundTertiary: '#FAFAFA',
  backgroundCard: '#FFFFFF',
  backgroundElevated: '#FFFFFF',

  surface: '#FFFFFF',
  surfaceSecondary: '#F5F5F5',
  surfacePressed: '#EBEBEB',
  surfaceHover: '#F0F0F0',

  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textInverse: '#FFFFFF',
  textAccent: '#FF6B4A',

  border: '#E5E5E5',
  borderLight: '#F0F0F0',
  borderAccent: '#FF6B4A',

  success: '#22C55E',
  successLight: 'rgba(34, 197, 94, 0.1)',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.1)',
  error: '#EF4444',
  errorLight: 'rgba(239, 68, 68, 0.1)',
  info: '#3B82F6',
  infoLight: 'rgba(59, 130, 246, 0.1)',

  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  shadow: 'rgba(0, 0, 0, 0.1)',
  divider: '#E5E5E5',

  chartLine: '#FF6B4A',
  chartFill: 'rgba(255, 107, 74, 0.1)',
  chartGrid: '#E5E5E5',

  tabActive: '#FF6B4A',
  tabInactive: '#999999',
  tabBackground: '#FFFFFF',
};

// Colorblind-friendly: Protanopia/Deuteranopia (Red-Green colorblindness)
export const colorblindProtanopiaTheme: ColorPalette = {
  // Use blue as accent instead of red/orange
  accent: '#4A9EFF',
  accentLight: '#6BB3FF',
  accentDark: '#3A7ED9',
  accentGradientStart: '#4A9EFF',
  accentGradientEnd: '#66B8FF',

  background: '#0D0D0D',
  backgroundSecondary: '#141414',
  backgroundTertiary: '#1A1A1A',
  backgroundCard: '#1E1E1E',
  backgroundElevated: '#252525',

  surface: '#1E1E1E',
  surfaceSecondary: '#2A2A2A',
  surfacePressed: '#333333',
  surfaceHover: '#303030',

  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textTertiary: '#666666',
  textInverse: '#0D0D0D',
  textAccent: '#4A9EFF',

  border: '#2A2A2A',
  borderLight: '#333333',
  borderAccent: '#4A9EFF',

  // Adjusted status colors for colorblindness
  success: '#4A9EFF',  // Blue instead of green
  successLight: 'rgba(74, 158, 255, 0.15)',
  warning: '#FFB84A',  // Yellow/gold (still visible)
  warningLight: 'rgba(255, 184, 74, 0.15)',
  error: '#FF6B9E',    // Pink instead of red
  errorLight: 'rgba(255, 107, 158, 0.15)',
  info: '#B494FF',     // Purple for info
  infoLight: 'rgba(180, 148, 255, 0.15)',

  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.5)',
  divider: '#2A2A2A',

  chartLine: '#4A9EFF',
  chartFill: 'rgba(74, 158, 255, 0.2)',
  chartGrid: '#2A2A2A',

  tabActive: '#4A9EFF',
  tabInactive: '#666666',
  tabBackground: '#141414',
};

// Colorblind-friendly: Tritanopia (Blue-Yellow colorblindness)
export const colorblindTritanopiaTheme: ColorPalette = {
  // Use magenta/pink as accent
  accent: '#FF4A8D',
  accentLight: '#FF6BA3',
  accentDark: '#E53A7D',
  accentGradientStart: '#FF4A8D',
  accentGradientEnd: '#FF66A3',

  background: '#0D0D0D',
  backgroundSecondary: '#141414',
  backgroundTertiary: '#1A1A1A',
  backgroundCard: '#1E1E1E',
  backgroundElevated: '#252525',

  surface: '#1E1E1E',
  surfaceSecondary: '#2A2A2A',
  surfacePressed: '#333333',
  surfaceHover: '#303030',

  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textTertiary: '#666666',
  textInverse: '#0D0D0D',
  textAccent: '#FF4A8D',

  border: '#2A2A2A',
  borderLight: '#333333',
  borderAccent: '#FF4A8D',

  // Adjusted for tritanopia
  success: '#4ADE80',  // Green is visible
  successLight: 'rgba(74, 222, 128, 0.15)',
  warning: '#FF8C4A',  // Orange instead of yellow
  warningLight: 'rgba(255, 140, 74, 0.15)',
  error: '#FF4A8D',    // Magenta/pink
  errorLight: 'rgba(255, 74, 141, 0.15)',
  info: '#4ADE80',     // Green for info
  infoLight: 'rgba(74, 222, 128, 0.15)',

  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.5)',
  divider: '#2A2A2A',

  chartLine: '#FF4A8D',
  chartFill: 'rgba(255, 74, 141, 0.2)',
  chartGrid: '#2A2A2A',

  tabActive: '#FF4A8D',
  tabInactive: '#666666',
  tabBackground: '#141414',
};

// High contrast mode
export const highContrastTheme: ColorPalette = {
  accent: '#FFFFFF',
  accentLight: '#FFFFFF',
  accentDark: '#E0E0E0',
  accentGradientStart: '#FFFFFF',
  accentGradientEnd: '#E0E0E0',

  background: '#000000',
  backgroundSecondary: '#000000',
  backgroundTertiary: '#0A0A0A',
  backgroundCard: '#0A0A0A',
  backgroundElevated: '#141414',

  surface: '#0A0A0A',
  surfaceSecondary: '#141414',
  surfacePressed: '#1E1E1E',
  surfaceHover: '#1A1A1A',

  textPrimary: '#FFFFFF',
  textSecondary: '#E0E0E0',
  textTertiary: '#CCCCCC',
  textInverse: '#000000',
  textAccent: '#FFFFFF',

  border: '#FFFFFF',
  borderLight: '#CCCCCC',
  borderAccent: '#FFFFFF',

  success: '#00FF00',
  successLight: 'rgba(0, 255, 0, 0.2)',
  warning: '#FFFF00',
  warningLight: 'rgba(255, 255, 0, 0.2)',
  error: '#FF0000',
  errorLight: 'rgba(255, 0, 0, 0.2)',
  info: '#00FFFF',
  infoLight: 'rgba(0, 255, 255, 0.2)',

  overlay: 'rgba(0, 0, 0, 0.9)',
  overlayLight: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(255, 255, 255, 0.3)',
  divider: '#FFFFFF',

  chartLine: '#FFFFFF',
  chartFill: 'rgba(255, 255, 255, 0.2)',
  chartGrid: '#333333',

  tabActive: '#FFFFFF',
  tabInactive: '#666666',
  tabBackground: '#000000',
};

export type ThemeVariant = 'dark' | 'light' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'highContrast';

export const getThemeColors = (variant: ThemeVariant): ColorPalette => {
  switch (variant) {
    case 'light':
      return lightOrangeTheme;
    case 'protanopia':
    case 'deuteranopia':
      return colorblindProtanopiaTheme;
    case 'tritanopia':
      return colorblindTritanopiaTheme;
    case 'highContrast':
      return highContrastTheme;
    case 'dark':
    default:
      return darkOrangeTheme;
  }
};
