'use client'

import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
  title: string
  headerClassName?: string
  titleClassName?: string
  trailing?: ReactNode
  children: ReactNode
}

export function CollapsibleSection({
  title,
  headerClassName,
  titleClassName,
  trailing,
  children
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const contentId = useId()

  return (
    <section>
      <div className={headerClassName}>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={() => setIsOpen(open => !open)}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
          <h2 className={titleClassName}>{title}</h2>
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-gray-500 transition-transform', !isOpen && '-rotate-90')}
            aria-hidden="true"
          />
        </button>
        {trailing}
      </div>

      <div
        id={contentId}
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}>
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </section>
  )
}
