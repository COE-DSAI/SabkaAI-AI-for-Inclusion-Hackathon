/**
 * Memora Vision Lite v0.5
 * Stage 2: Image Classification
 * 
 * Uses TensorFlow.js MobileNet for real on-device image classification.
 * Provides top-N labels with confidence scores.
 * 
 * Model: MobileNet v2 (loaded from TensorFlow Hub)
 */

import * as mobilenet from '@tensorflow-models/mobilenet';
import {
  NormalizedImage,
  ClassificationResult,
  ClassificationLabel,
  VisionPipelineConfig,
  DEFAULT_PIPELINE_CONFIG,
} from './types';
import { 
  initializeTensorFlow, 
  tf,
  disposeTensor 
} from './tensorflowSetup';

/**
 * MobileNet model instance
 */
let mobileNetModel: mobilenet.MobileNet | null = null;
let modelLoadPromise: Promise<mobilenet.MobileNet> | null = null;
let modelLoadFailed = false;

/**
 * Load MobileNet model (singleton pattern)
 */
async function loadMobileNetModel(): Promise<mobilenet.MobileNet | null> {
  // If model load previously failed, don't retry
  if (modelLoadFailed) {
    return null;
  }
  
  if (mobileNetModel) {
    return mobileNetModel;
  }
  
  if (modelLoadPromise) {
    return modelLoadPromise;
  }

  modelLoadPromise = (async () => {
    try {
      // Ensure TensorFlow is initialized
      const tfReady = await initializeTensorFlow();
      if (!tfReady) {
        throw new Error('TensorFlow.js initialization failed');
      }

      console.log('[MobileNet] Loading model...');
      const startTime = Date.now();
      
      // Load MobileNet v2 with version 2 (best accuracy)
      const model = await mobilenet.load({
        version: 2,
        alpha: 1.0, // Full-size model for best accuracy
      });
      
      console.log(`[MobileNet] Model loaded in ${Date.now() - startTime}ms`);
      mobileNetModel = model;
      return model;
    } catch (error) {
      console.warn('[MobileNet] Model load failed, using fallback:', error);
      modelLoadFailed = true;
      modelLoadPromise = null;
      return null;
    }
  })();

  return modelLoadPromise;
}

/**
 * ImageNet label categories for semantic grouping
 */
const LABEL_CATEGORIES: Record<string, string[]> = {
  // People-related
  person: ['person', 'man', 'woman', 'child', 'people', 'human'],
  
  // Text/Document indicators
  text: [
    'notebook', 'laptop', 'screen', 'monitor', 'television', 'computer',
    'web site', 'menu', 'book jacket', 'envelope', 'letter opener',
    'paper towel', 'notebook computer', 'desktop computer', 'cellular telephone'
  ],
  
  // Indoor indicators
  indoor: [
    'desk', 'chair', 'table', 'couch', 'bed', 'lamp', 'pillow',
    'bookcase', 'wardrobe', 'refrigerator', 'microwave', 'oven',
    'dining table', 'toilet', 'television', 'keyboard', 'mouse'
  ],
  
  // Outdoor indicators
  outdoor: [
    'sky', 'tree', 'mountain', 'beach', 'ocean', 'lake', 'river',
    'grass', 'flower', 'forest', 'park', 'street', 'road', 'bridge',
    'volcano', 'cliff', 'valley', 'seashore', 'lakeside', 'alp'
  ],
};

/**
 * Image classification service using TensorFlow.js MobileNet
 */
export class ClassificationService {
  private config: VisionPipelineConfig;
  private modelLoaded: boolean = false;
  private modelId: 'mobilenet_v2' | 'mobilenet_v3' = 'mobilenet_v2';

  constructor(config: Partial<VisionPipelineConfig> = {}) {
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
  }

  /**
   * Initialize the classification model
   */
  async initialize(): Promise<boolean> {
    try {
      const model = await loadMobileNetModel();
      this.modelLoaded = model !== null;
      return this.modelLoaded;
    } catch (error) {
      console.error('[ClassificationService] Model initialization failed:', error);
      this.modelLoaded = false;
      return false;
    }
  }

