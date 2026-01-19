import captionsReducer, {
  setCaptions,
  addCaption,
  updateCaption,
  removeCaption,
  addProcessing,
  removeProcessing,
  setLoading,
  setError,
} from '../../src/store/captionsSlice';
import { Caption } from '../../src/types';

describe('captionsSlice', () => {
  const initialState = {
    items: [],
    processing: [],
    loading: false,
    error: null,
  };

  const mockCaption: Caption = {
    id: 'caption-1',
    imageId: 'image-1',
    shortDescription: 'A person standing in a park',
    longDescription: 'A detailed description of the scene',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    processed: true,
  };

  describe('initial state', () => {
    it('should return the initial state', () => {
      const result = captionsReducer(undefined, { type: 'unknown' });
      expect(result).toEqual(initialState);
    });
  });

  describe('setCaptions', () => {
    it('should set captions array', () => {
      const captions = [mockCaption];
      const result = captionsReducer(initialState, setCaptions(captions));
      expect(result.items).toEqual(captions);
      expect(result.loading).toBe(false);
      expect(result.error).toBeNull();
    });
  });

  describe('addCaption', () => {
    it('should add new caption', () => {
      const result = captionsReducer(initialState, addCaption(mockCaption));
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(mockCaption);
    });

    it('should replace existing caption for same image', () => {
      const state = { ...initialState, items: [mockCaption] };
      const updatedCaption = { ...mockCaption, shortDescription: 'Updated description' };
      const result = captionsReducer(state, addCaption(updatedCaption));
      expect(result.items).toHaveLength(1);
      expect(result.items[0].shortDescription).toBe('Updated description');
    });

    it('should remove imageId from processing when caption is added', () => {
      const state = { ...initialState, processing: ['image-1', 'image-2'] };
      const result = captionsReducer(state, addCaption(mockCaption));
      expect(result.processing).not.toContain('image-1');
      expect(result.processing).toContain('image-2');
    });
  });

  describe('updateCaption', () => {
    it('should update existing caption properties', () => {
      const state = { ...initialState, items: [mockCaption] };
      const result = captionsReducer(state, updateCaption({ 
        id: 'caption-1', 
        shortDescription: 'New description' 
      }));
      expect(result.items[0].shortDescription).toBe('New description');
      expect(result.items[0].longDescription).toBe(mockCaption.longDescription);
    });

    it('should not modify state if caption not found', () => {
      const state = { ...initialState, items: [mockCaption] };
      const result = captionsReducer(state, updateCaption({ 
        id: 'non-existent', 
        shortDescription: 'New' 
      }));
      expect(result.items[0].shortDescription).toBe(mockCaption.shortDescription);
    });
  });

  describe('removeCaption', () => {
    it('should remove caption by id', () => {
      const state = { ...initialState, items: [mockCaption] };
      const result = captionsReducer(state, removeCaption('caption-1'));
      expect(result.items).toHaveLength(0);
    });

    it('should not affect other captions', () => {
      const secondCaption = { ...mockCaption, id: 'caption-2', imageId: 'image-2' };
      const state = { ...initialState, items: [mockCaption, secondCaption] };
      const result = captionsReducer(state, removeCaption('caption-1'));
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('caption-2');
    });
  });

  describe('processing management', () => {
    it('should add imageId to processing', () => {
      const result = captionsReducer(initialState, addProcessing('image-1'));
      expect(result.processing).toContain('image-1');
    });

    it('should not add duplicate to processing', () => {
      const state = { ...initialState, processing: ['image-1'] };
      const result = captionsReducer(state, addProcessing('image-1'));
      expect(result.processing).toHaveLength(1);
    });

    it('should remove imageId from processing', () => {
      const state = { ...initialState, processing: ['image-1', 'image-2'] };
      const result = captionsReducer(state, removeProcessing('image-1'));
      expect(result.processing).not.toContain('image-1');
      expect(result.processing).toContain('image-2');
    });
  });

  describe('loading and error states', () => {
    it('should set loading state', () => {
      const result = captionsReducer(initialState, setLoading(true));
      expect(result.loading).toBe(true);
    });

    it('should set error and clear loading', () => {
      const state = { ...initialState, loading: true };
      const result = captionsReducer(state, setError('Something went wrong'));
      expect(result.error).toBe('Something went wrong');
      expect(result.loading).toBe(false);
    });

    it('should clear error', () => {
      const state = { ...initialState, error: 'Previous error' };
      const result = captionsReducer(state, setError(null));
      expect(result.error).toBeNull();
    });
  });
});
