/**
 * Memora Vision Lite v0.5
 * Stage 5: Semantic Normalization
 * 
 * Pure logic layer (no ML) that:
 * - Deduplicates labels
 * - Collapses synonyms
 * - Ranks signals by confidence
 * - Removes low-confidence noise
 * - Classifies image type
 */

import {
  ClassificationResult,
  DetectionResult,
  OCRResult,
  SemanticObject,
  ImageType,
  Environment,
  ClassificationLabel,
  DetectedObject,
  PERSON_LABELS,
  INDOOR_LABELS,
  OUTDOOR_LABELS,
} from './types';

/**
 * Synonym mappings for label normalization
 */
const SYNONYM_MAP: Record<string, string> = {
  // People
  'man': 'person',
  'woman': 'person',
  'boy': 'person',
  'girl': 'person',
  'child': 'person',
  'adult': 'person',
  'people': 'person',
  'human': 'person',
  'face': 'person',
  'portrait': 'person',
  
  // Devices
  'notebook': 'laptop',
  'computer': 'laptop',
  'pc': 'laptop',
  'macbook': 'laptop',
  'cell phone': 'phone',
  'mobile phone': 'phone',
  'smartphone': 'phone',
  'iphone': 'phone',
  
  // Furniture
  'couch': 'sofa',
  'settee': 'sofa',
  'dining table': 'table',
  'desk': 'table',
  'coffee table': 'table',
  
  // Vehicles
  'automobile': 'car',
  'vehicle': 'car',
  'suv': 'car',
  'sedan': 'car',
  
  // Food
  'meal': 'food',
  'dish': 'food',
  'cuisine': 'food',
  
  // Places
  'living room': 'room',
  'bedroom': 'room',
  'office': 'room',
  'kitchen': 'room',
};

/**
 * Labels that indicate action/activity
 */
const ACTION_INDICATORS: Record<string, string> = {
  'laptop': 'using a laptop',
  'phone': 'using a phone',
  'book': 'reading',
  'food': 'eating',
  'cup': 'drinking',
  'keyboard': 'typing',
  'camera': 'taking photos',
  'sports ball': 'playing sports',
  'bicycle': 'cycling',
  'surfboard': 'surfing',
  'skis': 'skiing',
};

/**
 * Semantic normalization service
 */
export class SemanticNormalizationService {
  /**
   * Process all signals into a unified semantic object
   */
  normalize(
    classification: ClassificationResult,
    detection: DetectionResult,
    ocr: OCRResult
  ): SemanticObject {
    // Collect all labels
    const allLabels = this.collectAllLabels(classification, detection);
    
    // Deduplicate and normalize
    const normalizedLabels = this.deduplicateAndNormalize(allLabels);
    
    // Determine image type
    const type = this.classifyImageType(classification, ocr);
    
    // Determine environment
    const environment = this.determineEnvironment(normalizedLabels);
    
    // Count and identify people
    const personCount = this.countPeople(normalizedLabels, detection);
    
    // Determine primary subjects and secondary objects
    const { primarySubjects, secondaryObjects } = this.rankSubjects(normalizedLabels, personCount);
    
    // Determine action context if possible
    const actionContext = this.inferActionContext(normalizedLabels);
    
    return {
      type,
      primarySubjects,
      secondaryObjects,
      environment,
      textPresent: ocr.hasMeaningfulText,
      textContent: ocr.hasMeaningfulText ? ocr.textSummary : undefined,
      personCount,
      actionContext,
      allLabels: normalizedLabels.map(l => l.label),
    };
  }

  /**
   * Collect all labels from classification and detection
   */
  private collectAllLabels(
    classification: ClassificationResult,
    detection: DetectionResult
  ): Array<{ label: string; confidence: number; source: 'classification' | 'detection' }> {
    const labels: Array<{ label: string; confidence: number; source: 'classification' | 'detection' }> = [];

    // Add classification labels
    for (const label of classification.labels) {
      labels.push({
        label: label.normalizedLabel,
        confidence: label.confidence,
        source: 'classification',
      });
    }

    // Add detection labels
    for (const obj of detection.objects) {
      labels.push({
        label: obj.normalizedLabel,
        confidence: obj.confidence,
        source: 'detection',
      });
    }

    return labels;
  }

  /**
   * Deduplicate labels and collapse synonyms
   */
  private deduplicateAndNormalize(
    labels: Array<{ label: string; confidence: number; source: string }>
  ): Array<{ label: string; confidence: number }> {
    const labelMap = new Map<string, { confidence: number; count: number }>();

    for (const item of labels) {
      // Apply synonym mapping
      const normalizedLabel = SYNONYM_MAP[item.label] || item.label;
      
      const existing = labelMap.get(normalizedLabel);
      if (existing) {
        // Take highest confidence and increment count
        labelMap.set(normalizedLabel, {
          confidence: Math.max(existing.confidence, item.confidence),
          count: existing.count + 1,
        });
      } else {
        labelMap.set(normalizedLabel, {
          confidence: item.confidence,
          count: 1,
        });
      }
    }

    // Convert to array and sort by confidence
    const result: Array<{ label: string; confidence: number }> = [];
    labelMap.forEach((value, label) => {
      // Boost confidence slightly if label appeared multiple times
      const boostedConfidence = Math.min(1, value.confidence * (1 + (value.count - 1) * 0.1));
      result.push({ label, confidence: boostedConfidence });
    });

    // Sort by confidence
    result.sort((a, b) => b.confidence - a.confidence);

    return result;
  }

