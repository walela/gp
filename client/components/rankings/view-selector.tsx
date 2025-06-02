'use client'

import { cn } from '@/lib/utils'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ExportButton } from '@/components/ui/export-button'

interface ViewSelectorProps {
  view: string
  exportUrl?: string
  exportFilename?: string
}

const viewOptions = [
  { value: 'best_1', label: 'Best TPR' },
  { value: 'best_2', label: 'Best 2' },
  { value: 'best_3', label: 'Best 3' },
  { value: 'best_4', label: 'Best 4' }
]

export function ViewSelector({ view, exportUrl, exportFilename }: ViewSelectorProps) {
  const searchParams = useSearchParams()
  
  const getViewUrl = (viewValue: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', viewValue)
    params.set('sort', viewValue)
    return `/rankings?${params.toString()}`
  }
  
  return (
    <div className="flex items-center justify-between gap-2 w-full">
      <div className="inline-flex rounded-t-lg bg-white/90 backdrop-blur-sm border border-b-0 shadow-sm">
        {viewOptions.map(option => {
          const isActive = view === option.value;
          return (
            <Link
              key={option.value}
              href={getViewUrl(option.value)}
              className={cn(
                'inline-flex items-center justify-center whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-all',
                isActive 
                  ? 'bg-primary text-primary-foreground border-b-2 border-b-primary' 
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
      {exportUrl && (
        <ExportButton 
          url={exportUrl}
          filename={exportFilename}
          className="h-9"
        />
      )}
    </div>
  )
}
