/**
 * Modern Theme Context with colorblind support
 * Inspired by fitness app design with orange/coral accents
 */
import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Appearance, ColorSchemeName, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorPalette, getThemeColors, ThemeVariant } from './colors';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccessibilityMode = 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'highContrast';

export interface ModernTheme {
  colors: ColorPalette;
  isDark: boolean;
  mode: ThemeMode;
  accessibilityMode: AccessibilityMode;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  typography: {
    fontFamily: {
      regular: string;
      medium: string;
      semibold: string;
      bold: string;
    };
    fontSize: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      xxl: number;
      xxxl: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };
  shadows: {
    sm: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    md: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    lg: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
}

interface ThemeState {
  theme: ModernTheme;
  mode: ThemeMode;
  accessibilityMode: AccessibilityMode;
}

type ThemeAction = 
  | { type: 'SET_MODE'; payload: ThemeMode }
  | { type: 'SET_ACCESSIBILITY_MODE'; payload: AccessibilityMode }
  | { type: 'SET_SYSTEM_THEME'; payload: ColorSchemeName };

const STORAGE_KEYS = {
  MODE: '@memora_theme_mode',
  ACCESSIBILITY: '@memora_accessibility_mode',
};

const getThemeVariant = (isDark: boolean, accessibilityMode: AccessibilityMode): ThemeVariant => {
  if (accessibilityMode !== 'default') {
    return accessibilityMode;
  }
  return isDark ? 'dark' : 'light';
};

const createModernTheme = (isDark: boolean, mode: ThemeMode, accessibilityMode: AccessibilityMode): ModernTheme => {
  const variant = getThemeVariant(isDark, accessibilityMode);
  const colors = getThemeColors(variant);

  return {
    colors,
    isDark,
    mode,
    accessibilityMode,
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
    borderRadius: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 24,
      full: 9999,
    },
    typography: {
      fontFamily: {
        regular: 'System',
        medium: 'System',
        semibold: 'System',
        bold: 'System',
      },
      fontSize: {
        xs: 10,
        sm: 12,
        md: 14,
        lg: 16,
        xl: 20,
        xxl: 24,
        xxxl: 32,
      },
      lineHeight: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75,
      },
    },
    shadows: {
      sm: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
      },
      md: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
      },
      lg: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
      },
    },
  };
};

const themeReducer = (state: ThemeState, action: ThemeAction): ThemeState => {
  switch (action.type) {
    case 'SET_MODE': {
      const newMode = action.payload;
      const systemIsDark = Appearance.getColorScheme() === 'dark';
      const isDark = newMode === 'system' ? systemIsDark : newMode === 'dark';
      return {
        ...state,
        mode: newMode,
        theme: createModernTheme(isDark, newMode, state.accessibilityMode),
      };
    }
    case 'SET_ACCESSIBILITY_MODE': {
      const newAccessibilityMode = action.payload;
      return {
        ...state,
        accessibilityMode: newAccessibilityMode,
        theme: createModernTheme(state.theme.isDark, state.mode, newAccessibilityMode),
      };
    }
    case 'SET_SYSTEM_THEME': {
      if (state.mode === 'system') {
        const isDark = action.payload === 'dark';
        return {
          ...state,
          theme: createModernTheme(isDark, state.mode, state.accessibilityMode),
        };
      }
      return state;
    }
    default:
      return state;
  }
};

interface ThemeContextType {
  theme: ModernTheme;
  mode: ThemeMode;
  accessibilityMode: AccessibilityMode;
  setMode: (mode: ThemeMode) => void;
  setAccessibilityMode: (mode: AccessibilityMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ModernThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [state, dispatch] = useReducer(themeReducer, {
    mode: 'dark' as ThemeMode, // Default to dark for the modern look
    accessibilityMode: 'default' as AccessibilityMode,
    theme: createModernTheme(true, 'dark', 'default'),
  });

  // Load saved preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [savedMode, savedAccessibility] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.MODE),
          AsyncStorage.getItem(STORAGE_KEYS.ACCESSIBILITY),
        ]);

        if (savedMode) {
          dispatch({ type: 'SET_MODE', payload: savedMode as ThemeMode });
        }
        if (savedAccessibility) {
          dispatch({ type: 'SET_ACCESSIBILITY_MODE', payload: savedAccessibility as AccessibilityMode });
        }
      } catch (error) {
        console.warn('Failed to load theme preferences:', error);
      }
    };

    loadPreferences();
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      dispatch({ type: 'SET_SYSTEM_THEME', payload: colorScheme });
    });

    return () => subscription.remove();
  }, []);

  const setMode = async (mode: ThemeMode) => {
    dispatch({ type: 'SET_MODE', payload: mode });
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MODE, mode);
    } catch (error) {
      console.warn('Failed to save theme mode:', error);
    }
  };

  const setAccessibilityMode = async (mode: AccessibilityMode) => {
    dispatch({ type: 'SET_ACCESSIBILITY_MODE', payload: mode });
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESSIBILITY, mode);
    } catch (error) {
      console.warn('Failed to save accessibility mode:', error);
    }
  };

  const toggleTheme = () => {
    const newMode = state.theme.isDark ? 'light' : 'dark';
    setMode(newMode);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: state.theme,
        mode: state.mode,
        accessibilityMode: state.accessibilityMode,
        setMode,
        setAccessibilityMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useModernTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useModernTheme must be used within a ModernThemeProvider');
  }
  return context;
};

// Helper hook for quick theme colors access
export const useColors = (): ColorPalette => {
  const { theme } = useModernTheme();
  return theme.colors;
};

export default ThemeContext;