  /**
   * Classify the type of image
   */
  private classifyImageType(
    classification: ClassificationResult,
    ocr: OCRResult
  ): ImageType {
    const labels = classification.labels.map(l => l.normalizedLabel);
    
    // Check for document/text-heavy
    if (ocr.hasMeaningfulText && ocr.textBlocks.length > 2) {
      // Check specific document indicators
      const docIndicators = ['document', 'paper', 'letter', 'book', 'newspaper'];
      if (labels.some(l => docIndicators.includes(l))) {
        return 'document';
      }
      
      // Check for diagram
      const diagramIndicators = ['diagram', 'chart', 'graph', 'flowchart'];
      if (labels.some(l => diagramIndicators.includes(l))) {
        return 'diagram';
      }
      
      // Check for screenshot
      const screenIndicators = ['screen', 'monitor', 'display', 'interface'];
      if (labels.some(l => screenIndicators.includes(l))) {
        return 'screenshot';
      }
    }
    
    // Check for screenshot without OCR
    const screenIndicators = ['screen', 'monitor', 'interface', 'app'];
    if (labels.some(l => screenIndicators.includes(l))) {
      return 'screenshot';
    }
    
    // Check for diagram without text
    const diagramIndicators = ['diagram', 'chart', 'graph'];
    if (labels.some(l => diagramIndicators.includes(l))) {
      return 'diagram';
    }
    
    // Check for mixed content
    if (ocr.hasMeaningfulText && labels.some(l => PERSON_LABELS.includes(l))) {
      return 'mixed';
    }
    
    // Default to photo
    return 'photo';
  }

  /**
   * Determine indoor/outdoor environment
   */
  private determineEnvironment(
    labels: Array<{ label: string; confidence: number }>
  ): Environment {
    let indoorScore = 0;
    let outdoorScore = 0;

    for (const item of labels) {
      if (INDOOR_LABELS.includes(item.label)) {
        indoorScore += item.confidence;
      }
      if (OUTDOOR_LABELS.includes(item.label)) {
        outdoorScore += item.confidence;
      }
    }

    // Need significant difference to make a call
    if (indoorScore > outdoorScore && indoorScore > 0.3) return 'indoor';
    if (outdoorScore > indoorScore && outdoorScore > 0.3) return 'outdoor';
    return 'unknown';
  }

  /**
   * Count number of people detected
   */
  private countPeople(
    labels: Array<{ label: string; confidence: number }>,
    detection: DetectionResult
  ): number {
    // Count from detection results (more accurate for multiple people)
    const personDetections = detection.objects.filter(
      obj => obj.normalizedLabel === 'person' && obj.confidence > 0.4
    );

    if (personDetections.length > 0) {
      return personDetections.length;
    }

    // Fall back to classification
    const personLabel = labels.find(l => l.label === 'person');
    return personLabel && personLabel.confidence > 0.4 ? 1 : 0;
  }

  /**
   * Rank subjects into primary and secondary
   */
  private rankSubjects(
    labels: Array<{ label: string; confidence: number }>,
    personCount: number
  ): { primarySubjects: string[]; secondaryObjects: string[] } {
    const primarySubjects: string[] = [];
    const secondaryObjects: string[] = [];

    // People are always primary if present
    if (personCount > 0) {
      primarySubjects.push('person');
    }

    // Non-person labels
    const nonPersonLabels = labels.filter(l => l.label !== 'person');

    // High confidence (> 0.6) non-environment labels are primary
    for (const label of nonPersonLabels) {
      if (label.confidence > 0.6) {
        if (!this.isEnvironmentLabel(label.label)) {
          if (!primarySubjects.includes(label.label)) {
            primarySubjects.push(label.label);
          }
        }
      }
    }

    // Medium confidence (0.3-0.6) are secondary
    for (const label of nonPersonLabels) {
      if (label.confidence >= 0.3 && label.confidence <= 0.6) {
        if (!primarySubjects.includes(label.label) && !this.isEnvironmentLabel(label.label)) {
          if (!secondaryObjects.includes(label.label)) {
            secondaryObjects.push(label.label);
          }
        }
      }
    }

    // Limit to reasonable numbers
    return {
      primarySubjects: primarySubjects.slice(0, 3),
      secondaryObjects: secondaryObjects.slice(0, 5),
    };
  }

  /**
   * Check if label is an environment/scene label
   */
  private isEnvironmentLabel(label: string): boolean {
    return INDOOR_LABELS.includes(label) || OUTDOOR_LABELS.includes(label);
  }

  /**
   * Infer action context from objects
   */
  private inferActionContext(
    labels: Array<{ label: string; confidence: number }>
  ): string | undefined {
    // Check if person is present (action requires a subject)
    const hasPerson = labels.some(l => l.label === 'person' && l.confidence > 0.4);
    
    if (!hasPerson) return undefined;

    // Find highest confidence action indicator
    for (const label of labels) {
      if (ACTION_INDICATORS[label.label] && label.confidence > 0.4) {
        return ACTION_INDICATORS[label.label];
      }
    }

    return undefined;
  }

  /**
   * Get human-readable person descriptor
   */
  getPersonDescriptor(count: number): string {
    if (count === 0) return '';
    if (count === 1) return 'a person';
    if (count === 2) return 'two people';
    if (count <= 5) return `${count} people`;
    return 'a group of people';
  }

  /**
   * Get environment descriptor
   */
  getEnvironmentDescriptor(environment: Environment): string {
    switch (environment) {
      case 'indoor': return 'indoors';
      case 'outdoor': return 'outdoors';
      default: return '';
    }
  }
}

/**
 * Singleton instance
 */
let semanticServiceInstance: SemanticNormalizationService | null = null;

export function getSemanticNormalizationService(): SemanticNormalizationService {
  if (!semanticServiceInstance) {
    semanticServiceInstance = new SemanticNormalizationService();
  }
  return semanticServiceInstance;
}

export { SYNONYM_MAP, ACTION_INDICATORS };
export default SemanticNormalizationService;
