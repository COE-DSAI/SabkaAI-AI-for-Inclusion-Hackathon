/**
 * Modern Gallery Screen
 * Redesigned with dark theme and card-based layout
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  TextInput,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { RootState } from '../store';
import { useModernTheme } from '../theme/ThemeContext';
import { ProcessedImage } from '../store/imagesSlice';
import { Card, Badge, SectionHeader, EmptyState, StatusIndicator } from '../components/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2;

interface GalleryScreenProps {
  navigation: any;
}

export default function GalleryScreen({ navigation }: GalleryScreenProps) {
  const images = useSelector((state: RootState) => state.images.items);
  const { theme } = useModernTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const styles = createStyles(theme);

  const filteredImages = images.filter(image => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      image.caption?.toLowerCase().includes(query) ||
      image.filename?.toLowerCase().includes(query) ||
      image.detailedDescription?.toLowerCase().includes(query)
    );
  });

  const processedImages = filteredImages.filter(i => i.status === 'processed');
  const pendingImages = filteredImages.filter(i => i.status !== 'processed');

  const handleImagePress = (image: ProcessedImage) => {
    navigation.navigate('ImageDetails', { image });
  };

  const renderGridItem = ({ item }: { item: ProcessedImage }) => (
    <TouchableOpacity
      style={styles.gridCard}
      onPress={() => handleImagePress(item)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.uri }} style={styles.gridImage} />
      
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.imageGradient}
      />
      
      <View style={styles.statusBadge}>
        <StatusIndicator status={item.status} />
      </View>

      {item.detailedDescription && (
        <View style={styles.detailedBadge}>
          <Ionicons name="document-text" size={12} color={theme.colors.textPrimary} />
        </View>
      )}
      
      {item.caption && (
        <View style={styles.captionOverlay}>
          <Text style={styles.captionText} numberOfLines={2}>
            {item.caption}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderListItem = ({ item }: { item: ProcessedImage }) => (
    <TouchableOpacity
      style={styles.listCard}
      onPress={() => handleImagePress(item)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.uri }} style={styles.listImage} />
      
      <View style={styles.listItemContent}>
        <View style={styles.listHeader}>
          <Text style={styles.listFilename} numberOfLines={1}>
            {item.filename || 'Untitled'}
          </Text>
          <StatusIndicator status={item.status} />
        </View>
        
        {item.caption ? (
          <Text style={styles.listCaption} numberOfLines={2}>
            {item.caption}
          </Text>
        ) : (
          <Text style={styles.listCaptionPlaceholder}>
            No description yet
          </Text>
        )}
        
        <View style={styles.listMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={theme.colors.textTertiary} />
            <Text style={styles.metaText}>
              {item.creationTime ? new Date(item.creationTime).toLocaleDateString() : 'Unknown'}
            </Text>
          </View>
          {item.detailedDescription && (
            <View style={styles.metaItem}>
              <Ionicons name="document-text-outline" size={12} color={theme.colors.accent} />
              <Text style={[styles.metaText, { color: theme.colors.accent }]}>Detailed</Text>
            </View>
          )}
        </View>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* Title */}
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.title}>Gallery</Text>
          <Text style={styles.subtitle}>Your captioned memories</Text>
        </View>
        <TouchableOpacity
          style={styles.viewModeButton}
          onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
        >
          <Ionicons 
            name={viewMode === 'grid' ? 'list' : 'grid'} 
            size={22} 
            color={theme.colors.textPrimary} 
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by caption or filename..."
          placeholderTextColor={theme.colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Summary */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
          </View>
          <Text style={styles.statValue}>{processedImages.length}</Text>
          <Text style={styles.statLabel}>Processed</Text>
        </Card>
        
        <Card style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons name="time" size={20} color={theme.colors.warning} />
          </View>
          <Text style={styles.statValue}>{pendingImages.length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </Card>
        
        <Card style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons name="images" size={20} color={theme.colors.accent} />
          </View>
          <Text style={styles.statValue}>{filteredImages.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </Card>
      </View>

      {searchQuery && (
        <Text style={styles.searchResultsText}>
          {filteredImages.length} result{filteredImages.length !== 1 ? 's' : ''} for "{searchQuery}"
        </Text>
      )}
    </View>
  );

  if (images.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        {renderHeader()}
        <EmptyState
          icon="images-outline"
          title="No Images Yet"
          subtitle="Add photos to see them here with AI-generated descriptions for accessibility."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <FlatList
        data={filteredImages}
        renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={viewMode === 'grid' ? styles.columnWrapper : undefined}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.noResults}>
            <Ionicons name="search-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={styles.noResultsText}>No images match your search</Text>
          </View>
        }
      />
    </View>
  );
}

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
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  viewModeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  searchResultsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  gridCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceSecondary,
    marginBottom: 12,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  detailedBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,74,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionOverlay: {
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
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  listImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  listItemContent: {
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  listFilename: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  listCaption: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  listCaptionPlaceholder: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  listMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  noResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 16,
  },
});
