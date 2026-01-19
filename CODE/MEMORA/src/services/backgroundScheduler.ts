/**
 * BackgroundScheduler - Orchestrates automatic image captioning with constraints
 * 
 * Features:
 * - Battery-aware processing (pause when low battery)
 * - Network-aware processing (WiFi-only mode)
 * - Charging-only mode support
 * - Configurable processing intervals
 * - Integration with GalleryAccess, Captioning, and MetadataWriter services
 */

import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Battery from 'expo-battery';
import * as Network from 'expo-network';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { GalleryAccessService } from './galleryAccess';
import { MetadataReaderService } from './metadataReader';
import { CaptioningService, AIProvider } from './captioning';
import { MetadataWriterService } from './metadataWriter';

export const MEMORA_BACKGROUND_TASK = 'memora-caption-task';
export const MEMORA_SYNC_TASK = 'memora-sync-task';

// Storage keys for persistence
const STORAGE_KEYS = {
  LAST_RUN: '@memora/scheduler/lastRun',
  PROCESSED_COUNT: '@memora/scheduler/processedCount',
  PENDING_QUEUE: '@memora/scheduler/pendingQueue',
  SCHEDULER_STATE: '@memora/scheduler/state',
};

export interface SchedulerConfig {
  // Processing constraints
  wifiOnly: boolean;
  chargingOnly: boolean;
  lowBatteryThreshold: number; // Percentage (0-100)
  
  // Processing limits
  maxImagesPerRun: number;
  delayBetweenImages: number; // ms
  
  // Scheduling
  minimumInterval: number; // seconds
  enabled: boolean;
  
  // AI settings
  aiProvider: AIProvider;
  openaiApiKey?: string;
  geminiApiKey?: string;
  detailedCaptions: boolean;
}

export interface SchedulerState {
  isRunning: boolean;
  lastRunTime: number | null;
  lastRunResult: 'success' | 'partial' | 'skipped' | 'failed' | null;
  processedTotal: number;
  pendingCount: number;
  lastError: string | null;
}

export interface ConstraintCheck {
  canRun: boolean;
  reason?: string;
  constraints: {
    battery: { ok: boolean; level?: number; isCharging?: boolean };
    network: { ok: boolean; type?: string; isConnected?: boolean };
  };
}

const DEFAULT_CONFIG: SchedulerConfig = {
  wifiOnly: true,
  chargingOnly: false,
  lowBatteryThreshold: 20,
  maxImagesPerRun: 10,
  delayBetweenImages: 2000,
  minimumInterval: 15 * 60, // 15 minutes
  enabled: true,
  aiProvider: 'gemini',
  detailedCaptions: false,
};

// Singleton instance for task access
let schedulerInstance: BackgroundScheduler | null = null;

export class BackgroundScheduler {
  private config: SchedulerConfig;
  private state: SchedulerState;
  
