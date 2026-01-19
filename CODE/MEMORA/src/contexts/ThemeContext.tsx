import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorScheme = 'default' | 'highContrast' | 'protanopia' | 'deuteranopia' | 'tritanopia';

export interface ThemeColors {
  primary: string;
  primaryVariant: string;
  secondary: string;
  secondaryVariant: string;
  background: string;
  surface: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  onPrimary: string;
  onSecondary: string;
  onBackground: string;
  onSurface: string;
  onError: string;
  text: string;
  textSecondary: string;
  border: string;
  divider: string;
  shadow: string;
  overlay: string;
}

export interface Theme {
  colors: ThemeColors;
  isDark: boolean;
  mode: ThemeMode;
  colorScheme: ColorScheme;
}

interface ThemeState {
  theme: Theme;
  mode: ThemeMode;
  colorScheme: ColorScheme;
}

type ThemeAction = 
  | { type: 'SET_MODE'; payload: ThemeMode }
  | { type: 'SET_COLOR_SCHEME'; payload: ColorScheme }
  | { type: 'SET_SYSTEM_THEME'; payload: ColorSchemeName };

const lightColors: ThemeColors = {
  primary: '#6D94C5',       // Main blue from palette
  primaryVariant: '#5A7CA8', // Darker shade of blue
  secondary: '#CBDCEB',     // Light blue from palette
  secondaryVariant: '#B5CBE2', // Slightly darker light blue
  background: '#F5EFE6',    // Cream background from palette
  surface: '#E8DFCA',       // Warm beige from palette
  error: '#D32F2F',         // Professional red
  success: '#388E3C',       // Professional green
  warning: '#F57C00',       // Professional amber
  info: '#6D94C5',          // Use primary blue for info
  onPrimary: '#FFFFFF',     // White text on primary
  onSecondary: '#2C3E50',   // Dark text on secondary
  onBackground: '#2C3E50',  // Dark text on background
  onSurface: '#34495E',     // Slightly lighter dark text
  onError: '#FFFFFF',       // White text on error
  text: '#2C3E50',          // Primary text color
  textSecondary: '#5D6D7E', // Secondary text color
  border: '#BDC3C7',        // Light border
  divider: '#E8DFCA',       // Use surface color for dividers
  shadow: '#00000015',      // Subtle shadow
  overlay: '#00000040',     // Modal overlay
};

const darkColors: ThemeColors = {
  primary: '#8FB4D3',       // Lighter blue for dark mode
  primaryVariant: '#6D94C5', // Original blue
  secondary: '#A8C8E0',     // Muted light blue
  secondaryVariant: '#8FB4D3', // Same as primary
  background: '#1A1A1A',    // Dark background
  surface: '#2C2C2C',       // Lighter dark surface
  error: '#F44336',         // Bright red for visibility
  success: '#4CAF50',       // Bright green
  warning: '#FF9800',       // Bright orange
  info: '#8FB4D3',          // Primary blue for info
  onPrimary: '#1A1A1A',     // Dark text on primary
  onSecondary: '#1A1A1A',   // Dark text on secondary
  onBackground: '#E0E0E0',  // Light text on background
  onSurface: '#F0F0F0',     // Lighter text on surface
  onError: '#FFFFFF',       // White text on error
  text: '#E0E0E0',          // Primary light text
  textSecondary: '#B0B0B0', // Secondary light text
  border: '#404040',        // Dark border
  divider: '#383838',       // Dark divider
  shadow: '#00000030',      // Stronger shadow for dark mode
  overlay: '#00000060',     // Darker overlay
};

const highContrastColors: ThemeColors = {
  primary: '#000000',       // Pure black for high contrast
  primaryVariant: '#333333', // Dark gray
  secondary: '#6D94C5',     // Keep one color from palette for accent
  secondaryVariant: '#5A7CA8', // Darker accent
  background: '#FFFFFF',    // Pure white background
  surface: '#F8F8F8',       // Very light gray surface
  error: '#D50000',         // Pure red
  success: '#2E7D32',       // Pure green
  warning: '#F57C00',       // Pure orange
  info: '#1976D2',          // Pure blue
  onPrimary: '#FFFFFF',     // White on black
  onSecondary: '#FFFFFF',   // White on blue
  onBackground: '#000000',  // Black on white
  onSurface: '#000000',     // Black on surface
  onError: '#FFFFFF',       // White on red
  text: '#000000',          // Pure black text
  textSecondary: '#333333', // Dark gray text
  border: '#000000',        // Black borders
  divider: '#CCCCCC',       // Gray dividers
  shadow: '#00000025',      // Stronger shadow
  overlay: '#00000080',     // Strong overlay
};

