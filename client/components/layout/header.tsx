import Link from 'next/link'
import { MainNav } from '@/components/layout/main-nav'
import { Separator } from '@/components/ui/separator'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          <Link href="/" className="flex items-center min-w-0">
            <span className="font-maple-mono-heading font-medium truncate text-base sm:text-lg">
              <span className="hidden sm:inline">Chess Kenya Grand Prix Tracker</span>
              <span className="sm:hidden">GP Tracker 2026</span>
            </span>
          </Link>
          <MainNav />
        </div>
      </div>
      <Separator />
    </header>
  )
}
