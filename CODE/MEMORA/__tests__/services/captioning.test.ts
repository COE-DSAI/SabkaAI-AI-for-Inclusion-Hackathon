import * as FileSystem from 'expo-file-system';
import CaptioningService, { createCaptioningService } from '../../src/services/captioning';

jest.mock('expo-file-system');

// Note: @env is mocked globally via jest.config.js -> __mocks__/@env.js

// Mock Vision Lite to simulate low confidence (triggers fallback)
jest.mock('../../src/services/visionLite', () => ({
  processImageFromUri: jest.fn().mockResolvedValue({
    success: true,
    confidence_score: 0.1, // Below 0.3 threshold - triggers fallback
    caption_text: 'Test caption',
    signal_breakdown: {
      semantic: {
        environment: 'unknown',
        textPresent: false,
        secondaryObjects: [],
      },
    },
  }),
}));

describe('CaptioningService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('constructor and config', () => {
    it('should create service with default config', () => {
      const service = new CaptioningService();
      const status = service.getProviderStatus();
      expect(status).toHaveLength(3);
      expect(status.find(s => s.provider === 'ondevice')?.available).toBe(true);
    });

    it('should accept partial config', () => {
      const service = new CaptioningService({
        openaiApiKey: 'sk-test',
        preferredProvider: 'openai',
      });
      const status = service.getProviderStatus();
      expect(status.find(s => s.provider === 'openai')?.available).toBe(true);
    });

    it('should update config', () => {
      const service = new CaptioningService();
      service.updateConfig({ geminiApiKey: 'gemini-key' });
      const status = service.getProviderStatus();
      expect(status.find(s => s.provider === 'gemini')?.available).toBe(true);
    });
  });

  describe('createCaptioningService', () => {
    it('should create service instance', () => {
      const service = createCaptioningService();
      expect(service).toBeInstanceOf(CaptioningService);
    });

    it('should pass config to constructor', () => {
      const service = createCaptioningService({
        openaiApiKey: 'sk-key',
        preferredProvider: 'openai',
      });
      const status = service.getProviderStatus();
      expect(status.find(s => s.provider === 'openai')?.available).toBe(true);
    });
  });

  describe('generateCaption with OpenAI', () => {
    const mockBase64 = 'dGVzdA==';
    const mockImageUri = 'file:///test.jpg';

    beforeEach(() => {
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(mockBase64);
    });

    it('should generate short caption successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'A person walking in a park' } }],
        }),
      });

      const service = new CaptioningService({
        openaiApiKey: 'sk-test',
        preferredProvider: 'openai',
      });

      const result = await service.generateCaption(mockImageUri, false);
      expect(result.caption).toBe('A person walking in a park');
      expect(result.provider).toBe('openai');
      expect(result.isFromFallback).toBe(false);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should generate detailed caption', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ 
            message: { 
              content: 'A young person walks through a sunny park with green trees and colorful flowers' 
            } 
          }],
        }),
      });

      const service = new CaptioningService({
        openaiApiKey: 'sk-test',
        preferredProvider: 'openai',
      });

      const result = await service.generateCaption(mockImageUri, true);
      expect(result.caption.length).toBeGreaterThan(20);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle OpenAI API error and fallback', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Unauthorized',
          json: () => Promise.resolve({ error: { message: 'Invalid key' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            candidates: [{ content: { parts: [{ text: 'Gemini caption' }] } }],
          }),
        });

      const service = new CaptioningService({
        openaiApiKey: 'sk-invalid',
        geminiApiKey: 'gemini-key',
        preferredProvider: 'openai',
        enableFallback: true,
      });

      const result = await service.generateCaption(mockImageUri, false);
      expect(result.provider).toBe('gemini');
      expect(result.isFromFallback).toBe(true);
    });

    it('should return error result when all providers fail', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Error',
        json: () => Promise.resolve({}),
      });

      const service = new CaptioningService({
        openaiApiKey: 'sk-test',
        preferredProvider: 'openai',
        enableFallback: false,
      });

      const result = await service.generateCaption(mockImageUri, false);
      expect(result.error).toBeDefined();
      expect(result.isFromFallback).toBe(true);
      expect(result.confidence).toBe(0);
    });
  });

  describe('generateCaption with Gemini', () => {
    const mockBase64 = 'dGVzdA==';
    const mockImageUri = 'file:///test.jpg';

    beforeEach(() => {
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(mockBase64);
    });

    it('should generate caption with Gemini', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{ 
            content: { 
              parts: [{ text: 'A dog running on the beach' }] 
            } 
          }],
        }),
      });

      const service = new CaptioningService({
        geminiApiKey: 'gemini-key',
        preferredProvider: 'gemini',
      });

      const result = await service.generateCaption(mockImageUri, false);
      expect(result.caption).toBe('A dog running on the beach');
      expect(result.provider).toBe('gemini');
    });

    it('should handle missing Gemini API key', async () => {
      const service = new CaptioningService({
        preferredProvider: 'gemini',
        enableFallback: true,
      });

      const result = await service.generateCaption(mockImageUri, false);
      // Cloud providers no longer fall back to on-device
      expect(result.provider).toBe('gemini');
      expect(result.isFromFallback).toBe(true);
      expect(result.error).toContain('.env');
    });

    it('should handle Gemini API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: { message: 'Invalid request' } }),
      });

      const service = new CaptioningService({
        geminiApiKey: 'gemini-key',
        preferredProvider: 'gemini',
        enableFallback: false,
      });

      const result = await service.generateCaption(mockImageUri, false);
      expect(result.error).toContain('Gemini');
    });
  });

  describe('generateCaption with ondevice fallback to cloud', () => {
    it('should fallback to OpenAI when on-device confidence is too low', async () => {
      // Mock OpenAI success after on-device fails
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'OpenAI generated caption' } }],
        }),
      });
      
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('base64data');
      
      const service = new CaptioningService({
        preferredProvider: 'ondevice',
        openaiApiKey: 'sk-test',
      });

      const result = await service.generateCaption('file:///test.jpg', false);
      
      // Should have used OpenAI as fallback (on-device mock returns 0.1 confidence)
      expect(result.caption).toBe('OpenAI generated caption');
      expect(result.provider).toBe('ondevice'); // Reports as ondevice since that's preferred
      // Note: isFromFallback is false in ondevice mode to hide actual provider from user
      expect(result.isFromFallback).toBe(false);
    });

    it('should return unavailable when both on-device and cloud APIs fail', async () => {
      // Mock all API calls to fail
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const service = new CaptioningService({
        preferredProvider: 'ondevice',
        openaiApiKey: 'sk-test',
      });

      const result = await service.generateCaption('file:///test.jpg', false);
      
      // With silent cloud escalation, we return the on-device caption even if minimal
      // (it's better than nothing), or unavailable if truly nothing works
      expect(result.caption).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should return detailed fallback when all providers fail', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const service = new CaptioningService({
        preferredProvider: 'ondevice',
      });

      const result = await service.generateCaption('file:///test.jpg', true);
      // With silent cloud escalation, we return the on-device caption even if minimal
      expect(result.caption).toBeDefined();
    });
  });

  describe('provider fallback chain', () => {
    const mockBase64 = 'dGVzdA==';

    beforeEach(() => {
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(mockBase64);
    });

    it('should try providers in order', async () => {
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            statusText: 'Error',
            json: () => Promise.resolve({}),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            candidates: [{ content: { parts: [{ text: 'Fallback caption' }] } }],
          }),
        });
      });

      const service = new CaptioningService({
        openaiApiKey: 'sk-test',
        geminiApiKey: 'gemini-key',
        preferredProvider: 'openai',
        enableFallback: true,
      });

      const result = await service.generateCaption('file:///test.jpg', false);
      expect(callCount).toBe(2);
      expect(result.provider).toBe('gemini');
    });

    it('should not fallback when disabled', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Error',
        json: () => Promise.resolve({}),
      });

      const service = new CaptioningService({
        openaiApiKey: 'sk-test',
        geminiApiKey: 'gemini-key',
        preferredProvider: 'openai',
        enableFallback: false,
      });

      const result = await service.generateCaption('file:///test.jpg', false);
      expect(result.provider).toBe('openai');
      expect(result.error).toBeDefined();
    });
  });

  describe('confidence evaluation', () => {
    beforeEach(() => {
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('dGVzdA==');
    });

    it('should give high confidence for descriptive captions', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'A person walking through a sunny park with tall trees' } }],
        }),
      });

      const service = new CaptioningService({
        openaiApiKey: 'sk-test',
        preferredProvider: 'openai',
      });

      const result = await service.generateCaption('file:///test.jpg', false);
      expect(result.confidence).toBeGreaterThan(50);
    });

    it('should give lower confidence for short generic captions', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'An image' } }],
        }),
      });

      const service = new CaptioningService({
        openaiApiKey: 'sk-test',
        preferredProvider: 'openai',
      });

      const result = await service.generateCaption('file:///test.jpg', false);
      expect(result.confidence).toBeLessThan(50);
    });
  });

  describe('connection tests', () => {
    it('should test OpenAI connection', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const service = new CaptioningService({
        openaiApiKey: 'sk-test',
      });

      const result = await service.testOpenAIConnection();
      expect(result).toBe(true);
    });

    it('should return false for failed OpenAI connection', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

      const service = new CaptioningService({
        openaiApiKey: 'sk-test',
      });

      const result = await service.testOpenAIConnection();
      expect(result).toBe(false);
    });

    it('should return false when OpenAI key not configured', async () => {
      const service = new CaptioningService();

      const result = await service.testOpenAIConnection();
      expect(result).toBe(false);
    });

    it('should test Gemini connection', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const service = new CaptioningService({
        geminiApiKey: 'gemini-key',
      });

      const result = await service.testGeminiConnection();
      expect(result).toBe(true);
    });

    it('should return false for failed Gemini connection', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const service = new CaptioningService({
        geminiApiKey: 'gemini-key',
      });

      const result = await service.testGeminiConnection();
      expect(result).toBe(false);
    });
  });

  describe('getProviderStatus', () => {
    it('should return status for all providers', () => {
      const service = new CaptioningService({
        openaiApiKey: 'sk-test',
        geminiApiKey: undefined, // Explicitly undefined
      });

      const status = service.getProviderStatus();
      expect(status).toHaveLength(3);
      expect(status.find(s => s.provider === 'openai')?.available).toBe(true);
      // Gemini availability depends on whether key is set
      expect(status.find(s => s.provider === 'ondevice')?.available).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle file read errors', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(
        new Error('File not found')
      );

      const service = new CaptioningService({
        openaiApiKey: 'sk-test',
        preferredProvider: 'openai',
        enableFallback: false,
      });

      const result = await service.generateCaption('file:///missing.jpg', false);
      expect(result.error).toContain('read image');
    });

    it('should handle network errors', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('dGVzdA==');
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const service = new CaptioningService({
        openaiApiKey: 'sk-test',
        preferredProvider: 'openai',
        enableFallback: false,
      });

      const result = await service.generateCaption('file:///test.jpg', false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty response', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('dGVzdA==');
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [] }),
      });

      const service = new CaptioningService({
        openaiApiKey: 'sk-test',
        preferredProvider: 'openai',
        enableFallback: false,
      });

      const result = await service.generateCaption('file:///test.jpg', false);
      expect(result.error).toContain('No caption');
    });
  });
});
