'use client'

import { useState, useEffect } from 'react'
import { MapPin, Plus, Edit2, Trash2, Save, X, Shield, Navigation, Loader } from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import { safeLocationsAPI, type SafeLocation, type SafeLocationCreate } from '@/lib/api'
import { useLocation } from '@/hooks/useLocation'

export default function SafeLocationsPage() {
  const [locations, setLocations] = useState<SafeLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [customName, setCustomName] = useState<string>('')

  const { location, isTracking, startTracking, stopTracking } = useLocation()

  // Location name presets
  const locationPresets = ['Home', 'College', 'School', 'Work', 'Other']

  // Form state
  const [formData, setFormData] = useState<SafeLocationCreate>({
    name: '',
    latitude: 0,
    longitude: 0,
    radius_meters: 100,
    auto_start_walk: true,
    auto_stop_walk: true,
    notes: '',
  })

  useEffect(() => {
    loadLocations()
  }, [])

  const loadLocations = async () => {
    try {
      const response = await safeLocationsAPI.getAll()
      setLocations(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load safe locations')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    // Check if location is available
    if (!location) {
      setError('Please enable location access to add a safe location. You must be present at the location.')
      return
    }

    setIsAdding(true)
    setEditingId(null)
    setSelectedPreset('')
    setCustomName('')
    // Start tracking to ensure we have accurate location
    if (!isTracking) {
      startTracking()
    }
    setFormData({
      name: '',
      latitude: location.lat,
      longitude: location.lng,
      radius_meters: 100,
      auto_start_walk: true,
      auto_stop_walk: true,
      notes: '',
    })
  }

  const handleEdit = (location: SafeLocation) => {
    setIsAdding(false)
    setEditingId(location.id)
    setFormData({
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      radius_meters: location.radius_meters,
      auto_start_walk: location.auto_start_walk,
      auto_stop_walk: location.auto_stop_walk,
      notes: location.notes || '',
    })
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setSelectedPreset('')
    setCustomName('')
    // Stop tracking if we started it for adding
    if (isTracking && isAdding) {
      stopTracking()
    }
    setFormData({
      name: '',
      latitude: 0,
      longitude: 0,
      radius_meters: 100,
      auto_start_walk: true,
      auto_stop_walk: true,
      notes: '',
    })
  }

  const handleSave = async () => {
    try {
      // Determine final name
      const finalName = selectedPreset === 'Other' ? customName : (selectedPreset || customName)

      if (!finalName.trim()) {
        setError('Please select a location name')
        return
      }

      // Update form data with final name and current location
      const dataToSave = {
        ...formData,
        name: finalName.trim(),
        latitude: location?.lat || formData.latitude,
        longitude: location?.lng || formData.longitude,
      }

      if (isAdding) {
        // Security check: ensure we're using current location
        if (!location) {
          setError('Location not available. Please ensure GPS is enabled.')
          return
        }
        await safeLocationsAPI.create(dataToSave)
      } else if (editingId) {
        await safeLocationsAPI.update(editingId, dataToSave)
      }
      await loadLocations()
      handleCancel()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save location')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this safe location?')) return

    try {
      await safeLocationsAPI.delete(id)
      await loadLocations()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete location')
    }
  }

  // Update form data when location changes (for adding)
  useEffect(() => {
    if (isAdding && location) {
      setFormData(prev => ({
        ...prev,
        latitude: location.lat,
        longitude: location.lng
      }))
    }
  }, [location, isAdding])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
              Safe Locations
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Define safe zones for automatic walk mode control
            </p>
          </div>
          {!isAdding && !editingId && locations.length < 10 && (
            <button
              onClick={handleAdd}
              className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg flex items-center gap-2 transition-colors text-sm sm:text-base w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              Add Location
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-700 text-sm mt-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Add/Edit Form */}
        {(isAdding || editingId) && (
          <div className="bg-white border-2 border-blue-600 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {isAdding ? 'Add New' : 'Edit'} Safe Location
            </h2>

            {isAdding && (
              <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-800 text-sm font-medium">Security Notice</p>
                  <p className="text-blue-700 text-sm mt-1">
                    You can only add your current location as a safe location. Please ensure you are physically present at the location you want to add.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Location Name Presets */}
              {isAdding && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Location Name *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-2 mb-3">
                    {locationPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setSelectedPreset(preset)
                          if (preset !== 'Other') {
                            setFormData(prev => ({ ...prev, name: preset }))
                          }
                        }}
                        className={`px-3 sm:px-4 py-2 rounded-lg border-2 transition-all text-sm sm:text-base ${
                          selectedPreset === preset
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400 active:border-gray-500'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  {selectedPreset === 'Other' && (
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => {
                        setCustomName(e.target.value)
                        setFormData(prev => ({ ...prev, name: e.target.value }))
                      }}
                      placeholder="Enter custom location name"
                      className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder-gray-500"
                      maxLength={100}
                    />
                  )}
                </div>
              )}

              {/* Edit mode: show name input */}
              {editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Home, Work, College"
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder-gray-500"
                    maxLength={100}
                  />
                </div>
              )}

              {/* Current Location Display (for adding) */}
              {isAdding && location && (
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium text-gray-700">Your Current Location</span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="font-mono">
                      Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                    </div>
                    {location.accuracy && (
                      <div>
                        Accuracy: ±{location.accuracy.toFixed(0)}m
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Edit mode: show coordinates (read-only) */}
              {editingId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Latitude
                    </label>
                    <input
                      type="text"
                      value={formData.latitude.toFixed(6)}
                      disabled
                      className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Longitude
                    </label>
                    <input
                      type="text"
                      value={formData.longitude.toFixed(6)}
                      disabled
                      className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                </div>
              )}

              {/* Radius */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Radius (meters)
                </label>
                <input
                  type="number"
                  value={formData.radius_meters}
                  onChange={(e) => setFormData(prev => ({ ...prev, radius_meters: parseInt(e.target.value) || 100 }))}
                  min={10}
                  max={200}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900"
                />
                <p className="text-gray-600 text-xs mt-1">
                  Safe zone radius (10-200 meters). Default: 100m
                </p>
              </div>

              {/* Auto-Start/Stop Toggles */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.auto_start_walk}
                    onChange={(e) => setFormData(prev => ({ ...prev, auto_start_walk: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300 bg-white text-green-600"
                  />
                  <div>
                    <span className="text-gray-900 font-medium">Auto-start walk</span>
                    <p className="text-gray-600 text-sm">Start walk mode when you leave this location</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.auto_stop_walk}
                    onChange={(e) => setFormData(prev => ({ ...prev, auto_stop_walk: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300 bg-white text-green-600"
                  />
                  <div>
                    <span className="text-gray-900 font-medium">Auto-stop walk</span>
                    <p className="text-gray-600 text-sm">Stop walk mode when you enter this location (2 min delay)</p>
                  </div>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder-gray-500"
                  rows={2}
                  maxLength={500}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={
                    isAdding
                      ? (!selectedPreset || (selectedPreset === 'Other' && !customName.trim()) || !location)
                      : (!formData.name || !formData.latitude || !formData.longitude)
                  }
                  className="flex-1 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors text-sm sm:text-base"
                >
                  <Save className="w-4 h-4" />
                  {isAdding ? 'Add Safe Location' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 active:bg-gray-500 text-gray-900 font-semibold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors text-sm sm:text-base"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Locations List */}
        {locations.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No safe locations yet</h3>
            <p className="text-gray-600 mb-4">
              Add your first safe location to enable automatic walk mode
            </p>
            {!isAdding && (
              <button
                onClick={handleAdd}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg inline-flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Location
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {locations.map((location) => (
              <div
                key={location.id}
                className={`bg-white border-2 rounded-lg p-5 transition-colors ${
                  editingId === location.id ? 'border-blue-600' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <MapPin className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <h3 className="text-lg font-semibold text-gray-900">{location.name}</h3>
                      {!location.is_active && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm mb-3">
                      <div>
                        <span className="text-gray-600">Coordinates:</span>
                        <span className="text-gray-900 ml-2 font-mono">
                          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Radius:</span>
                        <span className="text-gray-900 ml-2">{location.radius_meters}m</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {location.auto_start_walk && (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-300">
                          Auto-start walk
                        </span>
                      )}
                      {location.auto_stop_walk && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-300">
                          Auto-stop walk
                        </span>
                      )}
                    </div>

                    {location.notes && (
                      <p className="text-gray-600 text-sm mt-2">{location.notes}</p>
                    )}

                    <a
                      href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 mt-2 inline-flex"
                    >
                      <Navigation className="w-4 h-4" />
                      View on Google Maps
                    </a>
                  </div>

                  <div className="flex gap-2 ml-0 sm:ml-4 mt-3 sm:mt-0">
                    <button
                      onClick={() => handleEdit(location)}
                      disabled={isAdding || editingId !== null}
                      className="p-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(location.id)}
                      disabled={isAdding || editingId !== null}
                      className="p-2 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {locations.length >= 10 && (
              <div className="text-center text-gray-600 text-sm py-4">
                Maximum of 10 safe locations reached
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
