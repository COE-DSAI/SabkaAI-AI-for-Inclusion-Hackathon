import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Caption } from '../types';

interface CaptionsState {
  items: Caption[];
  processing: string[]; // Array of image IDs being processed
  loading: boolean;
  error: string | null;
}

const initialState: CaptionsState = {
  items: [],
  processing: [],
  loading: false,
  error: null,
};

const captionsSlice = createSlice({
  name: 'captions',
  initialState,
  reducers: {
    setCaptions: (state, action: PayloadAction<Caption[]>) => {
      state.items = action.payload;
      state.loading = false;
      state.error = null;
    },
    addCaption: (state, action: PayloadAction<Caption>) => {
      const existingIndex = state.items.findIndex(
        caption => caption.imageId === action.payload.imageId
      );
      if (existingIndex !== -1) {
        state.items[existingIndex] = action.payload;
      } else {
        state.items.push(action.payload);
      }
      // Remove from processing
      state.processing = state.processing.filter(id => id !== action.payload.imageId);
    },
    updateCaption: (state, action: PayloadAction<Partial<Caption> & { id: string }>) => {
      const index = state.items.findIndex(caption => caption.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...action.payload };
      }
    },
    removeCaption: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(caption => caption.id !== action.payload);
    },
    addProcessing: (state, action: PayloadAction<string>) => {
      if (!state.processing.includes(action.payload)) {
        state.processing.push(action.payload);
      }
    },
    removeProcessing: (state, action: PayloadAction<string>) => {
      state.processing = state.processing.filter(id => id !== action.payload);
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
  setCaptions,
  addCaption,
  updateCaption,
  removeCaption,
  addProcessing,
  removeProcessing,
  setLoading,
  setError,
} = captionsSlice.actions;

export default captionsSlice.reducer;