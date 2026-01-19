import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppSettings, AIProvider } from '../types';

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

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateSettings: (state, action: PayloadAction<Partial<AppSettings>>) => {
      return { ...state, ...action.payload };
    },
    setBackgroundFetchFrequency: (state, action: PayloadAction<'hourly' | 'daily' | 'weekly'>) => {
      state.backgroundFetchFrequency = action.payload;
    },
    setWifiOnly: (state, action: PayloadAction<boolean>) => {
      state.wifiOnly = action.payload;
    },
    setChargingOnly: (state, action: PayloadAction<boolean>) => {
      state.chargingOnly = action.payload;
    },
    setOpenAIApiKey: (state, action: PayloadAction<string>) => {
      state.openAIApiKey = action.payload;
    },
    setGeminiApiKey: (state, action: PayloadAction<string>) => {
      state.geminiApiKey = action.payload;
    },
    setAIProvider: (state, action: PayloadAction<AIProvider>) => {
      state.aiProvider = action.payload;
    },
    setAutoProcessImages: (state, action: PayloadAction<boolean>) => {
      state.autoProcessImages = action.payload;
    },
    setSaveToGooglePhotos: (state, action: PayloadAction<boolean>) => {
      state.saveToGooglePhotos = action.payload;
    },
    setLowBatteryThreshold: (state, action: PayloadAction<number>) => {
      state.lowBatteryThreshold = Math.max(0, Math.min(100, action.payload));
    },
    setDetailedCaptions: (state, action: PayloadAction<boolean>) => {
      state.detailedCaptions = action.payload;
    },
  },
});

export const {
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
} = settingsSlice.actions;

export default settingsSlice.reducer;