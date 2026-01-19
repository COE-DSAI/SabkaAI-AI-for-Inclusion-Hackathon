import axios, { AxiosResponse } from 'axios';

interface WalkSession {
  id: number;
  user_id: number;
  start_time: string;
  end_time: string | null;
  status: string;
}

interface AlertData {
  user_id: number;
  session_id: number | null;
  type: string;
  confidence: number;
  location_lat: number | null;
  location_lng: number | null;
  transcription?: string;
  ai_analysis?: string;
  keywords_detected?: string[];
}

interface Alert {
  id: number;
  user_id: number;
  session_id: number | null;
  type: string;
  confidence: number;
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
  status: string;
}

interface UserData {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  trusted_contacts?: string[];
}

interface User {
  id: number;
  email: string;
  name: string;
  phone: string;
  user_type: string;
  trusted_contacts: string[];
  created_at: string;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

interface TrustedContact {
  phone: string;
  name?: string;
}

// Use /api proxy in development, full URL in production
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Global flag to prevent redirect during logout
let isLoggingOut = false;

export const setLoggingOut = (value: boolean) => {
  isLoggingOut = value;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Disabled for CORS compatibility with wildcard origins
});

// Request interceptor - cookies are sent automatically by browser
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      // For backward compatibility, still check localStorage
      const token = localStorage.getItem('access_token');

      if (token) {
        // If token exists in localStorage, send it as Bearer token
        config.headers.Authorization = `Bearer ${token}`;
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url} (Bearer token)`);
      } else {
        // Otherwise rely on httpOnly cookie (sent automatically by browser)
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url} (Cookie auth)`);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only log errors in development
    if (process.env.NODE_ENV === 'development') {
      if (error.response) {
        console.error(`API Error [${error.response.status}]:`, error.response.data);
      } else if (error.request) {
        console.error('API Error: No response received from server');
      } else {
        console.error('API Error:', error.message);
      }
    }

    // Only redirect on 401 if it's NOT from signin/signup endpoints
    if (error.response?.status === 401) {
      const isAuthEndpoint = error.config?.url?.includes('/users/signin') ||
                             error.config?.url?.includes('/users/signup');

      // Skip redirect if we're in the middle of logging out
      if (isLoggingOut) {
        console.log('401 Unauthorized - Logging out in progress, skipping redirect');
        return Promise.reject(error);
      }

      if (!isAuthEndpoint && typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        const isAlreadyOnAuthPage = currentPath.startsWith('/auth/');

        // Clear all auth-related data
        localStorage.removeItem('access_token');
        localStorage.removeItem('cached_user');
        localStorage.removeItem('cached_user_timestamp');
        localStorage.removeItem('cached_safety_score');
        localStorage.removeItem('cached_safety_score_timestamp');
        localStorage.removeItem('cached_safety_score_location');
        localStorage.removeItem('protego-store');

        // Only redirect if not already on auth page
        if (!isAlreadyOnAuthPage) {
          console.log('401 Unauthorized - Redirecting to signin');
          window.location.href = '/auth/signin';
        } else {
          console.log('401 Unauthorized - Already on auth page, skipping redirect');
        }
      }
    }
    return Promise.reject(error);
  }
);

interface WalkStartData {
  user_id: number;
  location_lat: number | null;
  location_lng: number | null;
  mode?: 'manual' | 'auto_geofence' | 'silent';
  safe_location_id?: number | null;
}

interface WalkStopData {
  session_id: number;
  password?: string;
  location_lat?: number;
  location_lng?: number;
}

// Export the base axios instance for custom API calls
export { api };

// Walk API
export const walkAPI = {
  startWalk: (data: WalkStartData): Promise<AxiosResponse<WalkSession>> =>
    api.post('/walk/start', data),
  stopWalk: (data: WalkStopData): Promise<AxiosResponse<WalkSession>> =>
    api.post('/walk/stop', data),
  getActiveSession: (userId: number): Promise<AxiosResponse<WalkSession>> =>
    api.get(`/walk/user/${userId}/active`),
};

// Alert API
export const alertAPI = {
  createAlert: (data: AlertData): Promise<AxiosResponse<Alert>> =>
    api.post('/alerts/', data),
  createInstantAlert: (data: AlertData): Promise<AxiosResponse<Alert>> =>
    api.post('/alerts/instant', data),
  getAlert: (alertId: number): Promise<AxiosResponse<Alert>> =>
    api.get(`/alerts/${alertId}`),
  cancelAlert: (alertId: number): Promise<AxiosResponse<Alert>> =>
    api.post(`/alerts/${alertId}/cancel`, {}),
};

