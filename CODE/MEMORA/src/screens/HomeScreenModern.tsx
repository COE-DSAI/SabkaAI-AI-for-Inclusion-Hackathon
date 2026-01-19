/**
 * Modern Home Screen
 * Redesigned with dark theme, orange accents, and card-based layout
 * Inspired by fitness app UI design
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  RefreshControl,
  Alert,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { RootState } from '../store';
import { useModernTheme } from '../theme/ThemeContext';
import { 
  addImage, 
  updateImageStatus, 
  updateImageCaption, 
  addToProcessingQueue,
  ProcessedImage 
} from '../store/imagesSlice';
import { Card, Button, Badge, SectionHeader, StatCard, EmptyState, StatusIndicator, ProgressRing } from '../components/ui';
import BackgroundProcessingService from '../services/backgroundProcessing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2;

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { theme } = useModernTheme();
  const dispatch = useDispatch();
  const { items: images, processingQueue, isProcessing } = useSelector((state: RootState) => state.images);
  const settings = useSelector((state: RootState) => state.settings);
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'processed' | 'processing' | 'unprocessed'>('all');

  const styles = createStyles(theme);

  // Stats
  const processedCount = images.filter(i => i.status === 'processed').length;
  const processingCount = images.filter(i => i.status === 'processing').length;
  const totalCount = images.length;
  const progressPercentage = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  useFocusEffect(
    useCallback(() => {
      BackgroundProcessingService.initialize();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await BackgroundProcessingService.processImagesInForeground();
    setRefreshing(false);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        for (const asset of result.assets) {
          const imageData: Omit<ProcessedImage, 'status'> = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            uri: asset.uri,
            filename: asset.fileName || `image_${Date.now()}.jpg`,
            width: asset.width,
            height: asset.height,
            mediaType: 'photo',
            creationTime: Date.now(),
          };

          dispatch(addImage(imageData));
          
          if (settings.autoProcessImages) {
            BackgroundProcessingService.addImageToQueue(imageData.id);
          }
        }

        Alert.alert(
          '✨ Images Added',
          `Added ${result.assets.length} image${result.assets.length > 1 ? 's' : ''} to your collection.`
        );
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const imageData: Omit<ProcessedImage, 'status'> = {
          id: Date.now().toString(),
          uri: asset.uri,
          filename: asset.fileName || `photo_${Date.now()}.jpg`,
          width: asset.width,
          height: asset.height,
          mediaType: 'photo',
          creationTime: Date.now(),
        };

        dispatch(addImage(imageData));
        
        if (settings.autoProcessImages) {
          BackgroundProcessingService.addImageToQueue(imageData.id);
        }

        Alert.alert('📸 Photo Captured', 'Your photo has been added to the collection.');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const importAllPhotos = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library permissions.');
        return;
      }

      Alert.alert(
        'Import All Photos',
        'This will import photos from your library. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            onPress: async () => {
              const albumAssets = await MediaLibrary.getAssetsAsync({
                mediaType: 'photo',
                first: 100,
                sortBy: [[MediaLibrary.SortBy.creationTime, false]],
              });

              const existingIds = new Set(images.map(img => img.id));
              const newAssets = albumAssets.assets.filter(a => !existingIds.has(a.id));

              for (const asset of newAssets) {
                const newImage: ProcessedImage = {
                  id: asset.id,
                  uri: asset.uri,
                  filename: asset.filename,
                  width: asset.width,
                  height: asset.height,
                  creationTime: asset.creationTime,
                  modificationTime: asset.modificationTime,
                  mediaType: 'photo',
                  albumId: asset.albumId,
                  status: 'unprocessed',
                };
                dispatch(addImage(newImage));
              }

              Alert.alert('🎉 Import Complete', `Imported ${newAssets.length} new photos.`);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error importing:', error);
      Alert.alert('Error', 'Failed to import photos');
    }
  };

  const filteredImages = images.filter(image => {
    if (selectedFilter === 'all') return true;
    return image.status === selectedFilter;
  });

  const filters = [
    { key: 'all', label: 'All', count: totalCount },
    { key: 'processed', label: 'Done', count: processedCount },
    { key: 'processing', label: 'Active', count: processingCount },
    { key: 'unprocessed', label: 'Pending', count: totalCount - processedCount - processingCount },
  ];

  const renderImageCard = ({ item }: { item: ProcessedImage }) => (
    <TouchableOpacity
      style={styles.imageCard}
      onPress={() => navigation.navigate('ImageDetails', { image: item })}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.uri }} style={styles.imagePreview} />
      
      {/* Gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.imageGradient}
      />
      
      {/* Status badge */}
      <View style={styles.statusBadge}>
        <StatusIndicator status={item.status} />
      </View>
      
      {/* Caption preview */}
      {item.caption && (
        <View style={styles.captionContainer}>
          <Text style={styles.captionText} numberOfLines={2}>
            {item.caption}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* Welcome Section */}
      <View style={styles.welcomeRow}>
        <View>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}
          </Text>
          <Text style={styles.welcomeText}>Hi there 👋</Text>
        </View>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <Card variant="elevated" style={styles.progressCard}>
          <View style={styles.progressContent}>
            <ProgressRing progress={progressPercentage} size={70} />
            <View style={styles.progressInfo}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressValue}>{processedCount}/{totalCount}</Text>
              <Text style={styles.progressSubtext}>images processed</Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Quick Stats */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.quickStatsScroll}
        contentContainerStyle={styles.quickStatsContent}
      >
        <StatCard icon="images" value={totalCount} label="Total" />
        <StatCard icon="checkmark-done" value={processedCount} label="Done" />
        <StatCard icon="time-outline" value={processingQueue.length} label="Queue" />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        <SectionHeader title="Quick Actions" />
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
            <LinearGradient
              colors={[theme.colors.accentGradientStart, theme.colors.accentGradientEnd]}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="images" size={24} color={theme.colors.textInverse} />
            </LinearGradient>
            <Text style={styles.actionButtonLabel}>Gallery</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
            <View style={[styles.actionButtonIcon, { backgroundColor: theme.colors.surfaceSecondary }]}>
              <Ionicons name="camera" size={24} color={theme.colors.accent} />
            </View>
            <Text style={styles.actionButtonLabel}>Camera</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={importAllPhotos}>
            <View style={[styles.actionButtonIcon, { backgroundColor: theme.colors.surfaceSecondary }]}>
              <Ionicons name="cloud-download" size={24} color={theme.colors.accent} />
            </View>
            <Text style={styles.actionButtonLabel}>Import</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => BackgroundProcessingService.processImagesInForeground()}
          >
            <View style={[styles.actionButtonIcon, { backgroundColor: theme.colors.surfaceSecondary }]}>
              <Ionicons name="flash" size={24} color={theme.colors.accent} />
            </View>
            <Text style={styles.actionButtonLabel}>Process</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterSection}>
        <SectionHeader 
          title="Your Images" 
          action={{ label: 'View All', onPress: () => navigation.navigate('Gallery') }}
        />
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsContent}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                selectedFilter === filter.key && styles.filterTabActive,
              ]}
              onPress={() => setSelectedFilter(filter.key as any)}
            >
              <Text style={[
                styles.filterTabText,
                selectedFilter === filter.key && styles.filterTabTextActive,
              ]}>
                {filter.label}
              </Text>
              <View style={[
                styles.filterCount,
                selectedFilter === filter.key && styles.filterCountActive,
              ]}>
                <Text style={[
                  styles.filterCountText,
                  selectedFilter === filter.key && styles.filterCountTextActive,
                ]}>
                  {filter.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      
      {filteredImages.length === 0 && totalCount === 0 ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
          {renderHeader()}
          <EmptyState
            icon="images-outline"
            title="No Images Yet"
            subtitle="Start by adding photos from your gallery or taking a new one with your camera."
            action={{ label: 'Add Photos', onPress: pickImage }}
          />
        </ScrollView>
      ) : (
        <FlatList
          data={filteredImages}
          renderItem={renderImageCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.accent}
              colors={[theme.colors.accent]}
            />
          }
        />
      )}
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    paddingBottom: 100,
  },
  columnWrapper: {
    paddingHorizontal: 16,
    gap: 12,
  },
  headerSection: {
    paddingTop: 60,
    paddingBottom: 16,
  },
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  progressCard: {
    padding: 20,
  },
  progressContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressInfo: {
    marginLeft: 20,
    flex: 1,
  },
  progressLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  progressValue: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  progressSubtext: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  quickStatsScroll: {
    marginBottom: 24,
  },
  quickStatsContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  actionsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - 32 - 36) / 4,
  },
  actionButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionButtonIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionButtonLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  filterSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterTabsContent: {
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceSecondary,
    gap: 8,
  },
  filterTabActive: {
    backgroundColor: theme.colors.accent,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterTabTextActive: {
    color: theme.colors.textInverse,
  },
  filterCount: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterCountTextActive: {
    color: theme.colors.textInverse,
  },
  imageCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceSecondary,
    marginBottom: 12,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  captionText: {
    fontSize: 12,
    color: '#FFFFFF',
    lineHeight: 16,
  },
});

export default HomeScreen;
