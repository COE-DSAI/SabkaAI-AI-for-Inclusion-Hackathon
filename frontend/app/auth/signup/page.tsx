'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/lib/store'
import AuthPage from '@/components/AuthPage'
import WhatsAppSandboxModal from '@/components/WhatsAppSandboxModal'

export default function SignUpPage() {
  const router = useRouter()
  const setUser = useUserStore((state) => state.setUser)
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [pendingUser, setPendingUser] = useState<any>(null)

  const handleSuccess = (token: string, user: any) => {
    console.log('SignUpPage: handleSuccess called with user:', user)
    setUser(user)
    setPendingUser(user)
    console.log('SignUpPage: User set in store, showing WhatsApp modal')

    // Check if user has already skipped the modal
    const hasSkipped = localStorage.getItem('whatsapp_sandbox_skipped')
    console.log('SignUpPage: hasSkipped value from localStorage:', hasSkipped)

    if (!hasSkipped) {
      // Show WhatsApp sandbox modal
      console.log('SignUpPage: Setting showWhatsAppModal to TRUE')
      setShowWhatsAppModal(true)
    } else {
      // Redirect immediately if user has skipped before
      console.log('SignUpPage: User previously skipped, redirecting...')
      redirectUser(user)
    }
  }

  const redirectUser = (user: any) => {
    console.log('SignUpPage: Redirecting based on user type:', user.user_type)
    setTimeout(() => {
      if (user.user_type === 'GOVT_AGENT') {
        router.replace('/gov-dashboard')
      } else if (user.user_type === 'SUPER_ADMIN') {
        router.replace('/admin')
      } else {
        router.replace('/dashboard')
      }
    }, 100)
  }

  const handleWhatsAppModalClose = () => {
    setShowWhatsAppModal(false)
    // Redirect after modal is closed
    if (pendingUser) {
      redirectUser(pendingUser)
    }
  }

  return (
    <>
      <AuthPage onSuccess={handleSuccess} />
      <WhatsAppSandboxModal
        isOpen={showWhatsAppModal}
        onClose={handleWhatsAppModalClose}
      />
    </>
  )
}

