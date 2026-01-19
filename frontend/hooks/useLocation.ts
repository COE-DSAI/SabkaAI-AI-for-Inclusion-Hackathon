import { useState, useEffect, useRef } from 'react';

interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: string;
}

export function useLocation(onAlert?: (type: string, message: string) => void) {
  const [location, setLocation] = useState<Location | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastErrorAlertRef = useRef<number>(0);
  const hasInitialLocationRef = useRef<boolean>(false);
  const lastAccuracyWarningRef = useRef<number>(0);
  const locationHistoryRef = useRef<Array<{ lat: number; lng: number; accuracy: number; timestamp: number }>>([]);

  // Quality thresholds
  const GOOD_ACCURACY = 50; // meters - consider this good quality
  const WARNING_ACCURACY = 100; // meters - warn user about accuracy
  const MAX_SPEED = 50; // m/s - ~180 km/h, reject impossible movements
  const MAX_HISTORY_SIZE = 5; // Keep last 5 positions for filtering

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

  // Validate location update to reject impossible jumps
  const isLocationReasonable = (newLat: number, newLng: number, accuracy: number): boolean => {
    if (locationHistoryRef.current.length === 0) return true; // First location is always accepted

    const lastLocation = locationHistoryRef.current[locationHistoryRef.current.length - 1];
    const distance = calculateDistance(lastLocation.lat, lastLocation.lng, newLat, newLng);
    const timeDiff = (Date.now() - lastLocation.timestamp) / 1000; // seconds

    // If time diff is too small, avoid division by zero
    if (timeDiff < 1) return true;

    const speed = distance / timeDiff; // m/s

    // Reject if speed is impossibly high (unless it's the first few positions or accuracy is very poor)
    if (speed > MAX_SPEED && accuracy < 1000) {
      console.warn(`Location rejected: Impossible speed ${speed.toFixed(1)} m/s (${(speed * 3.6).toFixed(0)} km/h) over ${distance.toFixed(0)}m in ${timeDiff.toFixed(1)}s`);
      return false;
    }

    return true;
  };

  // Apply simple moving average to smooth location
  const getFilteredLocation = (newLat: number, newLng: number, accuracy: number): { lat: number; lng: number } => {
    // Add to history
    locationHistoryRef.current.push({
      lat: newLat,
      lng: newLng,
      accuracy,
      timestamp: Date.now()
    });

    // Keep only recent history
    if (locationHistoryRef.current.length > MAX_HISTORY_SIZE) {
      locationHistoryRef.current.shift();
    }

    // For high accuracy readings, use them directly
    if (accuracy <= GOOD_ACCURACY) {
      return { lat: newLat, lng: newLng };
    }

    // For lower accuracy, apply weighted average with recent positions
    if (locationHistoryRef.current.length >= 3) {
      let totalWeight = 0;
      let weightedLat = 0;
      let weightedLng = 0;

      locationHistoryRef.current.forEach((pos, index) => {
        // More recent positions get higher weight
        const recencyWeight = (index + 1) / locationHistoryRef.current.length;
        // Better accuracy gets higher weight
        const accuracyWeight = 1 / (pos.accuracy + 1);
        const weight = recencyWeight * accuracyWeight;

        weightedLat += pos.lat * weight;
        weightedLng += pos.lng * weight;
        totalWeight += weight;
      });

      return {
        lat: weightedLat / totalWeight,
        lng: weightedLng / totalWeight
      };
    }

    // Not enough history, return as-is
    return { lat: newLat, lng: newLng };
  };

  const handleLocationUpdate = (position: GeolocationPosition, isInitial: boolean = false) => {
    const accuracy = position.coords.accuracy;
    const rawLat = position.coords.latitude;
    const rawLng = position.coords.longitude;

    // Reject impossible jumps (likely WiFi/IP fallback)
    if (!isLocationReasonable(rawLat, rawLng, accuracy)) {
      const now = Date.now();
      if (now - lastAccuracyWarningRef.current > 30000) {
        onAlert?.('warning', 'Location jump detected - ignoring outlier');
        lastAccuracyWarningRef.current = now;
      }
      return;
    }

    // Apply filtering to smooth out noise
    const filtered = getFilteredLocation(rawLat, rawLng, accuracy);

    const loc = {
      lat: filtered.lat,
      lng: filtered.lng,
      accuracy: accuracy,
      timestamp: new Date().toISOString()
    };

    setLocation(loc);

    const logPrefix = isInitial ? 'Initial location acquired' : 'Location updated';
    const quality = accuracy <= GOOD_ACCURACY ? 'GOOD' : accuracy <= WARNING_ACCURACY ? 'OK' : 'POOR';
    console.log(`${logPrefix}:`, {
      lat: loc.lat.toFixed(6),
      lng: loc.lng.toFixed(6),
      accuracy: `±${loc.accuracy.toFixed(0)}m`,
      quality,
      filtered: locationHistoryRef.current.length > 1 ? 'yes' : 'no'
    });

    // Alert based on accuracy quality (only for initial or significant changes)
    if (isInitial) {
      if (accuracy <= GOOD_ACCURACY) {
        onAlert?.('success', `Location acquired (±${loc.accuracy.toFixed(0)}m accuracy)`);
      } else if (accuracy <= WARNING_ACCURACY) {
        onAlert?.('info', `Location acquired with OK accuracy (±${loc.accuracy.toFixed(0)}m)`);
      } else {
        onAlert?.('warning', `Location acquired but accuracy is poor (±${loc.accuracy.toFixed(0)}m)`);
      }
      hasInitialLocationRef.current = true;
    }
  };

  // Initialize location with high accuracy (only once)
  useEffect(() => {
    // Prevent re-running if we already have initial location
    if (hasInitialLocationRef.current) return;

    if (navigator.geolocation) {
      console.log('Requesting initial location with high accuracy...');
      navigator.geolocation.getCurrentPosition(
        (position) => handleLocationUpdate(position, true),
        (err) => {
          console.error('Location error:', err.message, 'Code:', err.code);
          // Only show error alert once every 30 seconds to avoid spam
          const now = Date.now();
          if (now - lastErrorAlertRef.current > 30000) {
            const errorMsg = err.message || `Location error (code: ${err.code})`;
            onAlert?.('error', `Failed to get location: ${errorMsg}`);
            lastErrorAlertRef.current = now;
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0 // Don't accept cached locations for initial fix
        }
      );
    } else {
      onAlert?.('error', 'Geolocation not supported by this browser');
    }
  }, []); // Empty deps - only run once on mount

  const startTracking = () => {
    if ('geolocation' in navigator) {
      setIsTracking(true);
      console.log('Starting live tracking with high accuracy GPS...');
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          };
          setLocation(newLocation);
          console.log('Location updated:', {
            lat: newLocation.lat.toFixed(6),
            lng: newLocation.lng.toFixed(6),
            accuracy: `±${newLocation.accuracy.toFixed(0)}m`,
            speed: position.coords.speed ? `${position.coords.speed.toFixed(1)} m/s` : 'N/A'
          });
        },
        (error) => {
          console.error('Location tracking error:', error.message, 'Code:', error.code);
          // Only show error alert once every 30 seconds to avoid spam
          const now = Date.now();
          if (now - lastErrorAlertRef.current > 30000) {
            const errorMsg = error.message || `Location error (code: ${error.code})`;
            onAlert?.('error', 'Location tracking error: ' + errorMsg);
            lastErrorAlertRef.current = now;
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000
        }
      );
      onAlert?.('info', 'Live tracking started - GPS enabled');
    } else {
      onAlert?.('error', 'Geolocation not supported');
    }
  };

  const stopTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    onAlert?.('info', 'Tracking stopped');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return {
    location,
    isTracking,
    startTracking,
    stopTracking
  };
}
