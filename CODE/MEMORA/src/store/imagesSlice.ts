import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ImageData } from '../types';

export type ImageProcessingStatus = 'unprocessed' | 'processing' | 'processed' | 'error';

export interface ProcessedImage extends ImageData {
  status: ImageProcessingStatus;
  caption?: string;
  detailedDescription?: string;
  error?: string;
  processingStarted?: string;
  processingCompleted?: string;
}

interface ImagesState {
  items: ProcessedImage[];
  processingQueue: string[];
  isProcessing: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: ImagesState = {
  items: [],
  processingQueue: [],
  isProcessing: false,
  loading: false,
  error: null,
};

const imagesSlice = createSlice({
  name: 'images',
  initialState,
  reducers: {
    setImages: (state, action: PayloadAction<ProcessedImage[]>) => {
      state.items = action.payload;
      state.loading = false;
      state.error = null;
    },
    addImage: (state, action: PayloadAction<Omit<ProcessedImage, 'status'>>) => {
      const newImage: ProcessedImage = {
        ...action.payload,
        status: 'unprocessed',
      };
      state.items.unshift(newImage);
    },
    updateImage: (state, action: PayloadAction<Partial<ProcessedImage> & { id: string }>) => {
      const index = state.items.findIndex(img => img.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...action.payload };
      }
    },
    updateImageStatus: (state, action: PayloadAction<{ id: string; status: ImageProcessingStatus; error?: string }>) => {
      const image = state.items.find(img => img.id === action.payload.id);
      if (image) {
        image.status = action.payload.status;
        if (action.payload.error) {
          image.error = action.payload.error;
        }
        if (action.payload.status === 'processing') {
          image.processingStarted = new Date().toISOString();
        } else if (action.payload.status === 'processed') {
          image.processingCompleted = new Date().toISOString();
        }
      }
    },
    updateImageCaption: (state, action: PayloadAction<{ id: string; caption: string }>) => {
      const image = state.items.find(img => img.id === action.payload.id);
      if (image) {
        image.caption = action.payload.caption;
        image.status = 'processed';
        image.processingCompleted = new Date().toISOString();
      }
    },
    updateImageDetailedDescription: (state, action: PayloadAction<{ id: string; detailedDescription: string }>) => {
      const image = state.items.find(img => img.id === action.payload.id);
      if (image) {
        image.detailedDescription = action.payload.detailedDescription;
      }
    },
    reprocessImage: (state, action: PayloadAction<string>) => {
      const image = state.items.find(img => img.id === action.payload);
      if (image) {
        image.status = 'unprocessed';
        image.caption = undefined;
        image.detailedDescription = undefined;
        image.error = undefined;
        image.processingStarted = undefined;
        image.processingCompleted = undefined;
      }
    },
    addToProcessingQueue: (state, action: PayloadAction<string>) => {
      if (!state.processingQueue.includes(action.payload)) {
        state.processingQueue.push(action.payload);
      }
    },
    removeFromProcessingQueue: (state, action: PayloadAction<string>) => {
      state.processingQueue = state.processingQueue.filter(id => id !== action.payload);
    },
    setIsProcessing: (state, action: PayloadAction<boolean>) => {
      state.isProcessing = action.payload;
    },
    removeImage: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(img => img.id !== action.payload);
      state.processingQueue = state.processingQueue.filter(id => id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setImages,
  addImage,
  updateImage,
  updateImageStatus,
  updateImageCaption,
  updateImageDetailedDescription,
  reprocessImage,
  addToProcessingQueue,
  removeFromProcessingQueue,
  setIsProcessing,
  removeImage,
  setLoading,
  setError,
} = imagesSlice.actions;

export default imagesSlice.reducer;