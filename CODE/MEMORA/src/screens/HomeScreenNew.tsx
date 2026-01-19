import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

import { RootState } from '../store';
import { useTheme } from '../contexts/ThemeContext';
import { addImage, updateImageStatus, updateImageCaption, addToProcessingQueue, removeFromProcessingQueue, setIsProcessing } from '../store/imagesSlice';
import { createOpenAIService } from '../services/openai';
import { ProcessedImage } from '../store/imagesSlice';
import BackgroundProcessingService from '../services/backgroundProcessing';

const { width } = Dimensions.get('window');
const numColumns = width > 768 ? 3 : 2; // 3 columns on tablets, 2 on phones
const ITEM_SIZE = (width - (16 * 2) - (16 * (numColumns - 1))) / numColumns; // Dynamic sizing

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const { items: images, processingQueue, isProcessing } = useSelector((state: RootState) => state.images);
  const settings = useSelector((state: RootState) => state.settings);
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'processed' | 'processing' | 'unprocessed'>('all');

  const styles = createStyles(theme);

  useFocusEffect(
    React.useCallback(() => {
      loadImages();
      // Initialize background processing when screen loads
      BackgroundProcessingService.initialize();
    }, [])
  );

  const loadImages = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to view your images.');
        return;
      }

      // In a real app, you might load from MediaLibrary here
      // For now, we'll use the images in Redux store
    } catch (error) {
      console.error('Error loading images:', error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true, // Enable multiple selection
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Process each selected image
        const promises = result.assets.map(async (asset) => {
          const imageData: Omit<ProcessedImage, 'status'> = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // Ensure unique IDs
            uri: asset.uri,
            filename: asset.fileName || `image_${Date.now()}.jpg`,
            width: asset.width,
            height: asset.height,
            mediaType: 'photo',
            creationTime: Date.now(),
          };

          dispatch(addImage(imageData));
          
          if (settings.autoProcessImages) {
            // Add to background processing queue instead of processing immediately
            BackgroundProcessingService.addImageToQueue(imageData.id);
          }
          
          return imageData;
        });

        await Promise.all(promises);
        
        const selectedCount = result.assets.length;
        Alert.alert(
          'Images Added', 
          `Successfully added ${selectedCount} image${selectedCount > 1 ? 's' : ''} to your gallery.`
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
          // Add to background processing queue instead of processing immediately
          BackgroundProcessingService.addImageToQueue(imageData.id);
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const browseGallery = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required', 
          'Please grant photo library permissions to browse your gallery.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => MediaLibrary.requestPermissionsAsync() }
          ]
        );
        return;
      }

      // Get assets from device gallery
      const albumAssets = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        first: 50, // Load first 50 images
        sortBy: [[MediaLibrary.SortBy.creationTime, false]], // Most recent first
      });

      if (albumAssets.assets.length === 0) {
        Alert.alert('No Images', 'No images found in your gallery.');
        return;
      }

      // For now, we'll use the image picker for better UX
      // In a future update, we could create a custom gallery browser
      Alert.alert(
        'Browse Gallery', 
        `Found ${albumAssets.totalCount} images in your gallery. Use "Pick from Gallery" to select multiple images.`,
        [
          { text: 'OK' },
          { text: 'Pick Images', onPress: pickImage }
        ]
      );
    } catch (error) {
      console.error('Error browsing gallery:', error);
      Alert.alert('Error', 'Failed to browse gallery');
    }
  };

  const importAllGalleryImages = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required', 
          'Please grant photo library permissions to import your gallery.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => MediaLibrary.requestPermissionsAsync() }
          ]
        );
        return;
      }

      // Show confirmation dialog first
      Alert.alert(
        'Import All Images',
        'This will import all images from your photo library. This may take some time and use significant processing resources. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import All',
            style: 'destructive',
            onPress: async () => {
              try {
                // Get all photo assets
                const albumAssets = await MediaLibrary.getAssetsAsync({
                  mediaType: 'photo',
                  first: 1000, // Import up to 1000 images (adjust as needed)
                  sortBy: [[MediaLibrary.SortBy.creationTime, false]], // Most recent first
                });

                if (albumAssets.assets.length === 0) {
                  Alert.alert('No Images', 'No images found in your gallery.');
                  return;
                }

                // Filter out images that are already imported
                const existingIds = new Set(images.map(img => img.id));
                const newAssets = albumAssets.assets.filter(asset => !existingIds.has(asset.id));

                if (newAssets.length === 0) {
                  Alert.alert('All Imported', 'All gallery images are already in Memora.');
                  return;
                }

                // Add all new images to the store
                const importedImages: ProcessedImage[] = [];
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
                  importedImages.push(newImage);
                }

                Alert.alert(
                  'Import Complete',
                  `Successfully imported ${newAssets.length} images. They will be processed automatically.`,
                  [{ text: 'OK' }]
                );

                // Refresh the display
                await loadImages();
              } catch (importError) {
                console.error('Error importing all images:', importError);
                Alert.alert('Import Error', 'Failed to import some images. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error accessing gallery for import:', error);
      Alert.alert('Error', 'Failed to access gallery for import');
    }
  };

  const filteredImages = images.filter(image => {
    if (selectedFilter === 'all') return true;
    return image.status === selectedFilter;
  });

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'processed':
        return { 
          icon: 'checkmark-circle', 
          color: theme.colors.success, 
          text: 'Processed' 
        };
      case 'processing':
        return { 
          icon: 'time', 
          color: theme.colors.warning, 
          text: 'Processing' 
        };
      case 'error':
        return { 
          icon: 'close-circle', 
          color: theme.colors.error, 
          text: 'Error' 
        };
      default:
        return { 
          icon: 'ellipse-outline', 
          color: theme.colors.textSecondary, 
          text: 'Unprocessed' 
        };
    }
  };

  const renderImageItem = ({ item }: { item: ProcessedImage }) => {
    const statusInfo = getStatusInfo(item.status);
    
    return (
      <TouchableOpacity
        style={styles.imageItem}
        onPress={() => navigation.navigate('ImageDetails', { image: item })}
        activeOpacity={0.8}
      >
        <Image source={{ uri: item.uri }} style={styles.imagePreview} />
        <View style={styles.imageOverlay}>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Ionicons name={statusInfo.icon as any} size={12} color="white" />
          </View>
        </View>
        {item.status === 'processing' && (
          <View style={styles.processingOverlay}>
            <Ionicons name="refresh" size={16} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.processingText}>Processing...</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFilterButton = (filter: typeof selectedFilter, label: string, count: number) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === filter && styles.filterButtonActive,
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Text style={[
        styles.filterButtonText,
        selectedFilter === filter && styles.filterButtonTextActive,
      ]}>
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadImages();
    setRefreshing(false);
  };

  const processedCount = images.filter(img => img.status === 'processed').length;
  const processingCount = images.filter(img => img.status === 'processing').length;
  const unprocessedCount = images.filter(img => img.status === 'unprocessed').length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Memora Gallery</Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        {renderFilterButton('all', 'All', images.length)}
        {renderFilterButton('processed', 'Processed', processedCount)}
        {renderFilterButton('processing', 'Processing', processingCount)}
        {renderFilterButton('unprocessed', 'Unprocessed', unprocessedCount)}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={takePhoto}>
          <Ionicons name="camera" size={20} color={theme.colors.onPrimary} />
          <Text style={styles.actionButtonText}>Take Photo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={pickImage}>
          <Ionicons name="images" size={20} color={theme.colors.onSecondary} />
          <Text style={[styles.actionButtonText, { color: theme.colors.onSecondary }]}>Pick Multiple</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionButton, styles.tertiaryButton]} onPress={browseGallery}>
          <Ionicons name="grid" size={20} color={theme.colors.onPrimary} />
          <Text style={styles.actionButtonText}>Browse All</Text>
        </TouchableOpacity>
      </View>

      {/* Import All Button */}
      <View style={styles.importAllContainer}>
        <TouchableOpacity style={[styles.actionButton, styles.importAllButton]} onPress={importAllGalleryImages}>
          <Ionicons name="download" size={20} color={theme.colors.onPrimary} />
          <Text style={styles.actionButtonText}>Import All Gallery Images</Text>
        </TouchableOpacity>
      </View>

      {/* Processing Status */}
      {processingQueue.length > 0 && (
        <View style={styles.processingStatus}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="time" size={16} color={theme.colors.text} style={{ marginRight: 8 }} />
            <Text style={[styles.processingStatusText, { color: theme.colors.text }]}>
              {processingQueue.length} image{processingQueue.length > 1 ? 's' : ''} in queue
            </Text>
          </View>
          {!isProcessing && (
            <TouchableOpacity 
              style={[styles.processButton, { backgroundColor: theme.colors.warning }]}
              onPress={() => BackgroundProcessingService.processImagesInForeground()}
            >
              <Ionicons name="flash" size={12} color="white" style={{ marginRight: 4 }} />
              <Text style={styles.processButtonText}>Process Now</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Images Grid */}
      {filteredImages.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons 
            name="images-outline" 
            size={64} 
            color={theme.colors.textSecondary} 
            style={{ marginBottom: 16 }}
          />
          <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
            {selectedFilter === 'all' ? 'No images yet' : `No ${selectedFilter} images`}
          </Text>
          <Text style={[styles.emptyStateSubtitle, { color: theme.colors.textSecondary }]}>
            {selectedFilter === 'all' 
              ? 'Take a photo or pick an image to get started' 
              : `Switch to "All" to see your images`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredImages}
          renderItem={renderImageItem}
          numColumns={numColumns}
          key={numColumns} // Force re-render when columns change
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.imagesList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
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
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    minHeight: 60, // Ensure adequate touch targets
  },
  title: {
    fontSize: width > 375 ? 28 : 24, // Smaller title on small screens
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  settingsButton: {
    padding: 8,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text,
  },
  filterButtonTextActive: {
    color: theme.colors.onPrimary,
  },
  actionButtons: {
    flexDirection: width > 480 ? 'row' : 'column', // Stack on small screens
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: width > 480 ? 1 : undefined, // Full width on small screens
    minHeight: 48, // Ensure touch target is large enough
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: theme.colors.secondary,
  },
  tertiaryButton: {
    backgroundColor: theme.colors.info,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onPrimary,
    marginLeft: 8,
  },
  imagesList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  imageItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    marginRight: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    elevation: 3,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 4,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  processingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  processingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  processingStatusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  processButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  processButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  importAllContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  importAllButton: {
    backgroundColor: theme.colors.info,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
});

export default HomeScreen;