import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImageData } from '../types';

const LAST_PROCESSED_TIMESTAMP_KEY = '@memora_last_processed_timestamp';
const PROCESSED_IMAGE_IDS_KEY = '@memora_processed_image_ids';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'limited';

export interface PermissionResult {
  status: PermissionStatus;
  canAskAgain: boolean;
  granted: boolean;
}

export interface GalleryChangeResult {
  newImages: ImageData[];
  hasChanges: boolean;
  totalUnprocessed: number;
}

export class GalleryAccessService {
  static async getPermissionStatus(): Promise<PermissionResult> {
    try {
      const { status, canAskAgain } = await MediaLibrary.getPermissionsAsync();
      return {
        status: status as PermissionStatus,
        canAskAgain: canAskAgain ?? true,
        granted: status === 'granted',
      };
    } catch (error) {
      return {
        status: 'undetermined',
        canAskAgain: true,
        granted: false,
      };
    }
  }

  static async requestPermission(): Promise<PermissionResult> {
    try {
      const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
      return {
        status: status as PermissionStatus,
        canAskAgain: canAskAgain ?? true,
        granted: status === 'granted',
      };
    } catch (error) {
      return {
        status: 'denied',
        canAskAgain: false,
        granted: false,
      };
    }
  }

  static async hasFullAccess(): Promise<boolean> {
    const result = await this.getPermissionStatus();
    return result.granted;
  }

  static async getLastProcessedTimestamp(): Promise<number> {
    try {
      const timestamp = await AsyncStorage.getItem(LAST_PROCESSED_TIMESTAMP_KEY);
      return timestamp ? parseInt(timestamp, 10) : 0;
    } catch {
      return 0;
    }
  }

  static async setLastProcessedTimestamp(timestamp: number): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_PROCESSED_TIMESTAMP_KEY, timestamp.toString());
    } catch {
      // Silently fail storage writes
    }
  }

  static async getProcessedImageIds(): Promise<Set<string>> {
    try {
      const idsJson = await AsyncStorage.getItem(PROCESSED_IMAGE_IDS_KEY);
      if (idsJson) {
        const ids = JSON.parse(idsJson);
        return new Set(ids);
      }
      return new Set();
    } catch {
      return new Set();
    }
  }

  static async addProcessedImageId(imageId: string): Promise<void> {
    try {
      const existingIds = await this.getProcessedImageIds();
      existingIds.add(imageId);
      const idsArray = Array.from(existingIds);
      if (idsArray.length > 10000) {
        idsArray.splice(0, idsArray.length - 10000);
      }
      await AsyncStorage.setItem(PROCESSED_IMAGE_IDS_KEY, JSON.stringify(idsArray));
    } catch {
      // Silently fail storage writes
    }
  }

  static async clearProcessedImageIds(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PROCESSED_IMAGE_IDS_KEY);
    } catch {
      // Silently fail storage writes
    }
  }

  static async detectNewImages(limit: number = 50): Promise<GalleryChangeResult> {
    const emptyResult: GalleryChangeResult = {
      newImages: [],
      hasChanges: false,
      totalUnprocessed: 0,
    };

    const hasPermission = await this.hasFullAccess();
    if (!hasPermission) {
      return emptyResult;
    }

    try {
      const lastTimestamp = await this.getLastProcessedTimestamp();
      const processedIds = await this.getProcessedImageIds();

      const result = await MediaLibrary.getAssetsAsync({
        first: limit,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      });

      if (result.assets.length === 0) {
        return emptyResult;
      }

      const newImages: ImageData[] = [];

      for (const asset of result.assets) {
        const isNew = asset.creationTime > lastTimestamp;
        const isUnprocessed = !processedIds.has(asset.id);

        if (isNew || isUnprocessed) {
          newImages.push(this.assetToImageData(asset));
        }
      }

      return {
        newImages,
        hasChanges: newImages.length > 0,
        totalUnprocessed: newImages.length,
      };
    } catch {
      return emptyResult;
    }
  }

  static async detectUnprocessedImages(
    processedImageIds: string[],
    limit: number = 100
  ): Promise<ImageData[]> {
    const hasPermission = await this.hasFullAccess();
    if (!hasPermission) {
      return [];
    }

    try {
      const processedSet = new Set(processedImageIds);
      const allUnprocessed: ImageData[] = [];
      let endCursor: string | undefined;
      let hasNextPage = true;
      let fetchedCount = 0;
      const maxFetch = limit * 2;

      while (hasNextPage && allUnprocessed.length < limit && fetchedCount < maxFetch) {
        const options: MediaLibrary.AssetsOptions = {
          first: Math.min(50, limit),
          mediaType: MediaLibrary.MediaType.photo,
          sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        };

        if (endCursor) {
          options.after = endCursor;
        }

        const result = await MediaLibrary.getAssetsAsync(options);
        fetchedCount += result.assets.length;

        for (const asset of result.assets) {
          if (!processedSet.has(asset.id) && allUnprocessed.length < limit) {
            allUnprocessed.push(this.assetToImageData(asset));
          }
        }

        hasNextPage = result.hasNextPage;
        endCursor = result.endCursor;
      }

      return allUnprocessed;
    } catch {
      return [];
    }
  }

  static async getGalleryStats(): Promise<{
    totalImages: number;
    hasAccess: boolean;
  }> {
    const hasPermission = await this.hasFullAccess();
    if (!hasPermission) {
      return { totalImages: 0, hasAccess: false };
    }

    try {
      const result = await MediaLibrary.getAssetsAsync({
        first: 1,
        mediaType: MediaLibrary.MediaType.photo,
      });

      return {
        totalImages: result.totalCount,
        hasAccess: true,
      };
    } catch {
      return { totalImages: 0, hasAccess: false };
    }
  }

  static async getAllImages(
    pageSize: number = 50,
    cursor?: string
  ): Promise<{
    images: ImageData[];
    hasNextPage: boolean;
    endCursor?: string;
    totalCount: number;
  }> {
    const hasPermission = await this.hasFullAccess();
    if (!hasPermission) {
      return {
        images: [],
        hasNextPage: false,
        endCursor: undefined,
        totalCount: 0,
      };
    }

    try {
      const options: MediaLibrary.AssetsOptions = {
        first: pageSize,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      };

      if (cursor) {
        options.after = cursor;
      }

      const result = await MediaLibrary.getAssetsAsync(options);

      return {
        images: result.assets.map(this.assetToImageData),
        hasNextPage: result.hasNextPage,
        endCursor: result.endCursor,
        totalCount: result.totalCount,
      };
    } catch {
      return {
        images: [],
        hasNextPage: false,
        endCursor: undefined,
        totalCount: 0,
      };
    }
  }

  static async isImageAccessible(imageId: string): Promise<boolean> {
    try {
      const asset = await MediaLibrary.getAssetInfoAsync(imageId);
      return asset !== null;
    } catch {
      return false;
    }
  }

  private static assetToImageData(asset: MediaLibrary.Asset): ImageData {
    return {
      id: asset.id,
      uri: asset.uri,
      filename: asset.filename,
      width: asset.width,
      height: asset.height,
      creationTime: asset.creationTime,
      modificationTime: asset.modificationTime,
      mediaType: 'photo',
      duration: asset.duration,
      albumId: asset.albumId,
    };
  }
}

export default GalleryAccessService;
