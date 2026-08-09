'use client'

import { Settings } from 'lucide-react'
import { usePathname } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DESIGN_THEMES, isThemedPath, type DesignThemeId } from '@/lib/design-themes'
import { useDesignTheme } from '@/lib/design-theme-context'
import { trackEvent } from '@/lib/analytics'
import { cn } from '@/lib/utils'

export function DesignThemePicker({ className }: { className?: string }) {
  const { theme, setTheme } = useDesignTheme()
  const pathname = usePathname()
  const current = DESIGN_THEMES.find(t => t.id === theme) ?? DESIGN_THEMES[0]

  // Only offer the picker where the theme actually applies.
  if (!isThemedPath(pathname)) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-theme-picker
        suppressHydrationWarning
        aria-label={`Change design theme (current: ${current.label})`}
        title={`Theme: ${current.label}`}
        className={cn(
          'inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className
        )}>
        <Settings className="size-[18px]" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Design theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={value => {
            setTheme(value as DesignThemeId)
            const picked = DESIGN_THEMES.find(t => t.id === value)
            trackEvent(`Theme: ${picked?.label ?? value}`)
          }}>
          {DESIGN_THEMES.map(t => (
            <DropdownMenuRadioItem
              key={t.id}
              value={t.id}
              className="cursor-pointer flex-col items-start gap-0.5 py-2">
              <span className="font-medium">{t.label}</span>
              <span className="text-xs text-muted-foreground">{t.blurb}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
