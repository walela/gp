'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface SeasonSelectorProps {
  seasons: number[]
  currentSeason: number
  className?: string
}

export function SeasonSelector({ seasons, currentSeason, className }: SeasonSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleSeasonChange = (season: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('season', season.toString())
    // Reset to page 1 when changing season
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
          className
        )}>
        {currentSeason}
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {seasons.map(season => (
          <DropdownMenuItem
            key={season}
            onClick={() => handleSeasonChange(season)}
            className={cn(
              'cursor-pointer',
              season === currentSeason && 'bg-blue-50 text-blue-700 font-medium'
            )}>
            {season}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
