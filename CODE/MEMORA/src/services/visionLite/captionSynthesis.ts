/**
 * Memora Vision Lite v0.5
 * Stage 6-7: Caption Template Selection & Synthesis
 * 
 * Selects appropriate caption template based on image type
 * and fills it deterministically with semantic data.
 * 
 * Rules:
 * - Never guess identity
 * - Never infer emotions
 * - Never infer sensitive attributes
 * - Keep captions under ~20 words
 */

import {
  SemanticObject,
  ImageType,
  Environment,
  CaptionTemplate,
  TemplateSelection,
  SynthesizedCaption,
  VisionPipelineConfig,
  DEFAULT_PIPELINE_CONFIG,
} from './types';
import { SemanticNormalizationService, getSemanticNormalizationService } from './semanticNormalization';

/**
 * Template definitions with placeholders
 */
const CAPTION_TEMPLATES: Record<CaptionTemplate, string> = {
  // Person templates
  'photo_with_person': 'A person {action} {environment}.',
  'photo_with_people': '{people} {action} {environment}.',
  
  // Object templates
  'photo_object_focused': 'An image showing {primary_object} {context}.',
  'photo_scene': 'A {environment} scene with {objects}.',
  
  // Text templates
  'screenshot_with_text': 'A screenshot displaying: "{text}".',
  'document_with_text': 'A document containing: "{text}".',
  'text_heavy': 'An image with text: "{text}".',
  
  // Special templates
  'diagram': 'A diagram showing {description}.',
  'minimal': 'An image with unclear content.',
  'unknown': 'An image.',
};

/**
 * Caption synthesis service
 */
export class CaptionSynthesisService {
  private config: VisionPipelineConfig;
  private semanticService: SemanticNormalizationService;

  constructor(config: Partial<VisionPipelineConfig> = {}) {
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
    this.semanticService = getSemanticNormalizationService();
  }

  /**
   * Select appropriate caption template based on semantic analysis
   */
  selectTemplate(semantic: SemanticObject): TemplateSelection {
    let template: CaptionTemplate;
    let reason: string;

    // Priority-based template selection
    switch (semantic.type) {
      case 'document':
        if (semantic.textPresent && semantic.textContent) {
          template = 'document_with_text';
          reason = 'Document with readable text detected';
        } else {
          template = 'photo_object_focused';
          reason = 'Document without readable text';
        }
        break;

      case 'screenshot':
        if (semantic.textPresent && semantic.textContent) {
          template = 'screenshot_with_text';
          reason = 'Screenshot with visible text';
        } else {
          template = 'photo_object_focused';
          reason = 'Screenshot without text';
        }
        break;

      case 'diagram':
        template = 'diagram';
        reason = 'Diagram or chart detected';
        break;

      case 'photo':
      case 'mixed':
        // Person-centric templates
        if (semantic.personCount === 1) {
          template = 'photo_with_person';
          reason = 'Single person detected in photo';
        } else if (semantic.personCount > 1) {
          template = 'photo_with_people';
          reason = `${semantic.personCount} people detected in photo`;
        } else if (semantic.primarySubjects.length > 0) {
          template = 'photo_object_focused';
          reason = 'Objects detected without people';
        } else if (semantic.environment !== 'unknown') {
          template = 'photo_scene';
          reason = 'Scene/environment detected';
        } else {
          template = 'minimal';
          reason = 'No clear subjects detected';
        }
        break;

      case 'unknown':
      default:
        template = 'unknown';
        reason = 'Unable to classify image content';
        break;
    }

    // Handle text-heavy cases for photos/mixed
    if ((semantic.type === 'photo' || semantic.type === 'mixed') && 
        semantic.textPresent && 
        semantic.textContent &&
        semantic.personCount === 0 &&
        semantic.primarySubjects.length === 0) {
      template = 'text_heavy';
      reason = 'Text is primary content';
    }

    return {
      template,
      reason,
      templateString: CAPTION_TEMPLATES[template],
    };
  }

