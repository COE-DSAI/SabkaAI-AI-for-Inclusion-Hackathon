import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Protego - Personal Safety Companion',
  description: 'AI-powered personal safety monitoring and emergency alerts',
  icons: {
    icon: '/shield.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  )
}
