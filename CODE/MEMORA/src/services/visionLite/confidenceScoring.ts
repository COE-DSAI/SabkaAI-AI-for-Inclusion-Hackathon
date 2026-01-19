/**
 * Memora Vision Lite v0.5
 * Stage 8: Confidence Scoring
 * 
 * Computes a single confidence score using:
 * - Classification confidence
 * - Detection confidence
 * - OCR confidence (if used)
 * - Signal consistency
 */

import {
  ClassificationResult,
  DetectionResult,
  OCRResult,
  SemanticObject,
  ConfidenceBreakdown,
  VisionPipelineConfig,
  DEFAULT_PIPELINE_CONFIG,
} from './types';

/**
 * Default weights for confidence components
 */
const DEFAULT_WEIGHTS = {
  classification: 0.35,
  detection: 0.25,
  ocr: 0.15,
  consistency: 0.25,
};

/**
 * Confidence scoring service
 */
export class ConfidenceScoringService {
  private config: VisionPipelineConfig;

  constructor(config: Partial<VisionPipelineConfig> = {}) {
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
  }

  /**
   * Calculate overall confidence score
   */
  calculateConfidence(
    classification: ClassificationResult,
    detection: DetectionResult,
    ocr: OCRResult,
    semantic: SemanticObject
  ): { score: number; breakdown: ConfidenceBreakdown } {
    // Calculate individual component scores
    const classificationConfidence = this.calculateClassificationConfidence(classification);
    const detectionConfidence = this.calculateDetectionConfidence(detection);
    const ocrConfidence = this.calculateOCRConfidence(ocr);
    const signalConsistency = this.calculateSignalConsistency(
      classification,
      detection,
      ocr,
      semantic
    );

    // Adjust weights based on what data is available
    const weights = this.adjustWeights(classification, detection, ocr);

    // Calculate weighted score
    const score = 
      classificationConfidence * weights.classification +
      detectionConfidence * weights.detection +
      ocrConfidence * weights.ocr +
      signalConsistency * weights.consistency;

    // Clamp to [0, 1]
    const clampedScore = Math.max(0, Math.min(1, score));

    return {
      score: clampedScore,
      breakdown: {
        classificationConfidence,
        detectionConfidence,
        ocrConfidence,
        signalConsistency,
        weights,
      },
    };
  }

  /**
   * Calculate classification confidence
   * Based on top label confidence and spread
   */
  private calculateClassificationConfidence(classification: ClassificationResult): number {
    if (!classification.success || classification.labels.length === 0) {
      return 0;
    }

    // Get top label confidence
    const topConfidence = classification.labels[0].confidence;

    // Calculate confidence spread (good if top label is clearly dominant)
    let spread = 1;
    if (classification.labels.length > 1) {
      const secondConfidence = classification.labels[1].confidence;
      spread = topConfidence - secondConfidence;
    }

    // Average of top confidence and spread
    // High top confidence + good separation = high score
    const spreadBonus = spread * 0.3;
    
    return Math.min(1, topConfidence + spreadBonus);
  }

  /**
   * Calculate detection confidence
   * Based on number of detections and their confidence
   */
  private calculateDetectionConfidence(detection: DetectionResult): number {
    if (!detection.success || detection.objects.length === 0) {
      return 0;
    }

    // Average confidence of detected objects
    const avgConfidence = detection.objects.reduce(
      (sum, obj) => sum + obj.confidence, 0
    ) / detection.objects.length;

    // Bonus for having multiple consistent detections
    const countBonus = Math.min(detection.objects.length, 5) * 0.02;

    return Math.min(1, avgConfidence + countBonus);
  }

  /**
   * Calculate OCR confidence
   */
  private calculateOCRConfidence(ocr: OCRResult): number {
    // If OCR wasn't triggered, return neutral score
    if (!ocr.triggered) {
      return 0.5; // Neutral - doesn't affect overall score much
    }

    if (!ocr.success || ocr.textBlocks.length === 0) {
      return 0.2; // Low but not zero - OCR tried but found nothing
    }

    // Average confidence of text blocks
    const avgConfidence = ocr.textBlocks.reduce(
      (sum, block) => sum + block.confidence, 0
    ) / ocr.textBlocks.length;

    // Bonus for meaningful text
    const meaningfulBonus = ocr.hasMeaningfulText ? 0.15 : 0;

    return Math.min(1, avgConfidence + meaningfulBonus);
  }

