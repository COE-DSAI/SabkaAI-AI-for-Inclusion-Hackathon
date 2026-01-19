/**
 * Memora Vision Lite v0.5
 * Stage 1: Image Normalization
 * 
 * Prepares images for ML inference by:
 * - Reading image data from file URI or base64
 * - Decoding JPEG/PNG images
 * - Resizing to target dimensions
 * - Converting to tensor format (normalized RGB)
 */

import * as FileSystem from 'expo-file-system';
import * as jpeg from 'jpeg-js';
import {
  ImageBitmap,
  NormalizedImage,
  VisionPipelineConfig,
  DEFAULT_PIPELINE_CONFIG,
} from './types';

/**
 * Image normalization service for preparing images for ML inference
 */
export class ImageNormalizationService {
  private config: VisionPipelineConfig;

  constructor(config: Partial<VisionPipelineConfig> = {}) {
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
  }

  /**
   * Normalize an image for ML inference
   * 
   * @param imageBitmap - Input image data
   * @returns Normalized image ready for inference
   */
  async normalize(imageBitmap: ImageBitmap): Promise<NormalizedImage> {
    const targetSize = this.config.targetImageSize;

    // Validate input
    this.validateImageBitmap(imageBitmap);

    // Decode and process the image
    const { tensorData, width, height, rawPixelData, base64 } = await this.processImage(imageBitmap, targetSize);

    return {
      tensorData,
      width: targetSize,
      height: targetSize,
      originalWidth: width || imageBitmap.width,
      originalHeight: height || imageBitmap.height,
      preprocessing: {
        resized: true,
        colorNormalized: true,
        targetSize,
      },
      // Include raw data for OCR processing
      rawPixelData,
      base64,
      uri: imageBitmap.data.startsWith('file://') || imageBitmap.data.startsWith('/') ? imageBitmap.data : undefined,
      mimeType: imageBitmap.mimeType,
    };
  }

  /**
   * Process image and convert to tensor
   */
  private async processImage(
    imageBitmap: ImageBitmap,
    targetSize: number
  ): Promise<{ tensorData: Float32Array; width: number; height: number; rawPixelData?: Uint8Array; base64?: string }> {
    try {
      let imageData: { data: Uint8Array; width: number; height: number };
      let base64Data: string | undefined;

      // Handle different input types
      if (imageBitmap.data.startsWith('file://') || imageBitmap.data.startsWith('/')) {
        // File URI - read and decode
        imageData = await this.decodeImageFromUri(imageBitmap.data);
        // Also get base64 for OCR
        base64Data = await FileSystem.readAsStringAsync(imageBitmap.data, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else if (this.isBase64(imageBitmap.data)) {
        // Base64 encoded - decode directly
        imageData = this.decodeBase64Image(imageBitmap.data);
        base64Data = imageBitmap.data.replace(/^data:image\/\w+;base64,/, '');
      } else {
        // Unknown format - create placeholder
        console.warn('[ImageNormalization] Unknown image format, using placeholder');
        return {
          tensorData: this.createPlaceholderTensor(targetSize),
          width: imageBitmap.width || targetSize,
          height: imageBitmap.height || targetSize,
        };
      }

      // Resize image to target size
      const resized = this.resizeImage(imageData, targetSize, targetSize);

      // Convert to normalized tensor (values in [0, 1])
      const tensorData = this.imageToTensor(resized);

      return {
        tensorData,
        width: imageData.width,
        height: imageData.height,
        rawPixelData: imageData.data, // Keep original RGBA for OCR
        base64: base64Data,
      };
    } catch (error) {
      console.error('[ImageNormalization] Error processing image:', error);
      // Return placeholder on error
      return {
        tensorData: this.createPlaceholderTensor(targetSize),
        width: imageBitmap.width || targetSize,
        height: imageBitmap.height || targetSize,
      };
    }
  }

  /**
   * Decode image from file URI
   */
  private async decodeImageFromUri(
    uri: string
  ): Promise<{ data: Uint8Array; width: number; height: number }> {
    // Read file as base64
    const base64Data = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return this.decodeBase64Image(base64Data);
  }

  /**
   * Decode base64 encoded image
   */
  private decodeBase64Image(
    base64Data: string
  ): { data: Uint8Array; width: number; height: number } {
    // Remove data URL prefix if present
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

    // Convert base64 to buffer
    const buffer = this.base64ToBuffer(cleanBase64);

    // Decode JPEG (jpeg-js library)
    // Note: For PNG, we'd need a different decoder
    try {
      const decoded = jpeg.decode(buffer, { useTArray: true });
      return {
        data: decoded.data,
        width: decoded.width,
        height: decoded.height,
      };
    } catch {
      // If JPEG decode fails, might be PNG or other format
      // Create placeholder for now
      console.warn('[ImageNormalization] Image decode failed, format may not be JPEG');
      throw new Error('Image decode failed - only JPEG format is currently supported');
    }
  }

  /**
   * Convert base64 string to buffer
   */
  private base64ToBuffer(base64: string): Buffer {
    // Handle both Node.js Buffer and browser environments
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(base64, 'base64');
    }
    
    // Fallback for environments without Buffer
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes as unknown as Buffer;
  }

  /**
   * Resize image using bilinear interpolation
   */
  private resizeImage(
    imageData: { data: Uint8Array; width: number; height: number },
    targetWidth: number,
    targetHeight: number
  ): { data: Uint8Array; width: number; height: number } {
    const { data, width, height } = imageData;
    
    // If already correct size, return as-is
    if (width === targetWidth && height === targetHeight) {
      return imageData;
    }

    // Create output buffer (RGBA)
    const output = new Uint8Array(targetWidth * targetHeight * 4);
    
    const xRatio = width / targetWidth;
    const yRatio = height / targetHeight;

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        // Source coordinates
        const srcX = Math.floor(x * xRatio);
        const srcY = Math.floor(y * yRatio);
        
        // Clamp to valid range
        const clampedX = Math.min(srcX, width - 1);
        const clampedY = Math.min(srcY, height - 1);
        
        // Source and destination indices (RGBA format)
        const srcIdx = (clampedY * width + clampedX) * 4;
        const dstIdx = (y * targetWidth + x) * 4;
        
        // Copy RGBA values
        output[dstIdx] = data[srcIdx];         // R
        output[dstIdx + 1] = data[srcIdx + 1]; // G
        output[dstIdx + 2] = data[srcIdx + 2]; // B
        output[dstIdx + 3] = data[srcIdx + 3]; // A
      }
    }

