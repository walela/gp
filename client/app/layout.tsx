import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Analytics } from '@vercel/analytics/react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Chess Kenya 2024-2025 Grand Prix',
  description: 'Track Chess Kenya Grand Prix tournaments and rankings for the 2024-2025 season'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Chess-themed background gradient */}
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-200 via-white to-amber-100 dark:from-blue-900 dark:via-slate-900 dark:to-amber-900/70 -z-10" />
        
        <div className="relative flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">{children}</div>
          </main>
          <Footer />
        </div>
        <Analytics />
      </body>
    </html>
  )
}