  /**
   * Synthesize caption by filling template with semantic data
   * DETERMINISTIC: Same input always produces same output
   */
  synthesize(semantic: SemanticObject, templateSelection: TemplateSelection): SynthesizedCaption {
    const substitutions: Record<string, string> = {};
    let caption = templateSelection.templateString;

    // Build substitution values based on template type
    switch (templateSelection.template) {
      case 'photo_with_person':
        substitutions['action'] = this.buildActionPhrase(semantic);
        substitutions['environment'] = this.buildEnvironmentPhrase(semantic);
        break;

      case 'photo_with_people':
        substitutions['people'] = this.semanticService.getPersonDescriptor(semantic.personCount);
        substitutions['action'] = this.buildActionPhrase(semantic);
        substitutions['environment'] = this.buildEnvironmentPhrase(semantic);
        break;

      case 'photo_object_focused':
        substitutions['primary_object'] = this.buildPrimaryObjectPhrase(semantic);
        substitutions['context'] = this.buildContextPhrase(semantic);
        break;

      case 'photo_scene':
        substitutions['environment'] = semantic.environment !== 'unknown' 
          ? semantic.environment 
          : 'general';
        substitutions['objects'] = this.buildObjectListPhrase(semantic);
        break;

      case 'screenshot_with_text':
      case 'document_with_text':
      case 'text_heavy':
        substitutions['text'] = semantic.textContent || 'unreadable text';
        break;

      case 'diagram':
        substitutions['description'] = this.buildDiagramDescription(semantic);
        break;

      case 'minimal':
      case 'unknown':
        // No substitutions needed
        break;
    }

    // Apply substitutions
    caption = this.applySubstitutions(caption, substitutions);

    // Clean up and validate
    caption = this.cleanCaption(caption);

    // Enforce word limit
    caption = this.enforceWordLimit(caption, this.config.maxCaptionWords);

    return {
      text: caption,
      wordCount: this.countWords(caption),
      template: templateSelection.template,
      substitutions,
    };
  }

  /**
   * Build action phrase from semantic data
   */
  private buildActionPhrase(semantic: SemanticObject): string {
    if (semantic.actionContext) {
      return semantic.actionContext;
    }

    // Check for objects that imply action
    const actionObjects = semantic.primarySubjects.concat(semantic.secondaryObjects);
    
    for (const obj of actionObjects) {
      if (obj === 'laptop' || obj === 'computer') return 'using a computer';
      if (obj === 'phone') return 'using a phone';
      if (obj === 'book') return 'with a book';
      if (obj === 'food' || obj === 'meal') return 'with food';
      if (obj === 'cup' || obj === 'mug') return 'with a drink';
      if (obj === 'camera') return 'with a camera';
    }

    return '';
  }

  /**
   * Build environment phrase
   */
  private buildEnvironmentPhrase(semantic: SemanticObject): string {
    const envDesc = this.semanticService.getEnvironmentDescriptor(semantic.environment);
    
    if (envDesc) {
      return envDesc;
    }

    // Try to infer from objects
    const allLabels = semantic.allLabels;
    
    if (allLabels.includes('office') || allLabels.includes('desk')) return 'in an office';
    if (allLabels.includes('kitchen')) return 'in a kitchen';
    if (allLabels.includes('bedroom')) return 'in a bedroom';
    if (allLabels.includes('restaurant')) return 'at a restaurant';
    if (allLabels.includes('park')) return 'at a park';
    if (allLabels.includes('beach')) return 'at a beach';
    if (allLabels.includes('street')) return 'on a street';

    return '';
  }

  /**
   * Build primary object phrase
   */
  private buildPrimaryObjectPhrase(semantic: SemanticObject): string {
    if (semantic.primarySubjects.length === 0) {
      return 'unidentified objects';
    }

    const primary = semantic.primarySubjects[0];
    
    // Add article
    const article = this.getArticle(primary);
    return `${article} ${primary}`;
  }