  // Services (CaptioningService and MetadataWriterService are instance-based)
  // GalleryAccessService and MetadataReaderService use static methods
  private captioningService: CaptioningService | null = null;
  private metadataWriter: MetadataWriterService;
  
  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      isRunning: false,
      lastRunTime: null,
      lastRunResult: null,
      processedTotal: 0,
      pendingCount: 0,
      lastError: null,
    };
    
    // Initialize services (only instance-based ones)
    // GalleryAccessService and MetadataReaderService use static methods
    this.metadataWriter = new MetadataWriterService();
    
    // Set singleton
    schedulerInstance = this;
  }

  /**
   * Initialize the background scheduler
   */
  async initialize(): Promise<boolean> {
    try {
      // Load persisted state
      await this.loadPersistedState();
      
      // Initialize captioning service with current config
      this.updateCaptioningService();
      
      // Register background task if not already registered
      const isRegistered = await TaskManager.isTaskRegisteredAsync(MEMORA_BACKGROUND_TASK);
      
      if (!isRegistered && this.config.enabled) {
        await this.registerBackgroundTask();
      }
      
      return true;
    } catch (error) {
      console.error('BackgroundScheduler initialization failed:', error);
      this.state.lastError = error instanceof Error ? error.message : 'Initialization failed';
      return false;
    }
  }

  /**
   * Update configuration at runtime
   */
  async updateConfig(newConfig: Partial<SchedulerConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Update captioning service if AI settings changed
    if (newConfig.aiProvider || newConfig.openaiApiKey || newConfig.geminiApiKey) {
      this.updateCaptioningService();
    }
    
    // Handle enabled state change
    if (newConfig.enabled !== undefined) {
      if (newConfig.enabled) {
        await this.registerBackgroundTask();
      } else {
        await this.unregisterBackgroundTask();
      }
    }
    
    // Update interval if changed
    if (newConfig.minimumInterval !== undefined) {
      await this.updateTaskInterval();
    }
  }

  /**
   * Update captioning service with current config
   * CaptioningService automatically gets API keys from centralized storage
   */
  private updateCaptioningService(): void {
    this.captioningService = new CaptioningService({
      preferredProvider: this.config.aiProvider,
    });
  }

  /**
   * Register the background task
   */
  private async registerBackgroundTask(): Promise<void> {
    try {
      await BackgroundFetch.registerTaskAsync(MEMORA_BACKGROUND_TASK, {
        minimumInterval: this.config.minimumInterval,
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log('Memora background task registered');
    } catch (error) {
      console.error('Failed to register background task:', error);
      throw error;
    }
  }

  /**
   * Unregister the background task
   */
  private async unregisterBackgroundTask(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(MEMORA_BACKGROUND_TASK);
      if (isRegistered) {
        await BackgroundFetch.unregisterTaskAsync(MEMORA_BACKGROUND_TASK);
        console.log('Memora background task unregistered');
      }
    } catch (error) {
      console.error('Failed to unregister background task:', error);
    }
  }

  /**
   * Update task interval
   */
  private async updateTaskInterval(): Promise<void> {
    try {
      await BackgroundFetch.setMinimumIntervalAsync(this.config.minimumInterval);
    } catch (error) {
      console.error('Failed to update task interval:', error);
    }
  }

  /**
   * Check if constraints allow processing
   */
  async checkConstraints(): Promise<ConstraintCheck> {
    const constraints: ConstraintCheck = {
      canRun: true,
      constraints: {
        battery: { ok: true },
        network: { ok: true },
      },
    };

    // Check battery
    try {
      const batteryLevel = await Battery.getBatteryLevelAsync();
      const isCharging = await Battery.getBatteryStateAsync();
      const batteryPercentage = Math.round(batteryLevel * 100);

      constraints.constraints.battery = {
        ok: true,
        level: batteryPercentage,
        isCharging: isCharging === Battery.BatteryState.CHARGING || 
                    isCharging === Battery.BatteryState.FULL,
      };

      // Check low battery
      if (batteryPercentage < this.config.lowBatteryThreshold) {
        constraints.constraints.battery.ok = false;
        constraints.canRun = false;
        constraints.reason = `Battery too low (${batteryPercentage}%)`;
        return constraints;
      }

      // Check charging requirement
      if (this.config.chargingOnly && !constraints.constraints.battery.isCharging) {
        constraints.constraints.battery.ok = false;
        constraints.canRun = false;
        constraints.reason = 'Device not charging';
        return constraints;
      }
    } catch (error) {
      // Battery API might not be available on all devices
      console.warn('Battery check failed:', error);
    }

    // Check network
    try {
      const networkState = await Network.getNetworkStateAsync();
      
      constraints.constraints.network = {
        ok: true,
        type: networkState.type,
        isConnected: networkState.isConnected ?? false,
      };

      // Check if connected
      if (!networkState.isConnected) {
        constraints.constraints.network.ok = false;
        constraints.canRun = false;
        constraints.reason = 'No network connection';
        return constraints;
      }

      // Check WiFi requirement
      if (this.config.wifiOnly && networkState.type !== Network.NetworkStateType.WIFI) {
        constraints.constraints.network.ok = false;
        constraints.canRun = false;
        constraints.reason = 'WiFi required but not connected';
        return constraints;
      }
    } catch (error) {
      console.warn('Network check failed:', error);
    }

    return constraints;
  }

  /**
   * Run the captioning pipeline
   * This is called by the background task or can be triggered manually
   */
  async runCaptioningPipeline(): Promise<{
    success: boolean;
    processedCount: number;
    skippedCount: number;
    errorCount: number;
    errors: string[];
  }> {
    const result = {
      success: false,
      processedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      errors: [] as string[],
    };

    try {
      // Prevent concurrent runs
      if (this.state.isRunning) {
        result.errors.push('Pipeline already running');
        return result;
      }

      this.state.isRunning = true;
      this.state.lastError = null;

      // Check constraints
      const constraints = await this.checkConstraints();
      if (!constraints.canRun) {
        this.state.lastRunResult = 'skipped';
        this.state.lastRunTime = Date.now();
        result.errors.push(constraints.reason || 'Constraints not met');
        return result;
      }

      // Check permissions (GalleryAccessService uses static methods)
      const hasPermission = await GalleryAccessService.hasFullAccess();
      if (!hasPermission) {
        result.errors.push('Gallery permission denied');
        this.state.lastError = 'Permission denied';
        return result;
      }

      // Ensure captioning service is available
      if (!this.captioningService) {
        this.updateCaptioningService();
      }

      // Get new images since last run (use static detectUnprocessedImages)
      const processedIds = await GalleryAccessService.getProcessedImageIds();
      const newImages = await GalleryAccessService.detectUnprocessedImages(
        Array.from(processedIds),
        this.config.maxImagesPerRun
      );

      if (newImages.length === 0) {
        this.state.lastRunResult = 'success';
        this.state.lastRunTime = Date.now();
        result.success = true;
        return result;
      }

      // Process each image
      for (const image of newImages) {
        try {
          // Check if already has good caption (MetadataReaderService uses static methods)
          const existingMetadata = await MetadataReaderService.readImageMetadata(image.uri);
          
          if (existingMetadata && existingMetadata.description) {
            const quality = MetadataReaderService.evaluateCaptionQuality(
              existingMetadata.description
            );
            
            if (quality.score >= 50 && !quality.isGeneric) {
              result.skippedCount++;
              await GalleryAccessService.addProcessedImageId(image.id);
              continue;
            }
          }

          // Generate caption
          const captionResult = await this.captioningService!.generateCaption(
            image.uri,
            this.config.detailedCaptions
          );

          if (captionResult.caption && captionResult.confidence >= 30) {
            // Write caption to metadata
            const writeResult = await this.metadataWriter.embedCaption(
              image.uri,
              captionResult.caption,
              image.id
            );

            if (writeResult.success) {
              result.processedCount++;
              await GalleryAccessService.addProcessedImageId(image.id);
            } else {
              result.errorCount++;
              result.errors.push(`Write failed for ${image.id}: ${writeResult.error}`);
            }
          } else {
            result.errorCount++;
            result.errors.push(`Caption failed for ${image.id}`);
          }

          // Delay between images
          if (this.config.delayBetweenImages > 0) {
            await this.delay(this.config.delayBetweenImages);
          }

          // Re-check constraints periodically
          if (result.processedCount % 3 === 0) {
            const midCheck = await this.checkConstraints();
            if (!midCheck.canRun) {
              result.errors.push(`Stopped: ${midCheck.reason}`);
              break;
            }
          }
        } catch (error) {
          result.errorCount++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Error processing ${image.id}: ${errorMsg}`);
        }
      }

      // Update state
      this.state.processedTotal += result.processedCount;
      this.state.lastRunTime = Date.now();
      this.state.lastRunResult = result.errorCount === 0 ? 'success' : 
                                  result.processedCount > 0 ? 'partial' : 'failed';
      
      result.success = result.processedCount > 0 || result.skippedCount > 0;

      // Persist state
      await this.persistState();

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Pipeline error';
      result.errors.push(errorMsg);
      this.state.lastError = errorMsg;
      this.state.lastRunResult = 'failed';
    } finally {
      this.state.isRunning = false;
    }

    return result;
  }

  /**
   * Get current scheduler state
   */
  getState(): SchedulerState {
    return { ...this.state };
  }

  /**
   * Get current configuration
   */
  getConfig(): SchedulerConfig {
    return { ...this.config };
  }

  /**
   * Force an immediate run (for manual trigger)
   */
  async triggerImmediateRun(): Promise<{
    success: boolean;
    processedCount: number;
    skippedCount: number;
    errorCount: number;
    errors: string[];
  }> {
    return this.runCaptioningPipeline();
  }

  /**
   * Get pending images count
   */
  async getPendingCount(): Promise<number> {
    try {
      const processedIds = await GalleryAccessService.getProcessedImageIds();
      const unprocessedImages = await GalleryAccessService.detectUnprocessedImages(
        Array.from(processedIds),
        100
      );
      this.state.pendingCount = unprocessedImages.length;
      return unprocessedImages.length;
    } catch {
      return 0;
    }
  }

  /**
   * Clear processed history (for testing or reset)
   */
  async clearProcessedHistory(): Promise<void> {
    await GalleryAccessService.clearProcessedImageIds();
    this.state.processedTotal = 0;
    this.state.lastRunTime = null;
    this.state.lastRunResult = null;
  }

  /**
   * Persist state to AsyncStorage
   */
  private async persistState(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SCHEDULER_STATE,
        JSON.stringify({
          lastRunTime: this.state.lastRunTime,
          processedTotal: this.state.processedTotal,
        })
      );
    } catch (error) {
      console.warn('Failed to persist scheduler state:', error);
    }
  }

  /**
   * Load persisted state from AsyncStorage
   */
  private async loadPersistedState(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULER_STATE);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.state.lastRunTime = parsed.lastRunTime || null;
        this.state.processedTotal = parsed.processedTotal || 0;
      }
    } catch (error) {
      console.warn('Failed to load persisted state:', error);
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get the singleton instance (for background task access)
   */
  static getInstance(): BackgroundScheduler | null {
    return schedulerInstance;
  }
}

/**
 * Define the background task
 * This runs when the OS triggers background fetch
 */
TaskManager.defineTask(MEMORA_BACKGROUND_TASK, async () => {
  try {
    console.log('[Memora] Background task triggered');
    
    // Get or create scheduler instance
    let scheduler = BackgroundScheduler.getInstance();
    
    if (!scheduler) {
      // Re-create scheduler with defaults for background execution
      // In production, config would be loaded from AsyncStorage
      scheduler = new BackgroundScheduler();
      await scheduler.initialize();
    }

    // Run the pipeline
    const result = await scheduler.runCaptioningPipeline();

    if (result.processedCount > 0) {
      console.log(`[Memora] Processed ${result.processedCount} images`);
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else if (result.skippedCount > 0) {
      console.log(`[Memora] Skipped ${result.skippedCount} images (already captioned)`);
      return BackgroundFetch.BackgroundFetchResult.NoData;
    } else if (result.errors.length > 0) {
      console.warn(`[Memora] Errors: ${result.errors.join(', ')}`);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('[Memora] Background task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Get background task status
 */
export async function getBackgroundTaskStatus(): Promise<{
  isRegistered: boolean;
  status: BackgroundFetch.BackgroundFetchStatus | null;
}> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(MEMORA_BACKGROUND_TASK);
    const status = await BackgroundFetch.getStatusAsync();
    
    return { isRegistered, status };
  } catch (error) {
    console.error('Failed to get background task status:', error);
    return { isRegistered: false, status: null };
  }
}
