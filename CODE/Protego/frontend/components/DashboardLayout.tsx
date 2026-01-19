'use client'

import { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Header from './layout/Header';
import Navigation from './layout/Navigation';
import SOSButton from './layout/SOSButton';
import SafeLocationBanner from './layout/SafeLocationBanner';
import { walkAPI, alertAPI, aiAPI, userAPI } from '@/lib/api';
import { useUserStore } from '@/lib/store';
import { useLocation } from '@/hooks/useLocation';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { useGeofencing } from '@/hooks/useGeofencing';
import { ALERT_TYPES } from '@/lib/constants/alertTypes';

interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: string;
}

interface Alert {
  id: number;
  type: string;
  message: string;
  timestamp: string;
}

interface DashboardLayoutProps {
  children: ReactNode | ((props: any) => ReactNode);
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const userStore = useUserStore();
  const { isWalking, activeSession, startSession, stopSession, user, isAuthenticated, setUser, clearUser } = userStore;

  // Redirect non-regular users to their appropriate dashboards
  useEffect(() => {
    if (user && user.user_type) {
      if (user.user_type === 'GOVT_AGENT') {
        router.replace('/gov-dashboard');
      } else if (user.user_type === 'SUPER_ADMIN') {
        router.replace('/admin');
      }
    }
  }, [user, router]);