    return { data: output, width: targetWidth, height: targetHeight };
  }

  /**
   * Convert RGBA image data to normalized RGB tensor
   * Output: Float32Array with values in [0, 1], shape [height, width, 3]
   */
  private imageToTensor(
    imageData: { data: Uint8Array; width: number; height: number }
  ): Float32Array {
    const { data, width, height } = imageData;
    const tensorSize = width * height * 3; // RGB only
    const tensorData = new Float32Array(tensorSize);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const rgbaIdx = (y * width + x) * 4;
        const rgbIdx = (y * width + x) * 3;

        // Normalize to [0, 1]
        tensorData[rgbIdx] = data[rgbaIdx] / 255;         // R
        tensorData[rgbIdx + 1] = data[rgbaIdx + 1] / 255; // G
        tensorData[rgbIdx + 2] = data[rgbaIdx + 2] / 255; // B
      }
    }

    return tensorData;
  }

  /**
   * Create a placeholder tensor for testing/fallback
   */
  private createPlaceholderTensor(targetSize: number): Float32Array {
    const tensorSize = targetSize * targetSize * 3;
    const tensorData = new Float32Array(tensorSize);
    
    // Fill with gray (0.5) values
    for (let i = 0; i < tensorSize; i++) {
      tensorData[i] = 0.5;
    }
    
    return tensorData;
  }

  /**
   * Validate image bitmap input
   */
  private validateImageBitmap(imageBitmap: ImageBitmap): void {
    if (!imageBitmap) {
      throw new Error('ImageBitmap is required');
    }

    if (!imageBitmap.data || imageBitmap.data.length === 0) {
      throw new Error('Image data is required');
    }

    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimeTypes.includes(imageBitmap.mimeType)) {
      throw new Error(`Unsupported MIME type: ${imageBitmap.mimeType}`);
    }
  }

  /**
   * Check if string is base64 encoded
   */
  private isBase64(str: string): boolean {
    if (!str || str.length === 0) return false;
    
    // Check for data URL prefix
    if (str.startsWith('data:image/')) return true;
    
    // Remove data URL prefix if present
    const base64Part = str.includes(',') ? str.split(',')[1] : str;
    
    // Basic base64 pattern check (allow some invalid chars as it might be truncated)
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    return base64Regex.test(base64Part.substring(0, 100).replace(/\s/g, ''));
  }

  /**
   * Create ImageBitmap from file URI
   */
  async createImageBitmapFromUri(uri: string): Promise<ImageBitmap> {
    try {
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      
      if (!fileInfo.exists) {
        throw new Error('Image file does not exist');
      }

      // Read and decode to get dimensions
      const imageData = await this.decodeImageFromUri(uri);

      // Determine MIME type from extension
      const mimeType = this.getMimeTypeFromUri(uri);

      return {
        data: uri,
        width: imageData.width,
        height: imageData.height,
        mimeType,
        orientationCorrected: false,
      };
    } catch (error) {
      throw new Error(`Failed to create ImageBitmap: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get MIME type from file URI
   */
  private getMimeTypeFromUri(uri: string): 'image/jpeg' | 'image/png' | 'image/webp' {
    const lowerUri = uri.toLowerCase();
    
    if (lowerUri.endsWith('.png')) return 'image/png';
    if (lowerUri.endsWith('.webp')) return 'image/webp';
    
    // Default to JPEG
    return 'image/jpeg';
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VisionPipelineConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Singleton instance for convenience
 */
let normalizationServiceInstance: ImageNormalizationService | null = null;

export function getImageNormalizationService(
  config?: Partial<VisionPipelineConfig>
): ImageNormalizationService {
  if (!normalizationServiceInstance) {
    normalizationServiceInstance = new ImageNormalizationService(config);
  } else if (config) {
    normalizationServiceInstance.updateConfig(config);
  }
  return normalizationServiceInstance;
}

export default ImageNormalizationService;
