/**
 * Memora Vision Lite v0.5
 * Type definitions for the on-device vision pipeline
 * 
 * This module defines all interfaces for the deterministic,
 * CPU-only vision system designed for mobile devices.
 */

// ============= Core Types =============

/**
 * Image type classification based on content analysis
 */
export type ImageType = 'photo' | 'screenshot' | 'document' | 'diagram' | 'mixed' | 'unknown';

/**
 * Processing status for pipeline stages
 */
export type StageStatus = 'pending' | 'running' | 'completed' | 'skipped' | 'failed';

/**
 * Input image representation
 */
export interface ImageBitmap {
  /** Base64 encoded image data or file URI */
  data: string;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** MIME type of the image */
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  /** Whether orientation has been corrected */
  orientationCorrected: boolean;
}

/**
 * Normalized image ready for ML inference
 */
export interface NormalizedImage {
  /** Tensor-ready pixel data (RGB normalized to 0-1 or -1 to 1) */
  tensorData: Float32Array;
  /** Normalized width (typically 224 or 320) */
  width: number;
  /** Normalized height (typically 224 or 320) */
  height: number;
  /** Original image dimensions for reference */
  originalWidth: number;
  originalHeight: number;
  /** Preprocessing applied */
  preprocessing: {
    resized: boolean;
    colorNormalized: boolean;
    targetSize: number;
  };
  /** Optional: Raw pixel data as RGBA Uint8Array (for OCR) */
  rawPixelData?: Uint8Array;
  /** Optional: Base64 encoded image data (for OCR fallback) */
  base64?: string;
  /** Optional: Original image URI */
  uri?: string;
  /** Optional: MIME type of original image */
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

// ============= Stage 2: Classification Types =============

/**
 * Single classification label with confidence
 */
export interface ClassificationLabel {
  /** Human-readable label from MobileNet */
  label: string;
  /** Normalized label (lowercase, trimmed) */
  normalizedLabel: string;
  /** Confidence score 0.0-1.0 */
  confidence: number;
  /** Index in the classification output */
  index: number;
}

/**
 * Result from image classification stage
 */
export interface ClassificationResult {
  /** Top N labels above threshold */
  labels: ClassificationLabel[];
  /** Raw inference time in milliseconds */
  inferenceTimeMs: number;
  /** Model used for classification */
  modelId: 'mobilenet_v2' | 'mobilenet_v3';
  /** Whether inference succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

// ============= Stage 3: Object Detection Types =============

/**
 * Bounding box for detected object
 */
export interface BoundingBox {
  /** X coordinate of top-left corner (0-1 normalized) */
  x: number;
  /** Y coordinate of top-left corner (0-1 normalized) */
  y: number;
  /** Width (0-1 normalized) */
  width: number;
  /** Height (0-1 normalized) */
  height: number;
}

/**
 * Single detected object
 */
export interface DetectedObject {
  /** Object class label */
  label: string;
  /** Normalized label */
  normalizedLabel: string;
  /** Detection confidence 0.0-1.0 */
  confidence: number;
  /** Bounding box location */
  boundingBox: BoundingBox;
}

/**
 * Result from object detection stage
 */
export interface DetectionResult {
  /** Detected objects above threshold */
  objects: DetectedObject[];
  /** Raw inference time in milliseconds */
  inferenceTimeMs: number;
  /** Model used for detection */
  modelId: 'ssd_mobilenet_v2';
  /** Whether inference succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

// ============= Stage 4: OCR Types =============

/**
 * Text block detected by OCR
 */
export interface TextBlock {
  /** Extracted text content */
  text: string;
  /** Confidence of text recognition */
  confidence: number;
  /** Bounding box of text region */
  boundingBox: BoundingBox;
  /** Language detected (if available) */
  language?: string;
}

/**
 * Result from OCR stage
 */
export interface OCRResult {
  /** Whether OCR was triggered */
  triggered: boolean;
  /** Reason for trigger (or skip) */
  triggerReason: 'classification_hint' | 'user_enabled' | 'not_triggered';
  /** Detected text blocks */
  textBlocks: TextBlock[];
  /** Combined extracted text (cleaned) */
  extractedText: string;
  /** Summary text for caption (truncated) */
  textSummary: string;
  /** Whether meaningful text was detected */
  hasMeaningfulText: boolean;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Whether OCR succeeded (if triggered) */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

// ============= Stage 5: Semantic Normalization Types =============

/**
 * Environment/setting classification
 */
export type Environment = 'indoor' | 'outdoor' | 'unknown';

/**
 * Semantic representation of image content
 */
export interface SemanticObject {
  /** Classified image type */
  type: ImageType;
  /** Primary subjects (highest confidence) */
  primarySubjects: string[];
  /** Secondary objects (supporting context) */
  secondaryObjects: string[];
  /** Detected environment */
  environment: Environment;
  /** Whether text is present */
  textPresent: boolean;
  /** Text summary if present */
  textContent?: string;
  /** Count of people detected */
  personCount: number;
  /** Action context if detectable */
  actionContext?: string;
  /** All unique labels for reference */
  allLabels: string[];
}

// ============= Stage 6-7: Caption Types =============

/**
 * Caption template identifier
 */
export type CaptionTemplate = 
  | 'photo_with_person'
  | 'photo_with_people'
  | 'photo_object_focused'
  | 'photo_scene'
  | 'screenshot_with_text'
  | 'document_with_text'
  | 'diagram'
  | 'text_heavy'
  | 'minimal'
  | 'unknown';

/**
 * Selected template with reasoning
 */
export interface TemplateSelection {
  /** Selected template ID */
  template: CaptionTemplate;
  /** Why this template was selected */
  reason: string;
  /** Template string with placeholders */
  templateString: string;
}

/**
 * Synthesized caption result
 */
export interface SynthesizedCaption {
  /** Final caption text */
  text: string;
  /** Word count */
  wordCount: number;
  /** Template used */
  template: CaptionTemplate;
  /** Values substituted into template */
  substitutions: Record<string, string>;
}

// ============= Stage 8: Confidence Types =============

/**
 * Breakdown of confidence components
 */
export interface ConfidenceBreakdown {
  /** Classification stage confidence */
  classificationConfidence: number;
  /** Detection stage confidence */
  detectionConfidence: number;
  /** OCR confidence (if used) */
  ocrConfidence: number;
  /** Signal consistency score */
  signalConsistency: number;
  /** Weights used for each component */
  weights: {
    classification: number;
    detection: number;
    ocr: number;
    consistency: number;
  };
}

// ============= Stage 9: Quality Gate Types =============

/**
 * Quality gate decision
 */
export interface QualityGateResult {
  /** Whether caption passed quality gate */
  passed: boolean;
  /** Confidence threshold used */
  threshold: number;
  /** Actual confidence score */
  actualConfidence: number;
  /** Whether escalation to cloud is recommended */
  recommendCloudEscalation: boolean;
  /** Reason for decision */
  reason: string;
}

// ============= Pipeline Configuration =============

/**
 * Configuration for the vision pipeline
 */
export interface VisionPipelineConfig {
  /** Target size for image normalization */
  targetImageSize: number;
  /** Minimum confidence for classification labels */
  classificationThreshold: number;
  /** Minimum confidence for detected objects */
  detectionThreshold: number;
  /** Maximum number of classification labels to keep */
  maxClassificationLabels: number;
  /** Maximum number of detected objects to keep */
  maxDetectedObjects: number;
  /** Quality gate confidence threshold */
  qualityGateThreshold: number;
  /** Whether to always run OCR */
  alwaysRunOCR: boolean;
  /** Maximum text length for caption */
  maxTextSummaryLength: number;
  /** Maximum caption word count */
  maxCaptionWords: number;
  /** Enable debug logging */
  debugMode: boolean;
}

/**
 * Default pipeline configuration
 */
export const DEFAULT_PIPELINE_CONFIG: VisionPipelineConfig = {
  targetImageSize: 224,
  classificationThreshold: 0.3,
  detectionThreshold: 0.4,
  maxClassificationLabels: 5,
  maxDetectedObjects: 10,
  qualityGateThreshold: 0.5,
  alwaysRunOCR: false,
  maxTextSummaryLength: 50,
  maxCaptionWords: 20,
  debugMode: false,
};

// ============= Final Output Types =============

/**
 * Signal breakdown for debugging and analysis
 */
export interface SignalBreakdown {
  /** Classification results */
  classification: ClassificationResult;
  /** Detection results */
  detection: DetectionResult;
  /** OCR results */
  ocr: OCRResult;
  /** Semantic analysis */
  semantic: SemanticObject;
  /** Template selection */
  templateSelection: TemplateSelection;
  /** Confidence breakdown */
  confidenceBreakdown: ConfidenceBreakdown;
  /** Quality gate result */
  qualityGate: QualityGateResult;
}

/**
 * Pipeline stage timing for performance analysis
 */
export interface PipelineTiming {
  /** Stage name */
  stage: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Status of the stage */
  status: StageStatus;
}

/**
 * Final vision result - the main output of the pipeline
 */
export interface VisionResult {
  /** Generated caption text */
  caption_text: string;
  /** Overall confidence score 0.0-1.0 */
  confidence_score: number;
  /** Detailed signal breakdown */
  signal_breakdown: SignalBreakdown;
  /** Whether processing succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Total processing time in milliseconds */
  processingTimeMs: number;
  /** Individual stage timings */
  stageTiming: PipelineTiming[];
  /** Pipeline version */
  version: 'v0.5';
  /** Timestamp of processing */
  timestamp: number;
}

// ============= Model Metadata =============

/**
 * Metadata for loaded ML models
 */
export interface ModelMetadata {
  /** Model identifier */
  modelId: string;
  /** Model version */
  version: string;
  /** File size in bytes */
  sizeBytes: number;
  /** Whether model is quantized */
  quantized: boolean;
  /** Input tensor shape */
  inputShape: number[];
  /** Labels count (for classification) */
  labelsCount?: number;
  /** Whether model is loaded */
  isLoaded: boolean;
}

/**
 * Labels for MobileNet classification
 * Subset of ImageNet labels commonly used
 */
export const MOBILENET_TEXT_TRIGGER_LABELS = [
  'text',
  'document',
  'screen',
  'poster',
  'diagram',
  'menu',
  'book',
  'newspaper',
  'magazine',
  'letter',
  'envelope',
  'sign',
  'banner',
  'label',
  'monitor',
  'television',
  'laptop',
  'notebook',
  'web_site',
];

/**
 * Labels indicating indoor environment
 */
export const INDOOR_LABELS = [
  'indoor',
  'room',
  'office',
  'kitchen',
  'bedroom',
  'bathroom',
  'living_room',
  'dining_room',
  'library',
  'restaurant',
  'shop',
  'store',
  'gym',
  'studio',
];

/**
 * Labels indicating outdoor environment
 */
export const OUTDOOR_LABELS = [
  'outdoor',
  'sky',
  'mountain',
  'beach',
  'forest',
  'park',
  'street',
  'road',
  'garden',
  'field',
  'lake',
  'ocean',
  'river',
  'cityscape',
];

/**
 * Labels indicating person/people
 */
export const PERSON_LABELS = [
  'person',
  'man',
  'woman',
  'child',
  'boy',
  'girl',
  'people',
  'crowd',
  'face',
  'portrait',
];
