'use client'

import { useState } from 'react';
import {
  Shield,
  CheckCircle,
  MicOff,
  Lock,
  Eye,
  EyeOff,
  X,
  Activity,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Brain,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
}

interface WalkSession {
  id: number;
}

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
}

interface WalkControlProps {
  isWalking: boolean;
  activeSession: WalkSession | null;
  location: Location | null;
  voiceEnabled: boolean;
  isListening: boolean;
  isAnalyzing: boolean;
  voiceLogs: VoiceLog[];
  lastAnalysisResult: DistressAnalysisResult | null;
  loading: boolean;
  onStartWalk: () => void;
  onStopWalk: (password?: string) => void;
  onToggleVoice: () => void;
  onClearVoiceLogs: () => void;
}

export default function WalkControl({
  isWalking,
  activeSession,
  location,
  voiceEnabled,
  isListening,
  isAnalyzing,
  voiceLogs,
  lastAnalysisResult,
  loading,
  onStartWalk,
  onStopWalk,
  onToggleVoice,
  onClearVoiceLogs
}: WalkControlProps) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showLogsDetails, setShowLogsDetails] = useState(false);

  const handleStopClick = () => {
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStopWalk(password);
    setPassword('');
    setShowPassword(false);
    setShowPasswordModal(false);
  };

  const handleCancelPassword = () => {
    setPassword('');
    setShowPassword(false);
    setShowPasswordModal(false);
  };

  return (
    <>
      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6 animate-scale-in">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Stop Walk Mode</h3>
              </div>
              <button
                onClick={handleCancelPassword}
                className="text-gray-600 hover:text-gray-900 transition p-1 -mr-1"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <p className="text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base">
              Enter your password to stop walk mode
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-gray-900 placeholder-gray-400 pr-10 sm:pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-1 sm:pt-2">
                <button
                  type="submit"
                  disabled={!password || loading}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 active:from-red-800 active:to-red-900 text-white font-semibold py-2.5 sm:py-3 px-4 rounded-lg transition shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 text-sm sm:text-base"
                >
                  {loading ? 'Stopping...' : 'Stop Walk Mode'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelPassword}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 active:bg-gray-500 text-gray-900 font-semibold py-2.5 sm:py-3 px-4 rounded-lg transition shadow-md active:scale-95 text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
            </form>

            <p className="text-xs text-gray-500 mt-3 sm:mt-4 text-center">
              The system will never indicate which password you entered
            </p>
          </div>
        </div>
      )}

      {/* Main Walk Control UI */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm overflow-hidden animate-fade-in">
        {/* Main Status Section */}
        <div className="p-5 sm:p-8">
          <div className="flex flex-col items-center text-center">
            {/* Status Icon */}
            <div
              className={`p-6 sm:p-8 rounded-full mb-4 sm:mb-6 transition-all duration-500 ${
                isWalking ? 'bg-gradient-to-br from-green-100 to-emerald-100 text-green-600 animate-pulse shadow-lg' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Shield className={`w-16 h-16 sm:w-24 sm:h-24 transition-transform duration-300 ${isWalking ? 'scale-110' : 'scale-100'}`} />
            </div>

            {/* Title */}
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-800 transition-all duration-300">
              {isWalking ? 'Walk Mode Active' : 'Walk Mode Inactive'}
            </h2>

            {/* Description */}
            <p className="text-gray-600 mb-4 sm:mb-6 text-base sm:text-lg">
              {isWalking
                ? 'You are being monitored for safety with AI assistance.'
                : 'Start Walk Mode to enable safety monitoring and AI protection.'}
            </p>

            {/* Active Session Info */}
            {isWalking && activeSession && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg sm:rounded-xl p-3 sm:p-5 mb-4 sm:mb-6 w-full max-w-md animate-scale-in">
                <div className="flex items-center justify-center text-green-700 mb-1 sm:mb-2">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span className="font-medium text-sm sm:text-base">Session Active</span>
                </div>
                {location && (
                  <p className="text-xs sm:text-sm text-green-600 text-center">
                    Location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </p>
                )}
              </div>
            )}

            {/* Unified AI Voice Monitor */}
            {isWalking && (
              <div className="mb-4 sm:mb-6 w-full max-w-md">
                <button
                  onClick={onToggleVoice}
                  className={`${
                    voiceEnabled
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-600'
                  } px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold w-full flex items-center justify-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl active:scale-95 transition`}
                >
                  {voiceEnabled ? (
                    <>
                      <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>AI Voice Monitor: ON</span>
                      {isListening && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                    </>
                  ) : (
                    <>
                      <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>AI Voice Monitor: OFF</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* AI Voice Monitor Status (when enabled) */}
            {isWalking && voiceEnabled && (
              <div className="w-full max-w-md mb-4 sm:mb-6">
                {/* Live Status */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-3 sm:p-4 mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isListening ? (
                        <>
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-sm font-medium text-red-600">Listening...</span>
                        </>
                      ) : isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                          <span className="text-sm font-medium text-purple-600">AI Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Activity className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">Monitoring</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Last AI Analysis Result */}
                  {lastAnalysisResult && (
                    <div
                      className={`p-3 rounded-lg ${
                        lastAnalysisResult.distress_detected
                          ? 'bg-red-100 border border-red-300'
                          : 'bg-green-100 border border-green-300'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {lastAnalysisResult.distress_detected ? (
                          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-sm font-semibold ${
                                lastAnalysisResult.distress_detected ? 'text-red-700' : 'text-green-700'
                              }`}
                            >
                              {lastAnalysisResult.distress_detected
                                ? `⚠️ ${lastAnalysisResult.distress_type}`
                                : '✓ No Distress Detected'}
                            </span>
                            <span className="text-xs font-medium text-gray-600">
                              {Math.round(lastAnalysisResult.confidence * 100)}% AI confidence
                            </span>
                          </div>
                          {lastAnalysisResult.transcription && (
                            <p className="text-xs text-gray-700 mb-2">
                              📝 "{lastAnalysisResult.transcription}"
                            </p>
                          )}
                          {lastAnalysisResult.keywords_found.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {lastAnalysisResult.keywords_found.slice(0, 5).map((kw, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 text-xs bg-red-200 text-red-800 rounded-full font-medium"
                                >
                                  {kw}
                                </span>
                              ))}
                              {lastAnalysisResult.keywords_found.length > 5 && (
                                <span className="px-2 py-0.5 text-xs text-gray-600">
                                  +{lastAnalysisResult.keywords_found.length - 5} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Logs Toggle */}
                <button
                  onClick={() => setShowLogsDetails(!showLogsDetails)}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mx-auto transition"
                >
                  {showLogsDetails ? (
                    <>
                      <ChevronUp className="w-3 h-3" />
                      <span>Hide logs</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" />
                      <span>Show logs</span>
                    </>
                  )}
                </button>

                {/* Voice Logs (Collapsible) */}
                {showLogsDetails && voiceLogs.length > 0 && (
                  <div className="mt-3 bg-gray-900 text-gray-100 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-gray-400">AI Voice Monitor Logs</h4>
                      <button onClick={onClearVoiceLogs} className="text-xs text-gray-500 hover:text-white transition">
                        Clear
                      </button>
                    </div>
                    <div className="space-y-1 font-mono text-xs">
                      {voiceLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className={`flex gap-2 ${
                            log.type === 'error'
                              ? 'text-red-400'
                              : log.type === 'success'
                              ? 'text-green-400'
                              : log.type === 'warning'
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        >
                          <span className="text-gray-500 shrink-0 text-[10px]">{log.timestamp}</span>
                          <span className="flex-1 text-[10px]">{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* Start/Stop Button */}
            <button
              onClick={isWalking ? handleStopClick : onStartWalk}
              disabled={loading}
              className={`${
                isWalking
                  ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-500/50'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/50'
              } text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold w-full max-w-md rounded-lg sm:rounded-xl transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100`}
            >
              {loading ? 'Please wait...' : isWalking ? 'Stop Walk Mode' : 'Start Walk Mode'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
