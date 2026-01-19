'use client'

import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Shield, Home, MapPin } from 'lucide-react';
import Link from 'next/link';

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icon for user location
const userLocationIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="#3b82f6" opacity="0.3"/>
      <circle cx="20" cy="20" r="10" fill="#3b82f6"/>
      <circle cx="20" cy="20" r="4" fill="white"/>
    </svg>
  `),
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

// Custom marker icon for jurisdiction
const jurisdictionIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="35" height="35" viewBox="0 0 35 35" xmlns="http://www.w3.org/2000/svg">
      <circle cx="17.5" cy="17.5" r="16" fill="#dc2626" opacity="0.8"/>
      <path d="M17.5 8L20 15H27L21 20L23 27L17.5 22L12 27L14 20L8 15H15L17.5 8Z" fill="white"/>
    </svg>
  `),
  iconSize: [35, 35],
  iconAnchor: [17.5, 17.5],
  popupAnchor: [0, -17.5],
});

// Custom marker icon for safe location
const safeLocationIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="35" height="35" viewBox="0 0 35 35" xmlns="http://www.w3.org/2000/svg">
      <circle cx="17.5" cy="17.5" r="16" fill="#16a34a" opacity="0.8"/>
      <path d="M12 14L16 18L23 11M17.5 6C13 6 9 9 9 13.5C9 19.5 17.5 29 17.5 29S26 19.5 26 13.5C26 9 22 6 17.5 6Z" fill="white" stroke="white" stroke-width="1"/>
    </svg>
  `),
  iconSize: [35, 35],
  iconAnchor: [17.5, 35],
  popupAnchor: [0, -35],
});

interface Jurisdiction {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  phone: string;
  email: string | null;
  department: string | null;
  distance_km: number;
  is_within_jurisdiction: boolean;
}

interface SafeLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  auto_start_walk: boolean;
  auto_stop_walk: boolean;
  notes: string | null;
  distance_km: number;
  is_inside: boolean;
}

interface MapComponentProps {
  userLocation?: { lat: number; lng: number } | null;
}

// Component to recenter map when location changes
function RecenterMap({ location }: { location: { lat: number; lng: number } }) {
  const map = useMap();

  useEffect(() => {
    if (location) {
      map.setView([location.lat, location.lng], map.getZoom());
    }
  }, [location, map]);

  return null;
}

export default function MapComponent({ userLocation }: MapComponentProps) {
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [safeLocations, setSafeLocations] = useState<SafeLocation[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch nearby jurisdictions and safe locations
  useEffect(() => {
    if (!userLocation) return;

    const fetchMapData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/gov/nearby-jurisdictions?latitude=${userLocation.lat}&longitude=${userLocation.lng}&radius_km=20`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setJurisdictions(data.jurisdictions || []);
          setSafeLocations(data.safe_locations || []);
        }
      } catch (error) {
        console.error('Error fetching map data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMapData();
  }, [userLocation]);

  // Don't render map until we have user location
  if (!userLocation) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-gray-700 font-semibold text-lg">Getting your location...</p>
          <p className="text-gray-500 text-sm mt-2">Please enable location access</p>
        </div>
      </div>
    );
  }

  const center: [number, number] = [userLocation.lat, userLocation.lng];

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={center}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
        className="z-0"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User Location Marker */}
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
          <Popup>
            <div className="text-center p-2">
              <p className="font-semibold text-gray-900 text-sm">Your Location</p>
              <p className="text-xs text-gray-600 mt-1">
                {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Jurisdiction Markers and Circles */}
        {jurisdictions.map((jurisdiction) => (
          <div key={`jurisdiction-${jurisdiction.id}`}>
            <Circle
              center={[jurisdiction.latitude, jurisdiction.longitude]}
              radius={jurisdiction.radius_meters}
              pathOptions={{
                color: '#dc2626',
                fillColor: '#dc2626',
                fillOpacity: 0.1,
                weight: 2,
                dashArray: '5, 5'
              }}
            />
            <Marker
              position={[jurisdiction.latitude, jurisdiction.longitude]}
              icon={jurisdictionIcon}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-red-600" />
                    <p className="font-bold text-gray-900 text-sm">{jurisdiction.name}</p>
                  </div>
                  {jurisdiction.department && (
                    <p className="text-xs text-gray-600 mb-1">
                      <span className="font-semibold">Department:</span> {jurisdiction.department}
                    </p>
                  )}
                  <p className="text-xs text-gray-600 mb-1">
                    <span className="font-semibold">Phone:</span> {jurisdiction.phone}
                  </p>
                  {jurisdiction.email && (
                    <p className="text-xs text-gray-600 mb-1">
                      <span className="font-semibold">Email:</span> {jurisdiction.email}
                    </p>
                  )}
                  <p className="text-xs text-gray-600 mb-1">
                    <span className="font-semibold">Coverage:</span> {(jurisdiction.radius_meters / 1000).toFixed(1)} km radius
                  </p>
                  <p className="text-xs text-gray-600 mb-2">
                    <span className="font-semibold">Distance:</span> {jurisdiction.distance_km} km away
                  </p>
                  {jurisdiction.is_within_jurisdiction && (
                    <div className="mb-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      ✓ You are within this jurisdiction
                    </div>
                  )}
                  <Link
                    href={`/map/jurisdiction/${jurisdiction.id}`}
                    className="block text-center px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded mt-2"
                  >
                    View Details
                  </Link>
                </div>
              </Popup>
            </Marker>
          </div>
        ))}

        {/* Safe Location Markers and Circles */}
        {safeLocations.map((location) => (
          <div key={`safe-${location.id}`}>
            <Circle
              center={[location.latitude, location.longitude]}
              radius={location.radius_meters}
              pathOptions={{
                color: '#16a34a',
                fillColor: '#16a34a',
                fillOpacity: 0.15,
                weight: 2
              }}
            />
            <Marker
              position={[location.latitude, location.longitude]}
              icon={safeLocationIcon}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="w-4 h-4 text-green-600" />
                    <p className="font-bold text-gray-900 text-sm">{location.name}</p>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">
                    <span className="font-semibold">Radius:</span> {location.radius_meters}m
                  </p>
                  <p className="text-xs text-gray-600 mb-1">
                    <span className="font-semibold">Distance:</span> {location.distance_km} km away
                  </p>
                  {location.notes && (
                    <p className="text-xs text-gray-600 mb-1">
                      <span className="font-semibold">Notes:</span> {location.notes}
                    </p>
                  )}
                  <div className="text-xs text-gray-600 mb-2">
                    {location.auto_start_walk && <p>• Auto-start walk on exit</p>}
                    {location.auto_stop_walk && <p>• Auto-stop walk on entry</p>}
                  </div>
                  {location.is_inside && (
                    <div className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      ✓ You are inside this safe location
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          </div>
        ))}

        <RecenterMap location={userLocation} />
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-[1000] max-w-[200px]">
        <p className="text-xs font-bold text-gray-900 mb-2">Map Legend</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-xs text-gray-700">Your Location</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600"></div>
            <span className="text-xs text-gray-700">Jurisdiction ({jurisdictions.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-600"></div>
            <span className="text-xs text-gray-700">Safe Locations ({safeLocations.length})</span>
          </div>
        </div>
        {loading && (
          <p className="text-xs text-gray-500 mt-2 italic">Loading...</p>
        )}
      </div>
    </div>
  );
}
