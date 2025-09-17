import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Adams State Resource Hub',
  description: 'Career resources and guidance for Adams State University students',
  manifest: '/manifest.json',
  themeColor: '#3B82F6',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Adams State Hub'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      {/* new background and text color classes here */}
      <body
        className={`${inter.className} bg-brand-slate-100 text-brand-slate-800`}
        suppressHydrationWarning={true}
      >
        <AuthProvider>
          {/* wrapping div is removed. We only need the children. */}
          {children}

          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              }
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}