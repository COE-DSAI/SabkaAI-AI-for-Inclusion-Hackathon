import * as MediaLibrary from 'expo-media-library';
import { ImageData } from '../types';

export class ImageMetadataService {
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting media library permissions:', error);
      return false;
    }
  }

  static async getAllImages(
    first: number = 100,
    after?: string
  ): Promise<{ images: ImageData[]; hasNextPage: boolean; endCursor?: string }> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Media library permission denied');
      }

      const options: MediaLibrary.AssetsOptions = {
        first,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: MediaLibrary.SortBy.creationTime,
      };

      if (after) {
        options.after = after;
      }

      const result = await MediaLibrary.getAssetsAsync(options);
      
      const images: ImageData[] = result.assets.map(asset => ({
        id: asset.id,
        uri: asset.uri,
        filename: asset.filename,
        width: asset.width,
        height: asset.height,
        creationTime: asset.creationTime,
        modificationTime: asset.modificationTime,
        mediaType: asset.mediaType as 'photo' | 'video',
        duration: asset.duration,
        albumId: asset.albumId,
        location: null, // Location data not available from expo-media-library
      }));

      return {
        images,
        hasNextPage: result.hasNextPage,
        endCursor: result.endCursor,
      };
    } catch (error) {
      console.error('Error getting images:', error);
      throw error;
    }
  }

  static async getAssetInfo(assetId: string): Promise<MediaLibrary.Asset | null> {
    try {
      const asset = await MediaLibrary.getAssetInfoAsync(assetId);
      return asset;
    } catch (error) {
      console.error('Error getting asset info:', error);
      return null;
    }
  }

  static async saveImageWithCaption(
    imageUri: string,
    caption: string,
    filename?: string
  ): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Media library permission denied');
      }

      // Note: expo-media-library doesn't directly support setting EXIF description
      // We'll save the image and store caption separately in our app's data
      const asset = await MediaLibrary.createAssetAsync(imageUri);
      
      // For now, we can't directly embed the caption into the image metadata
      // This would require a more advanced image processing library
      console.info('Image saved. Caption will be stored separately in app data.');
      
      return asset.id;
    } catch (error) {
      console.error('Error saving image with caption:', error);
      return null;
    }
  }

  static async deleteAsset(assetId: string): Promise<boolean> {
    try {
      const result = await MediaLibrary.deleteAssetsAsync([assetId]);
      return result;
    } catch (error) {
      console.error('Error deleting asset:', error);
      return false;
    }
  }

  static async createAlbum(albumName: string): Promise<string | null> {
    try {
      const album = await MediaLibrary.createAlbumAsync(albumName);
      return album.id;
    } catch (error) {
      console.error('Error creating album:', error);
      return null;
    }
  }

  static async addAssetToAlbum(assetId: string, albumId: string): Promise<boolean> {
    try {
      const result = await MediaLibrary.addAssetsToAlbumAsync([assetId], albumId, false);
      return result;
    } catch (error) {
      console.error('Error adding asset to album:', error);
      return false;
    }
  }

  static async getAlbums(): Promise<MediaLibrary.Album[]> {
    try {
      const albums = await MediaLibrary.getAlbumsAsync();
      return albums;
    } catch (error) {
      console.error('Error getting albums:', error);
      return [];
    }
  }

  // Utility function to check if an image needs processing
  static async getUnprocessedImages(
    processedImageIds: string[],
    first: number = 50
  ): Promise<ImageData[]> {
    try {
      const { images } = await this.getAllImages(first);
      
      // Filter out already processed images
      const unprocessedImages = images.filter(
        image => !processedImageIds.includes(image.id)
      );
      
      return unprocessedImages;
    } catch (error) {
      console.error('Error getting unprocessed images:', error);
      return [];
    }
  }
}

export default ImageMetadataService;