const protanopiaColors: ThemeColors = {
  primary: '#6D94C5',       // Blue from palette (safe for protanopia)
  primaryVariant: '#5A7CA8', // Darker blue
  secondary: '#8E7CC3',     // Purple tint instead of green
  secondaryVariant: '#7566B3', // Darker purple
  background: '#F5EFE6',    // Keep background from palette
  surface: '#E8DFCA',       // Keep surface from palette
  error: '#D84315',         // Orange-red (distinguishable)
  success: '#5D4E75',       // Purple instead of green
  warning: '#F57C00',       // Orange
  info: '#6D94C5',          // Blue
  onPrimary: '#FFFFFF',     // White on primary
  onSecondary: '#FFFFFF',   // White on secondary
  onBackground: '#2C3E50',  // Dark text
  onSurface: '#34495E',     // Dark text
  onError: '#FFFFFF',       // White on error
  text: '#2C3E50',          // Dark text
  textSecondary: '#5D6D7E', // Gray text
  border: '#BDC3C7',        // Light border
  divider: '#E8DFCA',       // Surface color
  shadow: '#00000015',      // Subtle shadow
  overlay: '#00000040',     // Modal overlay
};

const getColorsForScheme = (isDark: boolean, colorScheme: ColorScheme): ThemeColors => {
  if (colorScheme === 'highContrast') {
    return isDark ? { ...highContrastColors, background: '#000000', surface: '#1a1a1a', text: '#ffffff', onBackground: '#ffffff', onSurface: '#ffffff' } : highContrastColors;
  }
  
  if (colorScheme === 'protanopia' || colorScheme === 'deuteranopia') {
    return isDark ? { 
      ...protanopiaColors, 
      background: '#1A1A1A', 
      surface: '#2C2C2C', 
      text: '#E0E0E0', 
      onBackground: '#E0E0E0', 
      onSurface: '#F0F0F0',
      border: '#404040',
      divider: '#383838'
    } : protanopiaColors;
  }
  
  if (colorScheme === 'tritanopia') {
    const tritColors = {
      ...protanopiaColors,
      primary: '#C75B7A',     // Pink-red (safe for tritanopia)
      primaryVariant: '#A8495C', // Darker pink-red
      secondary: '#6D94C5',   // Keep blue from palette
      secondaryVariant: '#5A7CA8', // Darker blue
    };
    return isDark ? { 
      ...tritColors, 
      background: '#1A1A1A', 
      surface: '#2C2C2C', 
      text: '#E0E0E0', 
      onBackground: '#E0E0E0', 
      onSurface: '#F0F0F0',
      border: '#404040',
      divider: '#383838'
    } : tritColors;
  }
  
  return isDark ? darkColors : lightColors;
};

const createTheme = (isDark: boolean, mode: ThemeMode, colorScheme: ColorScheme): Theme => ({
  colors: getColorsForScheme(isDark, colorScheme),
  isDark,
  mode,
  colorScheme,
});

const themeReducer = (state: ThemeState, action: ThemeAction): ThemeState => {
  switch (action.type) {
    case 'SET_MODE': {
      const newMode = action.payload;
      const systemIsDark = Appearance.getColorScheme() === 'dark';
      const isDark = newMode === 'system' ? systemIsDark : newMode === 'dark';
      return {
        ...state,
        mode: newMode,
        theme: createTheme(isDark, newMode, state.colorScheme),
      };
    }
    case 'SET_COLOR_SCHEME': {
      const newColorScheme = action.payload;
      return {
        ...state,
        colorScheme: newColorScheme,
        theme: createTheme(state.theme.isDark, state.mode, newColorScheme),
      };
    }
    case 'SET_SYSTEM_THEME': {
      if (state.mode === 'system') {
        const isDark = action.payload === 'dark';
        return {
          ...state,
          theme: createTheme(isDark, state.mode, state.colorScheme),
        };
      }
      return state;
    }
    default:
      return state;
  }
};

const ThemeContext = createContext<{
  theme: Theme;
  setMode: (mode: ThemeMode) => void;
  setColorScheme: (scheme: ColorScheme) => void;
} | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(themeReducer, {
    mode: 'system' as ThemeMode,
    colorScheme: 'default' as ColorScheme,
    theme: createTheme(Appearance.getColorScheme() === 'dark', 'system', 'default'),
  });

  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('themeMode');
        const savedColorScheme = await AsyncStorage.getItem('colorScheme');
        
        if (savedMode) {
          dispatch({ type: 'SET_MODE', payload: savedMode as ThemeMode });
        }
        if (savedColorScheme) {
          dispatch({ type: 'SET_COLOR_SCHEME', payload: savedColorScheme as ColorScheme });
        }
      } catch (error) {
        console.warn('Failed to load theme settings:', error);
      }
    };

    loadSavedTheme();

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      dispatch({ type: 'SET_SYSTEM_THEME', payload: colorScheme });
    });

    return () => subscription?.remove();
  }, []);

  const setMode = async (mode: ThemeMode) => {
    dispatch({ type: 'SET_MODE', payload: mode });
    try {
      await AsyncStorage.setItem('themeMode', mode);
    } catch (error) {
      console.warn('Failed to save theme mode:', error);
    }
  };

  const setColorScheme = async (scheme: ColorScheme) => {
    dispatch({ type: 'SET_COLOR_SCHEME', payload: scheme });
    try {
      await AsyncStorage.setItem('colorScheme', scheme);
    } catch (error) {
      console.warn('Failed to save color scheme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme: state.theme, setMode, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};