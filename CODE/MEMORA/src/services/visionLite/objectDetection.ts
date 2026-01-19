/**
 * Memora Vision Lite v0.5
 * Stage 3: Object Detection
 * 
 * Uses TensorFlow.js COCO-SSD for real on-device object detection.
 * Detects and localizes objects in images with bounding boxes.
 * 
 * Model: COCO-SSD (Single Shot MultiBox Detector)
 */

import * as cocoSsd from '@tensorflow-models/coco-ssd';
import {
  NormalizedImage,
  DetectionResult,
  DetectedObject,
  BoundingBox,
  VisionPipelineConfig,
  DEFAULT_PIPELINE_CONFIG,
} from './types';
import { 
  initializeTensorFlow, 
  tf,
  disposeTensor 
} from './tensorflowSetup';

/**
 * COCO-SSD model instance
 */
let cocoModel: cocoSsd.ObjectDetection | null = null;
let modelLoadPromise: Promise<cocoSsd.ObjectDetection> | null = null;
let modelLoadFailed = false;

/**
 * Load COCO-SSD model (singleton pattern)
 */
async function loadCocoModel(): Promise<cocoSsd.ObjectDetection | null> {
  // If model load previously failed, don't retry
  if (modelLoadFailed) {
    return null;
  }
  
  if (cocoModel) {
    return cocoModel;
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

      console.log('[COCO-SSD] Loading model...');
      const startTime = Date.now();
      
      // Load COCO-SSD with 'lite_mobilenet_v2' for faster inference
      const model = await cocoSsd.load({
        base: 'lite_mobilenet_v2', // Faster, good for mobile
      });
      
      console.log(`[COCO-SSD] Model loaded in ${Date.now() - startTime}ms`);
      cocoModel = model;
      return model;
    } catch (error) {
      console.warn('[COCO-SSD] Model load failed, using fallback:', error);
      modelLoadFailed = true;
      modelLoadPromise = null;
      return null;
    }
  })();

  return modelLoadPromise;
}

/**
 * COCO dataset labels (80 object classes)
 */
export const COCO_LABELS = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck',
  'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
  'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe',
  'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard',
  'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard',
  'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl',
  'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza',
  'donut', 'cake', 'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet',
  'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven',
  'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear',
  'hair drier', 'toothbrush'
];

/**
 * Object detection service using TensorFlow.js COCO-SSD
 */
export class ObjectDetectionService {
  private config: VisionPipelineConfig;
  private modelLoaded: boolean = false;
  private modelId: 'ssd_mobilenet_v2' = 'ssd_mobilenet_v2';

  constructor(config: Partial<VisionPipelineConfig> = {}) {
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
  }

  /**
   * Initialize the object detection model
   */
  async initialize(): Promise<boolean> {
    try {
      const model = await loadCocoModel();
      this.modelLoaded = model !== null;
      return this.modelLoaded;
    } catch (error) {
      console.error('[ObjectDetectionService] Model initialization failed:', error);
      this.modelLoaded = false;
      return false;
    }
  }

