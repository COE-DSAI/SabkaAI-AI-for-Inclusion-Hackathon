'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { AlertTriangle, MapPin, Clock, Navigation, RefreshCw, Shield, Phone, Lock, X } from 'lucide-react'
import { trackingAPI, type LiveTrackingResponse } from '@/lib/api'

export default function LiveTrackingPage() {
  const params = useParams()
  const token = params.token as string

  const [trackingData, setTrackingData] = useState<LiveTrackingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [showStopModal, setShowStopModal] = useState(false)
  const [stopPassword, setStopPassword] = useState('')
  const [stopError, setStopError] = useState<string | null>(null)
  const [stopping, setStopping] = useState(false)

  const fetchTracking = async () => {
    try {
      const response = await trackingAPI.getTracking(token)
      setTrackingData(response.data)
      setLastUpdated(new Date())
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load tracking data')
    } finally {
      setLoading(false)
    }
  }

  const handleStopSilentMode = async () => {
    if (!stopPassword.trim()) {
      setStopError('Please enter password')
      return
    }

    setStopping(true)
    setStopError(null)

    try {
      await trackingAPI.stopSilentMode(token, stopPassword)
      // Refresh tracking data to show session ended
      await fetchTracking()
      setShowStopModal(false)
      setStopPassword('')
    } catch (err: any) {
      setStopError(err.response?.data?.detail || 'Failed to stop tracking. Invalid password?')
    } finally {
      setStopping(false)
    }
  }

  useEffect(() => {
    fetchTracking()
  }, [token])

  // Auto-refresh every 10 seconds if active
  useEffect(() => {
    if (!autoRefresh || trackingData?.status !== 'active') return

    const interval = setInterval(fetchTracking, 10000)
    return () => clearInterval(interval)
  }, [autoRefresh, trackingData?.status])

  const getTimeSinceUpdate = () => {
    const seconds = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-yellow-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading tracking data...</p>
        </div>
      </div>
    )
  }

  if (error || trackingData?.status === 'invalid') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md bg-red-900/20 border-2 border-red-600 rounded-lg p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-100 mb-2">Invalid Tracking Link</h1>
          <p className="text-red-200">
            {trackingData?.message || error || 'This tracking link is invalid or has expired.'}
          </p>
        </div>
      </div>
    )
  }

  if (trackingData?.status === 'session_ended') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md bg-green-900/20 border-2 border-green-600 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-green-100 mb-2">Tracking Ended</h1>
          <p className="text-green-200 mb-4">{trackingData.message}</p>
          {trackingData.alert_created_at && (
            <p className="text-sm text-green-300">
              Alert was created at {new Date(trackingData.alert_created_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Active tracking
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-gray-900 to-gray-950 p-4">
      <div className="max-w-5xl mx-auto py-6">
        {/* Header with Branding */}
        <div className="flex items-center justify-center mb-6">
          <Shield className="w-8 h-8 text-red-500 mr-3" />
          <h1 className="text-2xl font-bold text-white">Protego Emergency Tracking</h1>
        </div>

        {/* Emergency Alert Banner */}
        <div className="bg-gradient-to-r from-red-900 to-red-800 border-2 border-red-500 rounded-xl p-6 mb-6 shadow-2xl">
          <div className="flex items-start gap-4">
            <div className="bg-red-500 rounded-full p-3 animate-pulse">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                  DURESS ALERT
                </span>
                <span className="text-red-300 text-sm font-medium">
                  {trackingData.alert_created_at && formatDateTime(trackingData.alert_created_at)}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">
                {trackingData.user_name} may be in danger
              </h2>
              <div className="bg-red-950/50 border-l-4 border-red-400 rounded p-4">
                <p className="text-red-100 font-semibold flex items-center gap-2 mb-2">
                  <Phone className="w-5 h-5" />
                  DO NOT call them directly
                </p>
                <p className="text-red-200 text-sm">
                  They may be compromised or in a coerced situation. Contact local authorities instead.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Location Card */}
            {trackingData.current_location && (
              <div className="bg-gray-800/90 backdrop-blur border border-gray-700 rounded-xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 rounded-lg p-2">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Live Location</h3>
                      <p className="text-gray-400 text-sm">Updates every 10 seconds</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                      autoRefresh
                        ? 'bg-green-600 text-white shadow-lg shadow-green-500/30'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                    {autoRefresh ? 'Auto' : 'Manual'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <p className="text-gray-400 text-xs font-medium mb-2">LATITUDE</p>
                    <p className="text-white font-mono text-lg font-semibold">
                      {trackingData.current_location.latitude.toFixed(6)}
                    </p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <p className="text-gray-400 text-xs font-medium mb-2">LONGITUDE</p>
                    <p className="text-white font-mono text-lg font-semibold">
                      {trackingData.current_location.longitude.toFixed(6)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <a
                    href={trackingData.current_location.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-500/30"
                  >
                    <Navigation className="w-5 h-5" />
                    Open in Google Maps
                  </a>
                  <button
                    onClick={fetchTracking}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-gray-400">Last updated</span>
                  <span className="text-green-400 font-medium">{getTimeSinceUpdate()}</span>
                </div>
              </div>
            )}

            {/* Emergency Actions */}
            <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-2 border-yellow-600/50 rounded-xl p-6 shadow-xl">
              <h3 className="text-xl font-bold text-yellow-100 mb-4 flex items-center gap-2">
                <Phone className="w-6 h-6" />
                Emergency Services
              </h3>
              <p className="text-yellow-200 text-sm mb-5">
                If {trackingData.user_name} is in immediate danger, contact local authorities:
              </p>
              <div className="grid grid-cols-2 gap-4">
                <a
                  href="tel:911"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg text-center transition-all shadow-lg hover:shadow-red-500/30 flex items-center justify-center gap-2"
                >
                  <Phone className="w-5 h-5" />
                  <div>
                    <div className="text-lg">911</div>
                    <div className="text-xs opacity-90">USA</div>
                  </div>
                </a>
                <a
                  href="tel:112"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg text-center transition-all shadow-lg hover:shadow-red-500/30 flex items-center justify-center gap-2"
                >
                  <Phone className="w-5 h-5" />
                  <div>
                    <div className="text-lg">112</div>
                    <div className="text-xs opacity-90">Europe</div>
                  </div>
                </a>
              </div>
              <p className="text-yellow-300/70 text-xs mt-4 text-center">
                Provide them with the coordinates shown above
              </p>
            </div>
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            {/* Timeline */}
            <div className="bg-gray-800/90 backdrop-blur border border-gray-700 rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Timeline
              </h3>
              <div className="space-y-4">
                {trackingData.alert_created_at && (
                  <div className="flex items-start gap-3">
                    <div className="bg-red-500 rounded-full w-2 h-2 mt-2"></div>
                    <div className="flex-1">
                      <p className="text-gray-400 text-xs uppercase tracking-wide">Alert Created</p>
                      <p className="text-white text-sm font-medium mt-1">
                        {formatDateTime(trackingData.alert_created_at)}
                      </p>
                    </div>
                  </div>
                )}
                {trackingData.session_start_time && (
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-500 rounded-full w-2 h-2 mt-2"></div>
                    <div className="flex-1">
                      <p className="text-gray-400 text-xs uppercase tracking-wide">Session Started</p>
                      <p className="text-white text-sm font-medium mt-1">
                        {formatDateTime(trackingData.session_start_time)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stop Tracking */}
            <div className="bg-gray-800/90 backdrop-blur border border-gray-700 rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Lock className="w-5 h-5 text-orange-400" />
                Stop Tracking
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Emergency resolved? Stop silent mode with password.
              </p>

              {!showStopModal ? (
                <button
                  onClick={() => setShowStopModal(true)}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition-all shadow-lg hover:shadow-orange-500/30"
                >
                  Stop Silent Mode
                </button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={stopPassword}
                      onChange={(e) => setStopPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      disabled={stopping}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleStopSilentMode()
                      }}
                    />
                  </div>

                  {stopError && (
                    <div className="bg-red-900/30 border border-red-600 rounded-lg p-3 flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-red-300 text-sm">{stopError}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleStopSilentMode}
                      disabled={stopping}
                      className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all shadow-lg"
                    >
                      {stopping ? (
                        <span className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Stopping...
                        </span>
                      ) : (
                        'Confirm'
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowStopModal(false)
                        setStopPassword('')
                        setStopError(null)
                      }}
                      disabled={stopping}
                      className="px-4 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-gray-500 text-xs text-center">
                    ⚠️ This will end tracking session
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-2">
            <Shield className="w-4 h-4" />
            <span>Secured by Protego Safety</span>
          </div>
          <p className="text-gray-600 text-xs">
            256-bit encrypted tracking • Updates every 10 seconds • Emergency response ready
          </p>
        </div>
      </div>
    </div>
  )
}
