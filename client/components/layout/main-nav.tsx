'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle
} from '@/components/ui/navigation-menu'

export function MainNav() {
  const pathname = usePathname()
  const isDev = process.env.NODE_ENV === 'development'

  const routes = [
    {
      href: '/',
      label: 'Tournaments',
      active: pathname === '/'
    },
    {
      href: '/rankings',
      label: 'Rankings',
      active: pathname === '/rankings'
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
        {routes.map(route => (
          <NavigationMenuItem key={route.href}>
            <NavigationMenuLink asChild active={route.active}>
              <Link
                href={route.href}
                className={route.href === '/admin'
                  ? 'inline-flex h-9 items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 text-sm font-semibold text-amber-800 shadow-sm transition-colors hover:border-amber-400 hover:bg-amber-100'
                  : `${navigationMenuTriggerStyle()} text-sm sm:text-[15px]`
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
        ))}
      </NavigationMenuList>

      {/* Mobile Navigation */}
      <div className="sm:hidden flex gap-4">
        {routes.map(route => (
          <Link
            key={route.href}
            href={route.href}
            className={route.href === '/admin'
              ? 'inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-800'
              : `text-sm font-medium inline-flex items-center gap-2 relative ${
                route.active ? 'text-primary' : 'text-muted-foreground/85'
              }`
            }>
            {route.href === '/admin' && (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
            )}
            <span>{route.label}</span>
          </Link>
        ))}
      </div>
    </NavigationMenu>
  )
}
