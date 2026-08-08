import Link from 'next/link'
import { MainNav } from '@/components/layout/main-nav'
import { DesignThemePicker } from '@/components/design-theme-picker'
import { Separator } from '@/components/ui/separator'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-elevation-low">
      <div className="container mx-auto max-w-7xl px-3">
        <div className="flex h-14 items-center justify-between gap-4">
          <Link href="/" className="flex items-center min-w-0">
            <span className="truncate text-base font-semibold tracking-tight sm:text-lg">CK GP 2026</span>
          </Link>
          <div className="flex items-center gap-3">
            <MainNav />
            <DesignThemePicker />
          </div>
        </div>
      </div>
      <Separator />
    </header>
  )
}
