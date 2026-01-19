/**
 * Modern Settings Screen
 * Redesigned with dark theme, sections, and colorblind mode support
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';

import { RootState } from '../store';
import {
  setBackgroundFetchFrequency,
  setWifiOnly,
  setChargingOnly,
  setOpenAIApiKey,
  setGeminiApiKey,
  setAIProvider,
  setAutoProcessImages,
  setLowBatteryThreshold,
  setDetailedCaptions,
} from '../store/settingsSlice';
import { createOpenAIService, hasValidApiKey } from '../services/openai';
import { CaptioningService } from '../services/captioning';
import { useModernTheme, ThemeMode, AccessibilityMode } from '../theme/ThemeContext';
import { Card, Button, ToggleRow } from '../components/ui';
import { AIProvider } from '../types';

export default function SettingsScreen() {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [showApiModal, setShowApiModal] = useState(false);
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings);
  const { theme, mode, accessibilityMode, setMode, setAccessibilityMode, toggleTheme } = useModernTheme();
  
  const styles = createStyles(theme);

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
        setShowApiModal(false);
        Alert.alert('✓ Success', 'OpenAI API key updated!');
      } else {
        Alert.alert('Error', 'Invalid API key');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to validate API key');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleGeminiKeyUpdate = async () => {
    if (!geminiKeyInput.trim()) {
      Alert.alert('Error', 'Please enter a valid API key');
      return;
    }

    setTestingConnection(true);
    try {
      const captioningService = new CaptioningService({
        preferredProvider: 'gemini',
        geminiApiKey: geminiKeyInput.trim(),
      });
      const isValid = await captioningService.testGeminiConnection();
      
      if (isValid) {
        dispatch(setGeminiApiKey(geminiKeyInput.trim()));
        setGeminiKeyInput('');
        setShowGeminiModal(false);
        Alert.alert('✓ Success', 'Gemini API key updated!');
      } else {
        Alert.alert('Error', 'Invalid API key');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to validate API key');
    } finally {
      setTestingConnection(false);
    }
  };

  const themeOptions: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'dark', label: 'Dark', icon: 'moon' },
    { value: 'light', label: 'Light', icon: 'sunny' },
    { value: 'system', label: 'System', icon: 'phone-portrait' },
  ];

  const accessibilityOptions: { value: AccessibilityMode; label: string; description: string }[] = [
    { value: 'default', label: 'Default', description: 'Standard color scheme' },
    { value: 'protanopia', label: 'Protanopia', description: 'Red-blind friendly' },
    { value: 'deuteranopia', label: 'Deuteranopia', description: 'Green-blind friendly' },
    { value: 'tritanopia', label: 'Tritanopia', description: 'Blue-blind friendly' },
    { value: 'highContrast', label: 'High Contrast', description: 'Maximum visibility' },
  ];

  const providerOptions: { value: AIProvider; label: string; icon: string; description?: string }[] = [
    { value: 'ondevice', label: 'Memora Vision Lite v0.5', icon: '🧠', description: 'On-device processing' },
    { value: 'gemini', label: 'Google Gemini', icon: '🌟' },
    { value: 'openai', label: 'OpenAI GPT-4o', icon: '🤖' },
  ];

  const frequencyOptions = [
    { value: 'hourly' as const, label: 'Hourly' },
    { value: 'daily' as const, label: 'Daily' },
    { value: 'weekly' as const, label: 'Weekly' },
  ];

  const renderApiModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    value: string,
    onChange: (v: string) => void,
    onSubmit: () => void,
    hasKey: boolean
  ) => (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.modalSubtitle}>
            {hasKey 
              ? 'You can update your API key or continue with the current one.'
              : 'Enter your API key to enable AI image captioning.'}
          </Text>
          
          <TextInput
            style={styles.apiInput}
            value={value}
            onChangeText={onChange}
            placeholder="Enter API key..."
            placeholderTextColor={theme.colors.textTertiary}
            secureTextEntry
            autoCapitalize="none"
          />
          
          <View style={styles.modalButtons}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <Button
              title={testingConnection ? 'Testing...' : 'Save Key'}
              onPress={onSubmit}
              loading={testingConnection}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Customize your experience</Text>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <Card style={styles.sectionCard}>
            <Text style={styles.cardLabel}>Theme</Text>
            <View style={styles.optionsRow}>
              {themeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.themeOption,
                    mode === option.value && styles.themeOptionActive,
                  ]}
                  onPress={() => setMode(option.value)}
                >
                  <Ionicons 
                    name={option.icon} 
                    size={22} 
                    color={mode === option.value ? theme.colors.textInverse : theme.colors.textSecondary} 
                  />
                  <Text style={[
                    styles.themeOptionText,
                    mode === option.value && styles.themeOptionTextActive,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        </View>

        {/* Colorblind Mode Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Accessibility</Text>
            <View style={styles.sectionBadge}>
              <Ionicons name="eye" size={12} color={theme.colors.accent} />
              <Text style={styles.sectionBadgeText}>Colorblind Modes</Text>
            </View>
          </View>
          
          <Card style={styles.sectionCard}>
            {accessibilityOptions.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.accessibilityOption,
                  index < accessibilityOptions.length - 1 && styles.accessibilityOptionBorder,
                ]}
                onPress={() => setAccessibilityMode(option.value)}
              >
                <View style={styles.accessibilityInfo}>
                  <Text style={styles.accessibilityLabel}>{option.label}</Text>
                  <Text style={styles.accessibilityDescription}>{option.description}</Text>
                </View>
                <View style={[
                  styles.radioOuter,
                  accessibilityMode === option.value && styles.radioOuterActive,
                ]}>
                  {accessibilityMode === option.value && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </Card>
        </View>

        {/* AI Provider Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Provider</Text>
          
          <Card style={styles.sectionCard}>
            <Text style={styles.cardLabel}>Select Provider</Text>
            <View style={styles.providerOptions}>
              {providerOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.providerOption,
                    settings.aiProvider === option.value && styles.providerOptionActive,
                  ]}
                  onPress={() => dispatch(setAIProvider(option.value))}
                >
                  <Text style={styles.providerIcon}>{option.icon}</Text>
                  <Text style={[
                    styles.providerLabel,
                    settings.aiProvider === option.value && styles.providerLabelActive,
                  ]}>
                    {option.label}
                  </Text>
                  {settings.aiProvider === option.value && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* API Keys */}
          <Card style={[styles.sectionCard, { marginTop: 12 }]}>
            <TouchableOpacity 
              style={styles.apiKeyRow}
              onPress={() => setShowApiModal(true)}
            >
              <View style={styles.apiKeyInfo}>
                <Text style={styles.apiKeyLabel}>OpenAI API Key</Text>
                <Text style={styles.apiKeyStatus}>
                  {settings.openAIApiKey ? '••••••••' + settings.openAIApiKey.slice(-4) : 'Not configured'}
                </Text>
              </View>
              <Ionicons name="key" size={20} color={theme.colors.accent} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.apiKeyRow}
              onPress={() => setShowGeminiModal(true)}
            >
              <View style={styles.apiKeyInfo}>
                <Text style={styles.apiKeyLabel}>Gemini API Key</Text>
                <Text style={styles.apiKeyStatus}>
                  {settings.geminiApiKey ? '••••••••' + settings.geminiApiKey.slice(-4) : 'Not configured'}
                </Text>
              </View>
              <Ionicons name="key" size={20} color={theme.colors.accent} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Processing Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Processing</Text>
          
          <Card style={styles.sectionCard}>
            <ToggleRow
              icon="flash"
              title="Auto-Process Images"
              subtitle="Automatically generate descriptions for new photos"
              value={settings.autoProcessImages}
              onValueChange={(value) => dispatch(setAutoProcessImages(value))}
            />
            
            <ToggleRow
              icon="document-text"
              title="Detailed Descriptions"
              subtitle="Generate longer, more detailed captions"
              value={settings.detailedCaptions}
              onValueChange={(value) => dispatch(setDetailedCaptions(value))}
            />
            
            <ToggleRow
              icon="wifi"
              title="WiFi Only"
              subtitle="Only process when connected to WiFi"
              value={settings.wifiOnly}
              onValueChange={(value) => dispatch(setWifiOnly(value))}
            />
            
            <ToggleRow
              icon="battery-charging"
              title="While Charging"
              subtitle="Only process when device is charging"
              value={settings.chargingOnly}
              onValueChange={(value) => dispatch(setChargingOnly(value))}
            />
          </Card>
        </View>

        {/* Background Fetch */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Background Sync</Text>
          
          <Card style={styles.sectionCard}>
            <Text style={styles.cardLabel}>Sync Frequency</Text>
            <View style={styles.frequencyOptions}>
              {frequencyOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.frequencyOption,
                    settings.backgroundFetchFrequency === option.value && styles.frequencyOptionActive,
                  ]}
                  onPress={() => dispatch(setBackgroundFetchFrequency(option.value))}
                >
                  <Text style={[
                    styles.frequencyLabel,
                    settings.backgroundFetchFrequency === option.value && styles.frequencyLabelActive,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Card style={styles.aboutCard}>
            <LinearGradient
              colors={[theme.colors.accentGradientStart, theme.colors.accentGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.aboutGradient}
            >
              <Text style={styles.aboutTitle}>Memora</Text>
              <Text style={styles.aboutVersion}>Version 1.0.0</Text>
              <Text style={styles.aboutDescription}>
                AI-powered image captioning for accessibility
              </Text>
            </LinearGradient>
          </Card>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modals */}
      {renderApiModal(
        showApiModal,
        () => setShowApiModal(false),
        'OpenAI API Key',
        apiKeyInput,
        setApiKeyInput,
        handleApiKeyUpdate,
        !!settings.openAIApiKey
      )}
      {renderApiModal(
        showGeminiModal,
        () => setShowGeminiModal(false),
        'Gemini API Key',
        geminiKeyInput,
        setGeminiKeyInput,
        handleGeminiKeyUpdate,
        !!settings.geminiApiKey
      )}
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accentGradientStart + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  sectionCard: {
    padding: 16,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    gap: 8,
  },
  themeOptionActive: {
    backgroundColor: theme.colors.accent,
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  themeOptionTextActive: {
    color: theme.colors.textInverse,
  },
  accessibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  accessibilityOptionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  accessibilityInfo: {
    flex: 1,
  },
  accessibilityLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  accessibilityDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: theme.colors.accent,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.accent,
  },
  providerOptions: {
    gap: 12,
  },
  providerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    gap: 12,
  },
  providerOptionActive: {
    backgroundColor: theme.colors.accent + '20',
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  providerIcon: {
    fontSize: 24,
  },
  providerLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  providerLabelActive: {
    color: theme.colors.textPrimary,
  },
  apiKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  apiKeyInfo: {
    flex: 1,
  },
  apiKeyLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  apiKeyStatus: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
  frequencyOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  frequencyOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  frequencyOptionActive: {
    backgroundColor: theme.colors.accent,
  },
  frequencyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  frequencyLabelActive: {
    color: theme.colors.textInverse,
  },
  aboutCard: {
    padding: 0,
    overflow: 'hidden',
  },
  aboutGradient: {
    padding: 24,
    alignItems: 'center',
  },
  aboutTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aboutVersion: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  aboutDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 12,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.backgroundCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  apiInput: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
});