  /**
   * Classify an image and return top labels
   * 
   * @param normalizedImage - Preprocessed image tensor
   * @returns Classification results with confidence scores
   */
  async classify(normalizedImage: NormalizedImage): Promise<ClassificationResult> {
    const startTime = Date.now();

    try {
      // Ensure model is loaded
      const model = await loadMobileNetModel();
      
      // If model failed to load, return empty results (not an error)
      // The pipeline will use other stages for captioning
      if (!model) {
        console.log('[ClassificationService] Model not available, skipping classification');
        return {
          labels: [],
          inferenceTimeMs: Date.now() - startTime,
          modelId: this.modelId,
          success: true, // Mark as success so pipeline continues
          error: 'Model not available in current environment',
        };
      }
      
      this.modelLoaded = true;

      // Create tensor from normalized image data
      const tensor = this.createTensorFromNormalizedImage(normalizedImage);
      
      try {
        // Run MobileNet classification
        const predictions = await model.classify(tensor, this.config.maxClassificationLabels * 2);
        
        // Convert predictions to our format
        const labels = this.processPredictions(predictions);

        const inferenceTimeMs = Date.now() - startTime;

        return {
          labels,
          inferenceTimeMs,
          modelId: this.modelId,
          success: true,
        };
      } finally {
        // Clean up tensor
        disposeTensor(tensor);
      }
    } catch (error) {
      console.error('[ClassificationService] Classification failed:', error);
      return {
        labels: [],
        inferenceTimeMs: Date.now() - startTime,
        modelId: this.modelId,
        success: true, // Mark as success so pipeline continues
        error: error instanceof Error ? error.message : 'Classification failed',
      };
    }
  }

  /**
   * Create a TensorFlow tensor from NormalizedImage
   */
  private createTensorFromNormalizedImage(normalizedImage: NormalizedImage): tf.Tensor3D {
    // NormalizedImage contains Float32Array with RGB values normalized to [0, 1]
    // Shape: [height, width, 3]
    return tf.tensor3d(
      normalizedImage.tensorData,
      [normalizedImage.height, normalizedImage.width, 3]
    );
  }

  /**
   * Process MobileNet predictions into our ClassificationLabel format
   */
  private processPredictions(
    predictions: Array<{ className: string; probability: number }>
  ): ClassificationLabel[] {
    const labels: ClassificationLabel[] = [];

    for (let i = 0; i < predictions.length; i++) {
      const pred = predictions[i];
      
      // Apply confidence threshold
      if (pred.probability >= this.config.classificationThreshold) {
        // MobileNet className format: "class1, class2, class3"
        // Extract the primary class name
        const primaryLabel = pred.className.split(',')[0].trim();
        
        labels.push({
          label: primaryLabel,
          normalizedLabel: this.normalizeLabel(primaryLabel),
          confidence: pred.probability,
          index: i,
        });
      }
    }

    // Return top N labels
    return labels.slice(0, this.config.maxClassificationLabels);
  }

  /**
   * Normalize label for consistent matching
   */
  private normalizeLabel(label: string): string {
    return label
      .toLowerCase()
      .trim()
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * Check if any label suggests text content
   */
  hasTextIndicator(labels: ClassificationLabel[]): boolean {
    const textIndicators = LABEL_CATEGORIES.text;
    
    return labels.some(label => {
      const normalized = label.normalizedLabel;
      return textIndicators.some(indicator => 
        normalized.includes(indicator.toLowerCase())
      );
    });
  }

  /**
   * Extract environment from labels
   */
  getEnvironment(labels: ClassificationLabel[]): 'indoor' | 'outdoor' | 'unknown' {
    const indoorLabels = LABEL_CATEGORIES.indoor;
    const outdoorLabels = LABEL_CATEGORIES.outdoor;

    let indoorScore = 0;
    let outdoorScore = 0;

    for (const label of labels) {
      const normalized = label.normalizedLabel;
      
      // Check indoor indicators
      for (const indicator of indoorLabels) {
        if (normalized.includes(indicator.toLowerCase())) {
          indoorScore += label.confidence;
          break;
        }
      }
      
      // Check outdoor indicators
      for (const indicator of outdoorLabels) {
        if (normalized.includes(indicator.toLowerCase())) {
          outdoorScore += label.confidence;
          break;
        }
      }
    }

    if (indoorScore > outdoorScore && indoorScore > 0.2) return 'indoor';
    if (outdoorScore > indoorScore && outdoorScore > 0.2) return 'outdoor';
    return 'unknown';
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VisionPipelineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if model is ready
   */
  isReady(): boolean {
    return this.modelLoaded && mobileNetModel !== null;
  }
}

/**
 * Singleton instance
 */
let classificationServiceInstance: ClassificationService | null = null;

export function getClassificationService(
  config?: Partial<VisionPipelineConfig>
): ClassificationService {
  if (!classificationServiceInstance) {
    classificationServiceInstance = new ClassificationService(config);
  } else if (config) {
    classificationServiceInstance.updateConfig(config);
  }
  return classificationServiceInstance;
}

/**
 * Export label categories for other services
 */
export const IMAGENET_LABELS = LABEL_CATEGORIES;

export default ClassificationService;
