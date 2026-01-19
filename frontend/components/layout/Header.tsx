'use client'

import { Shield, Bell, Sun, Search, User, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/store';
// Commented out - used only for logout functionality
// import { clearToken } from '@/lib/auth';
// import { setLoggingOut } from '@/lib/api';

interface HeaderProps {
  isMenuOpen?: boolean;
  onToggleMenu?: () => void;
}

export default function Header({ isMenuOpen = false, onToggleMenu }: HeaderProps) {
  const router = useRouter();
  const { user } = useUserStore();

  // Logout functionality - commented out (not implemented yet)
  /*
  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      await fetch(`${API_BASE_URL}/users/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
    }

    clearToken();
    clearUser();

    localStorage.removeItem('cached_user');
    localStorage.removeItem('cached_user_timestamp');
    localStorage.removeItem('cached_safety_score');
    localStorage.removeItem('cached_safety_score_timestamp');
    localStorage.removeItem('cached_safety_score_location');
    localStorage.removeItem('safeLocationHistory');
    localStorage.removeItem('protego-store');

    setLoggingOut(false);
    window.location.href = '/auth/signin';
  };
  */

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-[1920px] mx-auto px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left Section: Hamburger + Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile: Hamburger Menu */}
            <button
              onClick={onToggleMenu}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
              aria-label="Toggle menu"
            >
              <Menu size={22} className="text-gray-700" />
            </button>

            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-orange-500 p-2 sm:p-2.5 rounded-lg sm:rounded-xl flex-shrink-0">
                <Shield className="text-white" size={20} />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Protego</h1>
                <p className="text-xs sm:text-sm text-gray-500">Welcome, {user?.name || 'anaysumeet'}</p>
              </div>
            </div>
          </div>

          {/* Center: Search Bar - Hidden on mobile and tablet */}
          <div className="hidden lg:flex flex-1 max-w-2xl mx-4">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search incidents, units, locations..."
                className="w-full pl-11 pr-4 py-2.5 bg-gray-100 border-0 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Right: Action Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Notifications */}
            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0">
              <Bell size={19} className="text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Logout - Commented out (not implemented yet) */}
            {/* <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
              title="Logout"
            >
              <LogOut size={19} className="text-gray-600" />
            </button> */}

            {/* User Avatar */}
            <button
              className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center hover:bg-orange-200 transition flex-shrink-0"
              title={user?.name || 'User'}
            >
              <User size={18} className="text-orange-600" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
