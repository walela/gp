'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'

interface SectionSelectorProps {
  currentSection: 'open' | 'ladies'
  openId: string
  ladiesId: string
}

const sectionOptions = [
  { value: 'open', label: 'Open' },
  { value: 'ladies', label: 'Ladies' }
] as const

export function SectionSelector({ currentSection, openId, ladiesId }: SectionSelectorProps) {
  const getHref = (section: 'open' | 'ladies') => {
    return `/tournament/${section === 'open' ? openId : ladiesId}`
  }

  return (
    <div className="inline-flex divide-x divide-gray-200 rounded-t-lg bg-white/90 backdrop-blur-sm border border-b-0 shadow-sm">
      {sectionOptions.map(option => {
        const isActive = currentSection === option.value
        return (
          <Link
            key={option.value}
            href={getHref(option.value)}
            className={cn(
              'inline-flex items-center justify-center whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-all',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            {option.label}
          </Link>
        )
      })}
    </div>
  )
}
