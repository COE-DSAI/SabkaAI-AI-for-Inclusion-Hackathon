'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, MapPin, Clock, User, Phone, Mail, FileText, Image as ImageIcon, Eye, RefreshCw, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/lib/store'

interface Incident {
  id: number
  user_id: number
  reporter_name: string
  reporter_phone: string
  reporter_email: string
  incident_type: string
  status: string
  title: string
  description: string
  location_lat: number
  location_lng: number
  location_address: string | null
  media_files: string[]
  witness_name: string | null
  witness_phone: string | null
  is_anonymous: boolean
  authority_notes: string | null
  created_at: string
  updated_at: string | null
}

export default function GovIncidentsPage() {
  const router = useRouter()
  const user = useUserStore((state) => state.user)

  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    notes: ''
  })
  const [viewingMedia, setViewingMedia] = useState<string[] | null>(null)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)

  useEffect(() => {
    if (!user) {
      router.replace('/auth/signin')
      return
    }

    if (user.user_type !== 'GOVT_AGENT') {
      router.replace('/dashboard')
      return
    }

    fetchIncidents()
  }, [user, router])

  const fetchIncidents = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.replace('/auth/signin')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gov/incidents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.status === 401) {
        router.replace('/auth/signin')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch incidents')
      }

      const data = await response.json()
      setIncidents(data.incidents || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load incidents')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'REVIEWING':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'ASSIGNED':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'RESOLVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getIncidentTypeColor = (type: string) => {
    switch (type) {
      case 'THEFT':
        return 'text-orange-400'
      case 'ASSAULT':
        return 'text-red-400'
      case 'HARASSMENT':
        return 'text-pink-400'
      case 'ACCIDENT':
        return 'text-yellow-400'
      case 'MEDICAL_EMERGENCY':
        return 'text-red-500'
      case 'FIRE':
        return 'text-red-600'
      default:
        return 'text-gray-400'
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

  const handleUpdateStatus = async () => {
    if (!selectedIncident || !statusUpdate.status) return

    setUpdatingStatus(true)

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/incidents/reports/${selectedIncident.id}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: statusUpdate.status,
            authority_notes: statusUpdate.notes || null
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      alert('Incident status updated successfully')
      setSelectedIncident(null)
      setStatusUpdate({ status: '', notes: '' })
      fetchIncidents()
    } catch (error: any) {
      alert(error.message || 'Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading && incidents.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading incidents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Incident Reports</h1>
            <p className="text-sm text-gray-400">Reports assigned to your jurisdiction</p>
          </div>
          <button
            onClick={() => router.push('/gov-dashboard')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <p className="text-gray-400 text-xs">Total Incidents</p>
            <p className="text-2xl font-bold text-white mt-1">{incidents.length}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <p className="text-gray-400 text-xs">Submitted</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">
              {incidents.filter(i => i.status === 'SUBMITTED').length}
            </p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <p className="text-gray-400 text-xs">In Progress</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">
              {incidents.filter(i => ['REVIEWING', 'ASSIGNED'].includes(i.status)).length}
            </p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <p className="text-gray-400 text-xs">Resolved</p>
            <p className="text-2xl font-bold text-green-400 mt-1">
              {incidents.filter(i => i.status === 'RESOLVED').length}
            </p>
          </div>
        </div>

        {/* Incidents List */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Incident Reports</h2>
            <button
              onClick={fetchIncidents}
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

          {incidents.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No incident reports in your jurisdiction</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {incidents.map((incident) => (
                <div key={incident.id} className="px-6 py-4 hover:bg-gray-750 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Incident Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getStatusColor(incident.status)}`}>
                          {incident.status}
                        </span>
                        <span className={`text-sm font-semibold ${getIncidentTypeColor(incident.incident_type)}`}>
                          {incident.incident_type.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-semibold text-white mb-2">{incident.title}</h3>

                      {/* Reporter Info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-300">{incident.reporter_name}</span>
                          {incident.is_anonymous && (
                            <span className="text-xs text-orange-400">(Anonymous)</span>
                          )}
                        </div>
                        {!incident.is_anonymous && (
                          <>
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-300">{incident.reporter_phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-300">{incident.reporter_email}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">{incident.description}</p>

                      {/* Location & Time */}
                      <div className="flex flex-wrap items-center gap-4 text-sm mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <a
                            href={`https://www.google.com/maps?q=${incident.location_lat},${incident.location_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline"
                          >
                            {incident.location_address || `${incident.location_lat.toFixed(4)}, ${incident.location_lng.toFixed(4)}`}
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-400">{formatDateTime(incident.created_at)}</span>
                        </div>
                      </div>

                      {/* Media & Witness Info */}
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        {incident.media_files && incident.media_files.length > 0 && (
                          <button
                            onClick={() => {
                              setViewingMedia(incident.media_files)
                              setCurrentMediaIndex(0)
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                          >
                            <ImageIcon className="w-4 h-4" />
                            <span>View {incident.media_files.length} media file(s)</span>
                          </button>
                        )}
                        {incident.witness_name && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-400">Witness: {incident.witness_name}</span>
                          </div>
                        )}
                      </div>

                      {/* Authority Notes */}
                      {incident.authority_notes && (
                        <div className="mt-3 p-3 bg-gray-700 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-blue-400" />
                            <span className="text-xs font-semibold text-blue-400">Authority Notes:</span>
                          </div>
                          <p className="text-sm text-gray-300">{incident.authority_notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          setSelectedIncident(incident)
                          setStatusUpdate({ status: incident.status, notes: incident.authority_notes || '' })
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Update Status
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">Update Incident Status</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select
                    value={statusUpdate.status}
                    onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="SUBMITTED">Submitted</option>
                    <option value="REVIEWING">Reviewing</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Authority Notes</label>
                  <textarea
                    value={statusUpdate.notes}
                    onChange={(e) => setStatusUpdate({ ...statusUpdate, notes: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
                    placeholder="Add notes about this incident..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setSelectedIncident(null)
                      setStatusUpdate({ status: '', notes: '' })
                    }}
                    className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                    disabled={updatingStatus}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateStatus}
                    disabled={updatingStatus}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg"
                  >
                    {updatingStatus ? 'Updating...' : 'Update Status'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Viewer Modal */}
      {viewingMedia && viewingMedia.length > 0 && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
          <div className="relative max-w-5xl w-full">
            {/* Close Button */}
            <button
              onClick={() => {
                setViewingMedia(null)
                setCurrentMediaIndex(0)
              }}
              className="absolute top-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full z-10"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Image Counter */}
            <div className="absolute top-4 left-4 px-4 py-2 bg-gray-800/90 text-white rounded-lg z-10">
              <span className="text-sm font-medium">
                {currentMediaIndex + 1} / {viewingMedia.length}
              </span>
            </div>

            {/* Navigation Buttons */}
            {viewingMedia.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentMediaIndex((prev) => (prev > 0 ? prev - 1 : viewingMedia.length - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-full"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setCurrentMediaIndex((prev) => (prev < viewingMedia.length - 1 ? prev + 1 : 0))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-full"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Media Display */}
            <div className="bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: '60vh', maxHeight: '80vh' }}>
              <img
                src={viewingMedia[currentMediaIndex]}
                alt={`Incident evidence image ${currentMediaIndex + 1} of ${viewingMedia.length}`}
                className="max-w-full max-h-[80vh] object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg=='
                }}
              />
            </div>

            {/* Image URL */}
            <div className="mt-4 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm break-all">
              {viewingMedia[currentMediaIndex]}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