  /**
   * Detect objects in an image
   * 
   * @param normalizedImage - Preprocessed image tensor
   * @returns Detection results with bounding boxes
   */
  async detect(normalizedImage: NormalizedImage): Promise<DetectionResult> {
    const startTime = Date.now();

    try {
      // Ensure model is loaded
      const model = await loadCocoModel();
      
      // If model failed to load, return empty results (not an error)
      // The pipeline will use other stages for captioning
      if (!model) {
        console.log('[ObjectDetectionService] Model not available, skipping detection');
        return {
          objects: [],
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
        // Run COCO-SSD detection
        // Model expects 3D tensor [height, width, 3]
        const predictions = await model.detect(tensor as tf.Tensor3D);
        
        // Convert predictions to our format
        const objects = this.processPredictions(
          predictions, 
          normalizedImage.originalWidth, 
          normalizedImage.originalHeight
        );

        const inferenceTimeMs = Date.now() - startTime;

        return {
          objects,
          inferenceTimeMs,
          modelId: this.modelId,
          success: true,
        };
      } finally {
        // Clean up tensor
        disposeTensor(tensor);
      }
    } catch (error) {
      console.error('[ObjectDetectionService] Detection failed:', error);
      return {
        objects: [],
        inferenceTimeMs: Date.now() - startTime,
        modelId: this.modelId,
        success: true, // Mark as success so pipeline continues
        error: error instanceof Error ? error.message : 'Detection failed',
      };
    }
  }

  /**
   * Create a TensorFlow tensor from NormalizedImage
   */
  private createTensorFromNormalizedImage(normalizedImage: NormalizedImage): tf.Tensor3D {
    return tf.tensor3d(
      normalizedImage.tensorData,
      [normalizedImage.height, normalizedImage.width, 3]
    );
  }

  /**
   * Process COCO-SSD predictions into our DetectedObject format
   */
  private processPredictions(
    predictions: cocoSsd.DetectedObject[],
    originalWidth: number,
    originalHeight: number
  ): DetectedObject[] {
    const objects: DetectedObject[] = [];

    for (const pred of predictions) {
      // Apply confidence threshold
      if (pred.score >= this.config.detectionThreshold) {
        // COCO-SSD bbox format: [x, y, width, height] in pixels
        // Convert to normalized coordinates [0, 1]
        const boundingBox: BoundingBox = {
          x: pred.bbox[0] / originalWidth,
          y: pred.bbox[1] / originalHeight,
          width: pred.bbox[2] / originalWidth,
          height: pred.bbox[3] / originalHeight,
        };

        objects.push({
          label: pred.class,
          normalizedLabel: this.normalizeLabel(pred.class),
          confidence: pred.score,
          boundingBox,
        });
      }
    }

    // Sort by confidence descending
    objects.sort((a, b) => b.confidence - a.confidence);

    // Return top N detections
    return objects.slice(0, this.config.maxDetectedObjects);
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
   * Count people in detection results
   */
  countPeople(objects: DetectedObject[]): number {
    return objects.filter(obj => obj.normalizedLabel === 'person').length;
  }

  /**
   * Get primary subject from detections (largest, highest confidence)
   */
  getPrimarySubject(objects: DetectedObject[]): DetectedObject | null {
    if (objects.length === 0) return null;

    // Score by combination of confidence and bounding box size
    let bestScore = -1;
    let bestObject: DetectedObject | null = null;

    for (const obj of objects) {
      const boxArea = obj.boundingBox.width * obj.boundingBox.height;
      // Weight: 70% confidence, 30% size
      const score = obj.confidence * 0.7 + boxArea * 0.3;
      
      if (score > bestScore) {
        bestScore = score;
        bestObject = obj;
      }
    }

    return bestObject;
  }

  /**
   * Check if detection contains people
   */
  hasPeople(objects: DetectedObject[]): boolean {
    return objects.some(obj => obj.normalizedLabel === 'person');
  }

  /**
   * Get unique labels from detections
   */
  getUniqueLabels(objects: DetectedObject[]): string[] {
    const labels = new Set<string>();
    for (const obj of objects) {
      labels.add(obj.normalizedLabel);
    }
    return Array.from(labels);
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
    return this.modelLoaded && cocoModel !== null;
  }
}

/**
 * Singleton instance
 */
let detectionServiceInstance: ObjectDetectionService | null = null;

export function getObjectDetectionService(
  config?: Partial<VisionPipelineConfig>
): ObjectDetectionService {
  if (!detectionServiceInstance) {
    detectionServiceInstance = new ObjectDetectionService(config);
  } else if (config) {
    detectionServiceInstance.updateConfig(config);
  }
  return detectionServiceInstance;
}

export default ObjectDetectionService;
