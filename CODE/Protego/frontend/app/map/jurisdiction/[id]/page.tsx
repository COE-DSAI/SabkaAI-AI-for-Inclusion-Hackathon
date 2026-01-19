'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Shield, MapPin, Phone, Mail, ArrowLeft, Navigation, Building2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'

interface JurisdictionDetail {
  id: number
  name: string
  latitude: number
  longitude: number
  radius_meters: number
  phone: string
  email: string | null
  department: string | null
  notes: string | null
  distance_km: number
  is_within_jurisdiction: boolean
  created_at: string
}

export default function JurisdictionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const jurisdictionId = params.id as string

  const [jurisdiction, setJurisdiction] = useState<JurisdictionDetail | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get user location first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setUserLocation(loc)
          fetchJurisdiction(loc)
        },
        (error) => {
          console.error('Error getting location:', error)
          setError('Unable to get your location')
          setLoading(false)
        }
      )
    } else {
      setError('Geolocation is not supported')
      setLoading(false)
    }
  }, [jurisdictionId])

  const fetchJurisdiction = async (loc: { lat: number; lng: number }) => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.replace('/auth/signin')
        return
      }

      // Fetch nearby jurisdictions and find the one we need
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/gov/nearby-jurisdictions?latitude=${loc.lat}&longitude=${loc.lng}&radius_km=50`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch jurisdiction')
      }

      const data = await response.json()
      const found = data.jurisdictions.find((j: any) => j.id === parseInt(jurisdictionId))

      if (!found) {
        setError('Jurisdiction not found')
      } else {
        setJurisdiction(found)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load jurisdiction')
    } finally {
      setLoading(false)
    }
  }

  const openInMaps = () => {
    if (!jurisdiction) return
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${userLocation?.lat},${userLocation?.lng}&destination=${jurisdiction.latitude},${jurisdiction.longitude}`,
      '_blank'
    )
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading jurisdiction details...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !jurisdiction) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
            <p className="text-red-800 font-semibold mb-2">Error Loading Jurisdiction</p>
            <p className="text-red-600 text-sm mb-4">{error || 'Jurisdiction not found'}</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-xl">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Government Jurisdiction</h1>
              <p className="text-sm text-gray-600">Detailed information about this jurisdiction</p>
            </div>
          </div>
        </div>

        {/* Main Info Card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
            <h2 className="text-xl font-bold text-gray-900">{jurisdiction.name}</h2>
            {jurisdiction.department && (
              <div className="flex items-center gap-2 mt-2">
                <Building2 className="w-4 h-4 text-gray-600" />
                <p className="text-sm text-gray-700">{jurisdiction.department}</p>
              </div>
            )}
          </div>

          <div className="p-6 space-y-4">
            {/* Status Badge */}
            {jurisdiction.is_within_jurisdiction && (
              <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-sm font-semibold text-green-800">
                    You are currently within this jurisdiction's coverage area
                  </p>
                </div>
              </div>
            )}

            {/* Contact Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Contact Information</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-xs text-gray-600">Phone Number</p>
                    <a href={`tel:${jurisdiction.phone}`} className="text-sm font-medium text-gray-900 hover:text-orange-600">
                      {jurisdiction.phone}
                    </a>
                  </div>
                </div>
                {jurisdiction.email && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-xs text-gray-600">Email Address</p>
                      <a href={`mailto:${jurisdiction.email}`} className="text-sm font-medium text-gray-900 hover:text-orange-600">
                        {jurisdiction.email}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Location Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Location Information</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-1">Coordinates</p>
                    <p className="text-sm font-medium text-gray-900">
                      {jurisdiction.latitude.toFixed(6)}, {jurisdiction.longitude.toFixed(6)}
                    </p>
                    <a
                      href={`https://www.google.com/maps?q=${jurisdiction.latitude},${jurisdiction.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-orange-600 hover:text-orange-700 underline mt-1 inline-block"
                    >
                      View on Google Maps
                    </a>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">Coverage Radius</p>
                    <p className="text-sm font-medium text-gray-900">{(jurisdiction.radius_meters / 1000).toFixed(1)} km</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">Distance from You</p>
                    <p className="text-sm font-medium text-gray-900">{jurisdiction.distance_km} km</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {jurisdiction.notes && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Additional Notes</h3>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{jurisdiction.notes}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={openInMaps}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium"
              >
                <Navigation className="w-5 h-5" />
                Get Directions
              </button>
              <a
                href={`tel:${jurisdiction.phone}`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
              >
                <Phone className="w-5 h-5" />
                Call Now
              </a>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">Emergency Services</p>
              <p className="text-xs text-blue-700">
                This jurisdiction covers a {(jurisdiction.radius_meters / 1000).toFixed(1)} km radius area.
                In case of emergency, authorities from this jurisdiction will be notified if you're within their coverage area.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
