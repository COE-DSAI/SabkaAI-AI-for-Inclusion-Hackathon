'use client'

import { useState, useEffect } from 'react'
import { Shield, Lock, AlertTriangle, Check, X, Eye, EyeOff, Info } from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import { duressPasswordAPI, type DuressPasswordStatus } from '@/lib/api'

export default function SettingsPage() {
  const [duressStatus, setDuressStatus] = useState<DuressPasswordStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state for setting duress password
  const [isSettingDuress, setIsSettingDuress] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [duressPassword, setDuressPassword] = useState('')
  const [confirmDuressPassword, setConfirmDuressPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showDuressPassword, setShowDuressPassword] = useState(false)

  // Form state for removing duress password
  const [isRemoving, setIsRemoving] = useState(false)
  const [removePassword, setRemovePassword] = useState('')

  useEffect(() => {
    loadDuressStatus()
  }, [])

  const loadDuressStatus = async () => {
    try {
      const response = await duressPasswordAPI.checkStatus()
      setDuressStatus(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load duress password status')
    } finally {
      setLoading(false)
    }
  }

  const handleSetDuressPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // Validation
    if (duressPassword !== confirmDuressPassword) {
      setError('Duress passwords do not match')
      return
    }

    if (duressPassword.length < 6) {
      setError('Duress password must be at least 6 characters')
      return
    }

    if (duressPassword === currentPassword) {
      setError('Duress password must be different from your main password')
      return
    }

    try {
      await duressPasswordAPI.set({
        current_password: currentPassword,
        duress_password: duressPassword,
      })
      setSuccess('Duress password set successfully')
      setIsSettingDuress(false)
      setCurrentPassword('')
      setDuressPassword('')
      setConfirmDuressPassword('')
      await loadDuressStatus()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to set duress password')
    }
  }

  const handleRemoveDuressPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    try {
      await duressPasswordAPI.remove(removePassword)
      setSuccess('Duress password removed successfully')
      setIsRemoving(false)
      setRemovePassword('')
      await loadDuressStatus()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove duress password')
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Lock className="w-8 h-8 text-blue-500" />
            Settings
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your security and safety settings
          </p>
        </div>

        {/* Error/Success Messages */}
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

        {success && (
          <div className="bg-green-50 border border-green-300 rounded-lg p-4">
            <p className="text-green-700">{success}</p>
            <button
              onClick={() => setSuccess(null)}
              className="text-green-600 hover:text-green-700 text-sm mt-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Duress Password Card */}
        <div className="bg-white border-2 border-orange-600 rounded-lg p-6">
          <div className="flex items-start gap-4 mb-4">
            <Shield className="w-8 h-8 text-orange-500 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Duress Password
              </h2>
              <p className="text-gray-700 mb-4">
                A duress password is a special safety feature that protects you in coerced situations.
              </p>

              {/* Status Badge */}
              <div className="mb-4">
                {duressStatus?.has_duress_password ? (
                  <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-300">
                    <Check className="w-5 h-5" />
                    <span className="font-semibold">Duress password is active</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-lg border border-orange-300">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-semibold">No duress password configured</span>
                  </div>
                )}
              </div>

              {/* How It Works */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-500" />
                  How It Works
                </h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold mt-0.5">1.</span>
                    <span>You set two passwords: your main password and a duress password</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold mt-0.5">2.</span>
                    <span>When stopping walk mode, entering your <strong>main password</strong> stops tracking normally</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold mt-0.5">3.</span>
                    <span>When stopping walk mode, entering your <strong>duress password</strong>:</span>
                  </li>
                  <li className="ml-6 flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Shows "walk stopped" on your screen (appears normal to attacker)</span>
                  </li>
                  <li className="ml-6 flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Backend continues tracking in silent mode</span>
                  </li>
                  <li className="ml-6 flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Immediately alerts all trusted contacts with live tracking link</span>
                  </li>
                  <li className="ml-6 flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Contacts warned NOT to call you (you may be compromised)</span>
                  </li>
                </ul>
              </div>

              {/* Important Note */}
              <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-4">
                <p className="text-red-700 text-sm font-semibold mb-2">
                  ⚠️ Important Security Note
                </p>
                <ul className="text-red-600 text-sm space-y-1">
                  <li>• Your duress password MUST be different from your main password</li>
                  <li>• Never reveal your duress password to anyone</li>
                  <li>• Choose a duress password that looks believable (not "help" or "emergency")</li>
                  <li>• The system will NEVER indicate which password you entered</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {!duressStatus?.has_duress_password && !isSettingDuress && (
                  <button
                    onClick={() => setIsSettingDuress(true)}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    Set Duress Password
                  </button>
                )}

                {duressStatus?.has_duress_password && !isRemoving && !isSettingDuress && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setIsSettingDuress(true)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                      Change Duress Password
                    </button>
                    <button
                      onClick={() => setIsRemoving(true)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                      Remove Duress Password
                    </button>
                  </div>
                )}
              </div>

              {/* Set/Change Duress Password Form */}
              {isSettingDuress && (
                <form onSubmit={handleSetDuressPassword} className="space-y-4 mt-4 bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {duressStatus?.has_duress_password ? 'Change' : 'Set'} Duress Password
                  </h3>

                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Main Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-700"
                      >
                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Duress Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duress Password * (min 6 characters)
                    </label>
                    <div className="relative">
                      <input
                        type={showDuressPassword ? 'text' : 'password'}
                        value={duressPassword}
                        onChange={(e) => setDuressPassword(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 pr-10"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowDuressPassword(!showDuressPassword)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-700"
                      >
                        {showDuressPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Duress Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Duress Password *
                    </label>
                    <input
                      type="password"
                      value={confirmDuressPassword}
                      onChange={(e) => setConfirmDuressPassword(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900"
                      required
                      minLength={6}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded transition-colors"
                    >
                      {duressStatus?.has_duress_password ? 'Update' : 'Set'} Duress Password
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingDuress(false)
                        setCurrentPassword('')
                        setDuressPassword('')
                        setConfirmDuressPassword('')
                      }}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 px-4 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Remove Duress Password Form */}
              {isRemoving && (
                <form onSubmit={handleRemoveDuressPassword} className="space-y-4 mt-4 bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Remove Duress Password
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Enter your main password to remove your duress password. This will disable the silent alert feature.
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Main Password *
                    </label>
                    <input
                      type="password"
                      value={removePassword}
                      onChange={(e) => setRemovePassword(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded transition-colors"
                    >
                      Remove Duress Password
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRemoving(false)
                        setRemovePassword('')
                      }}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 px-4 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
