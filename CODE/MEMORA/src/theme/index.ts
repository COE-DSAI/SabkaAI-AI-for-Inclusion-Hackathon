/**
 * Theme module exports
 */
export { 
  ModernThemeProvider, 
  useModernTheme, 
  useColors,
  type ModernTheme,
  type ThemeMode,
  type AccessibilityMode,
} from './ThemeContext';

export { 
  type ColorPalette,
  type ThemeVariant,
  getThemeColors,
  darkOrangeTheme,
  lightOrangeTheme,
  colorblindProtanopiaTheme,
  colorblindTritanopiaTheme,
  highContrastTheme,
} from './colors';
