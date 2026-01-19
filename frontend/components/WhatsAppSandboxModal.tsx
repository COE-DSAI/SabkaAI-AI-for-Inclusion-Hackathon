'use client'

import { useState } from 'react'
import { MessageCircle, X, ExternalLink } from 'lucide-react'

interface WhatsAppSandboxModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function WhatsAppSandboxModal({ isOpen, onClose }: WhatsAppSandboxModalProps) {
  const [isJoining, setIsJoining] = useState(false)

  if (!isOpen) return null

  // Hardcoded Twilio WhatsApp sandbox config
  const sandboxNumber = '+14155238886'
  const sandboxCode = 'join stretch-particular'

  // Create WhatsApp link
  const whatsappLink = `https://wa.me/${sandboxNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(sandboxCode)}`

  const handleJoinWhatsApp = () => {
    setIsJoining(true)
    // Open WhatsApp in new tab
    window.open(whatsappLink, '_blank')

    // Close modal after a delay
    setTimeout(() => {
      setIsJoining(false)
      onClose()
    }, 2000)
  }

  const handleSkip = () => {
    // Store that user skipped this
    localStorage.setItem('whatsapp_sandbox_skipped', 'true')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-gray-200">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <MessageCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Join WhatsApp Alerts</h2>
              <p className="text-sm text-gray-600">Get emergency notifications</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <p className="text-gray-700">
              To receive emergency alerts and location updates via WhatsApp, you need to join our Twilio sandbox.
            </p>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-orange-900 mb-2">How it works:</p>
              <ol className="text-sm text-orange-800 space-y-1 list-decimal list-inside">
                <li>Click the button below to open WhatsApp</li>
                <li>Send the pre-filled message to join</li>
                <li>You'll receive a confirmation message</li>
                <li>That's it! You're all set to receive alerts</li>
              </ol>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Message to send:</p>
              <p className="font-mono text-sm text-gray-900 break-all">{sandboxCode}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSkip}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              Skip for now
            </button>
            <button
              onClick={handleJoinWhatsApp}
              disabled={isJoining}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition"
            >
              <MessageCircle className="w-5 h-5" />
              {isJoining ? 'Opening...' : 'Join on WhatsApp'}
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-center text-gray-500">
            You can always join later from your settings
          </p>
        </div>
      </div>
    </div>
  )
}
