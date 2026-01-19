/**
 * Integration Tests - End-to-End Pipeline Validation
 * 
 * Tests the full flow from image detection to caption embedding:
 * 1. Gallery access and image detection
 * 2. Metadata reading and quality check
 * 3. AI captioning with fallback chain
 * 4. Metadata writing
 */

// Mock expo modules BEFORE importing services
jest.mock('expo-media-library');
jest.mock('expo-file-system');
jest.mock('@react-native-async-storage/async-storage');

import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import types
import type { ImageData } from '../../src/types';

// Use actual service implementations
const { GalleryAccessService } = jest.requireActual('../../src/services/galleryAccess');
const { MetadataReaderService } = jest.requireActual('../../src/services/metadataReader');
const { CaptioningService } = jest.requireActual('../../src/services/captioning');
const { MetadataWriterService } = jest.requireActual('../../src/services/metadataWriter');

describe('Integration: Full Captioning Pipeline', () => {
  const mockMediaLibrary = MediaLibrary as jest.Mocked<typeof MediaLibrary>;
  const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      expires: 'never',
      canAskAgain: true,
    });
    
    mockMediaLibrary.getAssetsAsync.mockResolvedValue({
      assets: [
        {
          id: 'test-image-1',
          uri: 'file:///test/image1.jpg',
          filename: 'image1.jpg',
          mediaType: 'photo',
          width: 1920,
          height: 1080,
          creationTime: Date.now() - 1000,
          modificationTime: Date.now(),
          duration: 0,
          albumId: 'album-1',
        } as MediaLibrary.Asset,
      ],
      endCursor: 'cursor',
      hasNextPage: false,
      totalCount: 1,
    });
    
    mockFileSystem.getInfoAsync.mockResolvedValue({
      exists: true,
      size: 1000,
      isDirectory: false,
      uri: 'test',
      modificationTime: Date.now(),
    });
    
    // JPEG header for valid image detection
    mockFileSystem.readAsStringAsync.mockResolvedValue(
      '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQ='
    );
    
    mockFileSystem.writeAsStringAsync.mockResolvedValue(undefined);
    mockFileSystem.copyAsync.mockResolvedValue(undefined);
    mockFileSystem.deleteAsync.mockResolvedValue(undefined);
    
    mockMediaLibrary.createAssetAsync.mockResolvedValue({
      id: 'new-asset-id',
      uri: 'file:///new/asset.jpg',
    } as MediaLibrary.Asset);
    
    // Mock fetch for API calls
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [
          {
            content: {
              parts: [{ text: 'A beautiful sunset over mountains' }],
            },
          },
        ],
      }),
    });
  });

  describe('GalleryAccess → MetadataReader Flow', () => {
    it('should detect new images and check for existing captions', async () => {
      // Step 1: Check permissions (static method)
      const hasAccess = await GalleryAccessService.hasFullAccess();
      expect(hasAccess).toBe(true);
      
      // Step 2: Get new images (static method)
      const changeResult = await GalleryAccessService.detectNewImages(10);
      expect(changeResult.newImages.length).toBeGreaterThan(0);
      
      // Step 3: Check metadata for each image (static method)
      for (const image of changeResult.newImages) {
        const metadata = await MetadataReaderService.readImageMetadata(image.uri);
        // New images shouldn't have captions
        expect(metadata).toBeDefined();
      }
    });

    it('should track processed images', async () => {
      // Add processed image ID (static method)
      await GalleryAccessService.addProcessedImageId('test-image-1');
      
      // Check if it's tracked
      const processedIds = await GalleryAccessService.getProcessedImageIds();
      expect(processedIds.has('test-image-1')).toBe(true);
    });
  });

  describe('MetadataReader → Captioning Flow', () => {
    it('should identify images needing captions', async () => {
      // Image with no caption
      mockFileSystem.readAsStringAsync.mockResolvedValue(
        '/9j/4AAQSkZJRgABAQAAAQABAAD/'
      );
      
      const metadata = await MetadataReaderService.readImageMetadata('file:///test.jpg');
      
      // Should indicate no existing quality caption
      if (metadata?.description) {
        const quality = MetadataReaderService.evaluateCaptionQuality(metadata.description);
        expect(quality.score).toBeLessThan(50);
      }
    });

    it('should skip images with good existing captions', () => {
      const quality = MetadataReaderService.evaluateCaptionQuality(
        'A person standing in front of a historic brick building with ornate windows'
      );
      
      expect(quality.score).toBeGreaterThanOrEqual(50);
      expect(quality.isGeneric).toBe(false);
    });
  });

  describe('Captioning → MetadataWriter Flow', () => {
    it('should generate caption and embed in metadata', async () => {
      const captioningService = new CaptioningService({
        preferredProvider: 'gemini',
        geminiApiKey: 'test-key',
      });
      
      const metadataWriter = new MetadataWriterService();
      
      // Generate caption
      const captionResult = await captioningService.generateCaption(
        'file:///test.jpg',
        false
      );
      
      expect(captionResult.caption).toBeTruthy();
      expect(captionResult.confidence).toBeGreaterThan(0);
      
      // Embed caption
      const writeResult = await metadataWriter.embedCaption(
        'file:///test.jpg',
        captionResult.caption,
        'test-asset-id'
      );
      
      expect(writeResult.success).toBe(true);
    });

    it('should handle captioning errors gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const captioningService = new CaptioningService({
        preferredProvider: 'gemini',
        geminiApiKey: 'test-key',
      });
      
      const result = await captioningService.generateCaption(
        'file:///test.jpg',
        false
      );
      
      // Should fallback to on-device or return error
      expect(result.provider).toBeDefined();
    });
  });

  describe('Full Pipeline Integration', () => {
    it('should process image through complete pipeline', async () => {
      // Initialize services (non-static)
      const captioningService = new CaptioningService({
        preferredProvider: 'gemini',
        geminiApiKey: 'test-key',
      });
      const metadataWriter = new MetadataWriterService();
      
      // Step 1: Get permission (static)
      const permission = await GalleryAccessService.requestPermission();
      expect(permission.granted).toBe(true);
      
      // Step 2: Get new images (static)
      const changeResult = await GalleryAccessService.detectNewImages(1);
      expect(changeResult.newImages.length).toBe(1);
      
      const image = changeResult.newImages[0];
      
      // Step 3: Check existing metadata (static)
      const existingMetadata = await MetadataReaderService.readImageMetadata(image.uri);
      const needsCaption = !existingMetadata?.description || 
        MetadataReaderService.evaluateCaptionQuality(existingMetadata.description).score < 50;
      
      if (needsCaption) {
        // Step 4: Generate caption
        const captionResult = await captioningService.generateCaption(image.uri, false);
        expect(captionResult.caption).toBeTruthy();
        
        // Step 5: Write caption to metadata
        const writeResult = await metadataWriter.embedCaption(
          image.uri,
          captionResult.caption,
          image.id
        );
        expect(writeResult.success).toBe(true);
        
        // Step 6: Mark as processed (static)
        await GalleryAccessService.addProcessedImageId(image.id);
        const processedIds = await GalleryAccessService.getProcessedImageIds();
        expect(processedIds.has(image.id)).toBe(true);
      }
    });
  });
});

