'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { safeLocationsAPI, walkAPI, type CheckGeofenceResponse } from '@/lib/api'
import { useLocation } from './useLocation'

interface GeofencingState {
  insideSafeLocation: boolean
  currentSafeLocation: {
    id: number
    name: string
  } | null
  autoStopCountdown: number | null
  shouldAutoStart: boolean
  shouldAutoStop: boolean
}

interface UseGeofencingOptions {
  enabled?: boolean
  checkIntervalMs?: number
  onAutoStartTriggered?: (locationName: string) => void
  onAutoStopTriggered?: (locationName: string) => void
  onEnterSafeLocation?: (locationName: string) => void
  onExitSafeLocation?: (locationName: string) => void
}

/**
 * Hook for geofencing with auto-start/stop walk mode.
 *
 * Features:
 * - Background location tracking every 30 seconds
 * - Auto-start walk when leaving safe location
 * - Auto-stop walk when entering safe location (with 2-minute countdown)
 * - Cancellable countdown
 *
 * @param options - Configuration options
 * @returns Geofencing state and control functions
 */
export function useGeofencing(options: UseGeofencingOptions = {}) {
  const {
    enabled = true,
    checkIntervalMs = 30000, // 30 seconds
    onAutoStartTriggered,
    onAutoStopTriggered,
    onEnterSafeLocation,
    onExitSafeLocation,
  } = options

  const { location } = useLocation(() => {})

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const [state, setState] = useState<GeofencingState>({
    insideSafeLocation: false,
    currentSafeLocation: null,
    autoStopCountdown: null,
    shouldAutoStart: false,
    shouldAutoStop: false,
  })

  const [lastCheckLocation, setLastCheckLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const previousStateRef = useRef<GeofencingState>(state)

  /**
   * Check current location against all safe locations.
   */
  const checkGeofence = useCallback(async (lat: number, lng: number) => {
    if (isChecking) return

    setIsChecking(true)
    try {
      const response = await safeLocationsAPI.checkGeofence(lat, lng)
      const data: CheckGeofenceResponse = response.data

      setState(prev => {
        const newState: GeofencingState = {
          insideSafeLocation: data.inside_safe_location,
          currentSafeLocation: data.safe_location_id ? {
            id: data.safe_location_id,
            name: data.safe_location_name || 'Unknown Location'
          } : null,
          autoStopCountdown: prev.autoStopCountdown,
          shouldAutoStart: data.should_auto_start_walk,
          shouldAutoStop: data.should_auto_stop_walk,
        }

        // Detect transitions
        const wasInside = previousStateRef.current.insideSafeLocation
        const nowInside = newState.insideSafeLocation

        // Entered safe location
        if (!wasInside && nowInside && newState.currentSafeLocation) {
          if (onEnterSafeLocation) {
            onEnterSafeLocation(newState.currentSafeLocation.name)
          }
        }

        // Exited safe location
        if (wasInside && !nowInside && previousStateRef.current.currentSafeLocation) {
          if (onExitSafeLocation) {
            onExitSafeLocation(previousStateRef.current.currentSafeLocation.name)
          }
        }

        previousStateRef.current = newState
        return newState
      })

      setLastCheckLocation({ lat, lng })
    } catch (error) {
      console.error('Geofence check failed:', error)
    } finally {
      setIsChecking(false)
    }
  }, [isChecking, onEnterSafeLocation, onExitSafeLocation])

  /**
   * Start the 2-minute countdown for auto-stop.
   */
  const startAutoStopCountdown = useCallback(() => {
    if (state.autoStopCountdown !== null) return // Already counting down

    setState(prev => ({ ...prev, autoStopCountdown: 120 })) // 120 seconds = 2 minutes

    countdownIntervalRef.current = setInterval(() => {
      setState(prev => {
        if (prev.autoStopCountdown === null) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current)
            countdownIntervalRef.current = null
          }
          return prev
        }

        const newCountdown = prev.autoStopCountdown - 1

        // Countdown finished - trigger auto-stop
        if (newCountdown <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current)
            countdownIntervalRef.current = null
          }

          if (onAutoStopTriggered && prev.currentSafeLocation) {
            onAutoStopTriggered(prev.currentSafeLocation.name)
          }

          return { ...prev, autoStopCountdown: null }
        }

        return { ...prev, autoStopCountdown: newCountdown }
      })
    }, 1000)
  }, [state.autoStopCountdown, onAutoStopTriggered])

  /**
   * Cancel the auto-stop countdown.
   */
  const cancelAutoStopCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    setState(prev => ({ ...prev, autoStopCountdown: null }))
  }, [])

  /**
   * Trigger auto-start walk mode.
   */
  const triggerAutoStart = useCallback((userId: number) => {
    if (location?.lat && location?.lng && state.shouldAutoStart) {
      const locationName = previousStateRef.current.currentSafeLocation?.name || 'safe location'

      walkAPI.startWalk({
        user_id: userId,
        location_lat: location?.lat,
        location_lng: location?.lng,
        mode: 'auto_geofence',
        safe_location_id: previousStateRef.current.currentSafeLocation?.id || null,
      })

      if (onAutoStartTriggered) {
        onAutoStartTriggered(locationName)
      }
    }
  }, [location?.lat, location?.lng, state.shouldAutoStart, onAutoStartTriggered])

  // Main geofencing check interval
  useEffect(() => {
    if (!enabled || !location?.lat || !location?.lng) return

    // Only check if location has changed significantly (> 10 meters)
    if (lastCheckLocation) {
      const distance = calculateDistance(
        lastCheckLocation.lat,
        lastCheckLocation.lng,
        location.lat,
        location.lng
      )
      if (distance < 10) {
        // Location hasn't changed much, skip check
        return
      }
    }

    // Delay initial check by 3 seconds to avoid slamming backend on page load
    const initialCheckTimer = setTimeout(() => {
      if (location?.lat && location?.lng) {
        checkGeofence(location.lat, location.lng)
      }
    }, 3000)

    // Then check at intervals
    const interval = setInterval(() => {
      if (location?.lat && location?.lng) {
        checkGeofence(location.lat, location.lng)
      }
    }, checkIntervalMs)

    return () => {
      clearTimeout(initialCheckTimer)
      clearInterval(interval)
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [enabled, location?.lat, location?.lng, checkIntervalMs])

  // Auto-start countdown when entering safe location
  useEffect(() => {
    if (state.insideSafeLocation && state.shouldAutoStop && state.autoStopCountdown === null) {
      startAutoStopCountdown()
    }
  }, [state.insideSafeLocation, state.shouldAutoStop, state.autoStopCountdown, startAutoStopCountdown])

  // Cancel countdown if user exits safe location
  useEffect(() => {
    if (!state.insideSafeLocation && state.autoStopCountdown !== null) {
      cancelAutoStopCountdown()
    }
  }, [state.insideSafeLocation, state.autoStopCountdown, cancelAutoStopCountdown])

  return {
    ...state,
    isChecking,
    lastCheckLocation,
    cancelAutoStopCountdown,
    triggerAutoStart,
    checkGeofence: (lat: number, lng: number) => checkGeofence(lat, lng),
  }
}
