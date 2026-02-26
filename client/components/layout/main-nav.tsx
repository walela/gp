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
            <NavigationMenuLink asChild active={route.active}>
              <Link href={route.href} className={`${navigationMenuTriggerStyle()} text-sm sm:text-[15px]`}>
                <span className="relative inline-flex items-center gap-2">{route.label}</span>
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
            className={`text-sm font-medium inline-flex items-center gap-2 relative ${
              route.active ? 'text-primary' : 'text-muted-foreground/85'
            }`}>
            <span>{route.label}</span>
          </Link>
        ))}
      </div>
    </NavigationMenu>
  )
}
