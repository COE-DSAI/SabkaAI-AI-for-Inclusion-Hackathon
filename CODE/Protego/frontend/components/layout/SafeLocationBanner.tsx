'use client'

import { Shield, X, Clock, MapPin } from 'lucide-react'
import { useState, useEffect } from 'react'

interface SafeLocationEvent {
  id: string
  locationName: string
  enteredAt: Date
  leftAt?: Date
  isActive: boolean
}

interface SafeLocationBannerProps {
  currentLocation?: {
    name: string
    enteredAt: Date
  } | null
  onDismiss?: () => void
}

export default function SafeLocationBanner({ currentLocation, onDismiss }: SafeLocationBannerProps) {
  const [history, setHistory] = useState<SafeLocationEvent[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('safeLocationHistory')
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory)
        // Limit to last 50 entries to prevent unbounded growth
        const limited = parsed.slice(0, 50)
        setHistory(limited.map((event: any) => ({
          ...event,
          enteredAt: new Date(event.enteredAt),
          leftAt: event.leftAt ? new Date(event.leftAt) : undefined
        })))
      }
    } catch (error) {
      console.error('Failed to load safe location history:', error)
      // Clear corrupted data
      localStorage.removeItem('safeLocationHistory')
    }
  }, [])

  // Track current location changes
  useEffect(() => {
    if (currentLocation && !dismissed) {
      // Check if this is a new entry
      const lastEvent = history[0]
      if (!lastEvent || !lastEvent.isActive || lastEvent.locationName !== currentLocation.name) {
        // Mark previous event as left
        if (lastEvent?.isActive) {
          const updatedHistory = [...history]
          updatedHistory[0] = {
            ...lastEvent,
            leftAt: new Date(),
            isActive: false
          }
          setHistory(updatedHistory)
          localStorage.setItem('safeLocationHistory', JSON.stringify(updatedHistory))
        }

        // Add new entry
        const newEvent: SafeLocationEvent = {
          id: Date.now().toString(),
          locationName: currentLocation.name,
          enteredAt: currentLocation.enteredAt,
          isActive: true
        }
        const updatedHistory = [newEvent, ...history].slice(0, 20) // Keep last 20 events
        setHistory(updatedHistory)
        try {
          localStorage.setItem('safeLocationHistory', JSON.stringify(updatedHistory))
        } catch (error) {
          console.error('Failed to save safe location history:', error)
        }
        setDismissed(false)
      }
    } else if (!currentLocation && history[0]?.isActive) {
      // User left safe location
      const updatedHistory = [...history]
      updatedHistory[0] = {
        ...updatedHistory[0],
        leftAt: new Date(),
        isActive: false
      }
      setHistory(updatedHistory)
      localStorage.setItem('safeLocationHistory', JSON.stringify(updatedHistory))
    }
  }, [currentLocation, dismissed])

  const handleDismiss = () => {
    setDismissed(true)
    if (onDismiss) onDismiss()
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date()
    const duration = Math.floor((endTime.getTime() - start.getTime()) / 1000 / 60) // minutes
    if (duration < 60) return `${duration}m`
    const hours = Math.floor(duration / 60)
    const mins = duration % 60
    return `${hours}h ${mins}m`
  }

  if (!currentLocation && history.length === 0) return null

  return (
    <>
      {/* Active Banner */}
      {currentLocation && !dismissed && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 mb-4 animate-slide-down">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="bg-white/20 backdrop-blur-sm p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm sm:text-base">You're in a Safe Location</h3>
                  <span className="flex items-center gap-1 text-xs bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    Active
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-white/90">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">{currentLocation.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/80 mt-1">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span>Entered at {formatTime(currentLocation.enteredAt)}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">{formatDuration(currentLocation.enteredAt)} ago</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/20 rounded-lg transition flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      )}

      {/* History Toggle */}
      {history.length > 0 && (
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full text-left bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 hover:bg-gray-50 transition"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-1.5 sm:p-2 rounded-lg">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-sm sm:text-base text-gray-900">
                  Safe Location History
                </h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  {history.length} visit{history.length !== 1 ? 's' : ''} recorded
                </p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${showHistory ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
      )}

      {/* History Timeline */}
      {showHistory && history.length > 0 && (
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 max-h-96 overflow-y-auto">
          <div className="space-y-3 sm:space-y-4">
            {history.map((event, index) => (
              <div key={event.id} className="relative">
                {/* Timeline line */}
                {index < history.length - 1 && (
                  <div className="absolute left-3 sm:left-4 top-8 sm:top-10 bottom-0 w-0.5 bg-gray-200" />
                )}

                <div className="flex gap-3 sm:gap-4">
                  {/* Timeline dot */}
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    event.isActive
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/50'
                      : 'bg-gray-300'
                  }`}>
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>

                  {/* Event details */}
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-medium text-sm sm:text-base text-gray-900 truncate">
                        {event.locationName}
                      </h4>
                      {event.isActive && (
                        <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">
                          <div className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" />
                          Active
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">▶</span>
                        <span>Entered: {formatTime(event.enteredAt)}</span>
                        <span className="text-gray-400">•</span>
                        <span>{event.enteredAt.toLocaleDateString()}</span>
                      </div>
                      {event.leftAt && (
                        <div className="flex items-center gap-2">
                          <span className="text-red-600">■</span>
                          <span>Left: {formatTime(event.leftAt)}</span>
                          <span className="text-gray-400">•</span>
                          <span>Duration: {formatDuration(event.enteredAt, event.leftAt)}</span>
                        </div>
                      )}
                      {!event.leftAt && event.isActive && (
                        <div className="flex items-center gap-2 text-green-600">
                          <Clock className="w-3 h-3" />
                          <span>Currently here ({formatDuration(event.enteredAt)})</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
