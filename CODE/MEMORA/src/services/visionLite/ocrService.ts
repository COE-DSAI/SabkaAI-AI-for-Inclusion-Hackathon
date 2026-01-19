/**
 * Memora Vision Lite v0.5
 * Stage 4: OCR Service (Conditional)
 * 
 * Performs real on-device text recognition using Tesseract.js.
 * Triggered by:
 * - Classification suggesting text content
 * - User explicitly enabling always-OCR
 * 
 * Tesseract.js runs entirely on-device using WebAssembly.
 */

import { 
  Worker, 
  createWorker,
} from 'tesseract.js';
import {
  NormalizedImage,
  OCRResult,
  TextBlock,
  ClassificationLabel,
  VisionPipelineConfig,
  DEFAULT_PIPELINE_CONFIG,
  MOBILENET_TEXT_TRIGGER_LABELS,
} from './types';

/**
 * Tesseract recognition result type (simplified)
 */
interface TesseractBlock {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

interface TesseractLine {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

interface TesseractResult {
  data: {
    text: string;
    confidence: number;
    blocks?: TesseractBlock[];
    lines?: TesseractLine[];
  };
}

/**
 * OCR trigger conditions
 */
export interface OCRTriggerContext {
  classificationLabels: ClassificationLabel[];
  userAlwaysOCR: boolean;
}

/**
 * Tesseract worker instance (singleton)
 */
let tesseractWorker: Worker | null = null;
let workerInitPromise: Promise<Worker | null> | null = null;
let workerInitFailed = false;

/**
 * Initialize Tesseract worker (singleton pattern)
 */
async function initializeTesseractWorker(): Promise<Worker | null> {
  // If worker init previously failed, don't retry
  if (workerInitFailed) {
    return null;
  }
  
  if (tesseractWorker) {
    return tesseractWorker;
  }

  if (workerInitPromise) {
    return workerInitPromise;
  }

  workerInitPromise = (async () => {
    try {
      console.log('[Tesseract.js] Initializing OCR worker...');
      const startTime = Date.now();

      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          // Only log progress milestones
          if (m.status === 'recognizing text' && m.progress === 1) {
            console.log('[Tesseract.js] Recognition complete');
          }
        },
      });

      console.log(`[Tesseract.js] Worker initialized in ${Date.now() - startTime}ms`);
      tesseractWorker = worker;
      return worker;
    } catch (error) {
      console.warn('[Tesseract.js] Worker init failed:', error);
      workerInitFailed = true;
      workerInitPromise = null;
      return null;
    }
  })();

  return workerInitPromise;
}

/**
 * Terminate worker when app closes
 */
export async function terminateTesseractWorker(): Promise<void> {
  if (tesseractWorker) {
    await tesseractWorker.terminate();
    tesseractWorker = null;
    workerInitPromise = null;
    console.log('[Tesseract.js] Worker terminated');
  }
}

/**
 * OCR service for real text extraction
 */
export class OCRService {
  private config: VisionPipelineConfig;
  private initialized: boolean = false;

  constructor(config: Partial<VisionPipelineConfig> = {}) {
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
  }

