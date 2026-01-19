/**
 * OfflineIndicator - Shows connection status and sync state
 */

import React from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useOfflineStatus } from '../../lib/useOffline';

interface OfflineIndicatorProps {
  lang: 'hi' | 'en';
  className?: string;
}

export function OfflineIndicator({ lang, className = '' }: OfflineIndicatorProps) {
  const { isOnline, syncStatus, pendingChanges } = useOfflineStatus();
  
  const getText = (key: string) => {
    const texts: Record<string, { hi: string; en: string }> = {
      online: { hi: 'ऑनलाइन', en: 'Online' },
      offline: { hi: 'ऑफलाइन', en: 'Offline' },
      syncing: { hi: 'सिंक हो रहा है...', en: 'Syncing...' },
      pending: { hi: `${pendingChanges} बदलाव बाकी`, en: `${pendingChanges} changes pending` },
      synced: { hi: 'सिंक हो गया', en: 'Synced' },
      error: { hi: 'सिंक में समस्या', en: 'Sync error' }
    };
    return texts[key]?.[lang] ?? key;
  };
  
  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      {/* Connection status */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full ${
        isOnline 
          ? 'bg-green-500/20 text-green-500' 
          : 'bg-red-500/20 text-red-500'
      }`}>
        {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
        <span className="font-medium">
          {isOnline ? getText('online') : getText('offline')}
        </span>
      </div>
      
      {/* Sync status */}
      {pendingChanges > 0 && (
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full ${
          syncStatus.isSyncing
            ? 'bg-blue-500/20 text-blue-500'
            : syncStatus.error
            ? 'bg-red-500/20 text-red-500'
            : 'bg-amber-500/20 text-amber-500'
        }`}>
          {syncStatus.isSyncing ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>{getText('syncing')}</span>
            </>
          ) : syncStatus.error ? (
            <>
              <AlertCircle size={14} />
              <span>{getText('error')}</span>
            </>
          ) : (
            <>
              <RefreshCw size={14} />
              <span>{getText('pending')}</span>
            </>
          )}
        </div>
      )}
      
      {/* All synced */}
      {isOnline && pendingChanges === 0 && !syncStatus.isSyncing && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-green-500/10 text-green-500/70">
          <CheckCircle size={14} />
          <span>{getText('synced')}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for header/navbar
 */
export function OfflineIndicatorCompact({ lang }: { lang: 'hi' | 'en' }) {
  const { isOnline, syncStatus, pendingChanges } = useOfflineStatus();
  
  if (isOnline && pendingChanges === 0) {
    return null; // Don't show anything when fully synced
  }
  
  return (
    <div className={`p-1.5 rounded-full ${
      !isOnline
        ? 'bg-red-500/20 text-red-500'
        : syncStatus.isSyncing
        ? 'bg-blue-500/20 text-blue-500'
        : 'bg-amber-500/20 text-amber-500'
    }`}>
      {!isOnline ? (
        <WifiOff size={16} />
      ) : syncStatus.isSyncing ? (
        <RefreshCw size={16} className="animate-spin" />
      ) : (
        <div className="relative">
          <RefreshCw size={16} />
          {pendingChanges > 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 text-[8px] font-bold bg-amber-500 text-white rounded-full flex items-center justify-center">
              {pendingChanges > 9 ? '9+' : pendingChanges}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
