/**
 * Memora Vision Lite v0.5
 * Integration Tests - Vision Pipeline
 * 
 * End-to-end tests for the complete on-device vision pipeline,
 * verifying all stages work together correctly.
 */

import {
  VisionLitePipeline,
  processImage,
  processImageFromUri,
  ImageBitmap,
  VisionResult,
  DEFAULT_PIPELINE_CONFIG,
  MINIMAL_SAFE_CAPTION,
  PIPELINE_VERSION,
  PIPELINE_NAME,
} from '../../src/services/visionLite';

// Test fixtures
function createTestImageBitmap(scenario: 'photo' | 'document' | 'empty' | 'invalid'): ImageBitmap {
  switch (scenario) {
    case 'photo':
      return {
        data: 'base64-encoded-photo-data-simulation',
        width: 1920,
        height: 1080,
        mimeType: 'image/jpeg',
        orientationCorrected: true,
      };
    case 'document':
      return {
        data: 'base64-encoded-document-scan-simulation',
        width: 2480,
        height: 3508, // A4 ratio
        mimeType: 'image/png',
        orientationCorrected: true,
      };
    case 'empty':
      return {
        data: '',
        width: 0,
        height: 0,
        mimeType: 'image/jpeg',
        orientationCorrected: false,
      };
    case 'invalid':
      return {
        data: 'not-valid-image-data',
        width: -1,
        height: -1,
        mimeType: 'image/jpeg',
        orientationCorrected: false,
      };
  }
}

