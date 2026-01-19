'use client'

import { Phone, PhoneOff, Mic, MicOff, AlertTriangle } from 'lucide-react'
import { useLocation } from '@/hooks/useLocation'
import { useSafetyCall } from '@/hooks/useSafetyCall'

export default function SafetyCallView() {
  const { location } = useLocation(() => {})
  const {
    callActive,
    calling,
    muted,
    transcript,
    distressDetected,
    startCall,
    startVonageCall,
    endCall,
    toggleMute,
    error
  } = useSafetyCall()

  const handleStartCall = () => {
    // Use Vonage voice call - will actually call your phone
    startVonageCall(location ? {
      latitude: location.lat,
      longitude: location.lng
    } : undefined)
  }

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
      <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-gray-900">Safety Call</h2>

      <div className="bg-white rounded-lg p-4 sm:p-5 md:p-6 mb-4 sm:mb-6 border border-gray-200">
        <p className="text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base">
          Start a fake call with an AI "friend" who will check on you.
          This can deter potential threats by making them think someone is monitoring your safety.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded mb-3 sm:mb-4 text-sm sm:text-base">
            {error}
          </div>
        )}

        {distressDetected && (
          <div className="bg-yellow-50 border border-yellow-300 text-yellow-700 px-3 py-2 sm:px-4 sm:py-3 rounded mb-3 sm:mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="text-sm sm:text-base">Distress detected - alert sent to your trusted contacts</span>
          </div>
        )}

        {!callActive && !calling && (
          <button
            onClick={handleStartCall}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base"
          >
            <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
            Start Safety Call
          </button>
        )}

        {calling && (
          <div className="text-center py-6 sm:py-8">
            <div className="animate-pulse mb-3 sm:mb-4">
              <Phone className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto text-green-500" />
            </div>
            <p className="text-base sm:text-lg text-gray-900">Starting call...</p>
          </div>
        )}

        {callActive && (
          <div className="bg-gray-50 rounded-lg p-6 sm:p-8 md:p-10 border border-gray-200">
            <div className="flex items-center justify-center mb-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-600 rounded-full flex items-center justify-center animate-pulse">
                <Phone className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </div>
            </div>

            <p className="text-center text-2xl sm:text-3xl font-bold mb-2 text-gray-900">Call Active</p>
            <p className="text-center text-gray-600 text-sm sm:text-base mb-4">
              Your phone is ringing. Answer to talk to your AI safety friend.
            </p>

            <div className="bg-white rounded-lg p-4 text-center mb-4 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">AI Voice Assistant Connected</p>
              <p className="text-sm text-gray-700">The AI will check on your safety and can detect distress</p>
            </div>

            <p className="text-center text-xs text-gray-500">
              Hang up from your phone to end the call
            </p>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-white rounded-lg p-4 sm:p-5 md:p-6 border border-gray-200">
        <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-gray-900">How It Works</h3>
        <ul className="space-y-1.5 sm:space-y-2 text-gray-700 text-xs sm:text-sm">
          <li>• AI acts as a concerned friend checking on your safety</li>
          <li>• Mentions tracking your location to deter potential threats</li>
          <li>• Detects distress keywords and silently alerts your contacts</li>
          <li>• Appears like a normal phone call to anyone nearby</li>
          <li>• You control when to start and end the call</li>
        </ul>
      </div>
    </div>
  )
}