  /**
   * Initialize OCR engine (Tesseract.js)
   */
  async initialize(): Promise<boolean> {
    try {
      await initializeTesseractWorker();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('[Tesseract.js] Initialization failed:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Determine if OCR should be triggered
   */
  shouldTriggerOCR(context: OCRTriggerContext): { trigger: boolean; reason: OCRResult['triggerReason'] } {
    // User override - always run OCR
    if (context.userAlwaysOCR || this.config.alwaysRunOCR) {
      return { trigger: true, reason: 'user_enabled' };
    }

    // Check classification labels for text indicators
    for (const label of context.classificationLabels) {
      const normalizedLabel = label.normalizedLabel.toLowerCase();
      
      for (const trigger of MOBILENET_TEXT_TRIGGER_LABELS) {
        if (normalizedLabel.includes(trigger) && label.confidence > 0.3) {
          return { trigger: true, reason: 'classification_hint' };
        }
      }
    }

    return { trigger: false, reason: 'not_triggered' };
  }

  /**
   * Perform real OCR on an image using Tesseract.js
   * 
   * @param normalizedImage - Preprocessed image with tensor data or base64
   * @param context - Trigger context for conditional execution
   * @returns OCR results with extracted text
   */
  async extractText(
    normalizedImage: NormalizedImage,
    context: OCRTriggerContext
  ): Promise<OCRResult> {
    const startTime = Date.now();

    // Check if OCR should run
    const { trigger, reason } = this.shouldTriggerOCR(context);

    if (!trigger) {
      return {
        triggered: false,
        triggerReason: reason,
        textBlocks: [],
        extractedText: '',
        textSummary: '',
        hasMeaningfulText: false,
        processingTimeMs: Date.now() - startTime,
        success: true,
      };
    }

    try {
      // Ensure initialized
      if (!this.initialized) {
        await this.initialize();
      }

      // Get image data for Tesseract
      const imageData = await this.getImageDataForTesseract(normalizedImage);
      
      // Run Tesseract OCR
      const worker = await initializeTesseractWorker();
      
      // If worker isn't available, return empty result
      if (!worker) {
        console.log('[Tesseract.js] Worker not available, skipping OCR');
        return {
          triggered: true,
          triggerReason: reason,
          textBlocks: [],
          extractedText: '',
          textSummary: '',
          hasMeaningfulText: false,
          processingTimeMs: Date.now() - startTime,
          success: true, // Mark as success so pipeline continues
          error: 'OCR worker not available',
        };
      }
      
      const rawResult = await worker.recognize(imageData);
      
      // Cast to our simplified type
      const result = rawResult as unknown as TesseractResult;
      
      // Convert Tesseract output to our TextBlock format
      const textBlocks = this.convertTesseractResult(result, normalizedImage);
      
      // Process and clean text
      const extractedText = this.combineTextBlocks(textBlocks);
      const textSummary = this.createTextSummary(extractedText);
      const hasMeaningfulText = this.isTextMeaningful(extractedText);

      console.log(`[Tesseract.js] Extracted ${textBlocks.length} text blocks, ${extractedText.length} chars`);

      return {
        triggered: true,
        triggerReason: reason,
        textBlocks,
        extractedText,
        textSummary,
        hasMeaningfulText,
        processingTimeMs: Date.now() - startTime,
        success: true,
      };
    } catch (error) {
      console.error('[Tesseract.js] OCR failed:', error);
      return {
        triggered: true,
        triggerReason: reason,
        textBlocks: [],
        extractedText: '',
        textSummary: '',
        hasMeaningfulText: false,
        processingTimeMs: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'OCR failed',
      };
    }
  }

  /**
   * Get image data in a format Tesseract.js can process
   */
  private async getImageDataForTesseract(normalizedImage: NormalizedImage): Promise<string> {
    // If we have base64 data, use it directly (best option)
    if (normalizedImage.base64) {
      const mimeType = normalizedImage.mimeType || 'image/jpeg';
      return `data:${mimeType};base64,${normalizedImage.base64}`;
    }

    // If we have raw pixel data (Uint8Array RGBA), convert to BMP
    if (normalizedImage.rawPixelData) {
      const { width, height } = normalizedImage;
      
      if (normalizedImage.rawPixelData.length === width * height * 4) {
        return this.rgbaToDataUrl(normalizedImage.rawPixelData, width, height);
      }
      
      if (normalizedImage.rawPixelData.length === width * height * 3) {
        return this.rgbToDataUrl(normalizedImage.rawPixelData, width, height);
      }
    }

    // If we have tensor data (Float32Array normalized 0-1), convert back to image
    if (normalizedImage.tensorData) {
      const { width, height } = normalizedImage;
      const channels = normalizedImage.tensorData.length / (width * height);
      
      if (channels === 4 || channels === 3) {
        return this.tensorToDataUrl(normalizedImage.tensorData, width, height, channels);
      }
    }

    // If we have URI, return it (Tesseract can fetch from URI)
    if (normalizedImage.uri) {
      return normalizedImage.uri;
    }

    throw new Error('No valid image data for OCR');
  }

  /**
   * Convert Float32Array tensor (normalized 0-1) to BMP data URL
   */
  private tensorToDataUrl(tensor: Float32Array, width: number, height: number, channels: number): string {
    // Convert normalized Float32 values back to 0-255 Uint8 RGBA
    const rgba = new Uint8Array(width * height * 4);
    
    for (let i = 0; i < width * height; i++) {
      const srcIdx = i * channels;
      const dstIdx = i * 4;
      
      // Denormalize from 0-1 (or -1 to 1) back to 0-255
      const r = tensor[srcIdx];
      const g = tensor[srcIdx + 1];
      const b = tensor[srcIdx + 2];
      
      // Handle both 0-1 and -1 to 1 normalization
      const normalize = (v: number) => {
        if (v < 0) {
          // -1 to 1 range
          return Math.round((v + 1) * 127.5);
        }
        // 0 to 1 range
        return Math.round(v * 255);
      };
      
      rgba[dstIdx] = normalize(r);
      rgba[dstIdx + 1] = normalize(g);
      rgba[dstIdx + 2] = normalize(b);
      rgba[dstIdx + 3] = channels === 4 ? normalize(tensor[srcIdx + 3]) : 255;
    }
    
    return this.rgbaToDataUrl(rgba, width, height);
  }

  /**
   * Convert RGBA buffer to base64 BMP data URL for Tesseract
   */
  private rgbaToDataUrl(rgba: Uint8Array, width: number, height: number): string {
    const bmpData = this.createBMP(rgba, width, height);
    
    // Convert to base64
    let binary = '';
    for (let i = 0; i < bmpData.length; i++) {
      binary += String.fromCharCode(bmpData[i]);
    }
    
    // Use btoa if available, otherwise use Buffer
    let base64: string;
    if (typeof btoa !== 'undefined') {
      base64 = btoa(binary);
    } else {
      base64 = Buffer.from(bmpData).toString('base64');
    }
    
    return `data:image/bmp;base64,${base64}`;
  }

  /**
   * Convert RGB buffer to base64 image for Tesseract
   */
  private rgbToDataUrl(rgb: Uint8Array, width: number, height: number): string {
    // Convert RGB to RGBA
    const rgba = new Uint8Array(width * height * 4);
    
    for (let i = 0, j = 0; i < rgb.length; i += 3, j += 4) {
      rgba[j] = rgb[i];       // R
      rgba[j + 1] = rgb[i + 1]; // G
      rgba[j + 2] = rgb[i + 2]; // B
      rgba[j + 3] = 255;        // A (fully opaque)
    }

    return this.rgbaToDataUrl(rgba, width, height);
  }

  /**
   * Create a BMP file from RGBA data
   * BMP is simple and widely supported by Tesseract
   */
  private createBMP(rgba: Uint8Array, width: number, height: number): Uint8Array {
    const rowSize = Math.ceil((width * 3) / 4) * 4; // Rows must be 4-byte aligned
    const pixelDataSize = rowSize * height;
    const fileSize = 54 + pixelDataSize; // 54 bytes header + pixel data
    
    const bmp = new Uint8Array(fileSize);
    const view = new DataView(bmp.buffer);
    
    // BMP Header (14 bytes)
    bmp[0] = 0x42; // 'B'
    bmp[1] = 0x4D; // 'M'
    view.setUint32(2, fileSize, true);      // File size
    view.setUint32(6, 0, true);             // Reserved
    view.setUint32(10, 54, true);           // Pixel data offset
    
    // DIB Header (40 bytes - BITMAPINFOHEADER)
    view.setUint32(14, 40, true);           // Header size
    view.setInt32(18, width, true);         // Width
    view.setInt32(22, -height, true);       // Height (negative for top-down)
    view.setUint16(26, 1, true);            // Color planes
    view.setUint16(28, 24, true);           // Bits per pixel (24 = RGB)
    view.setUint32(30, 0, true);            // Compression (none)
    view.setUint32(34, pixelDataSize, true); // Image size
    view.setUint32(38, 2835, true);         // X pixels per meter
    view.setUint32(42, 2835, true);         // Y pixels per meter
    view.setUint32(46, 0, true);            // Colors in color table
    view.setUint32(50, 0, true);            // Important colors
    
    // Pixel data (BGR format, top-down due to negative height)
    let offset = 54;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        bmp[offset++] = rgba[srcIdx + 2]; // B
        bmp[offset++] = rgba[srcIdx + 1]; // G
        bmp[offset++] = rgba[srcIdx];     // R
      }
      // Padding to 4-byte boundary
      const padding = rowSize - (width * 3);
      for (let p = 0; p < padding; p++) {
        bmp[offset++] = 0;
      }
    }
    
    return bmp;
  }

  /**
   * Convert Tesseract.js result to our TextBlock format
   */
  private convertTesseractResult(
    result: TesseractResult,
    normalizedImage: NormalizedImage
  ): TextBlock[] {
    const textBlocks: TextBlock[] = [];
    const { width, height } = normalizedImage;

    // Process paragraphs/blocks from Tesseract
    if (result.data.blocks && result.data.blocks.length > 0) {
      for (const block of result.data.blocks) {
        if (block.text && block.text.trim().length > 0) {
          // Normalize bounding box to 0-1 range
          const bbox = block.bbox;
          const normalizedBox = {
            x: bbox.x0 / width,
            y: bbox.y0 / height,
            width: (bbox.x1 - bbox.x0) / width,
            height: (bbox.y1 - bbox.y0) / height,
          };

          textBlocks.push({
            text: block.text.trim(),
            confidence: block.confidence / 100, // Tesseract uses 0-100
            boundingBox: normalizedBox,
            language: 'en',
          });
        }
      }
    }

    // If no blocks, try lines
    if (textBlocks.length === 0 && result.data.lines && result.data.lines.length > 0) {
      for (const line of result.data.lines) {
        if (line.text && line.text.trim().length > 0) {
          const bbox = line.bbox;
          const normalizedBox = {
            x: bbox.x0 / width,
            y: bbox.y0 / height,
            width: (bbox.x1 - bbox.x0) / width,
            height: (bbox.y1 - bbox.y0) / height,
          };

          textBlocks.push({
            text: line.text.trim(),
            confidence: line.confidence / 100,
            boundingBox: normalizedBox,
            language: 'en',
          });
        }
      }
    }

    // Fallback to full text if no structured data
    if (textBlocks.length === 0 && result.data.text && result.data.text.trim().length > 0) {
      textBlocks.push({
        text: result.data.text.trim(),
        confidence: result.data.confidence / 100,
        boundingBox: { x: 0, y: 0, width: 1, height: 1 },
        language: 'en',
      });
    }

    return textBlocks;
  }

  /**
   * Combine text blocks into single string
   */
  private combineTextBlocks(textBlocks: TextBlock[]): string {
    if (textBlocks.length === 0) return '';

    // Sort by vertical position (top to bottom)
    const sorted = [...textBlocks].sort((a, b) => a.boundingBox.y - b.boundingBox.y);
    
    // Combine with space
    return sorted
      .map(block => block.text.trim())
      .filter(text => text.length > 0)
      .join(' ');
  }

  /**
   * Create summary text for caption
   */
  private createTextSummary(fullText: string): string {
    if (!fullText || fullText.length === 0) return '';

    // Clean the text
    let cleaned = this.cleanText(fullText);
    
    // Truncate to max length
    if (cleaned.length > this.config.maxTextSummaryLength) {
      // Try to truncate at word boundary
      const truncated = cleaned.substring(0, this.config.maxTextSummaryLength);
      const lastSpace = truncated.lastIndexOf(' ');
      
      if (lastSpace > this.config.maxTextSummaryLength * 0.7) {
        cleaned = truncated.substring(0, lastSpace) + '...';
      } else {
        cleaned = truncated + '...';
      }
    }

    return cleaned;
  }

  /**
   * Clean extracted text
   */
  private cleanText(text: string): string {
    return text
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove excessive punctuation
      .replace(/[.]{2,}/g, '.')
      .replace(/[,]{2,}/g, ',')
      // Remove common OCR artifacts
      .replace(/[|]/g, 'I')
      // Trim
      .trim();
  }

  /**
   * Determine if extracted text is meaningful
   * Filters out noise like random characters
   */
  private isTextMeaningful(text: string): boolean {
    if (!text || text.length < 3) return false;

    // Check minimum word count
    const words = text.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 1) return false;

    // Check for minimum word length average (filters noise)
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    if (avgWordLength < 2) return false;

    // Check for readable characters ratio
    const readableChars = text.replace(/[^a-zA-Z0-9\s]/g, '').length;
    const ratio = readableChars / text.length;
    if (ratio < 0.5) return false;

    return true;
  }

  /**
   * Get average OCR confidence
   */
  getAverageConfidence(textBlocks: TextBlock[]): number {
    if (textBlocks.length === 0) return 0;
    
    const sum = textBlocks.reduce((acc, block) => acc + block.confidence, 0);
    return sum / textBlocks.length;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VisionPipelineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.initialized;
  }
}

/**
 * Singleton instance
 */
let ocrServiceInstance: OCRService | null = null;

export function getOCRService(
  config?: Partial<VisionPipelineConfig>
): OCRService {
  if (!ocrServiceInstance) {
    ocrServiceInstance = new OCRService(config);
  } else if (config) {
    ocrServiceInstance.updateConfig(config);
  }
  return ocrServiceInstance;
}

export default OCRService;
