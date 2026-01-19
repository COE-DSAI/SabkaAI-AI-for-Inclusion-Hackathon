import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { RootState } from '../store';
import { useTheme } from '../contexts/ThemeContext';
import { ProcessedImage } from '../store/imagesSlice';

const { width } = Dimensions.get('window');
const numColumns = width > 768 ? 3 : 2; // 3 columns on tablets, 2 on phones
const ITEM_SIZE = (width - (16 * 2) - (8 * 2 * numColumns)) / numColumns; // Dynamic sizing

interface GalleryScreenProps {
  navigation: any;
}

export default function GalleryScreen({ navigation }: GalleryScreenProps) {
  const images = useSelector((state: RootState) => state.images.items);
  const { theme } = useTheme();

  const handleImagePress = (image: ProcessedImage) => {
    navigation.navigate('ImageDetails', { image });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return 'checkmark-circle';
      case 'processing':
        return 'time';
      case 'unprocessed':
        return 'ellipse-outline';
      default:
        return 'help-circle';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed':
        return theme.colors.success;
      case 'processing':
        return theme.colors.warning;
      case 'unprocessed':
        return theme.colors.textSecondary;
      default:
        return theme.colors.error;
    }
  };

  const renderImageItem = ({ item }: { item: ProcessedImage }) => (
    <TouchableOpacity 
      style={[
        styles.imageItem, 
        { 
          backgroundColor: theme.colors.surface,
          shadowColor: theme.colors.shadow,
        }
      ]}
      onPress={() => handleImagePress(item)}
    >
      <Image 
        source={{ uri: item.uri }} 
        style={styles.imagePreview}
        resizeMode="cover"
      />
      
      {/* Status Badge */}
      <View style={styles.imageOverlay}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Ionicons 
            name={getStatusIcon(item.status) as any} 
            size={12} 
            color="white" 
          />
        </View>
        
        {/* Detailed Description Indicator */}
        {item.detailedDescription && (
          <View style={[styles.detailedBadge, { backgroundColor: theme.colors.secondary }]}>
            <Ionicons 
              name="document-text" 
              size={10} 
              color="white" 
            />
          </View>
        )}
      </View>
      
      {/* Caption Preview */}
      {item.caption && (
        <View style={[styles.captionPreview, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.captionText, { color: theme.colors.text }]} numberOfLines={2}>
            {item.caption}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Gallery</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Your captioned memories
        </Text>
      </View>

      {images.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons 
            name="images-outline" 
            size={64} 
            color={theme.colors.textSecondary} 
          />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            No images yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            Take some photos to see them here with AI descriptions!
          </Text>
        </View>
      ) : (
        <FlatList
          data={images}
          renderItem={renderImageItem}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          key={numColumns} // Force re-render when columns change
          contentContainerStyle={styles.galleryContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    paddingTop: width > 375 ? 60 : 50, // Adjust for different screen sizes
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  galleryContainer: {
    padding: 16,
  },
  imageItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE + 40,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  imagePreview: {
    width: '100%',
    height: ITEM_SIZE,
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
  detailedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  captionPreview: {
    padding: 8,
    height: 40,
    justifyContent: 'center',
  },
  captionText: {
    fontSize: 12,
    lineHeight: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});