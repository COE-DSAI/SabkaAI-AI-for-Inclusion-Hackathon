'use client'

import { useEffect, useState } from 'react';
import { MapPin, Maximize2, Layers, Navigation as NavIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// Dynamically import the map to avoid SSR issues
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <MapPin size={36} className="text-gray-400" />
        </div>
        <p className="text-gray-700 font-semibold text-lg">Loading Map...</p>
      </div>
    </div>
  )
});

interface LiveTrackingMapProps {
  userLocation?: { lat: number; lng: number } | null;
}

export default function LiveTrackingMap({ userLocation }: LiveTrackingMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h3 className="font-bold text-lg text-gray-900">Live Tracking Map</h3>
          <p className="text-sm text-gray-500 mt-0.5">Real-time location tracking • OpenStreetMap</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2.5 hover:bg-gray-100 rounded-lg transition" title="Layers">
            <Layers size={18} className="text-gray-600" />
          </button>
          <button className="p-2.5 hover:bg-gray-100 rounded-lg transition" title="Fullscreen">
            <Maximize2 size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Map Area */}
      <div className="relative bg-gray-50 rounded-b-2xl overflow-hidden" style={{ height: '450px' }}>
        {mounted && <MapComponent userLocation={userLocation} />}
      </div>
    </div>
  );
}
