import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GalleryAccessService from '../../src/services/galleryAccess';

jest.mock('expo-media-library');
jest.mock('@react-native-async-storage/async-storage');

describe('GalleryAccessService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPermissionStatus', () => {
    it('should return granted status when permission is granted', async () => {
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
      });

      const result = await GalleryAccessService.getPermissionStatus();
      expect(result.status).toBe('granted');
      expect(result.granted).toBe(true);
      expect(result.canAskAgain).toBe(true);
    });

    it('should return denied status when permission is denied', async () => {
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
        canAskAgain: false,
      });

      const result = await GalleryAccessService.getPermissionStatus();
      expect(result.status).toBe('denied');
      expect(result.granted).toBe(false);
      expect(result.canAskAgain).toBe(false);
    });

    it('should return undetermined on error', async () => {
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission check failed')
      );

      const result = await GalleryAccessService.getPermissionStatus();
      expect(result.status).toBe('undetermined');
      expect(result.granted).toBe(false);
    });
  });

  describe('requestPermission', () => {
    it('should return granted when permission is approved', async () => {
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
      });

      const result = await GalleryAccessService.requestPermission();
      expect(result.status).toBe('granted');
      expect(result.granted).toBe(true);
    });

    it('should return denied when permission is rejected', async () => {
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
        canAskAgain: false,
      });

      const result = await GalleryAccessService.requestPermission();
      expect(result.status).toBe('denied');
      expect(result.granted).toBe(false);
    });

    it('should return denied on error', async () => {
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Request failed')
      );

      const result = await GalleryAccessService.requestPermission();
      expect(result.status).toBe('denied');
      expect(result.granted).toBe(false);
      expect(result.canAskAgain).toBe(false);
    });
  });

  describe('hasFullAccess', () => {
    it('should return true when permission is granted', async () => {
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
      });

      const result = await GalleryAccessService.hasFullAccess();
      expect(result).toBe(true);
    });

    it('should return false when permission is denied', async () => {
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
        canAskAgain: false,
      });

      const result = await GalleryAccessService.hasFullAccess();
      expect(result).toBe(false);
    });
  });

  describe('getLastProcessedTimestamp', () => {
    it('should return stored timestamp', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('1704067200000');

      const result = await GalleryAccessService.getLastProcessedTimestamp();
      expect(result).toBe(1704067200000);
    });

    it('should return 0 when no timestamp stored', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await GalleryAccessService.getLastProcessedTimestamp();
      expect(result).toBe(0);
    });

    it('should return 0 on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await GalleryAccessService.getLastProcessedTimestamp();
      expect(result).toBe(0);
    });
  });

  describe('setLastProcessedTimestamp', () => {
    it('should store timestamp', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await GalleryAccessService.setLastProcessedTimestamp(1704067200000);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@memora_last_processed_timestamp',
        '1704067200000'
      );
    });

    it('should not throw on error', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(
        GalleryAccessService.setLastProcessedTimestamp(1704067200000)
      ).resolves.not.toThrow();
    });
  });

  describe('getProcessedImageIds', () => {
    it('should return stored ids as Set', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(['id-1', 'id-2', 'id-3'])
      );

      const result = await GalleryAccessService.getProcessedImageIds();
      expect(result.size).toBe(3);
      expect(result.has('id-1')).toBe(true);
      expect(result.has('id-2')).toBe(true);
      expect(result.has('id-3')).toBe(true);
    });

    it('should return empty Set when no ids stored', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await GalleryAccessService.getProcessedImageIds();
      expect(result.size).toBe(0);
    });

    it('should return empty Set on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await GalleryAccessService.getProcessedImageIds();
      expect(result.size).toBe(0);
    });
  });

  describe('detectNewImages', () => {
    it('should return empty result when permission denied', async () => {
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await GalleryAccessService.detectNewImages();
      expect(result.hasChanges).toBe(false);
      expect(result.newImages).toHaveLength(0);
    });

    it('should detect new images based on timestamp', async () => {
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('1704067200000')
        .mockResolvedValueOnce(JSON.stringify([]));
      
      const mockAssets = [
        {
          id: 'new-image',
          uri: 'file:///new.jpg',
          filename: 'new.jpg',
          width: 1920,
          height: 1080,
          creationTime: 1704153600000,
          modificationTime: 1704153600000,
          mediaType: 'photo',
          duration: 0,
          albumId: 'album-1',
        },
        {
          id: 'old-image',
          uri: 'file:///old.jpg',
          filename: 'old.jpg',
          width: 1920,
          height: 1080,
          creationTime: 1703980800000,
          modificationTime: 1703980800000,
          mediaType: 'photo',
          duration: 0,
          albumId: 'album-1',
        },
      ];

      (MediaLibrary.getAssetsAsync as jest.Mock).mockResolvedValue({
        assets: mockAssets,
        hasNextPage: false,
        endCursor: null,
        totalCount: 2,
      });

      const result = await GalleryAccessService.detectNewImages();
      expect(result.hasChanges).toBe(true);
      expect(result.newImages.length).toBeGreaterThan(0);
    });

    it('should return empty result for empty gallery', async () => {
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('0')
        .mockResolvedValueOnce(JSON.stringify([]));
      (MediaLibrary.getAssetsAsync as jest.Mock).mockResolvedValue({
        assets: [],
        hasNextPage: false,
        endCursor: null,
        totalCount: 0,
      });

      const result = await GalleryAccessService.detectNewImages();
      expect(result.hasChanges).toBe(false);
      expect(result.newImages).toHaveLength(0);
    });
  });

  describe('detectUnprocessedImages', () => {
    it('should return empty array when permission denied', async () => {
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await GalleryAccessService.detectUnprocessedImages([]);
      expect(result).toHaveLength(0);
    });

    it('should filter out processed images', async () => {
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const mockAssets = [
        { id: 'img-1', uri: 'uri1', filename: 'f1', width: 100, height: 100, creationTime: Date.now(), modificationTime: Date.now(), mediaType: 'photo', duration: 0, albumId: 'a1' },
        { id: 'img-2', uri: 'uri2', filename: 'f2', width: 100, height: 100, creationTime: Date.now(), modificationTime: Date.now(), mediaType: 'photo', duration: 0, albumId: 'a1' },
        { id: 'img-3', uri: 'uri3', filename: 'f3', width: 100, height: 100, creationTime: Date.now(), modificationTime: Date.now(), mediaType: 'photo', duration: 0, albumId: 'a1' },
      ];

      (MediaLibrary.getAssetsAsync as jest.Mock).mockResolvedValue({
        assets: mockAssets,
        hasNextPage: false,
        endCursor: null,
      });

      const result = await GalleryAccessService.detectUnprocessedImages(['img-1', 'img-3']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('img-2');
    });

    it('should respect limit parameter', async () => {
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const mockAssets = Array.from({ length: 10 }, (_, i) => ({
        id: `img-${i}`,
        uri: `uri${i}`,
        filename: `f${i}`,
        width: 100,
        height: 100,
        creationTime: Date.now(),
        modificationTime: Date.now(),
        mediaType: 'photo',
        duration: 0,
        albumId: 'a1',
      }));

      (MediaLibrary.getAssetsAsync as jest.Mock).mockResolvedValue({
        assets: mockAssets,
        hasNextPage: false,
        endCursor: null,
      });

      const result = await GalleryAccessService.detectUnprocessedImages([], 3);
      expect(result).toHaveLength(3);
    });
  });

  describe('getGalleryStats', () => {
    it('should return stats when permission granted', async () => {
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (MediaLibrary.getAssetsAsync as jest.Mock).mockResolvedValue({
        assets: [],
        totalCount: 150,
        hasNextPage: false,
      });

      const result = await GalleryAccessService.getGalleryStats();
      expect(result.totalImages).toBe(150);
      expect(result.hasAccess).toBe(true);
    });

    it('should return zero stats when permission denied', async () => {
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await GalleryAccessService.getGalleryStats();
      expect(result.totalImages).toBe(0);
      expect(result.hasAccess).toBe(false);
    });
  });

  describe('getAllImages', () => {
    it('should return empty result when permission denied', async () => {
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await GalleryAccessService.getAllImages();
      expect(result.images).toHaveLength(0);
      expect(result.hasNextPage).toBe(false);
      expect(result.totalCount).toBe(0);
    });

    it('should paginate through images', async () => {
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const mockAssets = [
        { id: 'img-1', uri: 'uri1', filename: 'f1', width: 100, height: 100, creationTime: Date.now(), modificationTime: Date.now(), mediaType: 'photo', duration: 0, albumId: 'a1' },
      ];

      (MediaLibrary.getAssetsAsync as jest.Mock).mockResolvedValue({
        assets: mockAssets,
        hasNextPage: true,
        endCursor: 'cursor-123',
        totalCount: 100,
      });

      const result = await GalleryAccessService.getAllImages(50, undefined);
      expect(result.images).toHaveLength(1);
      expect(result.hasNextPage).toBe(true);
      expect(result.endCursor).toBe('cursor-123');
      expect(result.totalCount).toBe(100);
    });
  });

  describe('isImageAccessible', () => {
    it('should return true when image exists', async () => {
      (MediaLibrary.getAssetInfoAsync as jest.Mock).mockResolvedValue({
        id: 'img-1',
        uri: 'file:///test.jpg',
      });

      const result = await GalleryAccessService.isImageAccessible('img-1');
      expect(result).toBe(true);
    });

    it('should return false when image does not exist', async () => {
      (MediaLibrary.getAssetInfoAsync as jest.Mock).mockResolvedValue(null);

      const result = await GalleryAccessService.isImageAccessible('non-existent');
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (MediaLibrary.getAssetInfoAsync as jest.Mock).mockRejectedValue(
        new Error('Asset not found')
      );

      const result = await GalleryAccessService.isImageAccessible('error-id');
      expect(result).toBe(false);
    });
  });

  describe('addProcessedImageId', () => {
    it('should add new id to existing ids', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(['existing-id'])
      );
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await GalleryAccessService.addProcessedImageId('new-id');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@memora_processed_image_ids',
        expect.stringContaining('new-id')
      );
    });

    it('should limit stored ids to 10000', async () => {
      const manyIds = Array.from({ length: 10001 }, (_, i) => `id-${i}`);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(manyIds));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await GalleryAccessService.addProcessedImageId('newest-id');

      const setItemCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const storedIds = JSON.parse(setItemCall[1]);
      expect(storedIds.length).toBeLessThanOrEqual(10001);
    });
  });

  describe('clearProcessedImageIds', () => {
    it('should remove stored ids', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await GalleryAccessService.clearProcessedImageIds();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@memora_processed_image_ids');
    });

    it('should not throw on error', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(GalleryAccessService.clearProcessedImageIds()).resolves.not.toThrow();
    });
  });
});
