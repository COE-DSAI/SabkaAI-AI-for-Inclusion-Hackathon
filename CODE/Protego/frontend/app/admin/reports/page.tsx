'use client'

import { useState, useEffect } from 'react'
import { Shield, BarChart3, Download, TrendingUp, AlertTriangle, FileText, RefreshCw, Users, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/lib/store'

interface AgentSummary {
  id: number
  name: string
  department: string
  user_name: string
  alerts: {
    total: number
    active: number
    resolved: number
    false_alarms: number
  }
  incidents: {
    total: number
    submitted: number
    reviewing: number
    resolved: number
  }
}

interface OverallStats {
  period: {
    start_date: string
    end_date: string
    days: number
  }
  summary: {
    total_agents: number
    total_alerts: number
    active_alerts: number
    resolved_alerts: number
    false_alarms: number
    by_type: {
      sos: number
      voice_trigger: number
      ai_analysis: number
    }
    total_incidents: number
    submitted_incidents: number
    reviewing_incidents: number
    resolved_incidents: number
  }
  agents: AgentSummary[]
}

interface AgentStats {
  period: {
    start_date: string
    end_date: string
    days: number
  }
  authority: {
    id: number
    name: string
    department: string
    user_email: string
    user_name: string
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
  alerts_list?: Array<{
    id: number
    user_name: string
    type: string
    status: string
    created_at: string
    location_lat: number
    location_lng: number
  }>
}

export default function AdminReportsPage() {
  const router = useRouter()
  const user = useUserStore((state) => state.user)

  const [overallStats, setOverallStats] = useState<OverallStats | null>(null)
  const [agentStats, setAgentStats] = useState<AgentStats | null>(null)
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)
  const [viewMode, setViewMode] = useState<'overall' | 'agent'>('overall')

  useEffect(() => {
    if (!user) {
      router.replace('/auth/signin')
      return
    }

    if (user.user_type !== 'SUPER_ADMIN') {
      router.replace('/dashboard')
      return
    }

    fetchOverallStats()
  }, [user, router, days])

  useEffect(() => {
    if (selectedAgentId) {
      fetchAgentStats(selectedAgentId)
    }
  }, [selectedAgentId, days])

  const fetchOverallStats = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.replace('/auth/signin')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gov/admin/overall-stats?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.status === 401 || response.status === 403) {
        router.replace('/auth/signin')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch statistics')
      }

      const data = await response.json()
      setOverallStats(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  const fetchAgentStats = async (agentId: number) => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.replace('/auth/signin')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gov/admin/agent-stats/${agentId}?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch agent statistics')
      }

      const data = await response.json()
      setAgentStats(data)
      setViewMode('agent')
    } catch (err: any) {
      setError(err.message || 'Failed to load agent statistics')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateOverallPDFReport = async () => {
    if (!overallStats) return

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.replace('/auth/signin')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gov/admin/overall-stats/download-pdf?days=${days}`, {
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

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `overall_system_report_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      alert(err.message || 'Failed to generate PDF report')
    }
  }

  const handleGenerateAgentPDFReport = async () => {
    if (!agentStats || !selectedAgentId) return

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.replace('/auth/signin')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gov/admin/agent-stats/${selectedAgentId}/download-pdf?days=${days}`, {
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

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${agentStats.authority.name.replace(/\s+/g, '_')}_report_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      alert(err.message || 'Failed to generate PDF report')
    }
  }

  if (loading && !overallStats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin" />
          Loading statistics...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">{error}</div>
      </div>
    )
  }

  if (!overallStats) return null

  // Prepare data for agent stats view
  const dailyData = agentStats ? Object.entries(agentStats.alerts.daily).sort((a, b) => a[0].localeCompare(b[0])) : []
  const maxDailyValue = agentStats ? Math.max(...dailyData.map(([_, data]) => data.total), 1) : 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-purple-600 rounded-lg p-3">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Government Admin Reports</h1>
                <p className="text-sm text-gray-400">System-wide Performance Analytics</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setViewMode('overall'); setSelectedAgentId(null); }}
                  className={`px-4 py-2 rounded-lg transition ${
                    viewMode === 'overall'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Overall
                </button>
                <button
                  onClick={() => setViewMode('agent')}
                  className={`px-4 py-2 rounded-lg transition ${
                    viewMode === 'agent'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  By Agent
                </button>
              </div>

              {/* Period Selector */}
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
                <option value={90}>Last 90 days</option>
              </select>

              <button
                onClick={handleGenerateOverallPDFReport}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>

              <button
                onClick={() => router.push('/admin')}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
              >
                Back
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'overall' ? (
          <>
            {/* Overall Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Active Agents</p>
                    <p className="text-3xl font-bold text-white mt-1">{overallStats.summary.total_agents}</p>
                  </div>
                  <div className="bg-purple-600/20 rounded-lg p-3">
                    <Users className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Alerts</p>
                    <p className="text-3xl font-bold text-white mt-1">{overallStats.summary.total_alerts}</p>
                  </div>
                  <div className="bg-blue-600/20 rounded-lg p-3">
                    <AlertTriangle className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-red-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Active Alerts</p>
                    <p className="text-3xl font-bold text-red-400 mt-1">{overallStats.summary.active_alerts}</p>
                  </div>
                  <div className="bg-red-600/20 rounded-lg p-3">
                    <TrendingUp className="w-6 h-6 text-red-400" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-green-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Resolved</p>
                    <p className="text-3xl font-bold text-green-400 mt-1">{overallStats.summary.resolved_alerts}</p>
                  </div>
                  <div className="bg-green-600/20 rounded-lg p-3">
                    <Shield className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Agent Performance Table */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
              <h2 className="text-xl font-bold text-white mb-4">Agent Performance</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-gray-400 py-3 px-4">Agent</th>
                      <th className="text-left text-gray-400 py-3 px-4">Department</th>
                      <th className="text-center text-gray-400 py-3 px-4">Total Alerts</th>
                      <th className="text-center text-gray-400 py-3 px-4">Active</th>
                      <th className="text-center text-gray-400 py-3 px-4">Resolved</th>
                      <th className="text-center text-gray-400 py-3 px-4">Incidents</th>
                      <th className="text-center text-gray-400 py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overallStats.agents.map((agent) => (
                      <tr key={agent.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition">
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-white font-medium">{agent.name}</p>
                            <p className="text-gray-400 text-sm">{agent.user_name}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-300">{agent.department}</td>
                        <td className="py-3 px-4 text-center text-white font-semibold">{agent.alerts.total}</td>
                        <td className="py-3 px-4 text-center text-red-400">{agent.alerts.active}</td>
                        <td className="py-3 px-4 text-center text-green-400">{agent.alerts.resolved}</td>
                        <td className="py-3 px-4 text-center text-purple-400">{agent.incidents.total}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedAgentId(agent.id)}
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                          >
                            View Report
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : agentStats ? (
          <>
            {/* Agent Selection */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 mb-6 border border-purple-500/20">
              <div className="flex items-center gap-4">
                <label className="text-white font-medium">Select Agent:</label>
                <select
                  value={selectedAgentId || ''}
                  onChange={(e) => setSelectedAgentId(Number(e.target.value))}
                  className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Choose an agent...</option>
                  {overallStats.agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} - {agent.department}
                    </option>
                  ))}
                </select>
                {agentStats && (
                  <button
                    onClick={handleGenerateAgentPDFReport}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                )}
              </div>
            </div>

            {/* Agent Stats - Same as gov-dashboard report view */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Alerts</p>
                    <p className="text-3xl font-bold text-white mt-1">{agentStats.alerts.total}</p>
                  </div>
                  <div className="bg-blue-600/20 rounded-lg p-3">
                    <AlertTriangle className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-red-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Active Alerts</p>
                    <p className="text-3xl font-bold text-red-400 mt-1">{agentStats.alerts.active}</p>
                  </div>
                  <div className="bg-red-600/20 rounded-lg p-3">
                    <TrendingUp className="w-6 h-6 text-red-400" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-green-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Resolved</p>
                    <p className="text-3xl font-bold text-green-400 mt-1">{agentStats.alerts.resolved}</p>
                  </div>
                  <div className="bg-green-600/20 rounded-lg p-3">
                    <Shield className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Incidents</p>
                    <p className="text-3xl font-bold text-purple-400 mt-1">{agentStats.incidents.total}</p>
                  </div>
                  <div className="bg-purple-600/20 rounded-lg p-3">
                    <FileText className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Timeline Chart */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
              <h2 className="text-xl font-bold text-white mb-4">Daily Alert Timeline - {agentStats.authority.name}</h2>
              <div className="space-y-2">
                {dailyData.map(([date, data]) => (
                  <div key={date} className="flex items-center gap-4">
                    <div className="text-sm text-gray-400 w-24">{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    <div className="flex-1 flex gap-1">
                      <div className="flex-1 bg-gray-700 rounded-full h-6 overflow-hidden relative">
                        <div
                          className="bg-purple-500 h-full transition-all duration-300"
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
          </>
        ) : (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-12 border border-purple-500/20 text-center">
            <p className="text-gray-400 text-lg">Select an agent to view detailed report</p>
          </div>
        )}
      </div>
    </div>
  )
}
