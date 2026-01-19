/**
 * Tests for BackgroundScheduler
 * 
 * Covers:
 * - Constraint checking (battery, network)
 * - Task registration
 * - Captioning pipeline execution
 * - State management
 * - Configuration updates
 */

import { 
  BackgroundScheduler, 
  SchedulerConfig, 
  MEMORA_BACKGROUND_TASK,
  getBackgroundTaskStatus 
} from '../../src/services/backgroundScheduler';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Battery from 'expo-battery';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock all expo modules
jest.mock('expo-task-manager', () => ({
  isTaskRegisteredAsync: jest.fn(),
  defineTask: jest.fn(),
}));

jest.mock('expo-background-fetch', () => ({
  registerTaskAsync: jest.fn(),
  unregisterTaskAsync: jest.fn(),
  setMinimumIntervalAsync: jest.fn(),
  getStatusAsync: jest.fn(),
  BackgroundFetchResult: {
    NewData: 1,
    NoData: 2,
    Failed: 3,
  },
  BackgroundFetchStatus: {
    Denied: 1,
    Restricted: 2,
    Available: 3,
  },
}));

jest.mock('expo-battery', () => ({
  getBatteryLevelAsync: jest.fn(),
  getBatteryStateAsync: jest.fn(),
  BatteryState: {
    UNKNOWN: 0,
    UNPLUGGED: 1,
    CHARGING: 2,
    FULL: 3,
  },
}));

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(),
  NetworkStateType: {
    NONE: 'NONE',
    UNKNOWN: 'UNKNOWN',
    CELLULAR: 'CELLULAR',
    WIFI: 'WIFI',
    BLUETOOTH: 'BLUETOOTH',
    ETHERNET: 'ETHERNET',
    WIMAX: 'WIMAX',
    VPN: 'VPN',
    OTHER: 'OTHER',
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock the services (GalleryAccessService and MetadataReaderService use static methods)
jest.mock('../../src/services/galleryAccess', () => ({
  GalleryAccessService: {
    hasFullAccess: jest.fn().mockResolvedValue(true),
    detectUnprocessedImages: jest.fn().mockResolvedValue([]),
    addProcessedImageId: jest.fn().mockResolvedValue(undefined),
    clearProcessedImageIds: jest.fn().mockResolvedValue(undefined),
    getProcessedImageIds: jest.fn().mockResolvedValue(new Set()),
  },
}));

jest.mock('../../src/services/metadataReader', () => ({
  MetadataReaderService: {
    readImageMetadata: jest.fn().mockResolvedValue(null),
    evaluateCaptionQuality: jest.fn().mockReturnValue({ score: 0, isGeneric: true }),
  },
}));

jest.mock('../../src/services/captioning', () => ({
  CaptioningService: jest.fn().mockImplementation(() => ({
    generateCaption: jest.fn().mockResolvedValue({
      caption: 'A test caption',
      provider: 'gemini',
      confidence: 80,
    }),
  })),
}));

jest.mock('../../src/services/metadataWriter', () => ({
  MetadataWriterService: jest.fn().mockImplementation(() => ({
    embedCaption: jest.fn().mockResolvedValue({ success: true, assetId: 'new-123' }),
  })),
}));

describe('BackgroundScheduler', () => {
  const mockTaskManager = TaskManager as jest.Mocked<typeof TaskManager>;
  const mockBackgroundFetch = BackgroundFetch as jest.Mocked<typeof BackgroundFetch>;
  const mockBattery = Battery as jest.Mocked<typeof Battery>;
  const mockNetwork = Network as jest.Mocked<typeof Network>;
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    mockTaskManager.isTaskRegisteredAsync.mockResolvedValue(false);
    mockBackgroundFetch.registerTaskAsync.mockResolvedValue(undefined);
    mockBackgroundFetch.unregisterTaskAsync.mockResolvedValue(undefined);
    mockBackgroundFetch.setMinimumIntervalAsync.mockResolvedValue(undefined);
    mockBackgroundFetch.getStatusAsync.mockResolvedValue(BackgroundFetch.BackgroundFetchStatus.Available);
    
    mockBattery.getBatteryLevelAsync.mockResolvedValue(0.8); // 80%
    mockBattery.getBatteryStateAsync.mockResolvedValue(Battery.BatteryState.UNPLUGGED);
    
    mockNetwork.getNetworkStateAsync.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: Network.NetworkStateType.WIFI,
    });
    
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  describe('constructor and configuration', () => {
    it('should create instance with default config', () => {
      const scheduler = new BackgroundScheduler();
      expect(scheduler).toBeDefined();
      
      const config = scheduler.getConfig();
      expect(config.wifiOnly).toBe(true);
      expect(config.chargingOnly).toBe(false);
      expect(config.lowBatteryThreshold).toBe(20);
      expect(config.maxImagesPerRun).toBe(10);
    });

    it('should accept custom config', () => {
      const scheduler = new BackgroundScheduler({
        wifiOnly: false,
        chargingOnly: true,
        maxImagesPerRun: 5,
      });
      
      const config = scheduler.getConfig();
      expect(config.wifiOnly).toBe(false);
      expect(config.chargingOnly).toBe(true);
      expect(config.maxImagesPerRun).toBe(5);
    });

    it('should have correct initial state', () => {
      const scheduler = new BackgroundScheduler();
      const state = scheduler.getState();
      
      expect(state.isRunning).toBe(false);
      expect(state.lastRunTime).toBeNull();
      expect(state.lastRunResult).toBeNull();
      expect(state.processedTotal).toBe(0);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      const scheduler = new BackgroundScheduler();
      const result = await scheduler.initialize();
      
      expect(result).toBe(true);
    });

    it('should register background task if not registered', async () => {
      mockTaskManager.isTaskRegisteredAsync.mockResolvedValue(false);
      
      const scheduler = new BackgroundScheduler({ enabled: true });
      await scheduler.initialize();
      
      expect(mockBackgroundFetch.registerTaskAsync).toHaveBeenCalledWith(
        MEMORA_BACKGROUND_TASK,
        expect.objectContaining({
          stopOnTerminate: false,
          startOnBoot: true,
        })
      );
    });

    it('should not register if already registered', async () => {
      mockTaskManager.isTaskRegisteredAsync.mockResolvedValue(true);
      
      const scheduler = new BackgroundScheduler({ enabled: true });
      await scheduler.initialize();
      
      expect(mockBackgroundFetch.registerTaskAsync).not.toHaveBeenCalled();
    });

    it('should not register if disabled', async () => {
      const scheduler = new BackgroundScheduler({ enabled: false });
      await scheduler.initialize();
      
      expect(mockBackgroundFetch.registerTaskAsync).not.toHaveBeenCalled();
    });

    it('should load persisted state', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        lastRunTime: 1000000,
        processedTotal: 50,
      }));
      
      const scheduler = new BackgroundScheduler();
      await scheduler.initialize();
      
      const state = scheduler.getState();
      expect(state.lastRunTime).toBe(1000000);
      expect(state.processedTotal).toBe(50);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', async () => {
      const scheduler = new BackgroundScheduler();
      await scheduler.updateConfig({ maxImagesPerRun: 20 });
      
      expect(scheduler.getConfig().maxImagesPerRun).toBe(20);
    });

    it('should register task when enabled', async () => {
      const scheduler = new BackgroundScheduler({ enabled: false });
      await scheduler.updateConfig({ enabled: true });
      
      expect(mockBackgroundFetch.registerTaskAsync).toHaveBeenCalled();
    });

    it('should unregister task when disabled', async () => {
      mockTaskManager.isTaskRegisteredAsync.mockResolvedValue(true);
      
      const scheduler = new BackgroundScheduler({ enabled: true });
      await scheduler.updateConfig({ enabled: false });
      
      expect(mockBackgroundFetch.unregisterTaskAsync).toHaveBeenCalled();
    });

    it('should update interval when changed', async () => {
      const scheduler = new BackgroundScheduler();
      await scheduler.updateConfig({ minimumInterval: 30 * 60 });
      
      expect(mockBackgroundFetch.setMinimumIntervalAsync).toHaveBeenCalledWith(30 * 60);
    });
  });

  describe('checkConstraints', () => {
    it('should pass when all constraints met', async () => {
      mockBattery.getBatteryLevelAsync.mockResolvedValue(0.8);
      mockBattery.getBatteryStateAsync.mockResolvedValue(Battery.BatteryState.UNPLUGGED);
      mockNetwork.getNetworkStateAsync.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: Network.NetworkStateType.WIFI,
      });
      
      const scheduler = new BackgroundScheduler();
      const result = await scheduler.checkConstraints();
      
      expect(result.canRun).toBe(true);
      expect(result.constraints.battery.ok).toBe(true);
      expect(result.constraints.network.ok).toBe(true);
    });

    it('should fail when battery is low', async () => {
      mockBattery.getBatteryLevelAsync.mockResolvedValue(0.15); // 15%
      
      const scheduler = new BackgroundScheduler({ lowBatteryThreshold: 20 });
      const result = await scheduler.checkConstraints();
      
      expect(result.canRun).toBe(false);
      expect(result.reason).toContain('Battery too low');
      expect(result.constraints.battery.ok).toBe(false);
    });

    it('should fail when charging required but not charging', async () => {
      mockBattery.getBatteryStateAsync.mockResolvedValue(Battery.BatteryState.UNPLUGGED);
      
      const scheduler = new BackgroundScheduler({ chargingOnly: true });
      const result = await scheduler.checkConstraints();
      
      expect(result.canRun).toBe(false);
      expect(result.reason).toContain('not charging');
    });

    it('should pass when charging and charging required', async () => {
      mockBattery.getBatteryStateAsync.mockResolvedValue(Battery.BatteryState.CHARGING);
      
      const scheduler = new BackgroundScheduler({ chargingOnly: true });
      const result = await scheduler.checkConstraints();
      
      expect(result.canRun).toBe(true);
    });

    it('should fail when no network connection', async () => {
      mockNetwork.getNetworkStateAsync.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: Network.NetworkStateType.NONE,
      });
      
      const scheduler = new BackgroundScheduler();
      const result = await scheduler.checkConstraints();
      
      expect(result.canRun).toBe(false);
      expect(result.reason).toContain('No network');
    });

    it('should fail when WiFi required but on cellular', async () => {
      mockNetwork.getNetworkStateAsync.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: Network.NetworkStateType.CELLULAR,
      });
      
      const scheduler = new BackgroundScheduler({ wifiOnly: true });
      const result = await scheduler.checkConstraints();
      
      expect(result.canRun).toBe(false);
      expect(result.reason).toContain('WiFi required');
    });

    it('should pass when on cellular and WiFi not required', async () => {
      mockNetwork.getNetworkStateAsync.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: Network.NetworkStateType.CELLULAR,
      });
      
      const scheduler = new BackgroundScheduler({ wifiOnly: false });
      const result = await scheduler.checkConstraints();
      
      expect(result.canRun).toBe(true);
    });

    it('should handle battery API errors gracefully', async () => {
      mockBattery.getBatteryLevelAsync.mockRejectedValue(new Error('Not supported'));
      
      const scheduler = new BackgroundScheduler();
      const result = await scheduler.checkConstraints();
      
      // Should continue and check network
      expect(result.constraints.battery.ok).toBe(true);
    });
  });

  describe('runCaptioningPipeline', () => {
    it('should return early if already running', async () => {
      const scheduler = new BackgroundScheduler();
      
      // Start first run
      const firstRun = scheduler.runCaptioningPipeline();
      
      // Try to start second run immediately
      const secondRun = await scheduler.runCaptioningPipeline();
      
      expect(secondRun.success).toBe(false);
      expect(secondRun.errors).toContain('Pipeline already running');
      
      await firstRun; // Wait for first to complete
    });

    it('should skip when constraints not met', async () => {
      mockBattery.getBatteryLevelAsync.mockResolvedValue(0.05); // 5%
      
      const scheduler = new BackgroundScheduler();
      const result = await scheduler.runCaptioningPipeline();
      
      expect(result.success).toBe(false);
      expect(scheduler.getState().lastRunResult).toBe('skipped');
    });

    it('should succeed with no new images', async () => {
      const scheduler = new BackgroundScheduler();
      const result = await scheduler.runCaptioningPipeline();
      
      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(0);
      expect(scheduler.getState().lastRunResult).toBe('success');
    });

    it('should process new images', async () => {
      // Mock gallery to return images (static methods)
      const { GalleryAccessService } = require('../../src/services/galleryAccess');
      GalleryAccessService.hasFullAccess.mockResolvedValue(true);
      GalleryAccessService.getProcessedImageIds.mockResolvedValue(new Set());
      GalleryAccessService.detectUnprocessedImages.mockResolvedValue([
        { id: 'img-1', uri: 'file:///test1.jpg' },
        { id: 'img-2', uri: 'file:///test2.jpg' },
      ]);
      GalleryAccessService.addProcessedImageId.mockResolvedValue(undefined);
      
      const scheduler = new BackgroundScheduler({ delayBetweenImages: 0 });
      const result = await scheduler.runCaptioningPipeline();
      
      expect(result.processedCount).toBe(2);
      expect(result.success).toBe(true);
    });

    it('should skip images with existing good captions', async () => {
      // Mock gallery and metadata reader (static methods)
      const { GalleryAccessService } = require('../../src/services/galleryAccess');
      const { MetadataReaderService } = require('../../src/services/metadataReader');
      
      GalleryAccessService.hasFullAccess.mockResolvedValue(true);
      GalleryAccessService.getProcessedImageIds.mockResolvedValue(new Set());
      GalleryAccessService.detectUnprocessedImages.mockResolvedValue([
        { id: 'img-1', uri: 'file:///test1.jpg' },
      ]);
      GalleryAccessService.addProcessedImageId.mockResolvedValue(undefined);
      
      MetadataReaderService.readImageMetadata.mockResolvedValue({ description: 'Existing caption' });
      MetadataReaderService.evaluateCaptionQuality.mockReturnValue({ score: 80, isGeneric: false });
      
      const scheduler = new BackgroundScheduler();
      const result = await scheduler.runCaptioningPipeline();
      
      expect(result.skippedCount).toBe(1);
      expect(result.processedCount).toBe(0);
    });

    it('should handle captioning errors', async () => {
      const { GalleryAccessService } = require('../../src/services/galleryAccess');
      const { CaptioningService } = require('../../src/services/captioning');
      const { MetadataReaderService } = require('../../src/services/metadataReader');
      
      GalleryAccessService.hasFullAccess.mockResolvedValue(true);
      GalleryAccessService.getProcessedImageIds.mockResolvedValue(new Set());
      GalleryAccessService.detectUnprocessedImages.mockResolvedValue([
        { id: 'img-1', uri: 'file:///test1.jpg' },
      ]);
      GalleryAccessService.addProcessedImageId.mockResolvedValue(undefined);
      
      // Reset metadata reader to return no existing caption (static methods)
      MetadataReaderService.readImageMetadata.mockResolvedValue(null);
      MetadataReaderService.evaluateCaptionQuality.mockReturnValue({ score: 0, isGeneric: true });
      
      CaptioningService.mockImplementation(() => ({
        generateCaption: jest.fn().mockRejectedValue(new Error('API error')),
      }));
      
      const scheduler = new BackgroundScheduler();
      const result = await scheduler.runCaptioningPipeline();
      
      expect(result.errorCount).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should persist state after run', async () => {
      const scheduler = new BackgroundScheduler();
      await scheduler.runCaptioningPipeline();
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('triggerImmediateRun', () => {
    it('should run pipeline immediately', async () => {
      // Reset mocks to default successful state (static methods)
      const { GalleryAccessService } = require('../../src/services/galleryAccess');
      const { CaptioningService } = require('../../src/services/captioning');
      const { MetadataReaderService } = require('../../src/services/metadataReader');
      
      GalleryAccessService.hasFullAccess.mockResolvedValue(true);
      GalleryAccessService.getProcessedImageIds.mockResolvedValue(new Set());
      GalleryAccessService.detectUnprocessedImages.mockResolvedValue([]);
      GalleryAccessService.addProcessedImageId.mockResolvedValue(undefined);
      
      MetadataReaderService.readImageMetadata.mockResolvedValue(null);
      MetadataReaderService.evaluateCaptionQuality.mockReturnValue({ score: 0, isGeneric: true });
      
      CaptioningService.mockImplementation(() => ({
        generateCaption: jest.fn().mockResolvedValue({
          caption: 'Test caption',
          provider: 'gemini',
          confidence: 80,
        }),
      }));
      
      const scheduler = new BackgroundScheduler();
      const result = await scheduler.triggerImmediateRun();
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('getPendingCount', () => {
    it('should return count of pending images', async () => {
      const { GalleryAccessService } = require('../../src/services/galleryAccess');
      GalleryAccessService.getProcessedImageIds.mockResolvedValue(new Set());
      GalleryAccessService.detectUnprocessedImages.mockResolvedValue([
        { id: '1' }, { id: '2' }, { id: '3' },
      ]);
      
      const scheduler = new BackgroundScheduler();
      const count = await scheduler.getPendingCount();
      
      expect(count).toBe(3);
    });
  });

  describe('clearProcessedHistory', () => {
    it('should reset state', async () => {
      const scheduler = new BackgroundScheduler();
      
      // Set some state
      (scheduler as any).state.processedTotal = 100;
      (scheduler as any).state.lastRunTime = Date.now();
      
      await scheduler.clearProcessedHistory();
      
      const state = scheduler.getState();
      expect(state.processedTotal).toBe(0);
      expect(state.lastRunTime).toBeNull();
    });
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const scheduler = new BackgroundScheduler();
      const instance = BackgroundScheduler.getInstance();
      
      expect(instance).toBe(scheduler);
    });
  });

  describe('getBackgroundTaskStatus', () => {
    it('should return task status', async () => {
      mockTaskManager.isTaskRegisteredAsync.mockResolvedValue(true);
      mockBackgroundFetch.getStatusAsync.mockResolvedValue(
        BackgroundFetch.BackgroundFetchStatus.Available
      );
      
      const status = await getBackgroundTaskStatus();
      
      expect(status.isRegistered).toBe(true);
      expect(status.status).toBe(BackgroundFetch.BackgroundFetchStatus.Available);
    });

    it('should handle errors gracefully', async () => {
      mockTaskManager.isTaskRegisteredAsync.mockRejectedValue(new Error('Error'));
      
      const status = await getBackgroundTaskStatus();
      
      expect(status.isRegistered).toBe(false);
      expect(status.status).toBeNull();
    });
  });
});
