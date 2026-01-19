/**
 * Memora Vision Lite v0.5
 * Public API Exports
 * 
 * This module provides a clean public interface for the vision pipeline.
 */

// Main pipeline exports
export {
  VisionLitePipeline,
  getVisionLitePipeline,
  processImage,
  processImageFromUri,
  PIPELINE_VERSION,
  PIPELINE_NAME,
} from './pipeline';

// Type exports
export type {
  // Core types
  ImageBitmap,
  VisionResult,
  VisionPipelineConfig,
  SignalBreakdown,
  PipelineTiming,
  
  // Stage result types
  NormalizedImage,
  ClassificationResult,
  ClassificationLabel,
  DetectionResult,
  DetectedObject,
  BoundingBox,
  OCRResult,
  TextBlock,
  SemanticObject,
  TemplateSelection,
  SynthesizedCaption,
  ConfidenceBreakdown,
  QualityGateResult,
  
  // Enum types
  ImageType,
  Environment,
  CaptionTemplate,
  StageStatus,
  
  // Model metadata
  ModelMetadata,
} from './types';

// Configuration exports
export { DEFAULT_PIPELINE_CONFIG } from './types';

// Service exports (for advanced usage)
export { ImageNormalizationService, getImageNormalizationService } from './imageNormalization';
export { ClassificationService, getClassificationService, IMAGENET_LABELS } from './classificationService';
export { ObjectDetectionService, getObjectDetectionService, COCO_LABELS } from './objectDetection';
export { OCRService, getOCRService, terminateTesseractWorker } from './ocrService';
export { SemanticNormalizationService, getSemanticNormalizationService } from './semanticNormalization';
export { CaptionSynthesisService, getCaptionSynthesisService, CAPTION_TEMPLATES } from './captionSynthesis';
export { ConfidenceScoringService, getConfidenceScoringService } from './confidenceScoring';
export { QualityGateService, getQualityGateService, MINIMAL_SAFE_CAPTION } from './qualityGate';

// TensorFlow.js setup (for initialization)
export { 
  initializeTensorFlow, 
  isTensorFlowReady,
  imageUriToTensor,
  getMemoryInfo,
} from './tensorflowSetup';

// Label constants
export {
  MOBILENET_TEXT_TRIGGER_LABELS,
  INDOOR_LABELS,
  OUTDOOR_LABELS,
  PERSON_LABELS,
} from './types';
