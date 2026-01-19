import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

import { RootState } from '../store';
import {
  setBackgroundFetchFrequency,
  setWifiOnly,
  setChargingOnly,
  setOpenAIApiKey,
  setGeminiApiKey,
  setAIProvider,
  setAutoProcessImages,
  setSaveToGooglePhotos,
  setLowBatteryThreshold,
  setDetailedCaptions,
} from '../store/settingsSlice';
import { createOpenAIService, hasValidApiKey, getCurrentApiKey } from '../services/openai';
import { CaptioningService } from '../services/captioning';
import { firebaseAuth } from '../services/firebase';
import { useTheme, ThemeMode, ColorScheme } from '../contexts/ThemeContext';
import { AIProvider } from '../types';

export default function SettingsScreen() {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [showGeminiKeyInput, setShowGeminiKeyInput] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const settings = useSelector((state: RootState) => state.settings);
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { theme, setMode, setColorScheme } = useTheme();
  
  const styles = createStyles(theme);

  const frequencyOptions = [
    { label: 'Hourly', value: 'hourly' as const },
    { label: 'Daily', value: 'daily' as const },
    { label: 'Weekly', value: 'weekly' as const },
  ];

  const handleFrequencyChange = (frequency: 'hourly' | 'daily' | 'weekly') => {
    dispatch(setBackgroundFetchFrequency(frequency));
  };

  const handleApiKeyUpdate = async () => {
    if (!apiKeyInput.trim()) {
      Alert.alert('Error', 'Please enter a valid API key');
      return;
    }

    setTestingConnection(true);
    
    try {
      const openaiService = createOpenAIService(apiKeyInput.trim());
      const isValid = await openaiService.testConnection();
      
      if (isValid) {
        dispatch(setOpenAIApiKey(apiKeyInput.trim()));
        setApiKeyInput('');
        setShowApiKeyInput(false);
        Alert.alert('Success', 'OpenAI API key updated successfully!');
      } else {
        Alert.alert('Error', 'Invalid API key. Please check and try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to validate API key. Please check your internet connection.');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleGeminiKeyUpdate = async () => {
    if (!geminiKeyInput.trim()) {
      Alert.alert('Error', 'Please enter a valid API key');
      return;
    }

    setTestingGemini(true);
    
    try {
      const captioningService = new CaptioningService({
        preferredProvider: 'gemini',
        geminiApiKey: geminiKeyInput.trim(),
      });
      const isValid = await captioningService.testGeminiConnection();
      
      if (isValid) {
        dispatch(setGeminiApiKey(geminiKeyInput.trim()));
        setGeminiKeyInput('');
        setShowGeminiKeyInput(false);
        Alert.alert('Success', 'Gemini API key updated successfully!');
      } else {
        Alert.alert('Error', 'Invalid API key. Please check and try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to validate API key. Please check your internet connection.');
    } finally {
      setTestingGemini(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await firebaseAuth.signInWithGoogle();
    } catch (error) {
      Alert.alert('Error', 'Failed to sign in with Google');
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await firebaseAuth.signOut();
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const renderApiKeyModal = () => (
    <Modal visible={showApiKeyInput} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>OpenAI API Key</Text>
          <Text style={styles.modalSubtitle}>
            {hasValidApiKey() 
              ? 'You can use your own OpenAI API key or continue with the default one. Custom keys take priority.'
              : 'Enter your OpenAI API key to enable AI image captioning. A default key is available as fallback.'}
          </Text>
          
          <TextInput
            style={styles.apiKeyInput}
            value={apiKeyInput}
            onChangeText={setApiKeyInput}
            placeholder="sk-..."
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowApiKeyInput(false);
                setApiKeyInput('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleApiKeyUpdate}
              disabled={testingConnection}
            >
              <Text style={styles.saveButtonText}>
                {testingConnection ? 'Testing...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderGeminiKeyModal = () => (
    <Modal visible={showGeminiKeyInput} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Gemini API Key</Text>
          <Text style={styles.modalSubtitle}>
            Enter your Google Gemini API key. Get one free at ai.google.dev
          </Text>
          
          <TextInput
            style={styles.apiKeyInput}
            value={geminiKeyInput}
            onChangeText={setGeminiKeyInput}
            placeholder="AI..."
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowGeminiKeyInput(false);
                setGeminiKeyInput('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleGeminiKeyUpdate}
              disabled={testingGemini}
            >
              <Text style={styles.saveButtonText}>
                {testingGemini ? 'Testing...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Appearance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="color-palette" size={20} color={theme.colors.primary} /> Appearance
        </Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Theme Mode</Text>
            <Text style={styles.settingDescription}>
              {theme.mode === 'system' ? 'Follow system' : theme.mode === 'dark' ? 'Dark mode' : 'Light mode'}
            </Text>
          </View>
        </View>
        
        <View style={styles.frequencyOptions}>
          {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.frequencyOption,
                theme.mode === mode && styles.frequencyOptionActive,
              ]}
              onPress={() => setMode(mode)}
            >
              <Text style={[
                styles.frequencyOptionText,
                theme.mode === mode && styles.frequencyOptionTextActive,
              ]}>
                {mode === 'system' ? (
                  <><Ionicons name="phone-portrait" size={16} /> Auto</>
                ) : mode === 'dark' ? (
                  <><Ionicons name="moon" size={16} /> Dark</>
                ) : (
                  <><Ionicons name="sunny" size={16} /> Light</>
                )}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Color Scheme</Text>
            <Text style={styles.settingDescription}>
              {theme.colorScheme === 'default' ? 'Default colors' : 
               theme.colorScheme === 'highContrast' ? 'High contrast' :
               theme.colorScheme === 'protanopia' ? 'Protanopia friendly' :
               theme.colorScheme === 'deuteranopia' ? 'Deuteranopia friendly' :
               'Tritanopia friendly'}
            </Text>
          </View>
        </View>
        
        <View style={styles.frequencyOptions}>
          {(['default', 'highContrast'] as ColorScheme[]).map((scheme) => (
            <TouchableOpacity
              key={scheme}
              style={[
                styles.frequencyOption,
                theme.colorScheme === scheme && styles.frequencyOptionActive,
              ]}
              onPress={() => setColorScheme(scheme)}
            >
              <Text style={[
                styles.frequencyOptionText,
                theme.colorScheme === scheme && styles.frequencyOptionTextActive,
              ]}>
                {scheme === 'default' ? (
                  <><Ionicons name="color-palette" size={16} /> Default</>
                ) : (
                  <><Ionicons name="eye" size={16} /> High Contrast</>
                )}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* AI Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="sparkles" size={20} color={theme.colors.primary} /> AI Configuration
        </Text>
        
        {/* AI Provider Selection */}
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>AI Provider</Text>
            <Text style={styles.settingDescription}>
              {settings.aiProvider === 'gemini' ? 'Google Gemini (Recommended)' :
               settings.aiProvider === 'openai' ? 'OpenAI GPT-4o' :
               'On-Device (Offline)'}
            </Text>
          </View>
        </View>
        
        <View style={styles.frequencyOptions}>
          {(['gemini', 'openai', 'ondevice'] as AIProvider[]).map((provider) => (
            <TouchableOpacity
              key={provider}
              style={[
                styles.frequencyOption,
                settings.aiProvider === provider && styles.frequencyOptionActive,
              ]}
              onPress={() => dispatch(setAIProvider(provider))}
            >
              <Text style={[
                styles.frequencyOptionText,
                settings.aiProvider === provider && styles.frequencyOptionTextActive,
              ]}>
                {provider === 'gemini' ? (
                  <><Ionicons name="flash" size={16} /> Gemini</>
                ) : provider === 'openai' ? (
                  <><Ionicons name="cloud" size={16} /> OpenAI</>
                ) : (
                  <><Ionicons name="phone-portrait" size={16} /> Device</>
                )}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Gemini API Key */}
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => setShowGeminiKeyInput(true)}
        >
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Gemini API Key</Text>
            <Text style={styles.settingDescription}>
              {settings.geminiApiKey 
                ? 'Key configured' 
                : 'Not configured (required for Gemini)'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {settings.geminiApiKey && (
          <TouchableOpacity 
            style={[styles.settingItem, { backgroundColor: theme.colors.error + '15' }]}
            onPress={() => dispatch(setGeminiApiKey(''))}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.error }]}>Clear Gemini Key</Text>
              <Text style={styles.settingDescription}>Remove configured API key</Text>
            </View>
            <Ionicons name="trash" size={20} color={theme.colors.error} />
          </TouchableOpacity>
        )}

        {/* OpenAI API Key */}
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => setShowApiKeyInput(true)}
        >
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>OpenAI API Key</Text>
            <Text style={styles.settingDescription}>
              {settings.openAIApiKey 
                ? 'Custom key configured' 
                : hasValidApiKey() 
                  ? 'Using default key' 
                  : 'Not configured'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {settings.openAIApiKey && (
          <TouchableOpacity 
            style={[styles.settingItem, { backgroundColor: theme.colors.error + '15' }]}
            onPress={() => {
              dispatch(setOpenAIApiKey(''));
            }}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.error }]}>Clear OpenAI Key</Text>
              <Text style={styles.settingDescription}>
                Switch back to using the default API key
              </Text>
            </View>
            <Ionicons name="trash" size={20} color={theme.colors.error} />
          </TouchableOpacity>
        )}

        {/* Detailed Captions Toggle */}
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Detailed Captions</Text>
            <Text style={styles.settingDescription}>
              Generate longer, more descriptive captions
            </Text>
          </View>
          <Switch
            value={settings.detailedCaptions}
            onValueChange={(value) => dispatch(setDetailedCaptions(value))}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={settings.detailedCaptions ? theme.colors.onPrimary : theme.colors.surface}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Auto Process Images</Text>
            <Text style={styles.settingDescription}>
              Automatically generate captions for new images
            </Text>
          </View>
          <Switch
            value={settings.autoProcessImages}
            onValueChange={(value) => {
              dispatch(setAutoProcessImages(value));
            }}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={settings.autoProcessImages ? theme.colors.onPrimary : theme.colors.surface}
          />
        </View>
      </View>

      {/* Background Processing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Background Processing</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Fetch Frequency</Text>
            <Text style={styles.settingDescription}>
              How often to process unprocessed images
            </Text>
          </View>
        </View>
        
        <View style={styles.frequencyOptions}>
          {frequencyOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.frequencyOption,
                settings.backgroundFetchFrequency === option.value && styles.frequencyOptionActive,
              ]}
              onPress={() => handleFrequencyChange(option.value)}
            >
              <Text
                style={[
                  styles.frequencyOptionText,
                  settings.backgroundFetchFrequency === option.value && styles.frequencyOptionTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>WiFi Only</Text>
            <Text style={styles.settingDescription}>
              Only process images when connected to WiFi
            </Text>
          </View>
          <Switch
            value={settings.wifiOnly}
            onValueChange={(value) => {
              dispatch(setWifiOnly(value));
            }}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={settings.wifiOnly ? theme.colors.onPrimary : theme.colors.surface}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Charging Only</Text>
            <Text style={styles.settingDescription}>
              Only process images when device is charging
            </Text>
          </View>
          <Switch
            value={settings.chargingOnly}
            onValueChange={(value) => {
              dispatch(setChargingOnly(value));
            }}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={settings.chargingOnly ? theme.colors.onPrimary : theme.colors.surface}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Low Battery Threshold</Text>
            <Text style={styles.settingDescription}>
              Pause processing below {settings.lowBatteryThreshold}% battery
            </Text>
          </View>
        </View>
        
        <View style={styles.frequencyOptions}>
          {[10, 20, 30, 50].map((threshold) => (
            <TouchableOpacity
              key={threshold}
              style={[
                styles.frequencyOption,
                settings.lowBatteryThreshold === threshold && styles.frequencyOptionActive,
              ]}
              onPress={() => dispatch(setLowBatteryThreshold(threshold))}
            >
              <Text
                style={[
                  styles.frequencyOptionText,
                  settings.lowBatteryThreshold === threshold && styles.frequencyOptionTextActive,
                ]}
              >
                {threshold}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Google Photos Integration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Google Photos Integration</Text>
        
        {isAuthenticated ? (
          <>
            <View style={styles.userInfo}>
              <Text style={{ fontSize: 20, color: theme.colors.success }}>✅</Text>
              <Text style={styles.userInfoText}>
                Signed in as {user?.displayName || user?.email}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.signOutButton}
              onPress={handleGoogleSignOut}
            >
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Save to Google Photos</Text>
                <Text style={styles.settingDescription}>
                  Upload processed images with captions to Google Photos
                </Text>
              </View>
              <Switch
                value={settings.saveToGooglePhotos}
                onValueChange={(value) => {
                  dispatch(setSaveToGooglePhotos(value));
                }}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={settings.saveToGooglePhotos ? theme.colors.onPrimary : theme.colors.surface}
              />
            </View>
          </>
        ) : (
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={handleGoogleSignIn}
          >
            <Text style={{ fontSize: 20, color: 'white' }}>🔑</Text>
            <Text style={styles.signInButtonText}>Sign in with Google</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* App Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Version</Text>
            <Text style={styles.settingDescription}>Memora 2.0.0</Text>
          </View>
        </View>
      </View>

      {renderApiKeyModal()}
      {renderGeminiKeyModal()}
    </ScrollView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  section: {
    backgroundColor: theme.colors.surface,
    marginTop: 20,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  frequencyOptions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  frequencyOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  frequencyOptionActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  frequencyOptionText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  frequencyOptionTextActive: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  userInfoText: {
    marginLeft: 10,
    fontSize: 14,
    color: theme.colors.text,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    marginHorizontal: 20,
    marginVertical: 10,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signInButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  signOutButton: {
    backgroundColor: theme.colors.error,
    marginHorizontal: 20,
    marginVertical: 10,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: theme.colors.onError,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    margin: 20,
    padding: 20,
    borderRadius: 10,
    width: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  apiKeyInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});