/**
 * Modern Navigation with custom bottom tab bar
 * Inspired by fitness app design with dark theme
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import HomeScreenModern from '../screens/HomeScreenModern';
import GalleryScreenModern from '../screens/GalleryScreenModern';
import SettingsScreenModern from '../screens/SettingsScreenModern';
import ImageDetailsScreenModern from '../screens/ImageDetailsScreenModern';
import LoginScreen from '../screens/LoginScreen';
import { ProcessedImage } from '../store/imagesSlice';
import { useModernTheme } from '../theme/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
};

export type MainTabParamList = {
  HomeStack: undefined;
  Gallery: undefined;
  Settings: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  ImageDetails: { image: ProcessedImage };
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();
const HomeStack = createStackNavigator<HomeStackParamList>();

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreenModern} />
      <HomeStack.Screen name="ImageDetails" component={ImageDetailsScreenModern} />
    </HomeStack.Navigator>
  );
}

// Custom Tab Bar Component
function CustomTabBar({ state, descriptors, navigation }: any) {
  const { theme } = useModernTheme();

  const getTabIcon = (routeName: string, isFocused: boolean): keyof typeof Ionicons.glyphMap => {
    switch (routeName) {
      case 'HomeStack':
        return isFocused ? 'home' : 'home-outline';
      case 'Gallery':
        return isFocused ? 'images' : 'images-outline';
      case 'Settings':
        return isFocused ? 'settings' : 'settings-outline';
      default:
        return 'ellipse';
    }
  };

  const getTabLabel = (routeName: string): string => {
    switch (routeName) {
      case 'HomeStack':
        return 'Home';
      case 'Gallery':
        return 'Gallery';
      case 'Settings':
        return 'Settings';
      default:
        return routeName;
    }
  };

  return (
    <View style={[styles.tabBarContainer, { backgroundColor: theme.colors.tabBackground }]}>
      {/* Blur background for iOS */}
      {Platform.OS === 'ios' && (
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
      )}
      
      <View style={styles.tabBarContent}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              {isFocused ? (
                <LinearGradient
                  colors={[theme.colors.accentGradientStart, theme.colors.accentGradientEnd]}
                  style={styles.activeTabBackground}
                >
                  <Ionicons
                    name={getTabIcon(route.name, isFocused)}
                    size={24}
                    color="#FFFFFF"
                  />
                </LinearGradient>
              ) : (
                <View style={styles.inactiveTab}>
                  <Ionicons
                    name={getTabIcon(route.name, isFocused)}
                    size={24}
                    color={theme.colors.tabInactive}
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Bottom safe area */}
      <View style={{ height: Platform.OS === 'ios' ? 24 : 8 }} />
    </View>
  );
}

function MainTabs() {
  const { theme } = useModernTheme();

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="HomeStack" component={HomeStackScreen} />
      <Tab.Screen name="Gallery" component={GalleryScreenModern} />
      <Tab.Screen name="Settings" component={SettingsScreenModern} />
    </Tab.Navigator>
  );
}

export default function ModernNavigation() {
  const { theme } = useModernTheme();

  return (
    <NavigationContainer
      theme={{
        dark: theme.isDark,
        colors: {
          primary: theme.colors.accent,
          background: theme.colors.background,
          card: theme.colors.backgroundCard,
          text: theme.colors.textPrimary,
          border: theme.colors.border,
          notification: theme.colors.accent,
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{
            headerShown: true,
            title: 'Sign In',
            presentation: 'modal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  tabBarContent: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingHorizontal: 24,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  activeTabBackground: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveTab: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
