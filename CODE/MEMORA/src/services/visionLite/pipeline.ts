/**
 * Memora Vision Lite v0.5
 * Main Pipeline Orchestrator
 * 
 * Coordinates all pipeline stages to process images and generate
 * deterministic, screen-reader-safe captions.
 * 
 * Entry point: processImage(imageBitmap) -> VisionResult
 */

import {
  ImageBitmap,
  VisionResult,
  VisionPipelineConfig,
  DEFAULT_PIPELINE_CONFIG,
  PipelineTiming,
  StageStatus,
  SignalBreakdown,
  ClassificationResult,
  DetectionResult,
  OCRResult,
  SemanticObject,
  TemplateSelection,
  SynthesizedCaption,
} from './types';

import { ImageNormalizationService, getImageNormalizationService } from './imageNormalization';
import { ClassificationService, getClassificationService } from './classificationService';
import { ObjectDetectionService, getObjectDetectionService } from './objectDetection';
import { OCRService, getOCRService } from './ocrService';
import { SemanticNormalizationService, getSemanticNormalizationService } from './semanticNormalization';
import { CaptionSynthesisService, getCaptionSynthesisService } from './captionSynthesis';
import { ConfidenceScoringService, getConfidenceScoringService } from './confidenceScoring';
import { QualityGateService, getQualityGateService, MINIMAL_SAFE_CAPTION } from './qualityGate';

/**
 * Pipeline version
 */
export const PIPELINE_VERSION = 'v0.5';
export const PIPELINE_NAME = 'Memora Vision Lite';

/**
 * Main vision pipeline class
 */
export class VisionLitePipeline {
  private config: VisionPipelineConfig;
  private initialized: boolean = false;

  // Services
  private normalizationService: ImageNormalizationService;
  private classificationService: ClassificationService;
  private detectionService: ObjectDetectionService;
  private ocrService: OCRService;
  private semanticService: SemanticNormalizationService;
  private captionService: CaptionSynthesisService;
  private confidenceService: ConfidenceScoringService;
  private qualityGateService: QualityGateService;

  constructor(config: Partial<VisionPipelineConfig> = {}) {
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };

