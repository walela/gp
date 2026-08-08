'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle
} from '@/components/ui/navigation-menu'

export function MainNav() {
  const pathname = usePathname()
  const [pendingNavigation, setPendingNavigation] = useState<{ href: string, fromPathname: string } | null>(null)
  const isDev = process.env.NODE_ENV === 'development'
  const pendingHref = pendingNavigation?.fromPathname === pathname ? pendingNavigation.href : null

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
          const isHighlighted = route.href !== '/admin' && (pendingHref === route.href || (!pendingHref && route.active))

          return (
            <NavigationMenuItem key={route.href}>
              <NavigationMenuLink asChild>
                <Link
                  href={route.href}
                  aria-current={route.active ? 'page' : undefined}
                  onClick={() => !route.active && setPendingNavigation({ href: route.href, fromPathname: pathname })}
                  className={route.href === '/admin'
                    ? 'inline-flex h-9 items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 text-sm font-semibold text-amber-800 shadow-sm transition-colors hover:border-amber-400 hover:bg-amber-100'
                    : `${navigationMenuTriggerStyle()} relative rounded-none bg-transparent text-sm hover:bg-transparent focus:bg-transparent sm:text-[15px] after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:origin-center after:rounded-full after:bg-primary after:transition-transform after:duration-150 ${
                      isHighlighted ? 'after:scale-x-100' : 'after:scale-x-0'
                    }`
                  }
                >
                  <span className="relative inline-flex items-center gap-2">
                    {route.href === '/admin' && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                    )}
                    {route.label}
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
          const isHighlighted = route.href !== '/admin' && (pendingHref === route.href || (!pendingHref && route.active))

          return (
            <Link
              key={route.href}
              href={route.href}
              aria-current={route.active ? 'page' : undefined}
              onClick={() => !route.active && setPendingNavigation({ href: route.href, fromPathname: pathname })}
              className={route.href === '/admin'
                ? 'inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-800'
                : `relative inline-flex items-center gap-2 text-sm font-medium text-muted-foreground/85 after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-center after:rounded-full after:bg-primary after:transition-transform after:duration-150 ${
                  isHighlighted ? 'after:scale-x-100' : 'after:scale-x-0'
                }`
              }>
              {route.href === '/admin' && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
              )}
              <span>{route.label}</span>
            </Link>
          )
        })}
      </div>
    </NavigationMenu>
  )
}
