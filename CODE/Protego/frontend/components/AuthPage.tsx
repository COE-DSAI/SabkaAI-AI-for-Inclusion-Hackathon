'use client'

import React from "react"

import { useState } from 'react';
import { Shield, Eye, EyeOff, Mail, Lock, User, Phone, Users, Plus, X, AlertCircle } from 'lucide-react';
import { userAPI, UserData } from '@/lib/api';

interface CountryCode {
  code: string;
  country: string;
  flag: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { code: '+1', country: 'US/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
];

interface AuthPageProps {
  onSuccess: (token: string, user: any) => void;
}

export default function AuthPage({ onSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [trustedContacts, setTrustedContacts] = useState<string[]>([]);
  const [newContactCode, setNewContactCode] = useState('+91');
  const [newContactNumber, setNewContactNumber] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const addTrustedContact = () => {
    if (!newContactNumber.trim()) return;

    const fullNumber = `${newContactCode}${newContactNumber}`;
    if (trustedContacts.includes(fullNumber)) {
      setError('Contact already added');
      return;
    }

    setTrustedContacts([...trustedContacts, fullNumber]);
    setNewContactNumber('');
    setError(null);
  };

  const removeTrustedContact = (contact: string) => {
    setTrustedContacts(trustedContacts.filter(c => c !== contact));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[AuthPage] handleSubmit called, mode:', mode);
    console.log('[AuthPage] Email:', email, 'Password length:', password.length);
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        // Sign up
        if (!name.trim()) {
          setError('Name is required');
          setLoading(false);
          return;
        }
        if (trustedContacts.length === 0) {
          setError('Please add at least one trusted contact');
          setLoading(false);
          return;
        }

        const userData: UserData = {
          email,
          password,
          name,
          phone: `${countryCode}${phoneNumber}`,
          trusted_contacts: trustedContacts,
        };

        const response = await userAPI.signup(userData);
        const token = response.data.access_token;
        const user = response.data.user;

        // Store in localStorage for API calls
        localStorage.setItem('access_token', token);

        // Store in cookie for middleware authentication
        document.cookie = `access_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict`;

        onSuccess(token, user);
      } else {
        // Sign in
        console.log('[AuthPage] Calling signin API...');
        const response = await userAPI.signin({ email, password });
        console.log('[AuthPage] Signin response:', response.data);
        const token = response.data.access_token;
        const user = response.data.user;
        console.log('[AuthPage] User from API:', user);
        console.log('[AuthPage] User type:', user.user_type);

        // Store in localStorage for API calls
        localStorage.setItem('access_token', token);

        // Store in cookie for middleware authentication
        document.cookie = `access_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict`;

        console.log('[AuthPage] Calling onSuccess with user:', user);
        onSuccess(token, user);
      }
    } catch (err: any) {
      console.error('[AuthPage] Error during submit:', err);
      const message = err.response?.data?.detail || err.message || 'An error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Orange Header */}
        <div className="bg-orange-500 px-8 py-12 text-center relative">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-400 rounded-2xl mb-4">
            <Shield className="text-white" size={32} strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold text-white">Protego</h1>
          <p className="text-orange-100 mt-2 text-sm">Your Personal Safety Companion</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`flex-1 py-4 font-semibold transition-colors relative ${
              mode === 'signin'
                ? 'text-orange-500'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Sign In
            {mode === 'signin' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500"></div>
            )}
          </button>
          <button
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`flex-1 py-4 font-semibold transition-colors relative ${
              mode === 'signup'
                ? 'text-orange-500'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Sign Up
            {mode === 'signup' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500"></div>
            )}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-start gap-3">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {mode === 'signup' && (
            <>
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-black mb-2 flex items-center gap-2">
                  <User size={16} className="text-black" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-200 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-black"
                  placeholder="John Doe"
                  required
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-black mb-2 flex items-center gap-2">
                  <Phone size={16} className="text-black" />
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="px-3 py-3 bg-gray-200 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm text-black"
                  >
                    {COUNTRY_CODES.map((cc) => (
                      <option key={cc.code} value={cc.code}>
                        {cc.flag} {cc.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 px-4 py-3 bg-gray-200 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-black"
                    placeholder="9876543210"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-black mb-2 flex items-center gap-2">
              <Mail size={16} className="text-black" />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-200 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-black"
              placeholder="you@example.com"
              required
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-black mb-2 flex items-center gap-2">
              <Lock size={16} className="text-black" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-200 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-12 text-black"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Trusted Contacts - Only for Sign Up */}
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-black mb-2 flex items-center gap-2">
                <Users size={16} className="text-black" />
                Trusted Emergency Contacts
              </label>

              {/* Add Contact Input */}
              <div className="flex gap-2 mb-3">
                <select
                  value={newContactCode}
                  onChange={(e) => setNewContactCode(e.target.value)}
                  className="px-3 py-2 bg-gray-200 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm text-black"
                >
                  {COUNTRY_CODES.map((cc) => (
                    <option key={cc.code} value={cc.code}>
                      {cc.flag} {cc.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={newContactNumber}
                  onChange={(e) => setNewContactNumber(e.target.value.replace(/\D/g, ''))}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTrustedContact())}
                  className="flex-1 px-4 py-2 bg-gray-200 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm text-black"
                  placeholder="Emergency contact"
                />
                <button
                  type="button"
                  onClick={addTrustedContact}
                  className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                >
                  <Plus size={18} />
                </button>
              </div>

              {/* Contact List */}
              <div className="space-y-2 max-h-24 overflow-y-auto">
                {trustedContacts.map((contact, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-gray-100 p-3 rounded-lg border border-gray-200"
                  >
                    <span className="text-sm font-medium text-black">{contact}</span>
                    <button
                      type="button"
                      onClick={() => removeTrustedContact(contact)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>

              {trustedContacts.length === 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Add at least one emergency contact
                </p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        {/* Footer */}
        <div className="px-8 py-4 text-center border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Protected with end-to-end encryption
          </p>
        </div>
      </div>
    </div>
  );
}
