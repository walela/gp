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

  const routes = [
    {
      href: '/#live-standings',
      label: 'Live',
      active: pathname === '/'
    },
    {
      href: '/',
      label: 'Tournaments',
      active: pathname === '/'
    },
    {
      href: '/rankings',
      label: 'Rankings',
      active: pathname === '/rankings'
    }
  ]

  return (
    <NavigationMenu>
      <NavigationMenuList className="hidden sm:flex">
        {routes.map(route => (
          <NavigationMenuItem key={route.href}>
            <Link href={route.href} legacyBehavior passHref>
              <NavigationMenuLink className={navigationMenuTriggerStyle()} active={route.active}>
                <span className="relative inline-flex items-center gap-2">
                  {route.label}
                  {route.label === 'Live' ? (
                    <span
                      className="absolute -right-1.5 -top-1 inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"
                      aria-hidden="true"
                    />
                  ) : null}
                </span>
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>

      {/* Mobile Navigation */}
      <div className="sm:hidden flex gap-4">
        {routes.map(route => (
          <Link
            key={route.href}
            href={route.href}
            className={`text-sm font-medium inline-flex items-center gap-2 relative ${
              route.active ? 'text-primary' : 'text-muted-foreground'
            }`}>
            <span>{route.label}</span>
            {route.label === 'Live' ? (
              <span
                className="absolute -right-1.5 -top-0.5 inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"
                aria-hidden="true"
              />
            ) : null}
          </Link>
        ))}
      </div>
    </NavigationMenu>
  )
}
