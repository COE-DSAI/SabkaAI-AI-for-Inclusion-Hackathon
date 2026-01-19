'use client'

import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, MapPin, Clock, User, Phone, Mail, LogOut, RefreshCw, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/lib/store'

interface Alert {
  id: number
  user_id: number
  user_name: string
  user_phone: string
  user_email: string
  type: string
  status: string
  location_lat: number | null
  location_lng: number | null
  created_at: string
  triggered_at: string | null
  confidence: number
  is_duress: boolean
}

export default function GovDashboardPage() {
  const router = useRouter()
  const user = useUserStore((state) => state.user)
  const clearUser = useUserStore((state) => state.clearUser)

  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is a government agent
    if (!user) {
      router.replace('/auth/signin')
      return
    }

    if (user.user_type !== 'GOVT_AGENT') {
      router.replace('/dashboard')
      return
    }

    fetchAlerts()
  }, [user, router])

  const fetchAlerts = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.replace('/auth/signin')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gov/alerts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.status === 401) {
        router.replace('/auth/signin')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch alerts')
      }

      const data = await response.json()
      setAlerts(data.alerts || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    clearUser()
    localStorage.removeItem('access_token')
    document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    router.replace('/auth/signin')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'triggered':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    }
  }

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading && alerts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading alerts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 rounded-lg p-2">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Government Dashboard</h1>
                <p className="text-sm text-gray-400">Alert Monitoring System</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/gov-dashboard/reports')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">View Reports</span>
              </button>
              <button
                onClick={() => router.push('/gov-dashboard/incidents')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">View Incidents</span>
              </button>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Links */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/gov-dashboard/incidents')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium shadow-md transition"
          >
            <FileText className="w-5 h-5" />
            View Incident Reports
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Alerts</p>
                <p className="text-3xl font-bold text-white mt-1">{alerts.length}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Alerts</p>
                <p className="text-3xl font-bold text-red-400 mt-1">
                  {alerts.filter(a => a.status === 'triggered').length}
                </p>
              </div>
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Duress Alerts</p>
                <p className="text-3xl font-bold text-orange-400 mt-1">
                  {alerts.filter(a => a.is_duress).length}
                </p>
              </div>
              <Shield className="w-10 h-10 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Alerts in Your Jurisdiction</h2>
            <button
              onClick={fetchAlerts}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="px-6 py-4 bg-red-900/20 border-b border-red-800">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {alerts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No alerts in your jurisdiction</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {alerts.map((alert) => (
                <div key={alert.id} className="px-6 py-4 hover:bg-gray-750 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Alert Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getStatusColor(alert.status)}`}>
                          {alert.status}
                        </span>
                        {alert.is_duress && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-900 text-orange-200">
                            DURESS
                          </span>
                        )}
                        <span className="text-gray-400 text-sm">
                          {alert.type}
                        </span>
                      </div>

                      {/* User Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-300">{alert.user_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-300">{alert.user_phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-300">{alert.user_email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-300">{formatDateTime(alert.created_at)}</span>
                        </div>
                      </div>

                      {/* Location */}
                      {alert.location_lat && alert.location_lng && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <a
                            href={`https://www.google.com/maps?q=${alert.location_lat},${alert.location_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline"
                          >
                            View on Google Maps
                          </a>
                          <span className="text-gray-500">
                            ({alert.location_lat.toFixed(6)}, {alert.location_lng.toFixed(6)})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Confidence Badge */}
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Confidence</p>
                      <p className="text-2xl font-bold text-white">{Math.round(alert.confidence * 100)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
