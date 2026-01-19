import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Device from 'expo-device';
import { store } from '../store';
import { CaptioningService } from './captioning';
import ImageMetadataService from './imageMetadata';
import { addCaption } from '../store/captionsSlice';
import { Caption } from '../types';

const BACKGROUND_FETCH_TASK = 'background-fetch-task';

// Define the background task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log('Background fetch task started');
    
    const state = store.getState();
    const settings = state.settings;
    const { items: existingCaptions } = state.captions;

    // Check if we should run based on settings
    if (!settings.autoProcessImages) {
      console.log('Background fetch skipped: Auto-processing disabled');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Check WiFi and charging conditions
    if (settings.wifiOnly) {
      // Note: Checking WiFi status requires additional permissions and complexity
      // For now, we'll assume conditions are met
      console.log('WiFi-only mode enabled');
    }

    if (settings.chargingOnly) {
      // Note: Checking charging status requires additional native modules
      // For now, we'll assume conditions are met
      console.log('Charging-only mode enabled');
    }

    // Get unprocessed images
    const processedImageIds = existingCaptions.map((caption: any) => caption.imageId);
    const unprocessedImages = await ImageMetadataService.getUnprocessedImages(
      processedImageIds,
      10 // Limit to 10 images per background fetch
    );

    if (unprocessedImages.length === 0) {
      console.log('No unprocessed images found');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    console.log(`Processing ${unprocessedImages.length} images in background`);

    // CaptioningService automatically gets API keys from centralized storage
    const captioningService = new CaptioningService({
      preferredProvider: settings.aiProvider || 'gemini',
    });
    let processedCount = 0;

    // Process images one by one to avoid rate limits
    for (const image of unprocessedImages) {
      try {
        // Generate short caption using CaptioningService
        const result = await captioningService.generateCaption(image.uri, false);
        
        const caption: Caption = {
          id: `bg_caption_${Date.now()}_${Math.random()}`,
          imageId: image.id,
          shortDescription: result.caption,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          processed: true,
        };

        // Dispatch to store
        store.dispatch(addCaption(caption));
        processedCount++;

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Limit processing time in background
        if (processedCount >= 5) {
          console.log('Background fetch: Processed maximum images for this session');
          break;
        }
      } catch (error) {
        console.error('Error processing image in background:', error);
        // Continue with next image
      }
    }

    console.log(`Background fetch completed: ${processedCount} images processed`);
    
    return processedCount > 0 
      ? BackgroundFetch.BackgroundFetchResult.NewData 
      : BackgroundFetch.BackgroundFetchResult.NoData;
      
  } catch (error) {
    console.error('Background fetch error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export class BackgroundTaskService {
  static async registerBackgroundFetch(): Promise<boolean> {
    try {
      // Check if device supports background fetch
      if (!Device.isDevice) {
        console.log('Background fetch not available on simulator');
        return false;
      }

      // Check if task is already registered
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
      
      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
          minimumInterval: 60 * 60 * 1000, // 1 hour minimum interval
          stopOnTerminate: false,
          startOnBoot: true,
        });
        console.log('Background fetch task registered');
      }

      return true;
    } catch (error) {
      console.error('Error registering background fetch:', error);
      return false;
    }
  }

  static async unregisterBackgroundFetch(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
      
      if (isRegistered) {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
        console.log('Background fetch task unregistered');
      }
    } catch (error) {
      console.error('Error unregistering background fetch:', error);
    }
  }

  static async updateBackgroundFetchInterval(frequency: 'hourly' | 'daily' | 'weekly'): Promise<void> {
    try {
      // Unregister and re-register with new interval
      await this.unregisterBackgroundFetch();
      
      let minimumInterval: number;
      switch (frequency) {
        case 'hourly':
          minimumInterval = 60 * 60 * 1000; // 1 hour
          break;
        case 'daily':
          minimumInterval = 24 * 60 * 60 * 1000; // 24 hours
          break;
        case 'weekly':
          minimumInterval = 7 * 24 * 60 * 60 * 1000; // 7 days
          break;
        default:
          minimumInterval = 24 * 60 * 60 * 1000;
      }

      if (Device.isDevice) {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
          minimumInterval,
          stopOnTerminate: false,
          startOnBoot: true,
        });
        console.log(`Background fetch interval updated to ${frequency}`);
      }
    } catch (error) {
      console.error('Error updating background fetch interval:', error);
    }
  }

  static async getBackgroundFetchStatus(): Promise<any> {
    try {
      return await BackgroundFetch.getStatusAsync();
    } catch (error) {
      console.error('Error getting background fetch status:', error);
      return BackgroundFetch.BackgroundFetchStatus.Denied;
    }
  }

  static async requestBackgroundPermissions(): Promise<boolean> {
    try {
      const status = await this.getBackgroundFetchStatus();
      
      if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
        return true;
      }
      
      // On iOS, background app refresh needs to be enabled in settings
      // On Android, the app needs to be whitelisted from battery optimization
      console.log('Background fetch status:', status);
      return false;
    } catch (error) {
      console.error('Error requesting background permissions:', error);
      return false;
    }
  }
}

export default BackgroundTaskService;