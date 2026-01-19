/**
 * Tests for MetadataWriterService
 * 
 * Covers:
 * - JPEG EXIF embedding
 * - PNG XMP embedding
 * - File handling and error cases
 * - Backup creation
 * - Gallery updates
 */

import { MetadataWriterService, WriteResult } from '../../src/services/metadataWriter';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

// Mock expo modules
jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  cacheDirectory: '/cache/',
  EncodingType: {
    Base64: 'base64',
    UTF8: 'utf8',
  },
}));

jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(),
  createAssetAsync: jest.fn(),
  getAssetInfoAsync: jest.fn(),
  addAssetsToAlbumAsync: jest.fn(),
}));

describe('MetadataWriterService', () => {
  const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;
  const mockMediaLibrary = MediaLibrary as jest.Mocked<typeof MediaLibrary>;

  // Valid JPEG base64 header (FFD8FFE0 for JFIF)
  const validJpegBase64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==';
  
  // Valid PNG base64 header
  const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true, size: 1000, isDirectory: false, uri: 'test', modificationTime: 0 });
    mockFileSystem.readAsStringAsync.mockResolvedValue(validJpegBase64);
    mockFileSystem.writeAsStringAsync.mockResolvedValue(undefined);
    mockFileSystem.copyAsync.mockResolvedValue(undefined);
    mockFileSystem.deleteAsync.mockResolvedValue(undefined);
    mockFileSystem.makeDirectoryAsync.mockResolvedValue(undefined);
    
    mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({ status: 'granted', granted: true, expires: 'never', canAskAgain: true });
    mockMediaLibrary.createAssetAsync.mockResolvedValue({ id: 'new-asset-123', uri: 'file:///new.jpg' } as MediaLibrary.Asset);
    mockMediaLibrary.getAssetInfoAsync.mockResolvedValue({ id: 'original-123', albumId: 'album-1' } as MediaLibrary.Asset);
    mockMediaLibrary.addAssetsToAlbumAsync.mockResolvedValue(true);
  });

  describe('constructor and configuration', () => {
    it('should create instance with default config', () => {
      const service = new MetadataWriterService();
      expect(service).toBeDefined();
    });

    it('should accept custom config', () => {
      const service = new MetadataWriterService({
        writeExif: true,
        writeXmp: false,
        createBackup: true,
      });
      expect(service).toBeDefined();
    });
  });

  describe('embedCaption', () => {
    it('should successfully embed caption in JPEG', async () => {
      const service = new MetadataWriterService();
      const result = await service.embedCaption(
        'file:///test.jpg',
        'A beautiful sunset over mountains',
        'asset-123'
      );

      expect(result.success).toBe(true);
      expect(result.assetId).toBe('new-asset-123');
      expect(result.wroteExif).toBe(true);
      expect(result.wroteXmp).toBe(true);
    });

    it('should fail with empty URI', async () => {
      const service = new MetadataWriterService();
      const result = await service.embedCaption('', 'Test caption');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No source URI');
    });

    it('should fail with empty caption', async () => {
      const service = new MetadataWriterService();
      const result = await service.embedCaption('file:///test.jpg', '');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Empty caption');
    });

    it('should fail with whitespace-only caption', async () => {
      const service = new MetadataWriterService();
      const result = await service.embedCaption('file:///test.jpg', '   ');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Empty caption');
    });

    it('should fail when source file does not exist', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: false, isDirectory: false, uri: 'test' });

      const service = new MetadataWriterService();
      const result = await service.embedCaption('file:///nonexistent.jpg', 'Caption');

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });

    it('should handle file read errors', async () => {
      mockFileSystem.readAsStringAsync.mockRejectedValue(new Error('Read error'));

      const service = new MetadataWriterService();
      const result = await service.embedCaption('file:///test.jpg', 'Caption');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to read');
    });

    it('should handle content:// URIs by copying first', async () => {
      const service = new MetadataWriterService();
      await service.embedCaption('content://media/images/123', 'Caption');

      expect(mockFileSystem.copyAsync).toHaveBeenCalled();
    });

    it('should handle ph:// URIs (iOS) by copying first', async () => {
      const service = new MetadataWriterService();
      await service.embedCaption('ph://asset-123', 'Caption');

      expect(mockFileSystem.copyAsync).toHaveBeenCalled();
    });

    it('should clean up temp files after processing', async () => {
      const service = new MetadataWriterService();
      await service.embedCaption('file:///test.jpg', 'Caption');

      // Should delete the temp modified file
      expect(mockFileSystem.deleteAsync).toHaveBeenCalled();
    });
  });

  describe('JPEG EXIF embedding', () => {
    it('should embed EXIF in valid JPEG', async () => {
      mockFileSystem.readAsStringAsync.mockResolvedValue(validJpegBase64);

      const service = new MetadataWriterService();
      const result = await service.embedCaption('file:///test.jpg', 'Test EXIF caption');

      expect(result.success).toBe(true);
      expect(mockFileSystem.writeAsStringAsync).toHaveBeenCalled();
      
      // Verify the written data is valid base64
      const writeCall = mockFileSystem.writeAsStringAsync.mock.calls[0];
      expect(writeCall[1]).toBeTruthy();
      expect(typeof writeCall[1]).toBe('string');
    });

    it('should handle long captions', async () => {
      mockFileSystem.readAsStringAsync.mockResolvedValue(validJpegBase64);

      const longCaption = 'A'.repeat(1000);
      const service = new MetadataWriterService();
      const result = await service.embedCaption('file:///test.jpg', longCaption);

      expect(result.success).toBe(true);
    });

    it('should handle special characters in caption', async () => {
      mockFileSystem.readAsStringAsync.mockResolvedValue(validJpegBase64);

      const service = new MetadataWriterService();
      const result = await service.embedCaption(
        'file:///test.jpg',
        'Caption with "quotes" and <tags> & symbols'
      );

      expect(result.success).toBe(true);
    });

    it('should handle unicode characters by converting to ASCII', async () => {
      mockFileSystem.readAsStringAsync.mockResolvedValue(validJpegBase64);

      const service = new MetadataWriterService();
      const result = await service.embedCaption(
        'file:///test.jpg',
        'Caption with émojis 🌅'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('PNG XMP embedding', () => {
    it('should embed XMP in valid PNG', async () => {
      mockFileSystem.readAsStringAsync.mockResolvedValue(validPngBase64);

      const service = new MetadataWriterService({ writeXmp: true });
      const result = await service.embedCaption('file:///test.png', 'Test XMP caption');

      expect(result.success).toBe(true);
    });

    it('should escape XML special characters in XMP', async () => {
      mockFileSystem.readAsStringAsync.mockResolvedValue(validPngBase64);

      const service = new MetadataWriterService();
      const result = await service.embedCaption(
        'file:///test.png',
        'Caption with <xml> & "quotes"'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('gallery integration', () => {
    it('should create asset in gallery', async () => {
      const service = new MetadataWriterService();
      await service.embedCaption('file:///test.jpg', 'Caption');

      expect(mockMediaLibrary.createAssetAsync).toHaveBeenCalled();
    });

    it('should fail when gallery permission denied', async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({ 
        status: 'denied', 
        granted: false, 
        expires: 'never', 
        canAskAgain: true 
      });

      const service = new MetadataWriterService();
      const result = await service.embedCaption('file:///test.jpg', 'Caption');

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission denied');
    });

    it('should add to original album when asset ID provided', async () => {
      const service = new MetadataWriterService();
      await service.embedCaption('file:///test.jpg', 'Caption', 'original-asset-123');

      expect(mockMediaLibrary.getAssetInfoAsync).toHaveBeenCalledWith('original-asset-123');
      expect(mockMediaLibrary.addAssetsToAlbumAsync).toHaveBeenCalled();
    });

    it('should continue even if album add fails', async () => {
      mockMediaLibrary.addAssetsToAlbumAsync.mockRejectedValue(new Error('Album error'));

      const service = new MetadataWriterService();
      const result = await service.embedCaption('file:///test.jpg', 'Caption', 'asset-123');

      // Should still succeed - album add is optional
      expect(result.success).toBe(true);
    });
  });

  describe('backup functionality', () => {
    it('should create backup when configured', async () => {
      const service = new MetadataWriterService({ createBackup: true });
      await service.embedCaption('file:///test.jpg', 'Caption', 'asset-123');

      expect(mockFileSystem.copyAsync).toHaveBeenCalled();
    });

    it('should create backup directory if not exists', async () => {
      mockFileSystem.getInfoAsync.mockImplementation(async (uri) => {
        if (typeof uri === 'string' && uri.includes('backup')) {
          return { exists: false, isDirectory: false, uri };
        }
        return { exists: true, size: 1000, isDirectory: false, uri: String(uri), modificationTime: 0 };
      });

      const service = new MetadataWriterService({ createBackup: true });
      await service.embedCaption('file:///test.jpg', 'Caption', 'asset-123');

      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalled();
    });

    it('should not create backup when not configured', async () => {
      const service = new MetadataWriterService({ createBackup: false });
      await service.embedCaption('file:///test.jpg', 'Caption', 'asset-123');

      // copyAsync should only be called for content:// URIs, not for backup
      const copyCallsForBackup = mockFileSystem.copyAsync.mock.calls.filter(
        call => String(call[0]).includes('backup')
      );
      expect(copyCallsForBackup.length).toBe(0);
    });
  });

  describe('embedCaptionsBatch', () => {
    it('should process multiple images', async () => {
      const service = new MetadataWriterService();
      const results = await service.embedCaptionsBatch([
        { uri: 'file:///test1.jpg', caption: 'Caption 1' },
        { uri: 'file:///test2.jpg', caption: 'Caption 2' },
        { uri: 'file:///test3.jpg', caption: 'Caption 3' },
      ]);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should continue processing even if one fails', async () => {
      mockFileSystem.getInfoAsync.mockImplementation(async (uri) => {
        if (String(uri).includes('test2')) {
          return { exists: false, isDirectory: false, uri: String(uri) };
        }
        return { exists: true, size: 1000, isDirectory: false, uri: String(uri), modificationTime: 0 };
      });

      const service = new MetadataWriterService();
      const results = await service.embedCaptionsBatch([
        { uri: 'file:///test1.jpg', caption: 'Caption 1' },
        { uri: 'file:///test2.jpg', caption: 'Caption 2' },
        { uri: 'file:///test3.jpg', caption: 'Caption 3' },
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });

    it('should handle empty batch', async () => {
      const service = new MetadataWriterService();
      const results = await service.embedCaptionsBatch([]);

      expect(results).toHaveLength(0);
    });
  });

  describe('createXmpSidecar', () => {
    it('should create XMP sidecar file', async () => {
      const service = new MetadataWriterService();
      const result = await service.createXmpSidecar(
        'file:///photos/test.jpg',
        'Sidecar caption'
      );

      expect(result.success).toBe(true);
      expect(result.sidecarPath).toBe('file:///photos/test.xmp');
      expect(mockFileSystem.writeAsStringAsync).toHaveBeenCalled();
    });

    it('should escape XML characters in sidecar', async () => {
      const service = new MetadataWriterService();
      await service.createXmpSidecar(
        'file:///test.jpg',
        'Caption with <xml> & "special" chars'
      );

      const writeCall = mockFileSystem.writeAsStringAsync.mock.calls[0];
      const xmpContent = writeCall[1] as string;
      
      expect(xmpContent).toContain('&lt;xml&gt;');
      expect(xmpContent).toContain('&amp;');
      expect(xmpContent).toContain('&quot;');
    });

    it('should handle write errors', async () => {
      mockFileSystem.writeAsStringAsync.mockRejectedValue(new Error('Write error'));

      const service = new MetadataWriterService();
      const result = await service.createXmpSidecar('file:///test.jpg', 'Caption');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Write error');
    });
  });

  describe('verifyCaption', () => {
    it('should return true for now (placeholder)', async () => {
      const service = new MetadataWriterService();
      const result = await service.verifyCaption('file:///test.jpg', 'Caption');

      expect(result).toBe(true);
    });
  });

  describe('file extension handling', () => {
    it('should extract jpg extension', async () => {
      const service = new MetadataWriterService();
      await service.embedCaption('file:///photos/test.jpg', 'Caption');

      const writeCall = mockFileSystem.writeAsStringAsync.mock.calls[0];
      expect(writeCall[0]).toContain('.jpg');
    });

    it('should extract png extension', async () => {
      mockFileSystem.readAsStringAsync.mockResolvedValue(validPngBase64);

      const service = new MetadataWriterService();
      await service.embedCaption('file:///photos/test.png', 'Caption');

      const writeCall = mockFileSystem.writeAsStringAsync.mock.calls[0];
      expect(writeCall[0]).toContain('.png');
    });

    it('should default to jpg for unknown extension', async () => {
      const service = new MetadataWriterService();
      await service.embedCaption('file:///photos/test', 'Caption');

      const writeCall = mockFileSystem.writeAsStringAsync.mock.calls[0];
      expect(writeCall[0]).toContain('.jpg');
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      mockFileSystem.getInfoAsync.mockRejectedValue(new Error('Unexpected error'));

      const service = new MetadataWriterService();
      const result = await service.embedCaption('file:///test.jpg', 'Caption');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle temp file write errors', async () => {
      mockFileSystem.writeAsStringAsync.mockRejectedValue(new Error('Disk full'));

      const service = new MetadataWriterService();
      const result = await service.embedCaption('file:///test.jpg', 'Caption');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to write temp file');
    });

    it('should handle gallery save errors', async () => {
      mockMediaLibrary.createAssetAsync.mockRejectedValue(new Error('Gallery error'));

      const service = new MetadataWriterService();
      const result = await service.embedCaption('file:///test.jpg', 'Caption');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to save to gallery');
    });
  });
});
