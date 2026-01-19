/**
 * useOffline Hook - React hook for offline status and sync management
 */

import { useState, useEffect, useCallback } from 'react';
import { isOnline, onConnectionChange, offlineDB } from './offline-db';
import { startAutoSync, stopAutoSync, subscribeSyncStatus, SyncStatus, getSyncStatus } from './sync-manager';

export interface OfflineState {
  isOnline: boolean;
  syncStatus: SyncStatus;
  pendingChanges: number;
}

/**
 * Hook to track online/offline status and sync state
 */
export const useOfflineStatus = (): OfflineState => {
  const [online, setOnline] = useState(isOnline());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus());
  const [pendingChanges, setPendingChanges] = useState(0);
  
  useEffect(() => {
    // Subscribe to connection changes
    const cleanupConnection = onConnectionChange((isOnline) => {
      setOnline(isOnline);
    });
    
    // Subscribe to sync status
    const cleanupSync = subscribeSyncStatus((status) => {
      setSyncStatus(status);
      setPendingChanges(status.pendingCount);
    });
    
    // Check pending changes periodically
    const checkPending = async () => {
      const pending = await offlineDB.getPendingSyncs();
      setPendingChanges(pending.length);
    };
    checkPending();
    const intervalId = setInterval(checkPending, 30000);
    
    return () => {
      cleanupConnection();
      cleanupSync();
      clearInterval(intervalId);
    };
  }, []);
  
  return {
    isOnline: online,
    syncStatus,
    pendingChanges
  };
};

/**
 * Hook to manage auto-sync lifecycle
 */
export const useAutoSync = (appId: string, userId: string | undefined): void => {
  useEffect(() => {
    if (userId) {
      startAutoSync(appId, userId);
      return () => stopAutoSync();
    }
  }, [appId, userId]);
};

/**
 * Hook for caching and retrieving Mandi prices offline
 */
export const useOfflineMandi = () => {
  const [cachedPrices, setCachedPrices] = useState<any[]>([]);
  const [isFromCache, setIsFromCache] = useState(false);
  
  const savePricesToCache = useCallback(async (prices: any[]) => {
    await offlineDB.cacheMandiPrices(prices);
  }, []);
  
  const getPricesFromCache = useCallback(async (searchQuery?: string) => {
    let prices;
    if (searchQuery) {
      prices = await offlineDB.searchCachedMandi(searchQuery);
    } else {
      prices = await offlineDB.getCachedMandiPrices(50);
    }
    setCachedPrices(prices);
    setIsFromCache(true);
    return prices;
  }, []);
  
  return {
    cachedPrices,
    isFromCache,
    savePricesToCache,
    getPricesFromCache
  };
};

/**
 * Hook for offline transaction management
 */
export const useOfflineTransactions = () => {
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  
  const saveTransactionOffline = useCallback(async (
    type: 'income' | 'expense',
    amount: number,
    description: string,
    date: Date,
    category?: string
  ) => {
    const id = await offlineDB.saveTransaction({
      type,
      amount,
      description,
      date,
      category
    });
    setUnsyncedCount(prev => prev + 1);
    return id;
  }, []);
  
  const getUnsyncedTransactions = useCallback(async () => {
    const txns = await offlineDB.getUnsyncedTransactions();
    setUnsyncedCount(txns.length);
    return txns;
  }, []);
  
  useEffect(() => {
    getUnsyncedTransactions();
  }, []);
  
  return {
    unsyncedCount,
    saveTransactionOffline,
    getUnsyncedTransactions
  };
};

/**
 * Hook for lesson progress tracking
 */
export const useLessonProgress = () => {
  const saveProgress = useCallback(async (
    lessonId: string,
    progress: number,
    completed: boolean,
    score?: number
  ) => {
    await offlineDB.saveLessonProgress(lessonId, progress, completed, score);
  }, []);
  
  const getProgress = useCallback(async (lessonId: string) => {
    return offlineDB.getLessonProgress(lessonId);
  }, []);
  
  const getAllProgress = useCallback(async () => {
    return offlineDB.getAllLessonProgress();
  }, []);
  
  return {
    saveProgress,
    getProgress,
    getAllProgress
  };
};

/**
 * Hook for user preferences
 */
export const useOfflinePreferences = () => {
  const setPreference = useCallback(async (key: string, value: any) => {
    await offlineDB.setPreference(key, value);
  }, []);
  
  const getPreference = useCallback(async <T = any>(key: string): Promise<T | undefined> => {
    return offlineDB.getPreference<T>(key);
  }, []);
  
  return {
    setPreference,
    getPreference
  };
};

/**
 * Hook for privacy controls
 */
export const usePrivacyControls = () => {
  const clearAllData = useCallback(async () => {
    await offlineDB.clearAllData();
  }, []);
  
  const exportData = useCallback(async () => {
    return offlineDB.exportUserData();
  }, []);
  
  return {
    clearAllData,
    exportData
  };
};
