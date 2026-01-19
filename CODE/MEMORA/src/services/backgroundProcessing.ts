import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { store } from '../store';
import { 
  addToProcessingQueue, 
  removeFromProcessingQueue, 
  setIsProcessing,
  updateImageStatus,
  updateImageCaption 
} from '../store/imagesSlice';
import { CaptioningService } from './captioning';

const BACKGROUND_PROCESSING_TASK = 'background-processing-task';

// Define the background task
TaskManager.defineTask(BACKGROUND_PROCESSING_TASK, async () => {
  try {
    const state = store.getState();
    const { processingQueue, items: images } = state.images;
    const { openAIApiKey, geminiApiKey, aiProvider } = state.settings;

    if (processingQueue.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Process one image at a time to avoid overwhelming the system
    const imageId = processingQueue[0];
    const image = images.find(img => img.id === imageId);

    if (!image) {
      store.dispatch(removeFromProcessingQueue(imageId));
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    try {
      store.dispatch(updateImageStatus({ id: imageId, status: 'processing' }));
      
      // CaptioningService automatically gets API keys from centralized storage
      const captioningService = new CaptioningService({
        preferredProvider: aiProvider || 'gemini',
      });
      const result = await captioningService.generateCaption(image.uri);
      
      if (result.caption && !result.caption.includes('unavailable')) {
        store.dispatch(updateImageCaption({ id: imageId, caption: result.caption }));
      } else {
        store.dispatch(updateImageStatus({ id: imageId, status: 'error', error: result.error || 'Failed to process image' }));
      }
      
      store.dispatch(removeFromProcessingQueue(imageId));
      
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
      console.error('Background processing error:', error);
      store.dispatch(updateImageStatus({ 
        id: imageId, 
        status: 'error', 
        error: 'Processing failed' 
      }));
      store.dispatch(removeFromProcessingQueue(imageId));
      
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  } catch (error) {
    console.error('Background task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export class BackgroundProcessingService {
  static async initialize() {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_PROCESSING_TASK);
      
      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_PROCESSING_TASK, {
          minimumInterval: 15 * 1000, // 15 seconds minimum interval
          stopOnTerminate: false, // Continue after app is terminated
          startOnBoot: true, // Start when device boots
        });
        console.log('Background processing task registered');
      }
    } catch (error) {
      console.error('Failed to register background task:', error);
    }
  }

  static async addImageToQueue(imageId: string) {
    try {
      store.dispatch(addToProcessingQueue(imageId));
      
      // Trigger background fetch to process immediately if possible
      await BackgroundFetch.setMinimumIntervalAsync(1000); // Try to process ASAP
      
      // Reset to normal interval after a short delay
      setTimeout(async () => {
        await BackgroundFetch.setMinimumIntervalAsync(15 * 1000);
      }, 5000);
      
    } catch (error) {
      console.error('Failed to add image to processing queue:', error);
    }
  }

  static async processImagesInForeground() {
    try {
      const state = store.getState();
      const { processingQueue, items: images } = state.images;
      const { openAIApiKey, geminiApiKey, aiProvider } = state.settings;

      if (processingQueue.length === 0) {
        return;
      }

      store.dispatch(setIsProcessing(true));

      // CaptioningService automatically gets API keys from centralized storage
      const captioningService = new CaptioningService({
        preferredProvider: aiProvider || 'gemini',
      });

      // Process images one by one
      for (const imageId of processingQueue) {
        const image = images.find(img => img.id === imageId);
        
        if (!image) {
          store.dispatch(removeFromProcessingQueue(imageId));
          continue;
        }

        try {
          store.dispatch(updateImageStatus({ id: imageId, status: 'processing' }));
          
          const result = await captioningService.generateCaption(image.uri);
          
          if (result.caption && !result.caption.includes('unavailable')) {
            store.dispatch(updateImageCaption({ id: imageId, caption: result.caption }));
          } else {
            store.dispatch(updateImageStatus({ id: imageId, status: 'error', error: result.error || 'Failed to process image' }));
          }
          
          store.dispatch(removeFromProcessingQueue(imageId));
        } catch (error) {
          console.error('Foreground processing error:', error);
          store.dispatch(updateImageStatus({ 
            id: imageId, 
            status: 'error', 
            error: 'Processing failed' 
          }));
          store.dispatch(removeFromProcessingQueue(imageId));
        }
      }

      store.dispatch(setIsProcessing(false));
    } catch (error) {
      console.error('Foreground processing error:', error);
      store.dispatch(setIsProcessing(false));
    }
  }

  static async getBackgroundFetchStatus() {
    try {
      return await BackgroundFetch.getStatusAsync();
    } catch (error) {
      console.error('Failed to get background fetch status:', error);
      return BackgroundFetch.BackgroundFetchStatus.Denied;
    }
  }
}

export default BackgroundProcessingService;