describe('Memora Vision Lite v0.5 - Integration Pipeline', () => {
  describe('Full Pipeline Execution', () => {
    let pipeline: VisionLitePipeline;

    beforeEach(async () => {
      pipeline = new VisionLitePipeline({
        debugMode: false,
        qualityGateThreshold: 0.3, // Lower for testing
      });
      await pipeline.initialize();
    });

    it('should process a photo through all stages', async () => {
      const imageBitmap = createTestImageBitmap('photo');
      const result = await pipeline.processImage(imageBitmap);

      // Verify all stages completed
      expect(result.stageTiming).toHaveLength(9);
      
      const completedStages = result.stageTiming.filter(s => s.status === 'completed');
      expect(completedStages.length).toBeGreaterThanOrEqual(5);

      // Verify result structure
      expect(result.version).toBe('v0.5');
      expect(result.caption_text).toBeDefined();
      expect(result.caption_text.length).toBeGreaterThan(0);
      expect(result.confidence_score).toBeGreaterThanOrEqual(0);
      expect(result.confidence_score).toBeLessThanOrEqual(1);
    });

    it('should produce screen-reader safe captions', async () => {
      const imageBitmap = createTestImageBitmap('photo');
      const result = await pipeline.processImage(imageBitmap);

      const caption = result.caption_text;

      // Screen-reader safety checks
      // 1. Should not contain unpronounceable characters
      expect(caption).not.toMatch(/[<>{}[\]|\\]/);
      
      // 2. Should be proper sentence(s)
      expect(caption).toMatch(/[A-Z]/); // Has uppercase
      expect(caption).toMatch(/[.!?]$/); // Ends with punctuation

      // 3. Should not be too long for comfortable listening
      const wordCount = caption.split(/\s+/).length;
      expect(wordCount).toBeLessThanOrEqual(DEFAULT_PIPELINE_CONFIG.maxCaptionWords);
    });

    it('should not contain hallucinated identity information', async () => {
      const imageBitmap = createTestImageBitmap('photo');
      const result = await pipeline.processImage(imageBitmap);

      const caption = result.caption_text.toLowerCase();

      // Should not guess names
      const commonNames = ['john', 'jane', 'mike', 'sarah', 'david', 'lisa'];
      for (const name of commonNames) {
        expect(caption).not.toContain(name);
      }

      // Should not guess emotions unless very confident
      const emotions = ['happy', 'sad', 'angry', 'surprised', 'scared', 'excited'];
      for (const emotion of emotions) {
        expect(caption).not.toContain(emotion);
      }

      // Should not guess age
      const ageTerms = ['young', 'old', 'elderly', 'teenage', 'middle-aged'];
      for (const age of ageTerms) {
        expect(caption).not.toContain(age);
      }
    });

    it('should handle document/text-heavy images', async () => {
      const documentPipeline = new VisionLitePipeline({
        debugMode: false,
        alwaysRunOCR: true,
        qualityGateThreshold: 0.3,
      });
      await documentPipeline.initialize();

      const imageBitmap = createTestImageBitmap('document');
      const result = await documentPipeline.processImage(imageBitmap);

      // OCR should have been triggered
      expect(result.signal_breakdown.ocr.triggered).toBe(true);
    });

    it('should provide confidence breakdown', async () => {
      const imageBitmap = createTestImageBitmap('photo');
      const result = await pipeline.processImage(imageBitmap);

      const breakdown = result.signal_breakdown.confidenceBreakdown;

      // All components should be defined
      expect(breakdown.classificationConfidence).toBeDefined();
      expect(breakdown.detectionConfidence).toBeDefined();
      expect(breakdown.ocrConfidence).toBeDefined();
      expect(breakdown.signalConsistency).toBeDefined();

      // Weights should sum to approximately 1
      const totalWeight = 
        breakdown.weights.classification +
        breakdown.weights.detection +
        breakdown.weights.ocr +
        breakdown.weights.consistency;
      expect(totalWeight).toBeCloseTo(1, 1);
    });

    it('should handle high quality gate threshold correctly', async () => {
      const strictPipeline = new VisionLitePipeline({
        debugMode: false,
        qualityGateThreshold: 0.99, // Very strict
      });
      await strictPipeline.initialize();

      const imageBitmap = createTestImageBitmap('photo');
      const result = await strictPipeline.processImage(imageBitmap);

      // With real ML models returning high confidence, verify structure
      expect(result.signal_breakdown.qualityGate).toBeDefined();
      expect(typeof result.signal_breakdown.qualityGate.passed).toBe('boolean');
      expect(result.signal_breakdown.qualityGate.threshold).toBe(0.99);
      // Cloud escalation may be recommended even if passed
      expect(typeof result.signal_breakdown.qualityGate.recommendCloudEscalation).toBe('boolean');
    });
  });

  describe('Pipeline Determinism', () => {
    it('should produce consistent result structure for identical inputs', async () => {
      const pipeline = new VisionLitePipeline({ debugMode: false });
      await pipeline.initialize();

      const imageBitmap = createTestImageBitmap('photo');

      // Run multiple times
      const results: VisionResult[] = [];
      for (let i = 0; i < 3; i++) {
        results.push(await pipeline.processImage(imageBitmap));
      }

      // All should have same structure (actual values may vary in simulation mode)
      for (const result of results) {
        // Verify structure exists
        expect(result.signal_breakdown.semantic.type).toBeDefined();
        expect(result.signal_breakdown.templateSelection.template).toBeDefined();
        expect(result.caption_text).toBeDefined();
        expect(result.confidence_score).toBeGreaterThanOrEqual(0);
        expect(result.confidence_score).toBeLessThanOrEqual(1);
        
        // Verify all required fields are present
        expect(result.version).toBe('v0.5');
        expect(result.stageTiming.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle empty images gracefully', async () => {
      const pipeline = new VisionLitePipeline({ debugMode: false });
      
      const emptyImage = createTestImageBitmap('empty');
      
      // Should either throw or return error result
      let errorOccurred = false;
      try {
        const result = await pipeline.processImage(emptyImage);
        if (!result.success) {
          errorOccurred = true;
        }
      } catch {
        errorOccurred = true;
      }

      expect(errorOccurred).toBe(true);
    });

    it('should return valid caption for any processed image', async () => {
      const pipeline = new VisionLitePipeline({ debugMode: false });
      
      const invalidImage = createTestImageBitmap('invalid');
      
      let result: VisionResult | null = null;
      try {
        result = await pipeline.processImage(invalidImage);
      } catch {
        // Pipeline may throw for truly invalid images
      }

      // Either throws or returns a valid caption
      if (result) {
        expect(typeof result.caption_text).toBe('string');
        expect(result.caption_text.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance Characteristics', () => {
    it('should complete within target latency for typical photos', async () => {
      const pipeline = new VisionLitePipeline({ debugMode: false });
      await pipeline.initialize();

      const imageBitmap = createTestImageBitmap('photo');

      const startTime = Date.now();
      const result = await pipeline.processImage(imageBitmap);
      const totalTime = Date.now() - startTime;

      // Target: 200-400ms, allow extra time for test environment
      expect(totalTime).toBeLessThan(2000);
      
      // Result should include timing info
      expect(result.processingTimeMs).toBeDefined();
      expect(result.processingTimeMs).toBeLessThan(2000);
    });

    it('should report individual stage timings', async () => {
      const pipeline = new VisionLitePipeline({ debugMode: false });
      await pipeline.initialize();

      const imageBitmap = createTestImageBitmap('photo');
      const result = await pipeline.processImage(imageBitmap);

      // All timing entries should have valid durations
      for (const timing of result.stageTiming) {
        expect(timing.durationMs).toBeGreaterThanOrEqual(0);
        expect(timing.stage).toBeDefined();
        expect(timing.status).toBeDefined();
      }
    });
  });

  describe('Configuration', () => {
    it('should respect quality gate threshold configuration', async () => {
      // Note: Since services use singleton pattern, we test sequentially
      // First test with low threshold
      const lowThreshold = new VisionLitePipeline({ qualityGateThreshold: 0.1 });
      await lowThreshold.initialize();
      
      const imageBitmap = createTestImageBitmap('photo');
      const lowResult = await lowThreshold.processImage(imageBitmap);
      
      // Verify low threshold was applied
      expect(lowResult.signal_breakdown.qualityGate.threshold).toBe(0.1);
      
      // Now test with high threshold (this updates the singletons)
      const highThreshold = new VisionLitePipeline({ qualityGateThreshold: 0.9 });
      await highThreshold.initialize();
      
      const highResult = await highThreshold.processImage(imageBitmap);
      
      // Verify high threshold was applied
      expect(highResult.signal_breakdown.qualityGate.threshold).toBe(0.9);
    });

    it('should allow runtime configuration updates', async () => {
      const pipeline = new VisionLitePipeline({ debugMode: false });

      expect(pipeline.getConfig().debugMode).toBe(false);

      pipeline.updateConfig({ debugMode: true });

      expect(pipeline.getConfig().debugMode).toBe(true);
    });

    it('should use correct pipeline version', () => {
      const pipeline = new VisionLitePipeline();
      const info = pipeline.getVersionInfo();

      expect(info.name).toBe(PIPELINE_NAME);
      expect(info.version).toBe(PIPELINE_VERSION);
    });
  });
});

describe('Memora Vision Lite v0.5 - Module Exports', () => {
  it('should export main pipeline class', () => {
    expect(VisionLitePipeline).toBeDefined();
  });

  it('should export convenience functions', () => {
    expect(processImage).toBeDefined();
    expect(processImageFromUri).toBeDefined();
  });

  it('should export version constants', () => {
    expect(PIPELINE_VERSION).toBe('v0.5');
    expect(PIPELINE_NAME).toBe('Memora Vision Lite');
  });

  it('should export default configuration', () => {
    expect(DEFAULT_PIPELINE_CONFIG).toBeDefined();
    expect(DEFAULT_PIPELINE_CONFIG.targetImageSize).toBe(224);
    expect(DEFAULT_PIPELINE_CONFIG.qualityGateThreshold).toBe(0.5);
  });
});
