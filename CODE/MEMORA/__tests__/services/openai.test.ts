import { OpenAIService, createOpenAIService, hasValidApiKey, getCurrentApiKey } from '../../src/services/openai';
import * as FileSystem from 'expo-file-system';

jest.mock('expo-file-system');

describe('OpenAIService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('createOpenAIService', () => {
    it('should create service with user API key', () => {
      const service = createOpenAIService('sk-user-key');
      expect(service).toBeInstanceOf(OpenAIService);
    });

    it('should create service without API key', () => {
      const service = createOpenAIService();
      expect(service).toBeInstanceOf(OpenAIService);
    });
  });

  describe('hasValidApiKey', () => {
    it('should return false for empty key', () => {
      expect(hasValidApiKey('')).toBe(false);
    });

    it('should return false for undefined key', () => {
      expect(hasValidApiKey(undefined)).toBe(false);
    });

    it('should return false for invalid format', () => {
      expect(hasValidApiKey('invalid-key')).toBe(false);
    });

    it('should return true for valid sk- prefixed key', () => {
      expect(hasValidApiKey('sk-validkey123')).toBe(true);
    });
  });

  describe('getCurrentApiKey', () => {
    it('should return user key when provided', () => {
      expect(getCurrentApiKey('sk-user-key')).toBe('sk-user-key');
    });

    it('should return default key when user key is empty', () => {
      const result = getCurrentApiKey('');
      expect(typeof result).toBe('string');
    });
  });

  describe('generateImageCaption', () => {
    const mockBase64 = 'SGVsbG8gV29ybGQ=';
    const mockImageUri = 'file:///test/image.jpg';

    beforeEach(() => {
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(mockBase64);
    });

    it('should generate short caption when isLongDescription is false', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'A person walking in a park',
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const service = createOpenAIService('sk-test-key');
      const result = await service.generateImageCaption(mockImageUri, false);

      expect(result).toBe('A person walking in a park');
      expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(mockImageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    });

    it('should generate long description when isLongDescription is true', async () => {
      const longDescription = 'A detailed description of the scene with a person walking through a beautiful park on a sunny day.';
      const mockResponse = {
        choices: [
          {
            message: {
              content: longDescription,
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const service = createOpenAIService('sk-test-key');
      const result = await service.generateImageCaption(mockImageUri, true);

      expect(result).toBe(longDescription);
    });

    it('should return fallback message on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
      });

      const service = createOpenAIService('sk-invalid-key');
      const result = await service.generateImageCaption(mockImageUri, false);

      expect(result).toContain('unavailable');
    });

    it('should return fallback for long description on error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const service = createOpenAIService('sk-test-key');
      const result = await service.generateImageCaption(mockImageUri, true);

      expect(result).toContain('detailed description');
    });

    it('should handle empty choices array', async () => {
      const mockResponse = {
        choices: [],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const service = createOpenAIService('sk-test-key');
      const result = await service.generateImageCaption(mockImageUri, false);

      expect(result).toContain('unavailable');
    });

    it('should handle file read error', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(
        new Error('File not found')
      );

      const service = createOpenAIService('sk-test-key');
      const result = await service.generateImageCaption(mockImageUri, false);

      expect(result).toContain('unavailable');
    });
  });

  describe('testConnection', () => {
    it('should return true when API responds ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const service = createOpenAIService('sk-valid-key');
      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-valid-key',
          }),
        })
      );
    });

    it('should return false when API responds not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      });

      const service = createOpenAIService('sk-invalid-key');
      const result = await service.testConnection();

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const service = createOpenAIService('sk-test-key');
      const result = await service.testConnection();

      expect(result).toBe(false);
    });
  });
});
