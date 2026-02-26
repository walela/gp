import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Script from 'next/script'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'Chess Kenya Grand Prix',
  description: 'Track Chess Kenya Grand Prix tournaments and rankings'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${inter.className}`}>
        {/* Neobrutalist background - subtle Kenyan palette undertones */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[#f4f2ef]" />
          {/* Red-to-green diagonal wash */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#f5d5cd] via-[#f4f2ef] to-[#d2e8d8] opacity-60" />
          {/* Subtle grain */}
          <div className="absolute inset-0 opacity-[0.10]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`, backgroundSize: '200px 200px' }} />
          {/* Light grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a06_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a06_1px,transparent_1px)] bg-[size:48px_48px]" />
        </div>
        
        <div className="relative flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">
            <div className="container mx-auto max-w-7xl px-3 py-4">{children}</div>
          </main>
          <Footer />
        </div>
        <SpeedInsights />
        <Script
          defer
          data-domain="1700chess.sh"
          data-api="https://gp-tracker.walerunni.workers.dev/data/event"
          src="https://gp-tracker.walerunni.workers.dev/static/script.js"
        />
      </body>
    </html>
  )
}
