'use client'

import { useState, useEffect } from 'react'
import { Shield, Calendar, BarChart3, Download, TrendingUp, AlertTriangle, FileText, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/lib/store'

interface StatsData {
  period: {
    start_date: string
    end_date: string
    days: number
  }
  authority: {
    name: string
    department: string
    jurisdiction_radius_km: number
  }
  alerts: {
    total: number
    active: number
    resolved: number
    false_alarms: number
    by_type: {
      sos: number
      voice_trigger: number
      ai_analysis: number
    }
    daily: Record<string, { total: number; active: number; resolved: number }>
  }
  incidents: {
    total: number
    submitted: number
    reviewing: number
    resolved: number
  }
}

export default function GovReportsPage() {
  const router = useRouter()
  const user = useUserStore((state) => state.user)

  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    if (!user) {
      router.replace('/auth/signin')
      return
    }

    if (user.user_type !== 'GOVT_AGENT') {
      router.replace('/dashboard')
      return
    }

    fetchStats()
  }, [user, router, days])

  const fetchStats = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.replace('/auth/signin')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gov/stats?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.status === 401) {
        router.replace('/auth/signin')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch statistics')
      }

      const data = await response.json()
      setStats(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePDFReport = async () => {
    if (!stats) return

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.replace('/auth/signin')
        return
      }

      // Call backend PDF generation endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gov/stats/download-pdf?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.status === 401) {
        router.replace('/auth/signin')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to generate PDF report')
      }

      // Download the PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${stats.authority.name.replace(/\s+/g, '_')}_report_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      alert(err.message || 'Failed to generate PDF report')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin" />
          Loading statistics...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">{error}</div>
      </div>
    )
  }

  if (!stats) return null

  // Prepare daily chart data
  const dailyData = Object.entries(stats.alerts.daily).sort((a, b) => a[0].localeCompare(b[0]))
  const maxDailyValue = Math.max(...dailyData.map(([_, data]) => data.total), 1)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-blue-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 rounded-lg p-3">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Performance Report</h1>
                <p className="text-sm text-gray-400">{stats.authority.name} - {stats.authority.department}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Period Selector */}
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
                <option value={90}>Last 90 days</option>
              </select>

              <button
                onClick={handleGeneratePDFReport}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                Download PDF Report
              </button>

              <button
                onClick={() => router.push('/gov-dashboard')}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Total Alerts */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Alerts</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.alerts.total}</p>
              </div>
              <div className="bg-blue-600/20 rounded-lg p-3">
                <AlertTriangle className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          {/* Active Alerts */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-red-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Alerts</p>
                <p className="text-3xl font-bold text-red-400 mt-1">{stats.alerts.active}</p>
              </div>
              <div className="bg-red-600/20 rounded-lg p-3">
                <TrendingUp className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </div>

          {/* Resolved Alerts */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Resolved</p>
                <p className="text-3xl font-bold text-green-400 mt-1">{stats.alerts.resolved}</p>
              </div>
              <div className="bg-green-600/20 rounded-lg p-3">
                <Shield className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          {/* Incident Reports */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Incident Reports</p>
                <p className="text-3xl font-bold text-purple-400 mt-1">{stats.incidents.total}</p>
              </div>
              <div className="bg-purple-600/20 rounded-lg p-3">
                <FileText className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Alert Types Pie Chart */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
            <h2 className="text-xl font-bold text-white mb-4">Alerts by Type</h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">SOS Alerts</span>
                  <span className="text-white font-semibold">{stats.alerts.by_type.sos}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${stats.alerts.total > 0 ? (stats.alerts.by_type.sos / stats.alerts.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Voice Trigger</span>
                  <span className="text-white font-semibold">{stats.alerts.by_type.voice_trigger}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{ width: `${stats.alerts.total > 0 ? (stats.alerts.by_type.voice_trigger / stats.alerts.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">AI Analysis</span>
                  <span className="text-white font-semibold">{stats.alerts.by_type.ai_analysis}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${stats.alerts.total > 0 ? (stats.alerts.by_type.ai_analysis / stats.alerts.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Incident Status */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
            <h2 className="text-xl font-bold text-white mb-4">Incident Status</h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Submitted</span>
                  <span className="text-white font-semibold">{stats.incidents.submitted}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{ width: `${stats.incidents.total > 0 ? (stats.incidents.submitted / stats.incidents.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Under Review</span>
                  <span className="text-white font-semibold">{stats.incidents.reviewing}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{ width: `${stats.incidents.total > 0 ? (stats.incidents.reviewing / stats.incidents.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Resolved</span>
                  <span className="text-white font-semibold">{stats.incidents.resolved}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${stats.incidents.total > 0 ? (stats.incidents.resolved / stats.incidents.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Timeline Chart */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
          <h2 className="text-xl font-bold text-white mb-4">Daily Alert Timeline</h2>
          <div className="space-y-2">
            {dailyData.map(([date, data]) => (
              <div key={date} className="flex items-center gap-4">
                <div className="text-sm text-gray-400 w-24">{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                <div className="flex-1 flex gap-1">
                  {/* Total bar */}
                  <div className="flex-1 bg-gray-700 rounded-full h-6 overflow-hidden relative">
                    <div
                      className="bg-blue-500 h-full transition-all duration-300"
                      style={{ width: `${(data.total / maxDailyValue) * 100}%` }}
                    ></div>
                    <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-semibold">
                      {data.total}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-400 w-32">
                  <span className="text-red-400">{data.active}A</span> / <span className="text-green-400">{data.resolved}R</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