  /**
   * Calculate signal consistency
   * How well do different signals agree with each other?
   */
  private calculateSignalConsistency(
    classification: ClassificationResult,
    detection: DetectionResult,
    ocr: OCRResult,
    semantic: SemanticObject
  ): number {
    let consistencyScore = 0.5; // Base score
    let factors = 0;

    // Check classification-detection agreement
    if (classification.success && classification.labels.length > 0 && 
        detection.success && detection.objects.length > 0) {
      const classLabels = new Set(classification.labels.map(l => l.normalizedLabel));
      const detectLabels = new Set(detection.objects.map(o => o.normalizedLabel));
      
      // Count overlapping labels
      let overlap = 0;
      classLabels.forEach(label => {
        if (detectLabels.has(label)) overlap++;
      });

      // Normalize by smaller set size
      const minSize = Math.min(classLabels.size, detectLabels.size);
      const overlapRatio = minSize > 0 ? overlap / minSize : 0;
      
      consistencyScore += overlapRatio * 0.3;
      factors++;
    }

    // Check if semantic type matches content
    if (semantic.type !== 'unknown') {
      // Document/screenshot should have text
      if ((semantic.type === 'document' || semantic.type === 'screenshot') && ocr.hasMeaningfulText) {
        consistencyScore += 0.2;
      }
      // Photo should have objects
      if (semantic.type === 'photo' && (semantic.primarySubjects.length > 0 || semantic.personCount > 0)) {
        consistencyScore += 0.2;
      }
      factors++;
    }

    // Check if we have any meaningful content
    if (semantic.primarySubjects.length > 0 || semantic.personCount > 0 || ocr.hasMeaningfulText) {
      consistencyScore += 0.1;
    }
    
    // If no ML signals but OCR found text, that's still useful information
    if ((!classification.success || classification.labels.length === 0) &&
        (!detection.success || detection.objects.length === 0) &&
        ocr.triggered && ocr.hasMeaningfulText) {
      consistencyScore = Math.max(consistencyScore, 0.6);
    }

    return Math.min(1, consistencyScore);
  }

  /**
   * Adjust weights based on available data
   * If ML models couldn't load, give more weight to OCR and consistency
   */
  private adjustWeights(
    classification: ClassificationResult,
    detection: DetectionResult,
    ocr: OCRResult
  ): typeof DEFAULT_WEIGHTS {
    const weights = { ...DEFAULT_WEIGHTS };
    
    // Track if ML models didn't produce results
    const classificationAvailable = classification.success && classification.labels.length > 0;
    const detectionAvailable = detection.success && detection.objects.length > 0;
    const ocrAvailable = ocr.triggered && ocr.success;
    
    // If both ML models failed but OCR worked, redistribute to OCR
    if (!classificationAvailable && !detectionAvailable && ocrAvailable) {
      weights.classification = 0;
      weights.detection = 0;
      weights.ocr = 0.5;
      weights.consistency = 0.5;
      return weights;
    }
    
    // Normal weight adjustment
    let totalAvailable = 1;

    // If classification failed, redistribute weight
    if (!classificationAvailable) {
      totalAvailable -= DEFAULT_WEIGHTS.classification;
      weights.classification = 0;
    }

    // If detection failed, redistribute weight
    if (!detectionAvailable) {
      totalAvailable -= DEFAULT_WEIGHTS.detection;
      weights.detection = 0;
    }

    // If OCR wasn't triggered or failed
    if (!ocrAvailable) {
      totalAvailable -= DEFAULT_WEIGHTS.ocr;
      weights.ocr = 0;
    }

    // Normalize remaining weights to sum to 1
    if (totalAvailable > 0 && totalAvailable < 1) {
      const normFactor = 1 / totalAvailable;
      weights.classification *= normFactor;
      weights.detection *= normFactor;
      weights.ocr *= normFactor;
      weights.consistency *= normFactor;
    }

    return weights;
  }

  /**
   * Get confidence level description
   */
  getConfidenceLevel(score: number): 'high' | 'medium' | 'low' | 'very_low' {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    if (score >= 0.4) return 'low';
    return 'very_low';
  }

  /**
   * Check if confidence meets threshold
   */
  meetsThreshold(score: number): boolean {
    return score >= this.config.qualityGateThreshold;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VisionPipelineConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Singleton instance
 */
let confidenceScoringInstance: ConfidenceScoringService | null = null;

export function getConfidenceScoringService(
  config?: Partial<VisionPipelineConfig>
): ConfidenceScoringService {
  if (!confidenceScoringInstance) {
    confidenceScoringInstance = new ConfidenceScoringService(config);
  } else if (config) {
    confidenceScoringInstance.updateConfig(config);
  }
  return confidenceScoringInstance;
}

export { DEFAULT_WEIGHTS };
export default ConfidenceScoringService;
