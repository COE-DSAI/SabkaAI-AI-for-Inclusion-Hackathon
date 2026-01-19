export interface ImageData {
  id: string;
  uri: string;
  filename?: string;
  width: number;
  height: number;
  creationTime?: number;
  modificationTime?: number;
  mediaType: 'photo' | 'video';
  duration?: number;
  albumId?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface Caption {
  id: string;
  imageId: string;
  shortDescription: string;
  longDescription?: string;
  createdAt: number;
  updatedAt: number;
  processed: boolean;
  syncedToGooglePhotos?: boolean;
}

export interface User {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  isAnonymous: boolean;
}

export type AIProvider = 'openai' | 'gemini' | 'ondevice';

export interface AppSettings {
  backgroundFetchFrequency: 'hourly' | 'daily' | 'weekly';
  wifiOnly: boolean;
  chargingOnly: boolean;
  openAIApiKey?: string;
  geminiApiKey?: string;
  aiProvider: AIProvider;
  autoProcessImages: boolean;
  saveToGooglePhotos: boolean;
  lowBatteryThreshold: number; // 0-100 percentage
  detailedCaptions: boolean;
}

export interface AppState {
  images: ImageData[];
  captions: Caption[];
  user: User | null;
  settings: AppSettings;
  loading: boolean;
  error: string | null;
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface GooglePhotosUploadResponse {
  uploadToken: string;
}

export interface GooglePhotosMediaItem {
  id: string;
  description?: string;
  baseUrl: string;
  mimeType: string;
  filename: string;
}