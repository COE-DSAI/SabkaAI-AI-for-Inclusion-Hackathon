import settingsReducer, {
  updateSettings,
  setBackgroundFetchFrequency,
  setWifiOnly,
  setChargingOnly,
  setOpenAIApiKey,
  setGeminiApiKey,
  setAIProvider,
  setAutoProcessImages,
  setSaveToGooglePhotos,
  setLowBatteryThreshold,
  setDetailedCaptions,
} from '../../src/store/settingsSlice';
import { AppSettings } from '../../src/types';

describe('settingsSlice', () => {
  const initialState: AppSettings = {
    backgroundFetchFrequency: 'daily',
    wifiOnly: true,
    chargingOnly: false,
    autoProcessImages: true,
    saveToGooglePhotos: false,
    aiProvider: 'gemini',
    lowBatteryThreshold: 20,
    detailedCaptions: false,
  };

  describe('initial state', () => {
    it('should return the initial state', () => {
      const result = settingsReducer(undefined, { type: 'unknown' });
      expect(result).toEqual(initialState);
    });
  });

  describe('updateSettings', () => {
    it('should update multiple settings at once', () => {
      const updates = { wifiOnly: true, chargingOnly: true };
      const result = settingsReducer(initialState, updateSettings(updates));
      expect(result.wifiOnly).toBe(true);
      expect(result.chargingOnly).toBe(true);
      expect(result.backgroundFetchFrequency).toBe('daily');
    });

    it('should preserve existing settings when updating partial state', () => {
      const state = { ...initialState, openAIApiKey: 'test-key' };
      const result = settingsReducer(state, updateSettings({ wifiOnly: true }));
      expect(result.openAIApiKey).toBe('test-key');
      expect(result.wifiOnly).toBe(true);
    });
  });

  describe('setBackgroundFetchFrequency', () => {
    it('should set frequency to hourly', () => {
      const result = settingsReducer(initialState, setBackgroundFetchFrequency('hourly'));
      expect(result.backgroundFetchFrequency).toBe('hourly');
    });

    it('should set frequency to weekly', () => {
      const result = settingsReducer(initialState, setBackgroundFetchFrequency('weekly'));
      expect(result.backgroundFetchFrequency).toBe('weekly');
    });

    it('should set frequency to daily', () => {
      const state = { ...initialState, backgroundFetchFrequency: 'hourly' as const };
      const result = settingsReducer(state, setBackgroundFetchFrequency('daily'));
      expect(result.backgroundFetchFrequency).toBe('daily');
    });
  });

  describe('setWifiOnly', () => {
    it('should enable wifi only mode', () => {
      const result = settingsReducer(initialState, setWifiOnly(true));
      expect(result.wifiOnly).toBe(true);
    });

    it('should disable wifi only mode', () => {
      const state = { ...initialState, wifiOnly: true };
      const result = settingsReducer(state, setWifiOnly(false));
      expect(result.wifiOnly).toBe(false);
    });
  });

  describe('setChargingOnly', () => {
    it('should enable charging only mode', () => {
      const result = settingsReducer(initialState, setChargingOnly(true));
      expect(result.chargingOnly).toBe(true);
    });

    it('should disable charging only mode', () => {
      const state = { ...initialState, chargingOnly: true };
      const result = settingsReducer(state, setChargingOnly(false));
      expect(result.chargingOnly).toBe(false);
    });
  });

  describe('setOpenAIApiKey', () => {
    it('should set API key', () => {
      const result = settingsReducer(initialState, setOpenAIApiKey('sk-test-key'));
      expect(result.openAIApiKey).toBe('sk-test-key');
    });

    it('should clear API key when empty string is provided', () => {
      const state = { ...initialState, openAIApiKey: 'sk-test-key' };
      const result = settingsReducer(state, setOpenAIApiKey(''));
      expect(result.openAIApiKey).toBe('');
    });
  });

  describe('setAutoProcessImages', () => {
    it('should enable auto processing', () => {
      const state = { ...initialState, autoProcessImages: false };
      const result = settingsReducer(state, setAutoProcessImages(true));
      expect(result.autoProcessImages).toBe(true);
    });

    it('should disable auto processing', () => {
      const result = settingsReducer(initialState, setAutoProcessImages(false));
      expect(result.autoProcessImages).toBe(false);
    });
  });

  describe('setSaveToGooglePhotos', () => {
    it('should enable save to google photos', () => {
      const result = settingsReducer(initialState, setSaveToGooglePhotos(true));
      expect(result.saveToGooglePhotos).toBe(true);
    });

    it('should disable save to google photos', () => {
      const state = { ...initialState, saveToGooglePhotos: true };
      const result = settingsReducer(state, setSaveToGooglePhotos(false));
      expect(result.saveToGooglePhotos).toBe(false);
    });
  });

  describe('setGeminiApiKey', () => {
    it('should set Gemini API key', () => {
      const result = settingsReducer(initialState, setGeminiApiKey('AI-test-key'));
      expect(result.geminiApiKey).toBe('AI-test-key');
    });

    it('should clear Gemini API key when empty string is provided', () => {
      const state = { ...initialState, geminiApiKey: 'AI-test-key' };
      const result = settingsReducer(state, setGeminiApiKey(''));
      expect(result.geminiApiKey).toBe('');
    });
  });

  describe('setAIProvider', () => {
    it('should set provider to gemini', () => {
      const state = { ...initialState, aiProvider: 'openai' as const };
      const result = settingsReducer(state, setAIProvider('gemini'));
      expect(result.aiProvider).toBe('gemini');
    });

    it('should set provider to openai', () => {
      const result = settingsReducer(initialState, setAIProvider('openai'));
      expect(result.aiProvider).toBe('openai');
    });

    it('should set provider to ondevice', () => {
      const result = settingsReducer(initialState, setAIProvider('ondevice'));
      expect(result.aiProvider).toBe('ondevice');
    });
  });

  describe('setLowBatteryThreshold', () => {
    it('should set threshold to valid value', () => {
      const result = settingsReducer(initialState, setLowBatteryThreshold(30));
      expect(result.lowBatteryThreshold).toBe(30);
    });

    it('should clamp threshold to 0 minimum', () => {
      const result = settingsReducer(initialState, setLowBatteryThreshold(-10));
      expect(result.lowBatteryThreshold).toBe(0);
    });

    it('should clamp threshold to 100 maximum', () => {
      const result = settingsReducer(initialState, setLowBatteryThreshold(150));
      expect(result.lowBatteryThreshold).toBe(100);
    });
  });

  describe('setDetailedCaptions', () => {
    it('should enable detailed captions', () => {
      const result = settingsReducer(initialState, setDetailedCaptions(true));
      expect(result.detailedCaptions).toBe(true);
    });

    it('should disable detailed captions', () => {
      const state = { ...initialState, detailedCaptions: true };
      const result = settingsReducer(state, setDetailedCaptions(false));
      expect(result.detailedCaptions).toBe(false);
    });
  });
});
