'use client'

import { useId, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
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
          data-collapsible-trigger
          type="button"
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={() => setIsOpen(open => !open)}
          className="group flex min-w-0 flex-1 items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
          <h2 className={titleClassName}>{title}</h2>
          <span className="-mr-1 flex size-7 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors duration-200 group-hover:bg-gray-100 group-hover:text-gray-700">
            <ChevronRight
              strokeWidth={2.25}
              className={cn(
                'size-[18px] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
                isOpen && 'rotate-90'
              )}
              aria-hidden="true"
            />
          </span>
        </button>
        {trailing}
      </div>

      <div
        id={contentId}
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={cn(
          'grid transition-[grid-template-rows,opacity] motion-reduce:transition-none',
          isOpen
            ? 'grid-rows-[1fr] opacity-100 duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
            : 'grid-rows-[0fr] opacity-0 duration-250 ease-[cubic-bezier(0.4,0,1,1)]'
        )}>
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </section>
  )
}
