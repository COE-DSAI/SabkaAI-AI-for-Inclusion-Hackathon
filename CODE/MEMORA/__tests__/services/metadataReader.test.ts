import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import MetadataReaderService from '../../src/services/metadataReader';

jest.mock('expo-file-system');
jest.mock('expo-media-library');

describe('MetadataReaderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFormatFromUri', () => {
    it('should extract jpg extension', () => {
      expect(MetadataReaderService.getFormatFromUri('file:///photo.jpg')).toBe('jpg');
    });

    it('should extract png extension', () => {
      expect(MetadataReaderService.getFormatFromUri('/path/to/image.PNG')).toBe('png');
    });

    it('should handle heic extension', () => {
      expect(MetadataReaderService.getFormatFromUri('image.HEIC')).toBe('heic');
    });

    it('should handle path without dots', () => {
      const result = MetadataReaderService.getFormatFromUri('file:///noextension');
      expect(typeof result).toBe('string');
    });
  });

  describe('isFormatSupported', () => {
    it('should return true for supported formats', () => {
      expect(MetadataReaderService.isFormatSupported('jpg')).toBe(true);
      expect(MetadataReaderService.isFormatSupported('jpeg')).toBe(true);
      expect(MetadataReaderService.isFormatSupported('png')).toBe(true);
      expect(MetadataReaderService.isFormatSupported('webp')).toBe(true);
      expect(MetadataReaderService.isFormatSupported('heic')).toBe(true);
    });

    it('should return false for unsupported formats', () => {
      expect(MetadataReaderService.isFormatSupported('pdf')).toBe(false);
      expect(MetadataReaderService.isFormatSupported('doc')).toBe(false);
      expect(MetadataReaderService.isFormatSupported('mp4')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(MetadataReaderService.isFormatSupported('JPG')).toBe(true);
      expect(MetadataReaderService.isFormatSupported('PNG')).toBe(true);
    });
  });

  describe('evaluateCaptionQuality', () => {
    it('should return zero score for empty caption', () => {
      const result = MetadataReaderService.evaluateCaptionQuality('');
      expect(result.score).toBe(0);
      expect(result.hasMinimumLength).toBe(false);
      expect(result.needsImprovement).toBe(true);
    });

    it('should return zero score for undefined caption', () => {
      const result = MetadataReaderService.evaluateCaptionQuality(undefined);
      expect(result.score).toBe(0);
      expect(result.isGeneric).toBe(true);
    });

    it('should detect generic captions', () => {
      const result = MetadataReaderService.evaluateCaptionQuality('image');
      expect(result.isGeneric).toBe(true);
      expect(result.needsImprovement).toBe(true);
    });

    it('should detect generic caption variations', () => {
      expect(MetadataReaderService.evaluateCaptionQuality('photo').isGeneric).toBe(true);
      expect(MetadataReaderService.evaluateCaptionQuality('screenshot').isGeneric).toBe(true);
      expect(MetadataReaderService.evaluateCaptionQuality('untitled').isGeneric).toBe(true);
    });

    it('should give high score for descriptive captions', () => {
      const result = MetadataReaderService.evaluateCaptionQuality(
        'A person walking through a sunny park with trees and flowers in bloom'
      );
      expect(result.score).toBe(100);
      expect(result.hasMinimumLength).toBe(true);
      expect(result.hasAccessibilityValue).toBe(true);
      expect(result.isGeneric).toBe(false);
      expect(result.needsImprovement).toBe(false);
    });

    it('should give medium score for short captions', () => {
      const result = MetadataReaderService.evaluateCaptionQuality('Person in park');
      expect(result.score).toBeGreaterThan(25);
      expect(result.score).toBeLessThan(100);
      expect(result.hasMinimumLength).toBe(true);
    });
  });

  describe('readImageMetadata', () => {
    it('should return not supported for unsupported formats', async () => {
      const result = await MetadataReaderService.readImageMetadata('file:///doc.pdf');
      expect(result.isSupported).toBe(false);
      expect(result.hasCaption).toBe(false);
    });

    it('should return default for non-existent file', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false,
      });

      const result = await MetadataReaderService.readImageMetadata('file:///missing.jpg');
      expect(result.hasCaption).toBe(false);
      expect(result.isSupported).toBe(true);
    });

    it('should handle file read errors gracefully', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
      });
      (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(
        new Error('Read error')
      );

      const result = await MetadataReaderService.readImageMetadata('file:///error.jpg');
      expect(result.hasCaption).toBe(false);
      expect(result.format).toBe('jpg');
    });

    it('should extract XMP description when present', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
      });

      const xmpContent = `<x:xmpmeta><rdf:RDF><dc:description>A scenic mountain view</dc:description></rdf:RDF></x:xmpmeta>`;
      const base64Content = Buffer.from(xmpContent).toString('base64');
      
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(base64Content);

      const result = await MetadataReaderService.readImageMetadata('file:///photo.jpg');
      expect(result.hasCaption).toBe(true);
      expect(result.caption).toBe('A scenic mountain view');
    });
  });

  describe('needsProcessing', () => {
    it('should return false for unsupported formats', async () => {
      const result = await MetadataReaderService.needsProcessing('file:///doc.pdf');
      expect(result).toBe(false);
    });

    it('should return true for image without caption', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
      });
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        Buffer.from('no xmp data here').toString('base64')
      );

      const result = await MetadataReaderService.needsProcessing('file:///nocap.jpg');
      expect(result).toBe(true);
    });

    it('should return true for image with generic caption', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
      });

      const xmpContent = `<x:xmpmeta><dc:description>image</dc:description></x:xmpmeta>`;
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        Buffer.from(xmpContent).toString('base64')
      );

      const result = await MetadataReaderService.needsProcessing('file:///generic.jpg');
      expect(result).toBe(true);
    });

    it('should return false for image with quality caption', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
      });

      const xmpContent = `<x:xmpmeta><dc:description>A beautiful sunset over the ocean with colorful clouds and silhouettes</dc:description></x:xmpmeta>`;
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        Buffer.from(xmpContent).toString('base64')
      );

      const result = await MetadataReaderService.needsProcessing('file:///quality.jpg');
      expect(result).toBe(false);
    });
  });

  describe('batchCheckProcessingNeeded', () => {
    it('should return map of processing status for multiple uris', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
      });
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        Buffer.from('no xmp').toString('base64')
      );

      const uris = ['file:///a.jpg', 'file:///b.jpg'];
      const result = await MetadataReaderService.batchCheckProcessingNeeded(uris);

      expect(result.size).toBe(2);
      expect(result.get('file:///a.jpg')).toBe(true);
      expect(result.get('file:///b.jpg')).toBe(true);
    });

    it('should handle mixed supported and unsupported formats', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
      });
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        Buffer.from('no xmp').toString('base64')
      );

      const uris = ['file:///photo.jpg', 'file:///doc.pdf'];
      const result = await MetadataReaderService.batchCheckProcessingNeeded(uris);

      expect(result.get('file:///photo.jpg')).toBe(true);
      expect(result.get('file:///doc.pdf')).toBe(false);
    });
  });

  describe('getAssetMetadata', () => {
    it('should return null for non-existent asset', async () => {
      (MediaLibrary.getAssetInfoAsync as jest.Mock).mockResolvedValue(null);

      const result = await MetadataReaderService.getAssetMetadata('non-existent');
      expect(result).toBeNull();
    });

    it('should return metadata with asset dimensions', async () => {
      (MediaLibrary.getAssetInfoAsync as jest.Mock).mockResolvedValue({
        id: 'asset-1',
        uri: 'file:///photo.jpg',
        localUri: 'file:///local/photo.jpg',
        width: 1920,
        height: 1080,
        creationTime: 1704067200000,
        modificationTime: 1704153600000,
      });
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
      });
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        Buffer.from('no xmp').toString('base64')
      );

      const result = await MetadataReaderService.getAssetMetadata('asset-1');
      expect(result).not.toBeNull();
      expect(result?.width).toBe(1920);
      expect(result?.height).toBe(1080);
      expect(result?.dateCreated).toBe(1704067200000);
    });

    it('should handle errors gracefully', async () => {
      (MediaLibrary.getAssetInfoAsync as jest.Mock).mockRejectedValue(
        new Error('Asset error')
      );

      const result = await MetadataReaderService.getAssetMetadata('error-id');
      expect(result).toBeNull();
    });
  });

  describe('getImageDimensions', () => {
    it('should return null for unsupported format', async () => {
      const result = await MetadataReaderService.getImageDimensions('file:///video.mp4');
      expect(result).toBeNull();
    });

    it('should handle read errors gracefully', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(
        new Error('Read error')
      );

      const result = await MetadataReaderService.getImageDimensions('file:///error.jpg');
      expect(result).toBeNull();
    });

    it('should parse PNG dimensions correctly', async () => {
      const pngHeader = Buffer.alloc(24);
      pngHeader[0] = 0x89;
      pngHeader[1] = 0x50;
      pngHeader[2] = 0x4E;
      pngHeader[3] = 0x47;
      pngHeader.writeUInt32BE(800, 16);
      pngHeader.writeUInt32BE(600, 20);

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        pngHeader.toString('base64')
      );

      const result = await MetadataReaderService.getImageDimensions('file:///image.png');
      expect(result).toEqual({ width: 800, height: 600 });
    });
  });

  describe('extractXmpMetadata', () => {
    it('should return empty object when no XMP found', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        Buffer.from('raw image data without xmp').toString('base64')
      );

      const result = await MetadataReaderService.extractXmpMetadata('file:///noxmp.jpg');
      expect(result).toEqual({});
    });

    it('should extract alt text accessibility tag', async () => {
      const xmpContent = `<x:xmpmeta><Iptc4xmpCore:AltTextAccessibility>Accessible description</Iptc4xmpCore:AltTextAccessibility></x:xmpmeta>`;
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        Buffer.from(xmpContent).toString('base64')
      );

      const result = await MetadataReaderService.extractXmpMetadata('file:///alt.jpg');
      expect(result.altText).toBe('Accessible description');
    });

    it('should handle XMP with RDF Alt structure', async () => {
      const xmpContent = `<x:xmpmeta><dc:description><rdf:Alt><rdf:li xml:lang="x-default">RDF description</rdf:li></rdf:Alt></dc:description></x:xmpmeta>`;
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        Buffer.from(xmpContent).toString('base64')
      );

      const result = await MetadataReaderService.extractXmpMetadata('file:///rdf.jpg');
      expect(result.description).toBe('RDF description');
    });

    it('should decode XML entities', async () => {
      const xmpContent = `<x:xmpmeta><dc:description>John &amp; Jane&apos;s photo</dc:description></x:xmpmeta>`;
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        Buffer.from(xmpContent).toString('base64')
      );

      const result = await MetadataReaderService.extractXmpMetadata('file:///entities.jpg');
      expect(result.description).toBe("John & Jane's photo");
    });
  });
});