// User API
export const userAPI = {
  signup: (userData: UserData): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/users/signup', userData),
  signin: (credentials: { email: string; password: string }): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/users/signin', credentials),
  getProfile: (): Promise<AxiosResponse<User>> =>
    api.get('/users/me'),
  updateProfile: (updates: Partial<User>): Promise<AxiosResponse<User>> =>
    api.put('/users/me', updates),
  getTrustedContacts: (): Promise<AxiosResponse<string[]>> =>
    api.get('/users/me/trusted-contacts'),
  addTrustedContact: (contact: TrustedContact): Promise<AxiosResponse<User>> =>
    api.post('/users/me/trusted-contacts', contact),
  removeTrustedContact: (phone: string): Promise<AxiosResponse<User>> =>
    api.delete('/users/me/trusted-contacts', { data: { phone } }),
};

// AI API Types
interface AudioAnalysisResponse {
  transcription: string;
  distress_detected: boolean;
  distress_type: string;
  confidence: number;
  keywords_found: string[];
  alert_triggered: boolean;
  alert_id: number | null;
}

interface SafetySummaryResponse {
  summary: string;
  risk_level: string;
  recommendations: string[];
  alerts_analysis: string;
  session_duration_minutes: number;
  total_alerts: number;
}

interface ChatResponse {
  response: string;
  timestamp: string;
}

interface QuickAnalysisResponse {
  is_emergency: boolean;
  confidence: number;
  distress_type: string;
  analysis: string;
  recommended_action: string;
}

interface AIStatusResponse {
  whisper_configured: boolean;
  megallm_configured: boolean;
  realtime_configured: boolean;
  test_mode: boolean;
  model: string;
  confidence_threshold: number;
}

interface RealtimeConfigResponse {
  ws_url: string;
  deployment: string;
  instructions: string;
}

interface LocationSafetyResponse {
  safety_score: number;
  status: string; // safe, caution, alert
  risk_level: string; // low, medium, high
  factors: string[];
  recommendations: string[];
  time_context?: {
    hour: number;
    is_night: boolean;
    is_late_night: boolean;
    day_of_week: string;
  };
  analyzed_at: string;
}

interface SafetyScoreResponse {
  location_available: boolean;
  safety_score: number | null;
  status: string;
  status_message?: string;
  message?: string;
  prompt?: string;
  components?: {
    time_score: number;
    history_score: number;
    location_score: number;
    alert_score: number;
  };
  factors?: string[];
  recommendations?: string[];
  analyzed_at?: string;
}

// AI API
export const aiAPI = {
  // Analyze audio file for distress
  analyzeAudio: (
    audioBlob: Blob,
    sessionId?: number | null,
    locationLat?: number | null,
    locationLng?: number | null
  ): Promise<AxiosResponse<AudioAnalysisResponse>> => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    if (sessionId) formData.append('session_id', sessionId.toString());
    if (locationLat) formData.append('location_lat', locationLat.toString());
    if (locationLng) formData.append('location_lng', locationLng.toString());

    return api.post('/ai/analyze/audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // 60 second timeout for audio processing
    });
  },

  // Analyze text for safety concerns
  analyzeText: (
    text: string,
    context?: string
  ): Promise<AxiosResponse<QuickAnalysisResponse>> =>
    api.post('/ai/analyze/text', { text, context }),

  // Get safety summary for a session
  getSessionSummary: (sessionId: number): Promise<AxiosResponse<SafetySummaryResponse>> =>
    api.get(`/ai/summary/session/${sessionId}`),

  // Get latest session summary
  getLatestSummary: (): Promise<AxiosResponse<SafetySummaryResponse>> =>
    api.get('/ai/summary/latest'),

  // Chat with AI safety assistant
  chat: (
    message: string,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<AxiosResponse<ChatResponse>> =>
    api.post('/ai/chat', { message, conversation_history: conversationHistory }),

  // Get safety tips
  getSafetyTips: (): Promise<AxiosResponse<{ tips: string; generated_at: string }>> =>
    api.get('/ai/tips'),

  // Get AI service status
  getStatus: (): Promise<AxiosResponse<AIStatusResponse>> =>
    api.get('/ai/status'),

  // Get comprehensive safety score
  getSafetyScore: (
    latitude?: number | null,
    longitude?: number | null
  ): Promise<AxiosResponse<SafetyScoreResponse>> => {
    const params = new URLSearchParams();
    if (latitude !== null && latitude !== undefined) {
      params.append('latitude', latitude.toString());
    }
    if (longitude !== null && longitude !== undefined) {
      params.append('longitude', longitude.toString());
    }
    return api.get(`/ai/safety-score${params.toString() ? '?' + params.toString() : ''}`, {
      timeout: 30000, // 30 second timeout for safety score calculation with AI
    });
  },

  // Analyze location safety
  analyzeLocation: (
    latitude: number,
    longitude: number,
    timestamp?: string,
    context?: string
  ): Promise<AxiosResponse<LocationSafetyResponse>> =>
    api.post('/ai/analyze/location', { latitude, longitude, timestamp, context }),

  // Get realtime WebSocket configuration
  getRealtimeConfig: (): Promise<AxiosResponse<RealtimeConfigResponse>> =>
    api.get('/ai/realtime/config'),
};

