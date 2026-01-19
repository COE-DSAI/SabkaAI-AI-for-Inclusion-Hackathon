/**
 * Modern Image Details Screen
 * Redesigned with dark theme and modern card layout
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Share,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useSelector, useDispatch } from 'react-redux';

import { useModernTheme } from '../theme/ThemeContext';
import { RootState } from '../store';
import { updateImageCaption, updateImageDetailedDescription } from '../store/imagesSlice';
import { CaptioningService } from '../services/captioning';
import { Card, Button, StatusIndicator, useToast, EditModal } from '../components/ui';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageDetailsScreenProps {
  route: any;
  navigation: any;
}

export default function ImageDetailsScreen({ route, navigation }: ImageDetailsScreenProps) {
  const { image } = route.params;
  const { theme } = useModernTheme();
  const dispatch = useDispatch();
  const { showToast } = useToast();
  const settings = useSelector((state: RootState) => state.settings);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDetailed, setIsGeneratingDetailed] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  
  // Edit modal states
  const [showCaptionEditModal, setShowCaptionEditModal] = useState(false);
  const [showDescriptionEditModal, setShowDescriptionEditModal] = useState(false);
  
  // Get the latest image data from the store
  const currentImage = useSelector((state: RootState) => 
    state.images.items.find(img => img.id === image.id)
  ) || image;

  const styles = createStyles(theme);

  const generateCaption = async (detailed: boolean = false) => {
    const setLoading = detailed ? setIsGeneratingDetailed : setIsGenerating;
    setLoading(true);

    try {
      // CaptioningService automatically gets API keys from centralized storage
      const captioningService = new CaptioningService({
        preferredProvider: settings.aiProvider || 'gemini',
      });

      const result = await captioningService.generateCaption(currentImage.uri, detailed);

      if (result.caption) {
        if (detailed) {
          dispatch(updateImageDetailedDescription({ id: currentImage.id, detailedDescription: result.caption }));
        } else {
          dispatch(updateImageCaption({ id: currentImage.id, caption: result.caption }));
        }
        
        const providerName = result.provider === 'ondevice' ? 'Memora Vision Lite' : result.provider;
        showToast(`✨ ${detailed ? 'Description' : 'Caption'} generated`, 'success');
      } else {
        showToast(result.error || 'Failed to generate caption', 'error');
      }
    } catch (error) {
      console.error('Error generating caption:', error);
      showToast('Failed to generate. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    showToast(`${label} copied to clipboard`, 'success');
  };

  const handleSaveCaption = (newCaption: string) => {
    dispatch(updateImageCaption({ id: currentImage.id, caption: newCaption }));
    showToast('Caption saved', 'success');
  };

  const handleSaveDescription = (newDescription: string) => {
    dispatch(updateImageDetailedDescription({ id: currentImage.id, detailedDescription: newDescription }));
    showToast('Description saved', 'success');
  };

  const shareImage = async () => {
    try {
      await Share.share({
        message: currentImage.detailedDescription || currentImage.caption || 'Check out this image!',
        url: currentImage.uri,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Image Details</Text>
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={shareImage}
        >
          <Ionicons name="share-outline" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Preview */}
        <TouchableOpacity 
          style={styles.imageContainer}
          onPress={() => setShowFullImage(true)}
          activeOpacity={0.9}
        >
          <Image 
            source={{ uri: currentImage.uri }} 
            style={styles.mainImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.imageGradient}
          />
          <View style={styles.imageOverlay}>
            <View style={styles.statusRow}>
              <StatusIndicator status={currentImage.status} showLabel />
            </View>
            <TouchableOpacity style={styles.expandButton}>
              <Ionicons name="expand-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Button
            title={isGenerating ? 'Generating...' : 'Quick Caption'}
            icon="flash"
            onPress={() => generateCaption(false)}
            loading={isGenerating}
            variant="primary"
            style={{ flex: 1 }}
          />
          <Button
            title={isGeneratingDetailed ? 'Generating...' : 'Detailed'}
            icon="document-text"
            onPress={() => generateCaption(true)}
            loading={isGeneratingDetailed}
            variant="secondary"
            style={{ flex: 1 }}
          />
        </View>

        {/* Caption Card */}
        <Card variant="elevated" style={styles.captionCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="text" size={20} color={theme.colors.accent} />
              <Text style={styles.cardTitle}>Quick Caption</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity 
                style={styles.cardActionButton}
                onPress={() => setShowCaptionEditModal(true)}
              >
                <Ionicons name="create-outline" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cardActionButton}
                onPress={() => generateCaption(false)}
                disabled={isGenerating}
              >
                <Ionicons 
                  name="refresh-outline" 
                  size={18} 
                  color={isGenerating ? theme.colors.textTertiary : theme.colors.textSecondary} 
                />
              </TouchableOpacity>
              {currentImage.caption && (
                <TouchableOpacity 
                  style={styles.cardActionButton}
                  onPress={() => copyToClipboard(currentImage.caption!, 'Caption')}
                >
                  <Ionicons name="copy-outline" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {currentImage.caption ? (
            <Text style={styles.captionText}>{currentImage.caption}</Text>
          ) : (
            <View style={styles.emptyCaption}>
              <Ionicons name="sparkles-outline" size={24} color={theme.colors.textTertiary} />
              <Text style={styles.emptyCaptionText}>
                No caption yet. Tap "Quick Caption" to generate or ✏️ to add manually.
              </Text>
            </View>
          )}
        </Card>

        {/* Detailed Description Card */}
        <Card variant="elevated" style={styles.captionCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="document-text" size={20} color={theme.colors.accent} />
              <Text style={styles.cardTitle}>Detailed Description</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity 
                style={styles.cardActionButton}
                onPress={() => setShowDescriptionEditModal(true)}
              >
                <Ionicons name="create-outline" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cardActionButton}
                onPress={() => generateCaption(true)}
                disabled={isGeneratingDetailed}
              >
                <Ionicons 
                  name="refresh-outline" 
                  size={18} 
                  color={isGeneratingDetailed ? theme.colors.textTertiary : theme.colors.textSecondary} 
                />
              </TouchableOpacity>
              {currentImage.detailedDescription && (
                <TouchableOpacity 
                  style={styles.cardActionButton}
                  onPress={() => copyToClipboard(currentImage.detailedDescription!, 'Description')}
                >
                  <Ionicons name="copy-outline" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {currentImage.detailedDescription ? (
            <Text style={styles.detailedText}>{currentImage.detailedDescription}</Text>
          ) : (
            <View style={styles.emptyCaption}>
              <Ionicons name="reader-outline" size={24} color={theme.colors.textTertiary} />
              <Text style={styles.emptyCaptionText}>
                No detailed description. Tap "Detailed" for AI description or ✏️ to add manually.
              </Text>
            </View>
          )}
        </Card>

        {/* Image Info Card */}
        <Card variant="elevated" style={styles.infoCard}>
          <Text style={styles.infoTitle}>Image Information</Text>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Created</Text>
                <Text style={styles.infoValue}>{formatDate(currentImage.creationTime)}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="resize-outline" size={18} color={theme.colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Dimensions</Text>
                <Text style={styles.infoValue}>
                  {currentImage.width || '?'} × {currentImage.height || '?'}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="document-outline" size={18} color={theme.colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Filename</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {currentImage.filename || 'Unknown'}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text style={[styles.infoValue, { color: theme.colors.accent }]}>
                  {currentImage.status?.charAt(0).toUpperCase() + currentImage.status?.slice(1)}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Accessibility Tips */}
        <Card style={styles.tipsCard}>
          <LinearGradient
            colors={[theme.colors.accentGradientStart + '20', theme.colors.accentGradientEnd + '10']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tipsGradient}
          >
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb" size={24} color={theme.colors.accent} />
              <Text style={styles.tipsTitle}>Accessibility Tip</Text>
            </View>
            <Text style={styles.tipsText}>
              Detailed descriptions are especially helpful for screen reader users. 
              They provide context about colors, emotions, and spatial relationships in the image.
            </Text>
          </LinearGradient>
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit Caption Modal */}
      <EditModal
        visible={showCaptionEditModal}
        onClose={() => setShowCaptionEditModal(false)}
        title="Edit Caption"
        value={currentImage.caption || ''}
        onSave={handleSaveCaption}
        placeholder="Enter a short, descriptive alt text for this image..."
        maxLength={150}
      />

      {/* Edit Description Modal */}
      <EditModal
        visible={showDescriptionEditModal}
        onClose={() => setShowDescriptionEditModal(false)}
        title="Edit Description"
        value={currentImage.detailedDescription || ''}
        onSave={handleSaveDescription}
        placeholder="Enter a detailed description of this image..."
        maxLength={500}
      />
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  imageContainer: {
    width: '100%',
    height: SCREEN_WIDTH * 0.75,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  captionCard: {
    marginBottom: 16,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardActionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  captionText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    lineHeight: 24,
  },
  detailedText: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    lineHeight: 24,
  },
  emptyCaption: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  emptyCaptionText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoCard: {
    marginBottom: 16,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  tipsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  tipsGradient: {
    padding: 20,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  tipsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
});
