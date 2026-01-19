'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Upload, MapPin, AlertTriangle, FileVideo, X, Send, Loader2 } from 'lucide-react'
import { useUserStore } from '@/lib/store'
import DashboardLayout from '@/components/DashboardLayout'

const INCIDENT_TYPES = [
  { value: 'THEFT', label: 'Theft' },
  { value: 'ASSAULT', label: 'Assault' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'ACCIDENT', label: 'Accident' },
  { value: 'SUSPICIOUS_ACTIVITY', label: 'Suspicious Activity' },
  { value: 'VANDALISM', label: 'Vandalism' },
  { value: 'MEDICAL_EMERGENCY', label: 'Medical Emergency' },
  { value: 'FIRE', label: 'Fire' },
  { value: 'OTHER', label: 'Other' }
]

export default function ReportIncidentPage() {
  const router = useRouter()
  const user = useUserStore((state) => state.user)

  const [formData, setFormData] = useState({
    incident_type: '',
    title: '',
    description: '',
    location_address: '',
    witness_name: '',
    witness_phone: '',
    is_anonymous: false
  })

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const [cameraMode, setCameraMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) {
      router.replace('/auth/signin')
    }
  }, [user, router])

  useEffect(() => {
    // Get current location on mount
    getCurrentLocation()

    return () => {
      // Cleanup camera stream
      stopCamera()
    }
  }, [])

  const getCurrentLocation = () => {
    setLocationLoading(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
          setLocationLoading(false)
        },
        (error) => {
          console.error('Error getting location:', error)
          setLocationLoading(false)
        }
      )
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      })

      streamRef.current = stream
      setCameraMode(true)

      // Wait for next tick to ensure cameraMode state update has rendered the video element
      setTimeout(() => {
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(err => {
            console.error('Error playing video:', err)
          })
        }
      }, 100)
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Failed to access camera. Please check permissions.')
      setCameraMode(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setCameraMode(false)
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const context = canvas.getContext('2d')

      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height)

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
            const preview = URL.createObjectURL(blob)

            setMediaFiles([...mediaFiles, file])
            setMediaPreviews([...mediaPreviews, preview])
            stopCamera()
          }
        }, 'image/jpeg', 0.9)
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    files.forEach(file => {
      const preview = URL.createObjectURL(file)
      setMediaFiles([...mediaFiles, file])
      setMediaPreviews([...mediaPreviews, preview])
    })
  }

  const removeMedia = (index: number) => {
    const newFiles = mediaFiles.filter((_, i) => i !== index)
    const newPreviews = mediaPreviews.filter((_, i) => i !== index)
    setMediaFiles(newFiles)
    setMediaPreviews(newPreviews)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!location) {
      alert('Please wait for location to be detected or enable location services.')
      return
    }

    if (!formData.incident_type || !formData.title || !formData.description) {
      alert('Please fill in all required fields.')
      return
    }

    setSubmitting(true)

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.replace('/auth/signin')
        return
      }

      // Create incident report
      const reportData = {
        ...formData,
        location_lat: location.lat,
        location_lng: location.lng
      }

      const reportResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/incidents/reports`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportData)
      })

      if (!reportResponse.ok) {
        throw new Error('Failed to create incident report')
      }

      const reportResult = await reportResponse.json()
      const incidentId = reportResult.id

      // Upload media files if any
      const failedUploads: string[] = []
      if (mediaFiles.length > 0) {
        for (const file of mediaFiles) {
          const formData = new FormData()
          formData.append('file', file)

          const mediaResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/incidents/reports/${incidentId}/media`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          })

          if (!mediaResponse.ok) {
            failedUploads.push(file.name)
          }
        }
      }

      if (failedUploads.length > 0) {
        alert(`Incident report submitted, but ${failedUploads.length} media file(s) failed to upload: ${failedUploads.join(', ')}`)
      } else {
        alert('Incident report submitted successfully! Authorities have been notified.')
      }
      router.push('/dashboard')

    } catch (error: any) {
      console.error('Error submitting incident:', error)
      alert(error.message || 'Failed to submit incident report')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Report an Incident</h1>
                <p className="text-sm text-gray-600">Help authorities respond to incidents in your area</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Incident Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Incident Type <span className="text-red-600">*</span>
              </label>
              <select
                value={formData.incident_type}
                onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              >
                <option value="">Select incident type</option>
                {INCIDENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief summary of the incident"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                required
                minLength={3}
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-600">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of what happened..."
                rows={5}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                required
                minLength={10}
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location <span className="text-red-600">*</span>
              </label>
              <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-300 rounded-lg">
                <MapPin className="w-5 h-5 text-red-600" />
                {locationLoading ? (
                  <span className="text-gray-600">Detecting location...</span>
                ) : location ? (
                  <span className="text-gray-700">
                    {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="text-red-600 hover:text-red-700"
                  >
                    Click to get current location
                  </button>
                )}
              </div>
              <input
                type="text"
                value={formData.location_address}
                onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                placeholder="Address or landmark (optional)"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 mt-2"
              />
            </div>

            {/* Media Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos/Videos (optional)
              </label>

              {/* Camera Mode */}
              {cameraMode ? (
                <div className="space-y-3">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg bg-black"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                      <Camera className="w-5 h-5" />
                      Capture Photo
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex-1 px-4 py-3 bg-white hover:bg-gray-50 border border-gray-300 text-gray-900 rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    Take Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 px-4 py-3 bg-white hover:bg-gray-50 border border-gray-300 text-gray-900 rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Upload File
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Media Previews */}
              {mediaPreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                  {mediaPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      {mediaFiles[index].type.startsWith('video/') ? (
                        <div className="relative">
                          <video src={preview} className="w-full h-32 object-cover rounded-lg" />
                          <FileVideo className="absolute top-2 left-2 w-6 h-6 text-white" />
                        </div>
                      ) : (
                        <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(index)}
                        className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 rounded-full opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Witness Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Witness Name (optional)
                </label>
                <input
                  type="text"
                  value={formData.witness_name}
                  onChange={(e) => setFormData({ ...formData, witness_name: e.target.value })}
                  placeholder="Name of witness"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Witness Phone (optional)
                </label>
                <input
                  type="tel"
                  value={formData.witness_phone}
                  onChange={(e) => setFormData({ ...formData, witness_phone: e.target.value })}
                  placeholder="+1234567890"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Anonymous Reporting */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-300 rounded-lg">
              <input
                type="checkbox"
                id="anonymous"
                checked={formData.is_anonymous}
                onChange={(e) => setFormData({ ...formData, is_anonymous: e.target.checked })}
                className="w-4 h-4 text-red-600 bg-white border-gray-300 rounded focus:ring-red-500"
              />
              <label htmlFor="anonymous" className="text-sm text-gray-700">
                Report anonymously (your identity will be hidden from authorities)
              </label>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !location}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Report
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}
