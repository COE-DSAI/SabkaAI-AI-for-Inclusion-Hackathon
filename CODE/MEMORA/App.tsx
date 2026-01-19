import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { store, persistor } from './src/store';
import ModernNavigation from './src/navigation/ModernNavigation';
import { ModernThemeProvider } from './src/theme';
import { ToastProvider } from './src/components/ui';
import { initializeApiKeys } from './src/services/apiKeys';

// Initialize API keys from .env into Redux store
// This runs after PersistGate restores state, so user keys won't be overwritten
function ApiKeyInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Small delay to ensure Redux state is fully restored
    const timer = setTimeout(() => {
      initializeApiKeys();
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  
  return <>{children}</>;
}

export default function App() {
  const LoadingComponent = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D0D0D' }}>
      <ActivityIndicator size="large" color="#FF6B4A" />
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <PersistGate loading={<LoadingComponent />} persistor={persistor}>
          <ApiKeyInitializer>
            <ModernThemeProvider>
              <ToastProvider>
                <StatusBar style="light" />
                <ModernNavigation />
              </ToastProvider>
            </ModernThemeProvider>
          </ApiKeyInitializer>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}