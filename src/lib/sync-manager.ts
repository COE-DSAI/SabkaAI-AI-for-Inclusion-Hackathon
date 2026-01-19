/**
 * Sync Manager - Handles background synchronization of offline data
 * Syncs local changes to Firestore when connectivity is restored
 */

import { db as firestoreDb } from './firebase-config';
import { collection, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { offlineDB, isOnline, onConnectionChange, PendingSyncAction } from './offline-db';

// Sync status
let isSyncing = false;
let syncListeners: ((status: SyncStatus) => void)[] = [];

export interface SyncStatus {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: Date | null;
  error: string | null;
}

let currentStatus: SyncStatus = {
  isSyncing: false,
  pendingCount: 0,
  lastSyncTime: null,
  error: null
};

// Notify listeners of status change
const notifyListeners = () => {
  syncListeners.forEach(listener => listener(currentStatus));
};

// Subscribe to sync status updates
export const subscribeSyncStatus = (callback: (status: SyncStatus) => void): () => void => {
  syncListeners.push(callback);
  callback(currentStatus); // Immediate callback with current status
  return () => {
    syncListeners = syncListeners.filter(l => l !== callback);
  };
};

// Process a single sync action
const processSyncAction = async (action: PendingSyncAction, appId: string, userId: string): Promise<boolean> => {
  try {
    const collectionPath = `artifacts/${appId}/users/${userId}/${action.collection}`;
    
    switch (action.action) {
      case 'create': {
        const docRef = doc(collection(firestoreDb, collectionPath));
        await setDoc(docRef, {
          ...action.data,
          createdAt: serverTimestamp(),
          syncedAt: serverTimestamp()
        });
        
        // If it's a transaction, mark it as synced in local DB
        if (action.collection === 'khata' && action.data.localId) {
          await offlineDB.markTransactionSynced(action.data.localId, docRef.id);
        }
        break;
      }
      
      case 'update': {
        if (action.documentId) {
          const docRef = doc(firestoreDb, collectionPath, action.documentId);
          await updateDoc(docRef, {
            ...action.data,
            updatedAt: serverTimestamp()
          });
        }
        break;
      }
      
      case 'delete': {
        if (action.documentId) {
          const docRef = doc(firestoreDb, collectionPath, action.documentId);
          await deleteDoc(docRef);
        }
        break;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Sync action failed:', error);
    return false;
  }
};

// Main sync function
export const syncPendingChanges = async (appId: string, userId: string): Promise<void> => {
  if (!isOnline() || isSyncing) return;
  
  isSyncing = true;
  currentStatus = { ...currentStatus, isSyncing: true, error: null };
  notifyListeners();
  
  try {
    const pendingActions = await offlineDB.getPendingSyncs();
    currentStatus.pendingCount = pendingActions.length;
    
    for (const action of pendingActions) {
      if (!isOnline()) {
        throw new Error('Connection lost during sync');
      }
      
      const success = await processSyncAction(action, appId, userId);
      
      if (success) {
        await offlineDB.removeSyncAction(action.id!);
        currentStatus.pendingCount--;
        notifyListeners();
      } else {
        await offlineDB.incrementRetry(action.id!);
        
        // Remove if too many retries
        if (action.retries >= 3) {
          console.error('Removing sync action after 3 failed attempts:', action);
          await offlineDB.removeSyncAction(action.id!);
        }
      }
    }
    
    currentStatus.lastSyncTime = new Date();
    
    // Clear old cache data
    await offlineDB.clearOldMandiCache(24);
    
  } catch (error: any) {
    console.error('Sync failed:', error);
    currentStatus.error = error.message;
  } finally {
    isSyncing = false;
    currentStatus.isSyncing = false;
    notifyListeners();
  }
};

// Auto-sync when coming online
let cleanupConnectionListener: (() => void) | null = null;

export const startAutoSync = (appId: string, userId: string): void => {
  // Clean up existing listener
  if (cleanupConnectionListener) {
    cleanupConnectionListener();
  }
  
  // Sync immediately if online
  if (isOnline()) {
    syncPendingChanges(appId, userId);
  }
  
  // Sync when connection is restored
  cleanupConnectionListener = onConnectionChange((online) => {
    if (online) {
      console.log('Connection restored, syncing...');
      syncPendingChanges(appId, userId);
    }
  });
  
  // Periodic sync every 5 minutes when online
  const intervalId = setInterval(() => {
    if (isOnline()) {
      syncPendingChanges(appId, userId);
    }
  }, 5 * 60 * 1000);
  
  // Update cleanup to include interval
  const originalCleanup = cleanupConnectionListener;
  cleanupConnectionListener = () => {
    originalCleanup();
    clearInterval(intervalId);
  };
};

export const stopAutoSync = (): void => {
  if (cleanupConnectionListener) {
    cleanupConnectionListener();
    cleanupConnectionListener = null;
  }
};

// Queue a new sync action
export const queueOfflineAction = async (
  action: 'create' | 'update' | 'delete',
  collection: string,
  data: any,
  documentId?: string
): Promise<void> => {
  await offlineDB.queueSync(action, collection, data, documentId);
  
  // Try to sync immediately if online
  // Note: Requires appId and userId to be available
  currentStatus.pendingCount++;
  notifyListeners();
};

// Get current sync status
export const getSyncStatus = (): SyncStatus => currentStatus;
