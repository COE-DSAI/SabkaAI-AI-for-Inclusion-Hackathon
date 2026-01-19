import imagesReducer, {
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
  ProcessedImage,
} from '../../src/store/imagesSlice';

describe('imagesSlice', () => {
  const initialState = {
    items: [],
    processingQueue: [],
    isProcessing: false,
    loading: false,
    error: null,
  };

  const mockImage: Omit<ProcessedImage, 'status'> = {
    id: 'test-image-1',
    uri: 'file:///test/image.jpg',
    filename: 'image.jpg',
    width: 1920,
    height: 1080,
    mediaType: 'photo' as const,
    creationTime: Date.now(),
  };

  const mockProcessedImage: ProcessedImage = {
    ...mockImage,
    status: 'unprocessed',
  };

  describe('initial state', () => {
    it('should return the initial state', () => {
      const result = imagesReducer(undefined, { type: 'unknown' });
      expect(result).toEqual(initialState);
    });
  });

  describe('setImages', () => {
    it('should set images array', () => {
      const images = [mockProcessedImage];
      const result = imagesReducer(initialState, setImages(images));
      expect(result.items).toEqual(images);
      expect(result.loading).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should clear loading and error states', () => {
      const state = { ...initialState, loading: true, error: 'some error' };
      const result = imagesReducer(state, setImages([]));
      expect(result.loading).toBe(false);
      expect(result.error).toBeNull();
    });
  });

  describe('addImage', () => {
    it('should add new image with unprocessed status', () => {
      const result = imagesReducer(initialState, addImage(mockImage));
      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe('unprocessed');
      expect(result.items[0].id).toBe(mockImage.id);
    });

    it('should prepend new image to existing list', () => {
      const state = { ...initialState, items: [mockProcessedImage] };
      const newImage = { ...mockImage, id: 'test-image-2' };
      const result = imagesReducer(state, addImage(newImage));
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe('test-image-2');
    });
  });

  describe('updateImage', () => {
    it('should update existing image properties', () => {
      const state = { ...initialState, items: [mockProcessedImage] };
      const result = imagesReducer(state, updateImage({ id: 'test-image-1', caption: 'Test caption' }));
      expect(result.items[0].caption).toBe('Test caption');
    });

    it('should not modify state if image not found', () => {
      const state = { ...initialState, items: [mockProcessedImage] };
      const result = imagesReducer(state, updateImage({ id: 'non-existent', caption: 'Test' }));
      expect(result.items[0].caption).toBeUndefined();
    });
  });

  describe('updateImageStatus', () => {
    it('should update image status to processing', () => {
      const state = { ...initialState, items: [mockProcessedImage] };
      const result = imagesReducer(state, updateImageStatus({ id: 'test-image-1', status: 'processing' }));
      expect(result.items[0].status).toBe('processing');
      expect(result.items[0].processingStarted).toBeDefined();
    });

    it('should update image status to processed', () => {
      const processingImage = { ...mockProcessedImage, status: 'processing' as const };
      const state = { ...initialState, items: [processingImage] };
      const result = imagesReducer(state, updateImageStatus({ id: 'test-image-1', status: 'processed' }));
      expect(result.items[0].status).toBe('processed');
      expect(result.items[0].processingCompleted).toBeDefined();
    });

    it('should set error message when status is error', () => {
      const state = { ...initialState, items: [mockProcessedImage] };
      const result = imagesReducer(state, updateImageStatus({ 
        id: 'test-image-1', 
        status: 'error', 
        error: 'Processing failed' 
      }));
      expect(result.items[0].status).toBe('error');
      expect(result.items[0].error).toBe('Processing failed');
    });
  });

  describe('updateImageCaption', () => {
    it('should update caption and set status to processed', () => {
      const state = { ...initialState, items: [mockProcessedImage] };
      const result = imagesReducer(state, updateImageCaption({ id: 'test-image-1', caption: 'A scenic view' }));
      expect(result.items[0].caption).toBe('A scenic view');
      expect(result.items[0].status).toBe('processed');
      expect(result.items[0].processingCompleted).toBeDefined();
    });
  });

  describe('updateImageDetailedDescription', () => {
    it('should update detailed description', () => {
      const state = { ...initialState, items: [mockProcessedImage] };
      const result = imagesReducer(state, updateImageDetailedDescription({ 
        id: 'test-image-1', 
        detailedDescription: 'A detailed description of the image' 
      }));
      expect(result.items[0].detailedDescription).toBe('A detailed description of the image');
    });
  });

  describe('reprocessImage', () => {
    it('should reset image to unprocessed state', () => {
      const processedImage: ProcessedImage = {
        ...mockProcessedImage,
        status: 'processed',
        caption: 'Old caption',
        detailedDescription: 'Old description',
        error: 'Old error',
        processingStarted: new Date().toISOString(),
        processingCompleted: new Date().toISOString(),
      };
      const state = { ...initialState, items: [processedImage] };
      const result = imagesReducer(state, reprocessImage('test-image-1'));
      
      expect(result.items[0].status).toBe('unprocessed');
      expect(result.items[0].caption).toBeUndefined();
      expect(result.items[0].detailedDescription).toBeUndefined();
      expect(result.items[0].error).toBeUndefined();
      expect(result.items[0].processingStarted).toBeUndefined();
      expect(result.items[0].processingCompleted).toBeUndefined();
    });
  });

  describe('processing queue management', () => {
    it('should add image to processing queue', () => {
      const result = imagesReducer(initialState, addToProcessingQueue('test-image-1'));
      expect(result.processingQueue).toContain('test-image-1');
    });

    it('should not add duplicate to processing queue', () => {
      const state = { ...initialState, processingQueue: ['test-image-1'] };
      const result = imagesReducer(state, addToProcessingQueue('test-image-1'));
      expect(result.processingQueue).toHaveLength(1);
    });

    it('should remove image from processing queue', () => {
      const state = { ...initialState, processingQueue: ['test-image-1', 'test-image-2'] };
      const result = imagesReducer(state, removeFromProcessingQueue('test-image-1'));
      expect(result.processingQueue).not.toContain('test-image-1');
      expect(result.processingQueue).toContain('test-image-2');
    });
  });

  describe('setIsProcessing', () => {
    it('should set processing flag', () => {
      const result = imagesReducer(initialState, setIsProcessing(true));
      expect(result.isProcessing).toBe(true);
    });
  });

  describe('removeImage', () => {
    it('should remove image from items', () => {
      const state = { ...initialState, items: [mockProcessedImage] };
      const result = imagesReducer(state, removeImage('test-image-1'));
      expect(result.items).toHaveLength(0);
    });

    it('should also remove from processing queue', () => {
      const state = { 
        ...initialState, 
        items: [mockProcessedImage],
        processingQueue: ['test-image-1']
      };
      const result = imagesReducer(state, removeImage('test-image-1'));
      expect(result.processingQueue).not.toContain('test-image-1');
    });
  });

  describe('loading and error states', () => {
    it('should set loading state', () => {
      const result = imagesReducer(initialState, setLoading(true));
      expect(result.loading).toBe(true);
    });

    it('should set error and clear loading', () => {
      const state = { ...initialState, loading: true };
      const result = imagesReducer(state, setError('Something went wrong'));
      expect(result.error).toBe('Something went wrong');
      expect(result.loading).toBe(false);
    });

    it('should clear error', () => {
      const state = { ...initialState, error: 'Previous error' };
      const result = imagesReducer(state, setError(null));
      expect(result.error).toBeNull();
    });
  });
});
