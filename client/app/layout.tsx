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
        {/* Chess-themed background with subtle checkerboard pattern */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-white to-amber-100"></div>
          
          {/* Mesh grid pattern */}
          <div className="absolute inset-0">
            {/* Horizontal and vertical grid lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f610_1px,transparent_1px),linear-gradient(to_bottom,#00000010_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            
            {/* Diagonal grid lines for mesh effect */}
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_calc(50%_-_0.5px),#00000008_calc(50%_-_0.5px),#00000008_calc(50%_+_0.5px),transparent_calc(50%_+_0.5px)),linear-gradient(135deg,transparent_calc(50%_-_0.5px),#f59e0b08_calc(50%_-_0.5px),#f59e0b08_calc(50%_+_0.5px),transparent_calc(50%_+_0.5px))] bg-[size:48px_48px]"></div>
          </div>
        </div>
        
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
