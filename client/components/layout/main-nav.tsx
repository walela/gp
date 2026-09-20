'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle
} from '@/components/ui/navigation-menu'

const RANKINGS_UPDATE_EXPIRES_AT = new Date('2026-09-21T10:00:00+03:00').getTime()

export function MainNav() {
  const pathname = usePathname()
  const [pendingNavigation, setPendingNavigation] = useState<{ href: string, fromPathname: string } | null>(null)
  const [showRankingsUpdate, setShowRankingsUpdate] = useState(() => Date.now() < RANKINGS_UPDATE_EXPIRES_AT)
  const isDev = process.env.NODE_ENV === 'development'
  const pendingHref = pendingNavigation?.fromPathname === pathname ? pendingNavigation.href : null

  useEffect(() => {
    const remaining = RANKINGS_UPDATE_EXPIRES_AT - Date.now()
    if (remaining <= 0) return

    const timeout = window.setTimeout(() => setShowRankingsUpdate(false), remaining)
    return () => window.clearTimeout(timeout)
  }, [])

  const routes = [
    {
      href: '/',
      label: 'Rankings',
      active: pathname === '/' || pathname === '/rankings'
    },
    {
      href: '/tournaments',
      label: 'Tournaments',
      active: pathname === '/tournaments'
    },
    ...(isDev ? [{
      href: '/admin',
      label: 'Admin',
      active: pathname.startsWith('/admin')
    }] : [])
  ]

  return (
    <NavigationMenu>
      <NavigationMenuList className="hidden sm:flex">
        {routes.map(route => {
          const isPending = route.href !== '/admin' && pendingHref === route.href

          return (
            <NavigationMenuItem key={route.href}>
              <NavigationMenuLink asChild>
                <Link
                  href={route.href}
                  aria-current={route.active ? 'page' : undefined}
                  aria-busy={isPending || undefined}
                  onClick={() => !route.active && setPendingNavigation({ href: route.href, fromPathname: pathname })}
                  className={route.href === '/admin'
                    ? 'inline-flex h-9 items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 text-sm font-semibold text-amber-800 shadow-sm transition-colors hover:border-amber-400 hover:bg-amber-100'
                    : `${navigationMenuTriggerStyle()} relative rounded-none bg-transparent text-sm hover:bg-transparent focus:bg-transparent sm:text-[15px] after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:origin-center after:rounded-full after:bg-primary after:transition-transform after:duration-150 ${
                      !pendingHref && route.active ? 'text-primary' : 'text-muted-foreground/85'
                    } ${
                      isPending ? 'after:scale-x-100' : 'after:scale-x-0'
                    }`
                  }
                >
                  <span className="relative inline-flex items-center gap-2">
                    {route.href === '/admin' && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                    )}
                    {route.label}
                    {route.href === '/' && showRankingsUpdate && (
                      <span className="absolute -right-2 top-0 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                    )}
                  </span>
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          )
        })}
      </NavigationMenuList>

      {/* Mobile Navigation */}
      <div className="sm:hidden flex gap-4">
        {routes.map(route => {
          const isPending = route.href !== '/admin' && pendingHref === route.href

          return (
            <Link
              key={route.href}
              href={route.href}
              aria-current={route.active ? 'page' : undefined}
              aria-busy={isPending || undefined}
              onClick={() => !route.active && setPendingNavigation({ href: route.href, fromPathname: pathname })}
              className={route.href === '/admin'
                ? 'inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-800'
                : `relative inline-flex items-center gap-2 text-sm font-medium after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-center after:rounded-full after:bg-primary after:transition-transform after:duration-150 ${
                  !pendingHref && route.active ? 'text-primary' : 'text-muted-foreground/85'
                } ${
                  isPending ? 'after:scale-x-100' : 'after:scale-x-0'
                }`
              }>
              {route.href === '/admin' && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
              )}
              <span className="relative inline-flex items-center gap-1.5">
                {route.label}
                {route.href === '/' && showRankingsUpdate && (
                  <span className="absolute -right-2 top-0 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                )}
              </span>
            </Link>
          )
        })}
      </div>
    </NavigationMenu>
  )
}
