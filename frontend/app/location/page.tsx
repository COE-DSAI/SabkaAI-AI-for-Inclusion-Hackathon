'use client'

import { useState, useEffect } from 'react'
import { MapPin, RefreshCw, Navigation, Clock, Crosshair } from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'

interface LocationData {
  lat: number
  lng: number
  accuracy?: number
  timestamp: number
}

export default function LocationPage() {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load cached location on mount
  useEffect(() => {
    const cached = localStorage.getItem('cached_location')
    if (cached) {
      try {
        const data = JSON.parse(cached)
        setLocation(data)
      } catch (e) {
        console.error('Failed to parse cached location:', e)
      }
    }
  }, [])

  const fetchLocation = () => {
    setLoading(true)
    setError(null)

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation: LocationData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        }

        setLocation(newLocation)
        localStorage.setItem('cached_location', JSON.stringify(newLocation))
        setLoading(false)
      },
      (err) => {
        setError(err.message || 'Failed to get location')
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  const getTimeSince = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 rounded-xl p-3">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">My Location</h1>
                <p className="text-sm text-gray-500">View your current location</p>
              </div>
            </div>

            <button
              onClick={fetchLocation}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-blue-500/30 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Getting...' : 'Get Location'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {!location && !loading && !error && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <Crosshair className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Click "Get Location" to view your current position</p>
            </div>
          )}

          {location && (
            <div className="space-y-4">
              {/* Location Info */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Coordinates
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white/70 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Latitude</p>
                    <p className="text-lg font-mono font-semibold text-gray-800">
                      {location.lat.toFixed(6)}
                    </p>
                  </div>
                  <div className="bg-white/70 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Longitude</p>
                    <p className="text-lg font-mono font-semibold text-gray-800">
                      {location.lng.toFixed(6)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {location.accuracy && (
                    <div className="bg-white/70 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Accuracy</p>
                      <p className="text-sm font-semibold text-gray-800">
                        ±{location.accuracy.toFixed(0)}m
                      </p>
                    </div>
                  )}
                  <div className="bg-white/70 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last Updated
                    </p>
                    <p className="text-sm font-semibold text-gray-800">
                      {getTimeSince(location.timestamp)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <a
                  href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-green-500/30"
                >
                  <Navigation className="w-5 h-5" />
                  Open in Google Maps
                </a>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${location.lat}, ${location.lng}`)
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-semibold transition-all"
                >
                  Copy
                </button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-xs text-yellow-800">
                  <strong>Note:</strong> Your location is cached locally and updates when you click "Get Location". This helps show your last known position even when offline.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
