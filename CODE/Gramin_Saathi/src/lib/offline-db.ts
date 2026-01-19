/**
 * Offline Database using Dexie.js (IndexedDB wrapper)
 * Stores data locally for offline-first functionality
 */

import Dexie, { Table } from 'dexie';

// Type definitions for stored data
export interface CachedMandiPrice {
  id?: number;
  commodity: string;
  market: string;
  district: string;
  state: string;
  modal_price: string;
  min_price?: string;
  max_price?: string;
  arrival_date?: string;
  timestamp: Date;
}

export interface CachedWeather {
  id?: number;
  location: string;
  data: any;
  timestamp: Date;
}

export interface LessonProgress {
  lessonId: string;
  progress: number;
  completed: boolean;
  score?: number;
  lastAccessed: Date;
}

export interface OfflineTransaction {
  id?: number;
  firestoreId?: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category?: string;
  date: Date;
  synced: boolean;
  createdAt: Date;
}

export interface UserPreference {
  key: string;
  value: any;
}

export interface PendingSyncAction {
  id?: number;
  action: 'create' | 'update' | 'delete';
  collection: string;
  documentId?: string;
  data: any;
  createdAt: Date;
  retries: number;
}

// Dexie database class
class GraminSaathiDB extends Dexie {
  mandiPrices!: Table<CachedMandiPrice>;
  weather!: Table<CachedWeather>;
  lessonProgress!: Table<LessonProgress>;
  transactions!: Table<OfflineTransaction>;
  preferences!: Table<UserPreference>;
  syncQueue!: Table<PendingSyncAction>;

  constructor() {
    super('GraminSaathiDB');
    
    this.version(1).stores({
      mandiPrices: '++id, commodity, market, district, state, timestamp',
      weather: '++id, location, timestamp',
      lessonProgress: 'lessonId, lastAccessed',
      transactions: '++id, firestoreId, type, date, synced, createdAt',
      preferences: 'key',
      syncQueue: '++id, action, collection, createdAt'
    });
  }
}

// Singleton instance
export const db = new GraminSaathiDB();

// Utility functions for common operations
export const offlineDB = {
  // Mandi prices caching
  async cacheMandiPrices(prices: any[]): Promise<void> {
    const now = new Date();
    const cached = prices.map(p => ({
      ...p,
      timestamp: now
    }));
    await db.mandiPrices.bulkPut(cached);
  },

  async getCachedMandiPrices(limit = 20): Promise<CachedMandiPrice[]> {
    return db.mandiPrices
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray();
  },

  async searchCachedMandi(query: string): Promise<CachedMandiPrice[]> {
    const lowerQuery = query.toLowerCase();
    return db.mandiPrices
      .filter(p => 
        p.commodity?.toLowerCase().includes(lowerQuery) ||
        p.market?.toLowerCase().includes(lowerQuery) ||
        p.district?.toLowerCase().includes(lowerQuery)
      )
      .limit(50)
      .toArray();
  },

  async clearOldMandiCache(hours = 24): Promise<number> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return db.mandiPrices.where('timestamp').below(cutoff).delete();
  },

  // Weather caching
  async cacheWeather(location: string, data: any): Promise<void> {
    await db.weather.put({
      location,
      data,
      timestamp: new Date()
    });
  },

  async getCachedWeather(location: string): Promise<CachedWeather | undefined> {
    return db.weather.where('location').equals(location).first();
  },

  // Lesson progress
  async saveLessonProgress(lessonId: string, progress: number, completed: boolean, score?: number): Promise<void> {
    await db.lessonProgress.put({
      lessonId,
      progress,
      completed,
      score,
      lastAccessed: new Date()
    });
  },

  async getLessonProgress(lessonId: string): Promise<LessonProgress | undefined> {
    return db.lessonProgress.get(lessonId);
  },

  async getAllLessonProgress(): Promise<LessonProgress[]> {
    return db.lessonProgress.toArray();
  },

  // Offline transactions
  async saveTransaction(txn: Omit<OfflineTransaction, 'id' | 'synced' | 'createdAt'>): Promise<number> {
    return db.transactions.add({
      ...txn,
      synced: false,
      createdAt: new Date()
    });
  },

  async getUnsyncedTransactions(): Promise<OfflineTransaction[]> {
    return db.transactions.where('synced').equals(0).toArray();
  },

  async markTransactionSynced(id: number, firestoreId: string): Promise<void> {
    await db.transactions.update(id, { synced: true, firestoreId });
  },

  // User preferences
  async setPreference(key: string, value: any): Promise<void> {
    await db.preferences.put({ key, value });
  },

  async getPreference<T = any>(key: string): Promise<T | undefined> {
    const pref = await db.preferences.get(key);
    return pref?.value as T;
  },

  // Sync queue for offline changes
  async queueSync(action: PendingSyncAction['action'], collection: string, data: any, documentId?: string): Promise<void> {
    await db.syncQueue.add({
      action,
      collection,
      documentId,
      data,
      createdAt: new Date(),
      retries: 0
    });
  },

  async getPendingSyncs(): Promise<PendingSyncAction[]> {
    return db.syncQueue.toArray();
  },

  async removeSyncAction(id: number): Promise<void> {
    await db.syncQueue.delete(id);
  },

  async incrementRetry(id: number): Promise<void> {
    const item = await db.syncQueue.get(id);
    if (item) {
      await db.syncQueue.update(id, { retries: item.retries + 1 });
    }
  },

  // Clear all data (for privacy)
  async clearAllData(): Promise<void> {
    await Promise.all([
      db.mandiPrices.clear(),
      db.weather.clear(),
      db.lessonProgress.clear(),
      db.transactions.clear(),
      db.preferences.clear(),
      db.syncQueue.clear()
    ]);
  },

  // Export user data (for privacy)
  async exportUserData(): Promise<object> {
    const [transactions, lessonProgress, preferences] = await Promise.all([
      db.transactions.toArray(),
      db.lessonProgress.toArray(),
      db.preferences.toArray()
    ]);
    return {
      exportDate: new Date().toISOString(),
      transactions,
      lessonProgress,
      preferences
    };
  }
};

// Check if online
export const isOnline = (): boolean => navigator.onLine;

// Listen for online/offline events
export const onConnectionChange = (callback: (online: boolean) => void): () => void => {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};