describe('Integration: Error Recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should recover from permission denial', async () => {
    const mockMediaLibrary = MediaLibrary as jest.Mocked<typeof MediaLibrary>;
    // hasFullAccess uses getPermissionsAsync, not requestPermissionsAsync
    mockMediaLibrary.getPermissionsAsync.mockResolvedValue({
      status: 'denied',
      granted: false,
      expires: 'never',
      canAskAgain: true,
    });
    
    // Use static method (GalleryAccessService only has static methods)
    const hasAccess = await GalleryAccessService.hasFullAccess();
    
    expect(hasAccess).toBe(false);
  });

  it('should handle API rate limits', async () => {
    // First call succeeds
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{ content: { parts: [{ text: 'Caption 1' }] } }],
        }),
      })
      // Second call rate limited
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      })
      // Third call succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{ content: { parts: [{ text: 'Caption 3' }] } }],
        }),
      });
    
    const captioningService = new CaptioningService({
      preferredProvider: 'gemini',
      geminiApiKey: 'test-key',
    });
    
    // First should succeed
    const result1 = await captioningService.generateCaption('file:///1.jpg', false);
    expect(result1.caption).toBeTruthy();
    
    // Second may fallback
    const result2 = await captioningService.generateCaption('file:///2.jpg', false);
    expect(result2).toBeDefined();
    
    // Third should succeed again
    const result3 = await captioningService.generateCaption('file:///3.jpg', false);
    expect(result3.caption).toBeTruthy();
  });

  it('should handle file system errors', async () => {
    const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;
    mockFileSystem.getInfoAsync.mockResolvedValue({
      exists: false,
      isDirectory: false,
      uri: 'test',
    });
    
    const metadataWriter = new MetadataWriterService();
    const result = await metadataWriter.embedCaption(
      'file:///nonexistent.jpg',
      'Test caption'
    );
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('does not exist');
  });
});

