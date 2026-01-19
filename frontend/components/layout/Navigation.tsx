'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, MapPin, Phone, Users, Shield, Navigation as NavIcon, Settings, X, AlertTriangle } from 'lucide-react'

const views = [
  { name: 'Dashboard', path: '/dashboard', icon: Home },
  { name: 'Location', path: '/location', icon: MapPin },
  { name: 'Safety Call', path: '/safety-call', icon: Phone },
  { name: 'Contacts', path: '/contacts', icon: Users },
  { name: 'Report Incident', path: '/report-incident', icon: AlertTriangle },
  { name: 'Safe Locations', path: '/safe-locations', icon: NavIcon },
  { name: 'Safety', path: '/safety', icon: Shield },
  { name: 'Settings', path: '/settings', icon: Settings },
];

interface NavigationProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Navigation({ isOpen = false, onClose }: NavigationProps) {
  const pathname = usePathname()

  const closeMenu = () => {
    if (onClose) onClose()
  }

  return (
    <>

      {/* Mobile: Backdrop */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={closeMenu}
        />
      )}

      {/* Mobile: Slide-out Drawer */}
      <div
        className={`md:hidden fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-gray-800">Menu</h2>
            <button
              onClick={closeMenu}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <nav className="space-y-2">
            {views.map((view) => {
              const Icon = view.icon
              const isActive = pathname === view.path
              return (
                <Link
                  key={view.path}
                  href={view.path}
                  onClick={closeMenu}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{view.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Desktop: Horizontal Tabs */}
      <div className="hidden md:flex justify-center">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-1.5 sm:p-2">
          <div className="flex space-x-2">
            {views.map((view) => (
              <Link
                key={view.path}
                href={view.path}
                className={`px-4 py-3 rounded-xl font-medium whitespace-nowrap transition active:scale-95 text-sm lg:text-base ${
                  pathname === view.path
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {view.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
