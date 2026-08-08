import type { Metadata } from 'next'
import {
  Inter,
  Bricolage_Grotesque,
  Archivo,
  Source_Serif_4,
} from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'
import './themes.css'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { DesignThemeProvider } from '@/lib/design-theme-context'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Script from 'next/script'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

// Theme fonts, self-hosted via next/font so each design looks the same on every
// OS instead of falling back to whatever the visitor happens to have installed.
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
})
// Clash Grotesk (Indian Type Foundry) is self-hosted from its Fontshare
// release — it isn't on Google Fonts. Variable file covers weights 200–700.
const clashGrotesk = localFont({
  src: './fonts/ClashGrotesk-Variable.woff2',
  weight: '200 700',
  variable: '--font-clash',
})
const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
})
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
})

const fontVariables = [
  inter,
  bricolage,
  clashGrotesk,
  archivo,
  sourceSerif,
]
  .map(f => f.variable)
  .join(' ')

export const metadata: Metadata = {
  title: 'Chess Kenya Grand Prix',
  description: 'Track Chess Kenya Grand Prix tournaments and rankings'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body className={`${fontVariables} ${inter.className}`}>
        {/* Apply the saved design theme before paint to avoid a default-theme
            flash. Mirrors THEME_STORAGE_KEY + isThemedPath() in design-themes.ts. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('gp-design-theme');if(!t||t==='default')return;var p=location.pathname;var themed=p==='/'||['/rankings','/tournaments','/ladies','/insights','/tournament','/player'].some(function(x){return p===x||p.indexOf(x+'/')===0;});if(themed)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
        {/* Neobrutalist background - subtle Kenyan palette undertones */}
        <div data-app-bg className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[#f4f2ef]" />
          {/* Red-to-green diagonal wash */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#f5d5cd] via-[#f4f2ef] to-[#d2e8d8] opacity-60" />
          {/* Subtle grain */}
          <div className="absolute inset-0 opacity-[0.10]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`, backgroundSize: '200px 200px' }} />
          {/* Light grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a06_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a06_1px,transparent_1px)] bg-[size:48px_48px]" />
        </div>
        
        <DesignThemeProvider>
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              <div className="container mx-auto max-w-7xl px-3 py-4">{children}</div>
            </main>
            <Footer />
          </div>
        </DesignThemeProvider>
        <SpeedInsights />
        {/* Analytics opt-out: visiting any page with ?plausible_ignore=true sets
            the flag Plausible checks (and ?plausible_ignore=false clears it), so
            the owner can exclude a device (e.g. phone) without dev tools. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=new URLSearchParams(location.search).get('plausible_ignore');if(p==='true')localStorage.setItem('plausible_ignore','true');else if(p==='false')localStorage.removeItem('plausible_ignore');}catch(e){}})();`,
          }}
        />
        {/* Queue custom events fired before the deferred Plausible script loads. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}`,
          }}
        />
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