describe('Integration: Provider Fallback Chain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;
    mockFileSystem.getInfoAsync.mockResolvedValue({
      exists: true,
      size: 1000,
      isDirectory: false,
      uri: 'test',
      modificationTime: Date.now(),
    });
    mockFileSystem.readAsStringAsync.mockResolvedValue(
      '/9j/4AAQSkZJRgABAQAAAQABAAD/'
    );
  });

  it('should fallback from Gemini to OpenAI on error', async () => {
    // Gemini fails
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })
      // OpenAI succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'OpenAI caption' } }],
        }),
      });
    
    const captioningService = new CaptioningService({
      preferredProvider: 'gemini',
      geminiApiKey: 'gemini-key',
      openaiApiKey: 'openai-key',
    });
    
    const result = await captioningService.generateCaption('file:///test.jpg', false);
    
    // Should have gotten a caption from OpenAI fallback
    expect(result.caption).toBeTruthy();
  });

  it('should return error when all cloud APIs fail', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    
    const captioningService = new CaptioningService({
      preferredProvider: 'gemini',
      geminiApiKey: 'gemini-key',
      openaiApiKey: 'openai-key',
    });
    
    const result = await captioningService.generateCaption('file:///test.jpg', false);
    
    // Cloud providers no longer fall back to on-device
    // When all cloud APIs fail, it returns the last failed provider with error
    expect(result.isFromFallback).toBe(true);
    expect(result.error).toBeTruthy();
    // Should still return a fallback caption
    expect(result.caption).toBeTruthy();
  });
});

describe('Integration: Data Persistence', () => {
  it('should persist processed image tracking', async () => {
    const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    
    // Add processed image IDs (static methods)
    await GalleryAccessService.addProcessedImageId('image-1');
    await GalleryAccessService.addProcessedImageId('image-2');
    
    // Verify setItem was called
    expect(mockAsyncStorage.setItem).toHaveBeenCalled();
  });

  it('should retrieve processed IDs', async () => {
    const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(['image-1', 'image-2']));
    
    const processedIds = await GalleryAccessService.getProcessedImageIds();
    expect(processedIds.has('image-1')).toBe(true);
    expect(processedIds.has('image-2')).toBe(true);
  });
});

describe('Integration: Accessibility Focus', () => {
  it('should generate screen-reader friendly captions', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [
          {
            content: {
              parts: [{
                text: 'A smiling family of four standing in front of a red brick house. Two adults and two children are posing together on the front porch.'
              }],
            },
          },
        ],
      }),
    });
    
    const captioningService = new CaptioningService({
      preferredProvider: 'gemini',
      geminiApiKey: 'test-key',
    });
    
    const result = await captioningService.generateCaption('file:///family.jpg', true);
    
    // Should be descriptive enough for screen readers
    expect(result.caption.length).toBeGreaterThan(50);
    expect(result.confidence).toBeGreaterThan(50);
  });

  it('should evaluate caption quality for accessibility', () => {
    // Good accessibility caption (static method)
    const goodQuality = MetadataReaderService.evaluateCaptionQuality(
      'A golden retriever puppy playing with a red ball in a sunny backyard with green grass'
    );
    expect(goodQuality.score).toBeGreaterThan(70);
    
    // Poor generic caption
    const poorQuality = MetadataReaderService.evaluateCaptionQuality('Image');
    expect(poorQuality.score).toBeLessThan(30);
    expect(poorQuality.isGeneric).toBe(true);
  });
});
