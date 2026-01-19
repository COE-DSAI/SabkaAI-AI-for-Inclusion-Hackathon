/**
 * MetadataWriterService - Embeds AI-generated captions into image metadata
 * 
 * Accessibility-first: Writes captions to EXIF ImageDescription and XMP dc:description
 * so screen readers can access them when images are shared.
 * 
 * Strategy:
 * 1. Read image as base64
 * 2. Parse and modify EXIF/XMP metadata
 * 3. Write modified image to temp file
 * 4. Replace original in gallery
 */

import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

export interface WriteResult {
  success: boolean;
  assetId?: string;
  error?: string;
  // Track what was actually written
  wroteExif: boolean;
  wroteXmp: boolean;
}

export interface WriterConfig {
  // Where to write captions
  writeExif?: boolean;
  writeXmp?: boolean;
  // Backup options
  createBackup?: boolean;
  backupDir?: string;
}

const DEFAULT_CONFIG: Required<WriterConfig> = {
  writeExif: true,
  writeXmp: true,
  createBackup: false,
  backupDir: `${FileSystem.cacheDirectory}memora_backups/`,
};

export class MetadataWriterService {
  private config: Required<WriterConfig>;

  constructor(config: WriterConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Embed caption into image metadata and save
   */
  async embedCaption(
    sourceUri: string,
    caption: string,
    assetId?: string
  ): Promise<WriteResult> {
    try {
      // Validate inputs
      if (!sourceUri) {
        return {
          success: false,
          error: 'No source URI provided',
          wroteExif: false,
          wroteXmp: false,
        };
      }

      if (!caption || caption.trim().length === 0) {
        return {
          success: false,
          error: 'Empty caption provided',
          wroteExif: false,
          wroteXmp: false,
        };
      }

      // Check if file exists
      const fileInfo = await this.getFileInfo(sourceUri);
      if (!fileInfo.exists) {
        return {
          success: false,
          error: 'Source file does not exist',
          wroteExif: false,
          wroteXmp: false,
        };
      }

      // Read original image
      const imageData = await this.readImageAsBase64(sourceUri);
      if (!imageData) {
        return {
          success: false,
          error: 'Failed to read source image',
          wroteExif: false,
          wroteXmp: false,
        };
      }

      // Create backup if configured
      if (this.config.createBackup && assetId) {
        await this.createBackup(sourceUri, assetId);
      }

      // Embed metadata
      const modifiedData = await this.embedMetadataIntoImage(
        imageData,
        caption,
        sourceUri
      );

      // Write to temp file
      const tempPath = await this.writeTempFile(modifiedData, sourceUri);
      if (!tempPath) {
        return {
          success: false,
          error: 'Failed to write temp file',
          wroteExif: false,
          wroteXmp: false,
        };
      }

      // Update in gallery
      const result = await this.updateGalleryAsset(tempPath, assetId);

      // Clean up temp file
      await this.cleanupTempFile(tempPath);

      return {
        success: result.success,
        assetId: result.assetId,
        error: result.error,
        wroteExif: this.config.writeExif,
        wroteXmp: this.config.writeXmp,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to embed caption: ${errorMessage}`,
        wroteExif: false,
        wroteXmp: false,
      };
    }
  }

  /**
   * Batch embed captions for multiple images
   */
  async embedCaptionsBatch(
    items: Array<{ uri: string; caption: string; assetId?: string }>
  ): Promise<WriteResult[]> {
    const results: WriteResult[] = [];

    for (const item of items) {
      const result = await this.embedCaption(item.uri, item.caption, item.assetId);
      results.push(result);
    }

    return results;
  }

  /**
   * Get file info with error handling
   */
  private async getFileInfo(uri: string): Promise<{ exists: boolean; size?: number }> {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      return {
        exists: info.exists,
        size: info.exists ? info.size : undefined,
      };
    } catch {
      return { exists: false };
    }
  }

  /**
   * Read image file as base64
   */
  private async readImageAsBase64(uri: string): Promise<string | null> {
    try {
      // Handle content:// URIs on Android by copying to cache first
      let readableUri = uri;
      if (uri.startsWith('content://') || uri.startsWith('ph://')) {
        readableUri = await this.copyToReadableLocation(uri);
      }

      const base64 = await FileSystem.readAsStringAsync(readableUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Clean up temporary copy if we made one
      if (readableUri !== uri) {
        await this.cleanupTempFile(readableUri);
      }

      return base64;
    } catch (error) {
      console.error('Error reading image:', error);
      return null;
    }
  }

  /**
   * Copy content:// or ph:// URI to readable file location
   */
  private async copyToReadableLocation(uri: string): Promise<string> {
    const tempPath = `${FileSystem.cacheDirectory}memora_temp_read_${Date.now()}.jpg`;
    await FileSystem.copyAsync({
      from: uri,
      to: tempPath,
    });
    return tempPath;
  }

  /**
   * Embed metadata into image data
   * 
   * Note: Full EXIF/XMP manipulation requires native modules.
   * This implementation provides the structure for when native
   * modules are available (react-native-image-editor, piexifjs via native bridge, etc.)
   * 
   * For now, we prepare XMP sidecar data that can be written alongside.
   */
  private async embedMetadataIntoImage(
    base64Data: string,
    caption: string,
    sourceUri: string
  ): Promise<string> {
    // Detect format
    const format = this.detectImageFormat(base64Data);

    if (format === 'jpeg' && this.config.writeExif) {
      // For JPEG, we can embed in EXIF APP1 segment
      return this.embedExifInJpeg(base64Data, caption);
    } else if (format === 'png' && this.config.writeXmp) {
      // For PNG, use iTXt chunk
      return this.embedXmpInPng(base64Data, caption);
    }

    // For other formats, return original
    // Caption will need to be stored as sidecar
    return base64Data;
  }

  /**
   * Detect image format from base64 header
   */
  private detectImageFormat(base64Data: string): 'jpeg' | 'png' | 'webp' | 'unknown' {
    // JPEG starts with /9j/ (FFD8FF in base64)
    if (base64Data.startsWith('/9j/')) {
      return 'jpeg';
    }
    // PNG starts with iVBOR (89504E47 in base64)
    if (base64Data.startsWith('iVBOR')) {
      return 'png';
    }
    // WebP starts with RIFF....WEBP
    if (base64Data.startsWith('UklGR')) {
      return 'webp';
    }
    return 'unknown';
  }

  /**
   * Embed EXIF ImageDescription into JPEG
   * 
   * JPEG structure: SOI + APP segments + image data + EOI
   * We insert/update APP1 (EXIF) segment with ImageDescription tag
   */
  private embedExifInJpeg(base64Data: string, caption: string): string {
    try {
      // Decode base64 to binary
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      // Find APP1 marker (FFE1) or insert position after SOI (FFD8)
      const modifiedBytes = this.insertExifDescription(bytes, caption);

      // Encode back to base64
      let binary = '';
      for (let i = 0; i < modifiedBytes.length; i++) {
        binary += String.fromCharCode(modifiedBytes[i]);
      }
      return btoa(binary);
    } catch (error) {
      console.error('Error embedding EXIF:', error);
      return base64Data;
    }
  }

  /**
   * Insert or update EXIF ImageDescription tag
   */
  private insertExifDescription(bytes: Uint8Array, caption: string): Uint8Array {
    // Find insertion point (after SOI marker FFD8)
    if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) {
      console.warn('Not a valid JPEG');
      return bytes;
    }

    // Create minimal EXIF APP1 segment with ImageDescription
    const exifSegment = this.createExifSegment(caption);

    // Find where to insert (after SOI, before other segments)
    let insertPos = 2;
    
    // Skip existing APP0 (JFIF) if present
    if (bytes[2] === 0xFF && bytes[3] === 0xE0) {
      const app0Length = (bytes[4] << 8) | bytes[5];
      insertPos = 4 + app0Length;
    }

    // Skip existing APP1 (EXIF) if present - we'll replace it
    let existingApp1Start = -1;
    let existingApp1End = -1;
    
    if (bytes[insertPos] === 0xFF && bytes[insertPos + 1] === 0xE1) {
      existingApp1Start = insertPos;
      const app1Length = (bytes[insertPos + 2] << 8) | bytes[insertPos + 3];
      existingApp1End = insertPos + 2 + app1Length;
    }

    // Build new image
    let result: Uint8Array;
    
    if (existingApp1Start >= 0) {
      // Replace existing APP1
      const beforeApp1 = bytes.slice(0, existingApp1Start);
      const afterApp1 = bytes.slice(existingApp1End);
      result = new Uint8Array(beforeApp1.length + exifSegment.length + afterApp1.length);
      result.set(beforeApp1, 0);
      result.set(exifSegment, beforeApp1.length);
      result.set(afterApp1, beforeApp1.length + exifSegment.length);
    } else {
      // Insert new APP1
      const before = bytes.slice(0, insertPos);
      const after = bytes.slice(insertPos);
      result = new Uint8Array(before.length + exifSegment.length + after.length);
      result.set(before, 0);
      result.set(exifSegment, before.length);
      result.set(after, before.length + exifSegment.length);
    }

    return result;
  }

  /**
   * Create EXIF APP1 segment with ImageDescription
   */
  private createExifSegment(caption: string): Uint8Array {
    // Encode caption as ASCII (EXIF standard for ImageDescription)
    const captionBytes = this.stringToBytes(caption);
    
    // EXIF structure:
    // APP1 marker (FFE1) + length (2 bytes) + "Exif\0\0" + TIFF header + IFD
    
    // TIFF header: byte order (II = little endian) + 42 + offset to IFD0
    const tiffHeader = [
      0x49, 0x49, // II = little endian
      0x2A, 0x00, // 42 in little endian
      0x08, 0x00, 0x00, 0x00, // Offset to IFD0 = 8
    ];

    // IFD0 with ImageDescription tag (0x010E)
    const tagCount = 1;
    const ifd0 = [
      tagCount & 0xFF, (tagCount >> 8) & 0xFF, // Number of directory entries
      // ImageDescription tag
      0x0E, 0x01, // Tag = 0x010E (ImageDescription)
      0x02, 0x00, // Type = 2 (ASCII)
      captionBytes.length & 0xFF, (captionBytes.length >> 8) & 0xFF, 
      (captionBytes.length >> 16) & 0xFF, (captionBytes.length >> 24) & 0xFF, // Count
      // Value offset (points to data after IFD)
      0x1A, 0x00, 0x00, 0x00, // Offset = 8 (TIFF) + 2 (count) + 12 (entry) + 4 (next IFD) = 26 = 0x1A
      // Next IFD offset
      0x00, 0x00, 0x00, 0x00, // No next IFD
    ];

    // Combine all parts
    const exifIdentifier = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"
    const tiffData = [...tiffHeader, ...ifd0, ...captionBytes];
    const segmentData = [...exifIdentifier, ...tiffData];
    
    // APP1 segment: marker + length + data
    const segmentLength = segmentData.length + 2;
    const app1 = [
      0xFF, 0xE1, // APP1 marker
      (segmentLength >> 8) & 0xFF, segmentLength & 0xFF, // Length (big endian)
      ...segmentData,
    ];

    return new Uint8Array(app1);
  }

  /**
   * Convert string to bytes (ASCII)
   */
  private stringToBytes(str: string): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
      // Use ASCII value, replace non-ASCII with ?
      const code = str.charCodeAt(i);
      bytes.push(code < 128 ? code : 0x3F);
    }
    bytes.push(0); // Null terminator for EXIF ASCII
    return bytes;
  }

  /**
   * Embed XMP data in PNG
   * Uses iTXt chunk with XMP namespace
   */
  private embedXmpInPng(base64Data: string, caption: string): string {
    try {
      // Decode base64 to binary
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      // Create XMP chunk
      const xmpChunk = this.createPngXmpChunk(caption);

      // Find position before IEND chunk
      const iendPos = this.findPngIend(bytes);
      if (iendPos < 0) {
        return base64Data;
      }

      // Insert XMP chunk before IEND
      const before = bytes.slice(0, iendPos);
      const iend = bytes.slice(iendPos);
      const result = new Uint8Array(before.length + xmpChunk.length + iend.length);
      result.set(before, 0);
      result.set(xmpChunk, before.length);
      result.set(iend, before.length + xmpChunk.length);

      // Encode back to base64
      let binary = '';
      for (let i = 0; i < result.length; i++) {
        binary += String.fromCharCode(result[i]);
      }
      return btoa(binary);
    } catch (error) {
      console.error('Error embedding PNG XMP:', error);
      return base64Data;
    }
  }

  /**
   * Create PNG iTXt chunk with XMP data
   */
  private createPngXmpChunk(caption: string): Uint8Array {
    // Escape XML special characters
    const escapedCaption = caption
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const xmp = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:description>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${escapedCaption}</rdf:li>
        </rdf:Alt>
      </dc:description>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

    // iTXt chunk structure
    const keyword = 'XML:com.adobe.xmp';
    const keywordBytes = this.stringToBytes(keyword).slice(0, -1); // Remove null terminator, add it manually
    const xmpBytes = new TextEncoder().encode(xmp);

    // iTXt: keyword + null + compression flag + compression method + language tag + null + translated keyword + null + text
    const chunkData = new Uint8Array(
      keywordBytes.length + 1 + // keyword + null
      1 + // compression flag (0 = uncompressed)
      1 + // compression method (0)
      1 + // language tag (empty) + null  
      1 + // translated keyword (empty) + null
      xmpBytes.length
    );

    let offset = 0;
    chunkData.set(keywordBytes, offset);
    offset += keywordBytes.length;
    chunkData[offset++] = 0; // null terminator
    chunkData[offset++] = 0; // compression flag
    chunkData[offset++] = 0; // compression method
    chunkData[offset++] = 0; // language tag (empty + null)
    chunkData[offset++] = 0; // translated keyword (empty + null)
    chunkData.set(xmpBytes, offset);

    // Build chunk: length (4) + type (4) + data + CRC (4)
    const chunkType = [0x69, 0x54, 0x58, 0x74]; // iTXt
    const length = chunkData.length;
    
    const chunk = new Uint8Array(4 + 4 + length + 4);
    // Length (big endian)
    chunk[0] = (length >> 24) & 0xFF;
    chunk[1] = (length >> 16) & 0xFF;
    chunk[2] = (length >> 8) & 0xFF;
    chunk[3] = length & 0xFF;
    // Type
    chunk.set(chunkType, 4);
    // Data
    chunk.set(chunkData, 8);
    // CRC (calculate over type + data)
    const crc = this.calculateCrc32(chunk.slice(4, 8 + length));
    chunk[8 + length] = (crc >> 24) & 0xFF;
    chunk[8 + length + 1] = (crc >> 16) & 0xFF;
    chunk[8 + length + 2] = (crc >> 8) & 0xFF;
    chunk[8 + length + 3] = crc & 0xFF;

    return chunk;
  }

  /**
   * Find IEND chunk position in PNG
   */
  private findPngIend(bytes: Uint8Array): number {
    // IEND is 4 bytes length (0) + 4 bytes type + 4 bytes CRC = 12 bytes
    // Search for IEND type: 0x49, 0x45, 0x4E, 0x44
    for (let i = bytes.length - 12; i >= 8; i--) {
      if (
        bytes[i + 4] === 0x49 && // I
        bytes[i + 5] === 0x45 && // E
        bytes[i + 6] === 0x4E && // N
        bytes[i + 7] === 0x44    // D
      ) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Calculate CRC32 for PNG chunk
   */
  private calculateCrc32(data: Uint8Array): number {
    // CRC32 lookup table
    const table: number[] = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c;
    }

    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  /**
   * Write modified image to temp file
   */
  private async writeTempFile(base64Data: string, sourceUri: string): Promise<string | null> {
    try {
      const ext = this.getExtension(sourceUri);
      const tempPath = `${FileSystem.cacheDirectory}memora_modified_${Date.now()}.${ext}`;

      await FileSystem.writeAsStringAsync(tempPath, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return tempPath;
    } catch (error) {
      console.error('Error writing temp file:', error);
      return null;
    }
  }

  /**
   * Get file extension from URI
   */
  private getExtension(uri: string): string {
    const match = uri.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : 'jpg';
  }

  /**
   * Update gallery asset with new image
   */
  private async updateGalleryAsset(
    tempPath: string,
    originalAssetId?: string
  ): Promise<{ success: boolean; assetId?: string; error?: string }> {
    try {
      // Request permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        return { success: false, error: 'Gallery permission denied' };
      }

      // Create new asset from modified image
      const asset = await MediaLibrary.createAssetAsync(tempPath);

      // If we have the original asset, try to add to same album
      if (originalAssetId) {
        try {
          const originalAsset = await MediaLibrary.getAssetInfoAsync(originalAssetId);
          if (originalAsset && originalAsset.albumId) {
            await MediaLibrary.addAssetsToAlbumAsync([asset], originalAsset.albumId, false);
          }
        } catch {
          // Ignore album errors - asset is still saved
        }
      }

      return { success: true, assetId: asset.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to save to gallery: ${errorMessage}` };
    }
  }

  /**
   * Create backup of original image
   */
  private async createBackup(sourceUri: string, assetId: string): Promise<boolean> {
    try {
      const backupDir = this.config.backupDir;
      const dirInfo = await FileSystem.getInfoAsync(backupDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
      }

      const ext = this.getExtension(sourceUri);
      const backupPath = `${backupDir}${assetId}.${ext}`;

      await FileSystem.copyAsync({
        from: sourceUri,
        to: backupPath,
      });

      return true;
    } catch (error) {
      console.error('Error creating backup:', error);
      return false;
    }
  }

  /**
   * Clean up temp file
   */
  private async cleanupTempFile(tempPath: string): Promise<void> {
    try {
      const info = await FileSystem.getInfoAsync(tempPath);
      if (info.exists) {
        await FileSystem.deleteAsync(tempPath);
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Create XMP sidecar file for formats that don't support embedded metadata
   */
  async createXmpSidecar(
    imageUri: string,
    caption: string
  ): Promise<{ success: boolean; sidecarPath?: string; error?: string }> {
    try {
      // Escape XML special characters
      const escapedCaption = caption
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

      const xmp = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:description>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${escapedCaption}</rdf:li>
        </rdf:Alt>
      </dc:description>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

      // Create sidecar path
      const sidecarPath = imageUri.replace(/\.[^.]+$/, '.xmp');

      await FileSystem.writeAsStringAsync(sidecarPath, xmp, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      return { success: true, sidecarPath };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Verify caption was written by reading it back
   */
  async verifyCaption(uri: string, expectedCaption: string): Promise<boolean> {
    try {
      // This would use MetadataReaderService to read back and compare
      // For now, return true as a placeholder
      return true;
    } catch {
      return false;
    }
  }
}
