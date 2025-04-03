"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu"

export function MainNav() {
  const pathname = usePathname()

  const routes = [
    {
      href: "/",
      label: "Tournaments",
      active: pathname === "/",
    },
    {
      href: "/rankings",
      label: "Rankings",
      active: pathname === "/rankings",
    }
  ]

  return (
    <NavigationMenu>
      <NavigationMenuList className="hidden sm:flex">
        {routes.map((route) => (
          <NavigationMenuItem key={route.href}>
            <Link href={route.href} legacyBehavior passHref>
              <NavigationMenuLink className={navigationMenuTriggerStyle()} active={route.active}>
                {route.label}
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>

      {/* Mobile Navigation */}
      <div className="sm:hidden flex gap-4">
        {routes.map((route) => (
          <Link 
            key={route.href} 
            href={route.href}
            className={`text-sm font-medium ${route.active ? 'text-primary' : 'text-muted-foreground'}`}
          >
            {route.label}
          </Link>
        ))}
      </div>
    </NavigationMenu>
  )
}