// Safe Locations Types
interface SafeLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  auto_start_walk: boolean;
  auto_stop_walk: boolean;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

interface SafeLocationCreate {
  name: string;
  latitude: number;
  longitude: number;
  radius_meters?: number;
  auto_start_walk?: boolean;
  auto_stop_walk?: boolean;
  notes?: string;
}

interface CheckGeofenceResponse {
  inside_safe_location: boolean;
  safe_location_id?: number;
  safe_location_name?: string;
  distance_meters?: number;
  should_auto_start_walk: boolean;
  should_auto_stop_walk: boolean;
}

// Safe Locations API
export const safeLocationsAPI = {
  // Get all safe locations
  getAll: (includeInactive = false): Promise<AxiosResponse<SafeLocation[]>> =>
    api.get('/safe-locations/', { params: { include_inactive: includeInactive } }),

  // Get specific safe location
  getById: (id: number): Promise<AxiosResponse<SafeLocation>> =>
    api.get(`/safe-locations/${id}`),

  // Create new safe location
  create: (data: SafeLocationCreate): Promise<AxiosResponse<SafeLocation>> =>
    api.post('/safe-locations/', data),

  // Update safe location
  update: (id: number, data: Partial<SafeLocationCreate>): Promise<AxiosResponse<SafeLocation>> =>
    api.patch(`/safe-locations/${id}`, data),

  // Delete safe location
  delete: (id: number): Promise<AxiosResponse<void>> =>
    api.delete(`/safe-locations/${id}`),

  // Check if inside any safe location
  checkGeofence: (latitude: number, longitude: number): Promise<AxiosResponse<CheckGeofenceResponse>> =>
    api.post('/safe-locations/check-geofence', { latitude, longitude }),

  // Find nearest safe location
  findNearest: (latitude: number, longitude: number): Promise<AxiosResponse<any>> =>
    api.get(`/safe-locations/nearest/${latitude}/${longitude}`),
};

// Duress Password Types
interface DuressPasswordSet {
  current_password: string;
  duress_password: string;
}

interface DuressPasswordStatus {
  has_duress_password: boolean;
}

// Duress Password API
export const duressPasswordAPI = {
  // Set or update duress password
  set: (data: DuressPasswordSet): Promise<AxiosResponse<{ message: string; has_duress_password: boolean }>> =>
    api.post('/users/duress-password/set', data),

  // Remove duress password
  remove: (currentPassword: string): Promise<AxiosResponse<{ message: string; has_duress_password: boolean }>> =>
    api.delete('/users/duress-password', { data: { current_password: currentPassword } }),

  // Check if duress password is set
  checkStatus: (): Promise<AxiosResponse<DuressPasswordStatus>> =>
    api.get('/users/duress-password/status'),
};

// Live Tracking Types
interface LiveTrackingResponse {
  status: string; // "active", "session_ended", "invalid"
  user_name?: string;
  alert_created_at?: string;
  alert_type?: string;
  current_location?: {
    latitude: number;
    longitude: number;
    google_maps_url: string;
  };
  session_start_time?: string;
  last_updated?: string;
  message?: string;
}

// Live Tracking API (Public - No Auth Required)
export const trackingAPI = {
  // Get live tracking data by token
  getTracking: (token: string): Promise<AxiosResponse<LiveTrackingResponse>> =>
    axios.get(`${API_BASE_URL}/track/${token}`), // Don't use authenticated api instance

  // Stop silent mode tracking (password protected)
  stopSilentMode: (token: string, password: string): Promise<AxiosResponse<any>> =>
    axios.post(`${API_BASE_URL}/track/${token}/stop`, { password }), // Don't use authenticated api instance
};

export type {
  User,
  AuthResponse,
  UserData,
  TrustedContact,
  AudioAnalysisResponse,
  SafetySummaryResponse,
  ChatResponse,
  QuickAnalysisResponse,
  AIStatusResponse,
  LocationSafetyResponse,
  RealtimeConfigResponse,
  WalkStartData,
  WalkStopData,
  SafeLocation,
  SafeLocationCreate,
  CheckGeofenceResponse,
  DuressPasswordSet,
  DuressPasswordStatus,
  LiveTrackingResponse,
};