  const [safetyScore, setSafetyScore] = useState<number | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sosActive, setSosActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walkingStatus, setWalkingStatus] = useState('unknown');
  const [locationAvailable, setLocationAvailable] = useState(false);
  const [locationPrompt, setLocationPrompt] = useState<string>('');
  const [calculatingScore, setCalculatingScore] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Add alert helper with unique ID
  const addAlert = (type: string, message: string) => {
    const newAlert = {
      id: Date.now() + Math.random(), // Ensure unique ID
      type,
      message,
      timestamp: new Date().toLocaleTimeString()
    };
    setAlerts(prev => [newAlert, ...prev].slice(0, 5));
  };

  // Custom hooks
  const { location, isTracking, startTracking, stopTracking } = useLocation(addAlert);

  // Geofencing with safe location tracking
  const [currentSafeLocation, setCurrentSafeLocation] = useState<{ name: string; enteredAt: Date } | null>(null);

  const geofencing = useGeofencing({
    enabled: true, // Always check for safe locations
    checkIntervalMs: 60000, // Check every 60 seconds (1 minute)
    onEnterSafeLocation: (locationName) => {
      setCurrentSafeLocation({ name: locationName, enteredAt: new Date() });
      addAlert('success', `Entered safe location: ${locationName}`);
    },
    onExitSafeLocation: (locationName) => {
      setCurrentSafeLocation(null);
      addAlert('info', `Left safe location: ${locationName}`);
    },
  });

  const handleVoiceAlert = async (analysisResult: any) => {
    console.log('Creating emergency alert with AI analysis...', analysisResult);

    // Get fresh location
    let currentLocation: Location | null = null;
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            enableHighAccuracy: true,
            maximumAge: 0
          });
        });
        currentLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
      } catch (err: any) {
        console.warn('Location error:', err.message);
        currentLocation = location;
      }
    }

    try {
      await alertAPI.createInstantAlert({
        user_id: user?.id || 1,
        session_id: activeSession?.id || null,
        type: ALERT_TYPES.VOICE_ACTIVATION,
        confidence: analysisResult.confidence,
        location_lat: currentLocation?.lat || null,
        location_lng: currentLocation?.lng || null,
        transcription: analysisResult.transcription,
        ai_analysis: analysisResult.analysis,
        keywords_detected: analysisResult.keywords_found
      });
      addAlert('emergency', 'VOICE ALERT SENT WITH AI ANALYSIS!');
    } catch (err: any) {
      addAlert('error', `Failed to send alert: ${err.message}`);
    }
  };

  const { voiceEnabled, isListening, isAnalyzing, voiceLogs, lastAnalysisResult, toggleVoiceRecognition, clearVoiceLogs, recognitionRef } =
    useVoiceRecognition(isWalking, handleVoiceAlert, addAlert, activeSession?.id, location?.lat, location?.lng);

  // Check for existing auth token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');

      // If we have a token but no user in store, try to restore from cache first
      if (token && !user) {
        // Check if we have cached user data
        const cachedUser = localStorage.getItem('cached_user');
        const cacheTimestamp = localStorage.getItem('cached_user_timestamp');

        if (cachedUser && cacheTimestamp) {
          const cacheAge = Date.now() - parseInt(cacheTimestamp);
          const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

          // If cache is fresh, use it without API call
          if (cacheAge < CACHE_DURATION) {
            const userData = JSON.parse(cachedUser);
            setUser(userData);
            console.log('Auth restored from cache:', userData.email);
            return;
          }
        }

        // Cache is stale or doesn't exist, fetch from API
        try {
          console.log('Fetching fresh user profile...');
          const response = await userAPI.getProfile();
          const userData = response.data;
          setUser(userData as any);

          // Update cache
          localStorage.setItem('cached_user', JSON.stringify(userData));
          localStorage.setItem('cached_user_timestamp', Date.now().toString());
          console.log('Auth restored and cached:', userData.email);
        } catch (err: any) {
          console.error('Auth check failed:', err.message);
          localStorage.removeItem('access_token');
          localStorage.removeItem('cached_user');
          localStorage.removeItem('cached_user_timestamp');
          clearUser();
        }
      } else if (!token && user) {
        // Token missing but user in store - clear everything
        console.log('No token found, clearing store...');
        localStorage.removeItem('cached_user');
        localStorage.removeItem('cached_user_timestamp');
        clearUser();
      } else if (token && user) {
        console.log('Auth already loaded from store:', user.email);
      }
    };

    // Small delay to ensure Zustand rehydration completes
    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, []); // Empty deps - only run once on mount

  // Calculate comprehensive safety score using new system
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null);

  useEffect(() => {
    const calculateSafetyScore = async () => {
      // Check cache first
      const cachedScore = localStorage.getItem('cached_safety_score');
      const cacheTimestamp = localStorage.getItem('cached_safety_score_timestamp');
      const cachedLocation = localStorage.getItem('cached_safety_score_location');

      if (cachedScore && cacheTimestamp && cachedLocation && location) {
        const cacheAge = Date.now() - parseInt(cacheTimestamp);
        const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes
        const cached = JSON.parse(cachedLocation);

        // Check if location is similar (within 50 meters)
        const distance = Math.sqrt(
          Math.pow((location.lat - cached.lat) * 111000, 2) +
          Math.pow((location.lng - cached.lng) * 111000, 2)
        );

        // Use cache if fresh and location similar
        if (cacheAge < CACHE_DURATION && distance < 50) {
          const data = JSON.parse(cachedScore);
          setScoreBreakdown(data);
          setLocationAvailable(data.location_available);
          setSafetyScore(data.safety_score);
          setWalkingStatus(data.status);
          setLocationPrompt(data.prompt || '');
          return;
        }
      }

      setCalculatingScore(true);
      try {
        // Call new safety score endpoint
        const response = await aiAPI.getSafetyScore(
          location?.lat || null,
          location?.lng || null
        );

        const data = response.data;

        // Store full breakdown for modal
        setScoreBreakdown(data);

        // Update cache
        if (location) {
          localStorage.setItem('cached_safety_score', JSON.stringify(data));
          localStorage.setItem('cached_safety_score_timestamp', Date.now().toString());
          localStorage.setItem('cached_safety_score_location', JSON.stringify({ lat: location.lat, lng: location.lng }));
        }

        // Update state based on response
        setLocationAvailable(data.location_available);

        if (data.location_available && data.safety_score !== null) {
          setSafetyScore(data.safety_score);
          setWalkingStatus(data.status);
          setLocationPrompt('');

          // Show alert if high risk detected
          if (data.status === 'alert' && data.factors && data.factors.length > 0) {
            addAlert('warning', data.factors[0]);
          }
        } else {
          // Location not available
          setSafetyScore(null);
          setWalkingStatus('unknown');
          setLocationPrompt(data.prompt || 'Enable location to view safety score');
        }
      } catch (err: any) {
        console.error('Safety score calculation failed:', err);
        // Fallback state
        setLocationAvailable(false);
        setSafetyScore(null);
        setWalkingStatus('unknown');
        setLocationPrompt('Unable to calculate safety score');
        setScoreBreakdown(null);
      } finally {
        setCalculatingScore(false);
      }
    };

    // Calculate immediately
    calculateSafetyScore();

    // Recalculate every 3 minutes
    const interval = setInterval(calculateSafetyScore, 180000);

    return () => clearInterval(interval);
  }, [location]);

  const triggerSOS = async () => {
    setSosActive(true);
    addAlert('emergency', 'SOS ACTIVATED - Getting your location...');

    let currentLocation: Location | null = null;
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            enableHighAccuracy: true,
            maximumAge: 0
          });
        });
        currentLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        addAlert('success', `Location acquired: ${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`);
      } catch (err: any) {
        addAlert('warning', `Location error: ${err.message}. Using last known location.`);
        currentLocation = location;
      }
    }

    try {
      await alertAPI.createInstantAlert({
        user_id: user?.id || 1,
        session_id: activeSession?.id || null,
        type: ALERT_TYPES.SOS,
        confidence: 1.0,
        location_lat: currentLocation?.lat || null,
        location_lng: currentLocation?.lng || null,
      });
      addAlert('emergency', 'Emergency contacts notified!');
    } catch (err: any) {
      addAlert('error', `Failed to send SOS: ${err.message}`);
    }
  };

  const cancelSOS = () => {
    setSosActive(false);
    addAlert('success', 'SOS cancelled');
  };

  const handleStartWalk = async () => {
    setLoading(true);
    try {
      const response = await walkAPI.startWalk({
        user_id: user?.id || 1,
        location_lat: location?.lat || null,
        location_lng: location?.lng || null,
      });
      startSession(response.data);
      addAlert('success', 'Walk mode started');
    } catch (err: any) {
      addAlert('error', 'Failed to start walk mode');
    } finally {
      setLoading(false);
    }
  };

  const handleStopWalk = async (password?: string) => {
    setLoading(true);
    try {
      if (!location) {
        addAlert('warning', 'Getting your location...');
        // Wait a bit for location to be available
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await walkAPI.stopWalk({
        session_id: activeSession?.id || 1,
        password: password,
        location_lat: location?.lat,
        location_lng: location?.lng
      });
      stopSession();
      addAlert('success', 'Walk mode stopped');
    } catch (err: any) {
      addAlert('error', 'Failed to stop walk mode');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = typeof children === 'function'
    ? children({
        safetyScore,
        walkingStatus,
        isWalking,
        activeSession,
        location,
        voiceEnabled,
        isListening,
        isAnalyzing,
        voiceLogs,
        lastAnalysisResult,
        loading,
        alerts,
        user,
        setUser,
        handleStartWalk,
        handleStopWalk,
        toggleVoiceRecognition,
        clearVoiceLogs,
        addAlert,
        isTracking,
        startTracking,
        stopTracking,
        locationAvailable,
        locationPrompt,
        calculatingScore,
        scoreBreakdown,
      })
    : children;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        isMenuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen(!menuOpen)}
      />

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Navigation
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
        />

        <div className="mt-6 space-y-4 sm:space-y-6">
          {/* Safe Location Banner */}
          <SafeLocationBanner currentLocation={currentSafeLocation} />

          <SOSButton
            isActive={sosActive}
            onTrigger={triggerSOS}
            onCancel={cancelSOS}
          />

          {renderContent}
        </div>
      </div>
    </div>
  );
}
