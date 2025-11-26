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
            <Link href={route.href} legacyBehavior passHref>
              <NavigationMenuLink className={`${navigationMenuTriggerStyle()} text-sm sm:text-[13px]`} active={route.active}>
                <span className="relative inline-flex items-center gap-2">{route.label}</span>
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
            className={`text-[13px] font-medium inline-flex items-center gap-2 relative ${
              route.active ? 'text-primary' : 'text-muted-foreground'
            }`}>
            <span>{route.label}</span>
          </Link>
        ))}
      </div>
    </NavigationMenu>
  )
}