    // Initialize services
    this.normalizationService = getImageNormalizationService(this.config);
    this.classificationService = getClassificationService(this.config);
    this.detectionService = getObjectDetectionService(this.config);
    this.ocrService = getOCRService(this.config);
    this.semanticService = getSemanticNormalizationService();
    this.captionService = getCaptionSynthesisService(this.config);
    this.confidenceService = getConfidenceScoringService(this.config);
    this.qualityGateService = getQualityGateService(this.config);
  }

  /**
   * Initialize the pipeline (load models)
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    this.log('Initializing Memora Vision Lite v0.5...');

    try {
      // Initialize ML services
      await Promise.all([
        this.classificationService.initialize(),
        this.detectionService.initialize(),
        this.ocrService.initialize(),
      ]);

      this.initialized = true;
      this.log('Pipeline initialized successfully');
      return true;
    } catch (error) {
      console.error('[Memora Vision Lite v0.5] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Process an image and generate a caption
   * 
   * This is the main entry point for the pipeline.
   * 
   * @param imageBitmap - Input image data
   * @returns VisionResult with caption and confidence
   */
  async processImage(imageBitmap: ImageBitmap): Promise<VisionResult> {
    const pipelineStartTime = Date.now();
    const stageTiming: PipelineTiming[] = [];

    // Ensure initialized
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // ========== STAGE 1: Image Normalization ==========
      const stage1Start = Date.now();
      this.log('Stage 1: Image Normalization');
      
      const normalizedImage = await this.normalizationService.normalize(imageBitmap);
      
      stageTiming.push({
        stage: 'normalization',
        durationMs: Date.now() - stage1Start,
        status: 'completed',
      });

      // ========== STAGE 2: Image Classification ==========
      const stage2Start = Date.now();
      this.log('Stage 2: Image Classification');
      
      const classification = await this.classificationService.classify(normalizedImage);
      
      stageTiming.push({
        stage: 'classification',
        durationMs: Date.now() - stage2Start,
        status: classification.success ? 'completed' : 'failed',
      });

      // ========== STAGE 3: Object Detection ==========
      const stage3Start = Date.now();
      this.log('Stage 3: Object Detection');
      
      const detection = await this.detectionService.detect(normalizedImage);
      
      stageTiming.push({
        stage: 'detection',
        durationMs: Date.now() - stage3Start,
        status: detection.success ? 'completed' : 'skipped',
      });

      // ========== STAGE 4: OCR (Conditional) ==========
      const stage4Start = Date.now();
      this.log('Stage 4: OCR (Conditional)');
      
      const ocr = await this.ocrService.extractText(normalizedImage, {
        classificationLabels: classification.labels,
        userAlwaysOCR: this.config.alwaysRunOCR,
      });
      
      stageTiming.push({
        stage: 'ocr',
        durationMs: Date.now() - stage4Start,
        status: ocr.triggered ? (ocr.success ? 'completed' : 'failed') : 'skipped',
      });

      // ========== STAGE 5: Semantic Normalization ==========
      const stage5Start = Date.now();
      this.log('Stage 5: Semantic Normalization');
      
      const semantic = this.semanticService.normalize(classification, detection, ocr);
      
      stageTiming.push({
        stage: 'semantic_normalization',
        durationMs: Date.now() - stage5Start,
        status: 'completed',
      });

      // ========== STAGE 6: Template Selection ==========
      const stage6Start = Date.now();
      this.log('Stage 6: Template Selection');
      
      const templateSelection = this.captionService.selectTemplate(semantic);
      
      stageTiming.push({
        stage: 'template_selection',
        durationMs: Date.now() - stage6Start,
        status: 'completed',
      });

      // ========== STAGE 7: Caption Synthesis ==========
      const stage7Start = Date.now();
      this.log('Stage 7: Caption Synthesis');
      
      const synthesizedCaption = this.captionService.synthesize(semantic, templateSelection);
      
      stageTiming.push({
        stage: 'caption_synthesis',
        durationMs: Date.now() - stage7Start,
        status: 'completed',
      });

      // ========== STAGE 8: Confidence Scoring ==========
      const stage8Start = Date.now();
      this.log('Stage 8: Confidence Scoring');
      
      const { score: confidenceScore, breakdown: confidenceBreakdown } = 
        this.confidenceService.calculateConfidence(classification, detection, ocr, semantic);
      
      stageTiming.push({
        stage: 'confidence_scoring',
        durationMs: Date.now() - stage8Start,
        status: 'completed',
      });

      // ========== STAGE 9: Quality Gate ==========
      const stage9Start = Date.now();
      this.log('Stage 9: Quality Gate');
      
      const qualityGate = this.qualityGateService.evaluate(
        synthesizedCaption,
        confidenceScore,
        confidenceBreakdown
      );

      const { finalCaption } = this.qualityGateService.applyGate(synthesizedCaption, qualityGate);
      
      stageTiming.push({
        stage: 'quality_gate',
        durationMs: Date.now() - stage9Start,
        status: 'completed',
      });

      // ========== Build Final Result ==========
      const processingTimeMs = Date.now() - pipelineStartTime;
      this.log(`Pipeline completed in ${processingTimeMs}ms`);

      const signalBreakdown: SignalBreakdown = {
        classification,
        detection,
        ocr,
        semantic,
        templateSelection,
        confidenceBreakdown,
        qualityGate,
      };

      return {
        caption_text: finalCaption,
        confidence_score: confidenceScore,
        signal_breakdown: signalBreakdown,
        success: true,
        processingTimeMs,
        stageTiming,
        version: PIPELINE_VERSION,
        timestamp: Date.now(),
      };

    } catch (error) {
      // Handle pipeline failure
      const processingTimeMs = Date.now() - pipelineStartTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error('[Memora Vision Lite v0.5] Pipeline error:', error);

      return this.createErrorResult(errorMessage, processingTimeMs, stageTiming);
    }
  }

  /**
   * Create an error result
   */
  private createErrorResult(
    errorMessage: string,
    processingTimeMs: number,
    stageTiming: PipelineTiming[]
  ): VisionResult {
    // Create empty results for signal breakdown
    const emptyClassification: ClassificationResult = {
      labels: [],
      inferenceTimeMs: 0,
      modelId: 'mobilenet_v2',
      success: false,
      error: errorMessage,
    };

    const emptyDetection: DetectionResult = {
      objects: [],
      inferenceTimeMs: 0,
      modelId: 'ssd_mobilenet_v2',
      success: false,
    };

    const emptyOCR: OCRResult = {
      triggered: false,
      triggerReason: 'not_triggered',
      textBlocks: [],
      extractedText: '',
      textSummary: '',
      hasMeaningfulText: false,
      processingTimeMs: 0,
      success: false,
    };

    const emptySemantic: SemanticObject = {
      type: 'unknown',
      primarySubjects: [],
      secondaryObjects: [],
      environment: 'unknown',
      textPresent: false,
      personCount: 0,
      allLabels: [],
    };

    const emptyTemplateSelection: TemplateSelection = {
      template: 'minimal',
      reason: 'Pipeline error',
      templateString: MINIMAL_SAFE_CAPTION,
    };

    return {
      caption_text: MINIMAL_SAFE_CAPTION,
      confidence_score: 0,
      signal_breakdown: {
        classification: emptyClassification,
        detection: emptyDetection,
        ocr: emptyOCR,
        semantic: emptySemantic,
        templateSelection: emptyTemplateSelection,
        confidenceBreakdown: {
          classificationConfidence: 0,
          detectionConfidence: 0,
          ocrConfidence: 0,
          signalConsistency: 0,
          weights: {
            classification: 0.35,
            detection: 0.25,
            ocr: 0.15,
            consistency: 0.25,
          },
        },
        qualityGate: {
          passed: false,
          threshold: this.config.qualityGateThreshold,
          actualConfidence: 0,
          recommendCloudEscalation: true,
          reason: `Pipeline error: ${errorMessage}`,
        },
      },
      success: false,
      error: errorMessage,
      processingTimeMs,
      stageTiming,
      version: PIPELINE_VERSION,
      timestamp: Date.now(),
    };
  }

  /**
   * Process image from URI (convenience method)
   */
  async processImageFromUri(uri: string): Promise<VisionResult> {
    try {
      const imageBitmap = await this.normalizationService.createImageBitmapFromUri(uri);
      
      // Set default dimensions if not detected
      if (imageBitmap.width === 0 || imageBitmap.height === 0) {
        imageBitmap.width = 640;
        imageBitmap.height = 480;
      }

      return this.processImage(imageBitmap);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load image';
      return this.createErrorResult(errorMessage, 0, []);
    }
  }

  /**
   * Update pipeline configuration
   */
  updateConfig(config: Partial<VisionPipelineConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update all services
    this.normalizationService.updateConfig(config);
    this.classificationService.updateConfig(config);
    this.detectionService.updateConfig(config);
    this.ocrService.updateConfig(config);
    this.captionService.updateConfig(config);
    this.confidenceService.updateConfig(config);
    this.qualityGateService.updateConfig(config);
  }

  /**
   * Get current configuration
   */
  getConfig(): VisionPipelineConfig {
    return { ...this.config };
  }

  /**
   * Check if pipeline is ready
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Get pipeline version info
   */
  getVersionInfo(): { name: string; version: string } {
    return {
      name: PIPELINE_NAME,
      version: PIPELINE_VERSION,
    };
  }

  /**
   * Debug logging
   */
  private log(message: string): void {
    if (this.config.debugMode) {
      console.log(`[${PIPELINE_NAME} ${PIPELINE_VERSION}] ${message}`);
    }
  }
}

/**
 * Singleton instance
 */
let pipelineInstance: VisionLitePipeline | null = null;

/**
 * Get or create the pipeline instance
 */
export function getVisionLitePipeline(
  config?: Partial<VisionPipelineConfig>
): VisionLitePipeline {
  if (!pipelineInstance) {
    pipelineInstance = new VisionLitePipeline(config);
  } else if (config) {
    pipelineInstance.updateConfig(config);
  }
  return pipelineInstance;
}

/**
 * Main entry point function
 * 
 * @param imageBitmap - Input image data
 * @returns VisionResult with caption and confidence
 */
export async function processImage(imageBitmap: ImageBitmap): Promise<VisionResult> {
  const pipeline = getVisionLitePipeline();
  return pipeline.processImage(imageBitmap);
}

/**
 * Process image from URI
 * 
 * @param uri - Image file URI
 * @returns VisionResult with caption and confidence
 */
export async function processImageFromUri(uri: string): Promise<VisionResult> {
  const pipeline = getVisionLitePipeline();
  return pipeline.processImageFromUri(uri);
}

export default VisionLitePipeline;
