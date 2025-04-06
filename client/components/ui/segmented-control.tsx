import * as React from 'react'
import { cn } from '@/lib/utils'

interface Option {
  value: string
  label: string
}

interface SegmentedControlProps {
  value: string
  options: Option[]
  onChange: (value: string) => void
  className?: string
}

export function SegmentedControl({ value, options, onChange, className }: SegmentedControlProps) {
  return (
    <div className={cn('inline-flex rounded-lg bg-white/80 backdrop-blur-sm border shadow-sm p-1', className)}>
      {options.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
            value === option.value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/80'
          )}>
          {option.label}
        </button>
      ))}
    </div>
  )
}
