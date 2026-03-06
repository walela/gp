'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface CategoryToggleProps {
  currentCategory: 'open' | 'ladies'
  currentSeason: number
  className?: string
}

export function CategoryToggle({ currentCategory, className }: CategoryToggleProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const ladiesDisabled = false

  const handleCategoryChange = (category: 'open' | 'ladies') => {
    if (category === 'ladies' && ladiesDisabled) return

    const params = new URLSearchParams(searchParams.toString())
    if (category === 'open') {
      params.delete('category')
    } else {
      params.set('category', category)
    }
    // Reset to page 1 when changing category
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className={cn('inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5', className)}>
      <button
        onClick={() => handleCategoryChange('open')}
        className={cn(
          'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
          currentCategory === 'open'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        )}>
        Open
      </button>
      <button
        onClick={() => handleCategoryChange('ladies')}
        disabled={ladiesDisabled}
        className={cn(
          'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
          currentCategory === 'ladies'
            ? 'bg-white text-gray-900 shadow-sm'
            : ladiesDisabled
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-600 hover:text-gray-900'
        )}>
        <span className="relative">
          Ladies
          {currentCategory !== 'ladies' && (
            <span className="absolute -top-0.5 -right-1.5 flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-300 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-400" />
            </span>
          )}
        </span>
      </button>
    </div>
  )
}
