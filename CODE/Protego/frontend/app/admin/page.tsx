'use client'

import { useState, useEffect } from 'react'
import { Shield, Plus, Edit2, Trash2, MapPin, Phone, Mail, LogOut, RefreshCw, Building2, User, Lock, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/lib/store'

interface Authority {
  id: number
  user_id: number
  user_email: string
  user_name: string
  name: string
  latitude: number
  longitude: number
  radius_meters: number
  phone: string
  email: string | null
  department: string | null
  is_active: boolean
  notes: string | null
  created_at: string
}

export default function AdminPage() {
  const router = useRouter()
  const user = useUserStore((state) => state.user)
  const clearUser = useUserStore((state) => state.clearUser)

  const [authorities, setAuthorities] = useState<Authority[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    authority_name: '',
    latitude: '',
    longitude: '',
    radius_meters: '',
    phone: '',
    department: '',
    notes: ''
  })

  useEffect(() => {
    // Check if user is super admin
    if (!user) {
      router.replace('/auth/signin')
      return
    }

    if (user.user_type !== 'SUPER_ADMIN') {
      router.replace('/dashboard')
      return
    }

    fetchAuthorities()
  }, [user, router])

  const fetchAuthorities = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.replace('/auth/signin')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gov/admin/authorities`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.status === 401 || response.status === 403) {
        router.replace('/auth/signin')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch authorities')
      }

      const data = await response.json()
      setAuthorities(data.authorities || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load authorities')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAuthority = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gov/admin/authorities`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          authority_name: formData.authority_name,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          radius_meters: parseInt(formData.radius_meters),
          phone: formData.phone,
          department: formData.department || null,
          notes: formData.notes || null
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to create authority')
      }

      // Reset form and close modal
      setFormData({
        name: '',
        email: '',
        password: '',
        authority_name: '',
        latitude: '',
        longitude: '',
        radius_meters: '',
        phone: '',
        department: '',
        notes: ''
      })
      setShowCreateModal(false)

      // Refresh list
      await fetchAuthorities()
    } catch (err: any) {
      setError(err.message || 'Failed to create authority')
    }
  }

  const handleDeleteAuthority = async (authorityId: number) => {
    if (!confirm('Are you sure you want to delete this authority? This will also delete the associated user account.')) {
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gov/admin/authorities/${authorityId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete authority')
      }

      await fetchAuthorities()
    } catch (err: any) {
      setError(err.message || 'Failed to delete authority')
    }
  }

  const handleLogout = () => {
    clearUser()
    localStorage.removeItem('access_token')
    document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    router.replace('/auth/signin')
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 rounded-lg p-2">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Govt Admin Portal</h1>
                <p className="text-sm text-gray-400">Government Authority Management</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/reports')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">View Reports</span>
              </button>
              <button
                onClick={() => router.push('/admin/incidents')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
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
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => router.push('/admin/incidents')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-lg font-medium shadow-md transition"
          >
            <Shield className="w-5 h-5" />
            View All Incident Reports
          </button>
        </div>

        {/* Header with Create Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Government Authorities</h2>
            <p className="text-gray-400 mt-1">Manage government agent accounts and jurisdictions</p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
          >
            <Plus className="w-5 h-5" />
            Create Authority
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-800 rounded-lg p-4">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Authorities</p>
                <p className="text-3xl font-bold text-white mt-1">{authorities.length}</p>
              </div>
              <Building2 className="w-10 h-10 text-purple-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active</p>
                <p className="text-3xl font-bold text-green-400 mt-1">
                  {authorities.filter(a => a.is_active).length}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Inactive</p>
                <p className="text-3xl font-bold text-gray-400 mt-1">
                  {authorities.filter(a => !a.is_active).length}
                </p>
              </div>
              <Building2 className="w-10 h-10 text-gray-600" />
            </div>
          </div>
        </div>

        {/* Authorities List */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Authorities</h3>
            <button
              onClick={fetchAuthorities}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loading && authorities.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <RefreshCw className="w-12 h-12 text-gray-600 animate-spin mx-auto mb-3" />
              <p className="text-gray-400">Loading authorities...</p>
            </div>
          ) : authorities.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No authorities created yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {authorities.map((authority) => (
                <div key={authority.id} className="px-6 py-4 hover:bg-gray-750 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="text-lg font-semibold text-white">{authority.name}</h4>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          authority.is_active
                            ? 'bg-green-900 text-green-200'
                            : 'bg-gray-700 text-gray-300'
                        }`}>
                          {authority.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {authority.department && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-900 text-blue-200">
                            {authority.department}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-300">{authority.user_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-300">{authority.user_email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-300">{authority.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-300">
                            {authority.latitude.toFixed(4)}, {authority.longitude.toFixed(4)} ({(authority.radius_meters / 1000).toFixed(1)}km)
                          </span>
                        </div>
                      </div>

                      {authority.notes && (
                        <p className="text-sm text-gray-400 italic">{authority.notes}</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteAuthority(authority.id)}
                        className="p-2 bg-red-900 hover:bg-red-800 text-red-200 rounded-lg transition"
                        title="Delete Authority"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-800">
              <h3 className="text-xl font-bold text-white">Create New Authority</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateAuthority} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    User Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email (Login)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Lock className="w-4 h-4 inline mr-1" />
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                    minLength={8}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Building2 className="w-4 h-4 inline mr-1" />
                    Authority Name
                  </label>
                  <input
                    type="text"
                    value={formData.authority_name}
                    onChange={(e) => setFormData({ ...formData, authority_name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Mumbai Police West Division"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                    placeholder="+919876543210"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                    placeholder="Police, Fire, Medical, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                    placeholder="19.0760"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                    placeholder="72.8777"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Radius (meters)
                  </label>
                  <input
                    type="number"
                    value={formData.radius_meters}
                    onChange={(e) => setFormData({ ...formData, radius_meters: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                    placeholder="5000"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">Jurisdiction radius in meters (e.g., 5000 = 5km)</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                    rows={3}
                    placeholder="Additional notes about this authority..."
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition"
                >
                  Create Authority
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
