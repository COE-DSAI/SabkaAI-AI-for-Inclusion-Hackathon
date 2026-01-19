/**
 * Memora Vision Lite v0.5
 * Stage 9: Quality Gate
 * 
 * Final validation step that:
 * - Accepts high-confidence captions
 * - Returns safe fallback for low-confidence
 * - Flags for optional cloud escalation
 */

import {
  QualityGateResult,
  SynthesizedCaption,
  ConfidenceBreakdown,
  VisionPipelineConfig,
  DEFAULT_PIPELINE_CONFIG,
} from './types';

/**
 * Minimum safe caption for low-confidence results
 */
const MINIMAL_SAFE_CAPTION = 'An image with unclear content.';

/**
 * Quality gate service
 */
export class QualityGateService {
  private config: VisionPipelineConfig;

  constructor(config: Partial<VisionPipelineConfig> = {}) {
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
  }

  /**
   * Evaluate caption through quality gate
   */
  evaluate(
    caption: SynthesizedCaption,
    confidenceScore: number,
    confidenceBreakdown: ConfidenceBreakdown
  ): QualityGateResult {
    const threshold = this.config.qualityGateThreshold;
    
    // Primary check: confidence threshold
    if (confidenceScore >= threshold) {
      return {
        passed: true,
        threshold,
        actualConfidence: confidenceScore,
        recommendCloudEscalation: false,
        reason: 'Confidence meets threshold',
      };
    }

    // Secondary checks for borderline cases
    if (this.shouldPassBorderlineCase(caption, confidenceScore, confidenceBreakdown)) {
      return {
        passed: true,
        threshold,
        actualConfidence: confidenceScore,
        recommendCloudEscalation: true, // Recommend cloud but pass anyway
        reason: 'Borderline case passed with cloud escalation recommendation',
      };
    }

    // Failed quality gate
    return {
      passed: false,
      threshold,
      actualConfidence: confidenceScore,
      recommendCloudEscalation: true,
      reason: this.getFailureReason(confidenceScore, confidenceBreakdown),
    };
  }

  /**
   * Check for borderline cases that might still pass
   */
  private shouldPassBorderlineCase(
    caption: SynthesizedCaption,
    confidenceScore: number,
    breakdown: ConfidenceBreakdown
  ): boolean {
    // Within 10% of threshold
    const borderlineMargin = 0.1;
    const borderlineThreshold = this.config.qualityGateThreshold - borderlineMargin;
    
    if (confidenceScore < borderlineThreshold) {
      return false;
    }

    // Check if any single signal is very strong
    if (breakdown.classificationConfidence > 0.8) return true;
    if (breakdown.detectionConfidence > 0.8) return true;
    if (breakdown.ocrConfidence > 0.9) return true;

    // Check if caption is from a reliable template
    const reliableTemplates = ['photo_with_person', 'photo_with_people', 'text_heavy'];
    if (reliableTemplates.includes(caption.template)) {
      return true;
    }

    return false;
  }

  /**
   * Get human-readable failure reason
   */
  private getFailureReason(
    confidenceScore: number,
    breakdown: ConfidenceBreakdown
  ): string {
    const reasons: string[] = [];

    if (breakdown.classificationConfidence < 0.3) {
      reasons.push('low classification confidence');
    }

    if (breakdown.detectionConfidence < 0.3 && breakdown.weights.detection > 0) {
      reasons.push('low detection confidence');
    }

    if (breakdown.signalConsistency < 0.4) {
      reasons.push('inconsistent signals');
    }

    if (reasons.length === 0) {
      return `Overall confidence ${(confidenceScore * 100).toFixed(0)}% below threshold`;
    }

    return `Low confidence due to: ${reasons.join(', ')}`;
  }

  /**
   * Apply quality gate to get final caption
   */
  applyGate(
    caption: SynthesizedCaption,
    gateResult: QualityGateResult
  ): { finalCaption: string; wasModified: boolean } {
    if (gateResult.passed) {
      return {
        finalCaption: caption.text,
        wasModified: false,
      };
    }

    // Return minimal safe caption
    return {
      finalCaption: MINIMAL_SAFE_CAPTION,
      wasModified: true,
    };
  }

  /**
   * Get minimal safe caption
   */
  getMinimalCaption(): string {
    return MINIMAL_SAFE_CAPTION;
  }

  /**
   * Check if cloud escalation is recommended
   */
  shouldEscalateToCloud(gateResult: QualityGateResult): boolean {
    return gateResult.recommendCloudEscalation;
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
let qualityGateInstance: QualityGateService | null = null;

export function getQualityGateService(
  config?: Partial<VisionPipelineConfig>
): QualityGateService {
  if (!qualityGateInstance) {
    qualityGateInstance = new QualityGateService(config);
  } else if (config) {
    qualityGateInstance.updateConfig(config);
  }
  return qualityGateInstance;
}

export { MINIMAL_SAFE_CAPTION };
export default QualityGateService;
