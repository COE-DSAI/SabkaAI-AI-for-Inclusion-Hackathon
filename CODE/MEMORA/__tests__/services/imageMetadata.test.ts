import * as MediaLibrary from 'expo-media-library';
import ImageMetadataService from '../../src/services/imageMetadata';

jest.mock('expo-media-library');

describe('ImageMetadataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestPermissions', () => {
    it('should return true when permissions are granted', async () => {
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await ImageMetadataService.requestPermissions();
      expect(result).toBe(true);
    });

    it('should return false when permissions are denied', async () => {
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await ImageMetadataService.requestPermissions();
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission error')
      );

      const result = await ImageMetadataService.requestPermissions();
      expect(result).toBe(false);
    });
  });

  describe('getAllImages', () => {
    it('should return images when permissions are granted', async () => {
      const mockAssets = [
        {
          id: 'asset-1',
          uri: 'file:///test/image1.jpg',
          filename: 'image1.jpg',
          width: 1920,
          height: 1080,
          creationTime: Date.now(),
          modificationTime: Date.now(),
          mediaType: 'photo',
          duration: 0,
          albumId: 'album-1',
        },
      ];

      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (MediaLibrary.getAssetsAsync as jest.Mock).mockResolvedValue({
        assets: mockAssets,
        hasNextPage: false,
        endCursor: null,
      });

      const result = await ImageMetadataService.getAllImages();
      expect(result.images).toHaveLength(1);
      expect(result.images[0].id).toBe('asset-1');
      expect(result.hasNextPage).toBe(false);
    });

    it('should throw error when permissions are denied', async () => {
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      await expect(ImageMetadataService.getAllImages()).rejects.toThrow(
        'Media library permission denied'
      );
    });

    it('should handle pagination with after cursor', async () => {
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (MediaLibrary.getAssetsAsync as jest.Mock).mockResolvedValue({
        assets: [],
        hasNextPage: false,
        endCursor: null,
      });

      await ImageMetadataService.getAllImages(50, 'cursor-123');

      expect(MediaLibrary.getAssetsAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          first: 50,
          after: 'cursor-123',
        })
      );
    });
  });

  describe('getAssetInfo', () => {
    it('should return asset info', async () => {
      const mockAsset = {
        id: 'asset-1',
        uri: 'file:///test/image.jpg',
      };

      (MediaLibrary.getAssetInfoAsync as jest.Mock).mockResolvedValue(mockAsset);

      const result = await ImageMetadataService.getAssetInfo('asset-1');
      expect(result).toEqual(mockAsset);
    });

    it('should return null on error', async () => {
      (MediaLibrary.getAssetInfoAsync as jest.Mock).mockRejectedValue(
        new Error('Asset not found')
      );

      const result = await ImageMetadataService.getAssetInfo('invalid-id');
      expect(result).toBeNull();
    });
  });

  describe('deleteAsset', () => {
    it('should return true on successful deletion', async () => {
      (MediaLibrary.deleteAssetsAsync as jest.Mock).mockResolvedValue(true);

      const result = await ImageMetadataService.deleteAsset('asset-1');
      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      (MediaLibrary.deleteAssetsAsync as jest.Mock).mockRejectedValue(
        new Error('Delete failed')
      );

      const result = await ImageMetadataService.deleteAsset('asset-1');
      expect(result).toBe(false);
    });
  });

  describe('getUnprocessedImages', () => {
    it('should filter out processed images', async () => {
      const mockAssets = [
        { id: 'asset-1', uri: 'uri1', filename: 'f1', width: 100, height: 100, mediaType: 'photo' },
        { id: 'asset-2', uri: 'uri2', filename: 'f2', width: 100, height: 100, mediaType: 'photo' },
        { id: 'asset-3', uri: 'uri3', filename: 'f3', width: 100, height: 100, mediaType: 'photo' },
      ];

      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (MediaLibrary.getAssetsAsync as jest.Mock).mockResolvedValue({
        assets: mockAssets,
        hasNextPage: false,
        endCursor: null,
      });

      const processedIds = ['asset-1', 'asset-3'];
      const result = await ImageMetadataService.getUnprocessedImages(processedIds);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('asset-2');
    });

    it('should return empty array on error', async () => {
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission error')
      );

      const result = await ImageMetadataService.getUnprocessedImages([]);
      expect(result).toEqual([]);
    });
  });

  describe('createAlbum', () => {
    it('should return album id on success', async () => {
      (MediaLibrary.createAlbumAsync as jest.Mock).mockResolvedValue({
        id: 'new-album-id',
      });

      const result = await ImageMetadataService.createAlbum('Test Album');
      expect(result).toBe('new-album-id');
    });

    it('should return null on error', async () => {
      (MediaLibrary.createAlbumAsync as jest.Mock).mockRejectedValue(
        new Error('Album creation failed')
      );

      const result = await ImageMetadataService.createAlbum('Test Album');
      expect(result).toBeNull();
    });
  });

  describe('getAlbums', () => {
    it('should return albums list', async () => {
      const mockAlbums = [
        { id: 'album-1', title: 'Camera Roll' },
        { id: 'album-2', title: 'Screenshots' },
      ];

      (MediaLibrary.getAlbumsAsync as jest.Mock).mockResolvedValue(mockAlbums);

      const result = await ImageMetadataService.getAlbums();
      expect(result).toEqual(mockAlbums);
    });

    it('should return empty array on error', async () => {
      (MediaLibrary.getAlbumsAsync as jest.Mock).mockRejectedValue(
        new Error('Albums fetch failed')
      );

      const result = await ImageMetadataService.getAlbums();
      expect(result).toEqual([]);
    });
  });
});
