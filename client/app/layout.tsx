import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

const roboto = Roboto({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto'
})

export const metadata: Metadata = {
  title: 'Chess Kenya 2025 Grand Prix',
  description: 'Track Chess Kenya Grand Prix tournaments and rankings for the 2025 season'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
              <body className={`${roboto.variable} ${roboto.className}`}>
        {/* Chess-themed background with subtle checkerboard pattern */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          {/* Enhanced gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100/80 via-white to-slate-300"></div>
          
          {/* Subtle vignette effect */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_70%,rgba(241,245,249,0.3)_100%)]"></div>
          
          {/* Subtle grid pattern */}
          <div className="absolute inset-0">
            {/* Fine grid - very subtle */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#64748b05_1px,transparent_1px),linear-gradient(to_bottom,#64748b05_1px,transparent_1px)] bg-[size:8px_8px]"></div>
            
            {/* Medium grid - light */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#64748b08_1px,transparent_1px),linear-gradient(to_bottom,#64748b08_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            
            {/* Major grid lines - still subtle */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#64748b10_1px,transparent_1px),linear-gradient(to_bottom,#64748b10_1px,transparent_1px)] bg-[size:160px_160px]"></div>
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
        <SpeedInsights />
      </body>
    </html>
  )
}
