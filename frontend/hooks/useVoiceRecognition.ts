import { useState, useEffect, useRef, useCallback } from 'react';

interface VoiceLog {
  timestamp: string;
  message: string;
  type: string;
}

interface DistressAnalysisResult {
  distress_detected: boolean;
  distress_type: string;
  confidence: number;
  keywords_found: string[];
  transcription: string;
  analysis?: string;  // AI analysis explanation
}

export function useVoiceRecognition(
  isWalking: boolean,
  onVoiceAlert: (analysisResult: DistressAnalysisResult) => void,
  addVoiceLog: (message: string, type?: string) => void,
  sessionId?: number | null,
  locationLat?: number | null,
  locationLng?: number | null
) {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [voiceLogs, setVoiceLogs] = useState<VoiceLog[]>([]);
  const [lastAnalysisResult, setLastAnalysisResult] = useState<DistressAnalysisResult | null>(null);
  const recognitionRef = useRef<any>(null);

  // Use refs for callbacks to avoid re-initializing recognition on callback changes
  const onVoiceAlertRef = useRef(onVoiceAlert);
  const isWalkingRef = useRef(isWalking);
  const voiceEnabledRef = useRef(voiceEnabled);

  // Keep refs updated
  useEffect(() => {
    onVoiceAlertRef.current = onVoiceAlert;
  }, [onVoiceAlert]);

  useEffect(() => {
    isWalkingRef.current = isWalking;
  }, [isWalking]);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  const addLog = (message: string, type: string = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message, type };
    console.log(`[Voice ${type.toUpperCase()}] ${timestamp}: ${message}`);
    setVoiceLogs(prev => [...prev, logEntry].slice(-20));
  };

  // Track last analyzed transcription to prevent duplicates
  const lastTranscriptionRef = useRef<string>('');
  const lastAnalysisTimeRef = useRef<number>(0);

  // Analyze transcription with AI
  const analyzeTranscription = async (transcription: string) => {
    // Prevent duplicate analysis of the same transcription within 5 seconds
    const now = Date.now();
    if (transcription === lastTranscriptionRef.current && now - lastAnalysisTimeRef.current < 5000) {
      addLog('Skipping duplicate transcription', 'info');
      return;
    }

    lastTranscriptionRef.current = transcription;
    lastAnalysisTimeRef.current = now;

    setIsAnalyzing(true);
    addLog(`Analyzing: "${transcription}"`, 'info');

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/analyze/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          transcription,
          session_id: sessionId,
          location_lat: locationLat,
          location_lng: locationLng
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const result: DistressAnalysisResult = await response.json();
      setLastAnalysisResult(result);

      if (result.distress_detected) {
        addLog(
          `⚠️ DISTRESS: ${result.distress_type} (${Math.round(result.confidence * 100)}%)`,
          'warning'
        );

        // Trigger frontend alert callback with AI analysis data
        addLog('Triggering emergency alert with AI analysis...', 'error');
        onVoiceAlertRef.current(result);
      } else {
        addLog(`✓ No distress detected (${Math.round(result.confidence * 100)}% confidence)`, 'success');
      }
    } catch (error: any) {
      addLog(`Analysis error: ${error.message}`, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Initialize voice recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const errorMsg = 'Speech Recognition not supported in this browser';
      console.warn(errorMsg);
      addLog(errorMsg, 'error');
      return;
    }

    addLog('Speech Recognition API available', 'success');

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      addLog('🎤 AI-powered listening started...', 'success');
    };

    recognition.onend = () => {
      setIsListening(false);
      // Use refs to get current values without causing re-renders
      if (isWalkingRef.current && voiceEnabledRef.current) {
        addLog('Auto-restarting voice recognition...', 'info');
        try {
          recognition.start();
        } catch (err: any) {
          addLog(`Failed to restart: ${err.message}`, 'error');
        }
      }
    };

    recognition.onerror = (event: any) => {
      addLog(`Error: ${event.error}`, 'error');
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0].transcript.trim();
      const isFinal = lastResult.isFinal;

      // Show interim results
      if (!isFinal) {
        addLog(`Hearing: "${transcript}"`, 'info');
      }

      // Analyze final transcriptions with AI
      if (isFinal) {
        addLog(`📝 Heard: "${transcript}"`, 'info');

        // Only analyze if there's actual content (more than 2 words or 10 chars)
        if (transcript.length > 10 || transcript.split(' ').length > 2) {
          analyzeTranscription(transcript);
        } else {
          addLog('Skipping analysis (too short)', 'info');
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        addLog('Voice recognition cleaned up', 'info');
      }
    };
  // Only run once on mount - use refs for dynamic values
  }, []);

  // Start/stop voice recognition based on state
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isWalking && voiceEnabled) {
      addLog('Starting voice recognition...', 'info');
      try {
        recognitionRef.current.start();
      } catch (err: any) {
        addLog(`Start error: ${err.message}`, 'warning');
      }
    } else {
      addLog('Stopping voice recognition', 'info');
      recognitionRef.current.stop();
    }
  }, [isWalking, voiceEnabled]);

  const toggleVoiceRecognition = () => {
    const newState = !voiceEnabled;
    setVoiceEnabled(newState);
    addLog(`AI Voice Monitor ${newState ? 'ENABLED' : 'DISABLED'}`, newState ? 'success' : 'info');
  };

  const clearVoiceLogs = () => {
    setVoiceLogs([]);
    setLastAnalysisResult(null);
  };

  return {
    voiceEnabled,
    isListening,
    isAnalyzing,
    voiceLogs,
    lastAnalysisResult,
    toggleVoiceRecognition,
    clearVoiceLogs,
    recognitionRef
  };
}