  /**
   * Build context phrase from secondary objects
   */
  private buildContextPhrase(semantic: SemanticObject): string {
    const contextParts: string[] = [];

    // Add environment if known
    if (semantic.environment !== 'unknown') {
      contextParts.push(this.semanticService.getEnvironmentDescriptor(semantic.environment));
    }

    // Add some secondary objects
    if (semantic.secondaryObjects.length > 0) {
      const objects = semantic.secondaryObjects.slice(0, 2);
      contextParts.push('with ' + objects.join(' and '));
    }

    return contextParts.filter(p => p.length > 0).join(' ');
  }

  /**
   * Build object list phrase
   */
  private buildObjectListPhrase(semantic: SemanticObject): string {
    const allObjects = [...semantic.primarySubjects, ...semantic.secondaryObjects];
    
    if (allObjects.length === 0) {
      return 'various elements';
    }

    if (allObjects.length === 1) {
      return this.getArticle(allObjects[0]) + ' ' + allObjects[0];
    }

    if (allObjects.length === 2) {
      return `${this.getArticle(allObjects[0])} ${allObjects[0]} and ${this.getArticle(allObjects[1])} ${allObjects[1]}`;
    }

    // 3+ objects: "a X, Y, and Z"
    const lastObj = allObjects[allObjects.length - 1];
    const otherObjs = allObjects.slice(0, -1).slice(0, 3); // Max 4 objects total
    return otherObjs.join(', ') + ', and ' + lastObj;
  }

  /**
   * Build diagram description
   */
  private buildDiagramDescription(semantic: SemanticObject): string {
    if (semantic.textPresent && semantic.textContent) {
      return `information related to "${semantic.textContent}"`;
    }

    const labels = semantic.allLabels;
    
    if (labels.includes('chart') || labels.includes('graph')) {
      return 'data visualization';
    }
    
    if (labels.includes('flowchart')) {
      return 'a process flow';
    }

    return 'visual information';
  }

  /**
   * Get appropriate article (a/an)
   */
  private getArticle(word: string): string {
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    const firstLetter = word.charAt(0).toLowerCase();
    return vowels.includes(firstLetter) ? 'an' : 'a';
  }

  /**
   * Apply substitutions to template
   */
  private applySubstitutions(template: string, substitutions: Record<string, string>): string {
    let result = template;
    
    for (const [key, value] of Object.entries(substitutions)) {
      const placeholder = `{${key}}`;
      result = result.replace(placeholder, value);
    }

    return result;
  }

  /**
   * Clean up caption text
   */
  private cleanCaption(caption: string): string {
    return caption
      // Remove empty placeholders
      .replace(/\{[^}]+\}/g, '')
      // Remove double spaces
      .replace(/\s+/g, ' ')
      // Remove space before punctuation
      .replace(/\s+\./g, '.')
      .replace(/\s+,/g, ',')
      // Remove multiple periods
      .replace(/\.+/g, '.')
      // Capitalize first letter
      .replace(/^./, c => c.toUpperCase())
      // Trim
      .trim();
  }

  /**
   * Enforce word limit
   */
  private enforceWordLimit(caption: string, maxWords: number): string {
    const words = caption.split(/\s+/);
    
    if (words.length <= maxWords) {
      return caption;
    }

    // Truncate and add period if needed
    const truncated = words.slice(0, maxWords).join(' ');
    return truncated.endsWith('.') ? truncated : truncated + '.';
  }

  /**
   * Count words in caption
   */
  private countWords(caption: string): number {
    return caption.split(/\s+/).filter(w => w.length > 0).length;
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
let captionSynthesisInstance: CaptionSynthesisService | null = null;

export function getCaptionSynthesisService(
  config?: Partial<VisionPipelineConfig>
): CaptionSynthesisService {
  if (!captionSynthesisInstance) {
    captionSynthesisInstance = new CaptionSynthesisService(config);
  } else if (config) {
    captionSynthesisInstance.updateConfig(config);
  }
  return captionSynthesisInstance;
}

export { CAPTION_TEMPLATES };
export default CaptionSynthesisService;
