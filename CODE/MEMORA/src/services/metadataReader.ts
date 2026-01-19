import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

export interface ImageMetadataInfo {
  hasCaption: boolean;
  caption?: string;
  hasDescription: boolean;
  description?: string;
  hasAltText: boolean;
  altText?: string;
  format: string;
  isSupported: boolean;
  width?: number;
  height?: number;
  dateCreated?: number;
  dateModified?: number;
}

export interface CaptionQuality {
  score: number;
  hasMinimumLength: boolean;
  hasAccessibilityValue: boolean;
  isGeneric: boolean;
  needsImprovement: boolean;
}

const SUPPORTED_FORMATS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'heic',
  'heif',
  'gif',
  'bmp',
  'tiff',
];

const GENERIC_CAPTIONS = [
  'image',
  'photo',
  'picture',
  'img',
  'screenshot',
  'attachment',
  'untitled',
  'no description',
  'no caption',
];

const EXIF_DESCRIPTION_MARKER = Buffer.from([0x00, 0x9e, 0x00, 0x00]);
const XMP_START = '<x:xmpmeta';
const XMP_END = '</x:xmpmeta>';
const DESCRIPTION_TAG = 'dc:description';
const ALT_TEXT_TAG = 'Iptc4xmpCore:AltTextAccessibility';

export class MetadataReaderService {
  static getFormatFromUri(uri: string): string {
    const extension = uri.split('.').pop()?.toLowerCase() || '';
    return extension;
  }

  static isFormatSupported(format: string): boolean {
    return SUPPORTED_FORMATS.includes(format.toLowerCase());
  }

  static async readImageMetadata(uri: string): Promise<ImageMetadataInfo> {
    const format = this.getFormatFromUri(uri);
    const isSupported = this.isFormatSupported(format);

    const defaultResult: ImageMetadataInfo = {
      hasCaption: false,
      hasDescription: false,
      hasAltText: false,
      format,
      isSupported,
    };

    if (!isSupported) {
      return defaultResult;
    }

    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        return defaultResult;
      }

      const xmpData = await this.extractXmpMetadata(uri);
      
      const caption = xmpData.caption || xmpData.description;
      const description = xmpData.description;
      const altText = xmpData.altText;

      return {
        hasCaption: !!caption && caption.trim().length > 0,
        caption: caption?.trim(),
        hasDescription: !!description && description.trim().length > 0,
        description: description?.trim(),
        hasAltText: !!altText && altText.trim().length > 0,
        altText: altText?.trim(),
        format,
        isSupported: true,
      };
    } catch {
      return defaultResult;
    }
  }

  static async extractXmpMetadata(uri: string): Promise<{
    caption?: string;
    description?: string;
    altText?: string;
  }> {
    try {
      const content = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
        length: 65536,
        position: 0,
      });

      const decoded = Buffer.from(content, 'base64').toString('utf8');
      
      const xmpStartIndex = decoded.indexOf(XMP_START);
      const xmpEndIndex = decoded.indexOf(XMP_END);

      if (xmpStartIndex === -1 || xmpEndIndex === -1) {
        return {};
      }

      const xmpContent = decoded.substring(xmpStartIndex, xmpEndIndex + XMP_END.length);

      const description = this.extractXmpTag(xmpContent, DESCRIPTION_TAG);
      const altText = this.extractXmpTag(xmpContent, ALT_TEXT_TAG);

      return {
        caption: description || altText,
        description,
        altText,
      };
    } catch {
      return {};
    }
  }

  private static extractXmpTag(xmpContent: string, tagName: string): string | undefined {
    const patterns = [
      new RegExp(`<${tagName}[^>]*>([^<]+)</${tagName}>`, 'i'),
      new RegExp(`<${tagName}[^>]*><rdf:Alt><rdf:li[^>]*>([^<]+)</rdf:li></rdf:Alt></${tagName}>`, 'i'),
      new RegExp(`${tagName}="([^"]+)"`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = xmpContent.match(pattern);
      if (match && match[1]) {
        return this.decodeXmpValue(match[1].trim());
      }
    }

    return undefined;
  }

  private static decodeXmpValue(value: string): string {
    return value
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  static evaluateCaptionQuality(caption: string | undefined): CaptionQuality {
    if (!caption || caption.trim().length === 0) {
      return {
        score: 0,
        hasMinimumLength: false,
        hasAccessibilityValue: false,
        isGeneric: true,
        needsImprovement: true,
      };
    }

    const trimmed = caption.trim().toLowerCase();
    const wordCount = trimmed.split(/\s+/).length;
    
    const isGeneric = GENERIC_CAPTIONS.some(
      generic => trimmed === generic || trimmed.startsWith(generic + ' ')
    );

    const hasMinimumLength = wordCount >= 3;
    const hasAccessibilityValue = wordCount >= 5 && !isGeneric;

    let score = 0;
    if (wordCount >= 3) score += 25;
    if (wordCount >= 5) score += 25;
    if (wordCount >= 10) score += 15;
    if (!isGeneric) score += 35;

    return {
      score: Math.min(100, score),
      hasMinimumLength,
      hasAccessibilityValue,
      isGeneric,
      needsImprovement: score < 75,
    };
  }

  static async needsProcessing(uri: string): Promise<boolean> {
    const metadata = await this.readImageMetadata(uri);
    
    if (!metadata.isSupported) {
      return false;
    }

    if (!metadata.hasCaption && !metadata.hasAltText) {
      return true;
    }

    const quality = this.evaluateCaptionQuality(
      metadata.altText || metadata.caption
    );

    return quality.needsImprovement;
  }

  static async getImageDimensions(uri: string): Promise<{
    width: number;
    height: number;
  } | null> {
    try {
      const content = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
        length: 1024,
        position: 0,
      });

      const buffer = Buffer.from(content, 'base64');
      const format = this.getFormatFromUri(uri);

      if (format === 'jpg' || format === 'jpeg') {
        return this.parseJpegDimensions(buffer);
      } else if (format === 'png') {
        return this.parsePngDimensions(buffer);
      }

      return null;
    } catch {
      return null;
    }
  }

  private static parseJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
    try {
      let offset = 2;
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xFF) break;
        
        const marker = buffer[offset + 1];
        if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }

        const length = buffer.readUInt16BE(offset + 2);
        offset += length + 2;
      }
      return null;
    } catch {
      return null;
    }
  }

  private static parsePngDimensions(buffer: Buffer): { width: number; height: number } | null {
    try {
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return { width, height };
      }
      return null;
    } catch {
      return null;
    }
  }

  static async batchCheckProcessingNeeded(
    uris: string[]
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    const checks = uris.map(async (uri) => {
      const needs = await this.needsProcessing(uri);
      results.set(uri, needs);
    });

    await Promise.all(checks);
    return results;
  }

  static async getAssetMetadata(assetId: string): Promise<ImageMetadataInfo | null> {
    try {
      const asset = await MediaLibrary.getAssetInfoAsync(assetId);
      if (!asset) {
        return null;
      }

      const metadata = await this.readImageMetadata(asset.localUri || asset.uri);
      return {
        ...metadata,
        width: asset.width,
        height: asset.height,
        dateCreated: asset.creationTime,
        dateModified: asset.modificationTime,
      };
    } catch {
      return null;
    }
  }
}

export default MetadataReaderService;
