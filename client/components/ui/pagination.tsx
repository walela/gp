'use client'

import Link from 'next/link'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  currentPage: number
  totalPages: number
  basePath: string
  queryParams?: Record<string, string>
  className?: string
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  basePath,
  queryParams = {},
  className
}: PaginationProps) {
  // Don't render pagination if there's only one page
  if (totalPages <= 1) return null
  
  // Build the query string from the provided params
  const buildQueryString = (page: number) => {
    const params = new URLSearchParams()
    
    // Add all the query params
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value) params.append(key, value)
    })
    
    // Add the page param
    params.append('page', page.toString())
    
    return `?${params.toString()}`
  }
  
  // Calculate the range of pages to display for desktop
  const getDesktopPageRange = () => {
    const maxVisiblePages = 5
    
    // For small number of pages, show all
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    
    // For larger number of pages, show a window around the current page
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
    
    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }
    
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)
  }
  
  // Get mobile page range - always show first 3 pages if available
  const getMobilePageRange = () => {
    // Always show the first 3 pages on mobile
    const maxMobilePages = Math.min(3, totalPages)
    return Array.from({ length: maxMobilePages }, (_, i) => i + 1)
  }
  
  const desktopPageRange = getDesktopPageRange()
  const mobilePageRange = getMobilePageRange()
  const showMobileEllipsis = totalPages > 3
  
  return (
    <nav aria-label="Pagination" className={cn("flex items-center justify-between px-3", className)}>
      {/* Previous */}
      <div className="shrink-0">
        {currentPage > 1 ? (
          <Link
            href={`${basePath}${buildQueryString(currentPage - 1)}`}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-foreground/80 bg-background hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Prev</span>
          </Link>
        ) : (
          <span aria-disabled="true" className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground bg-muted cursor-not-allowed">
            <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Prev</span>
          </span>
        )}
      </div>

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {/* Desktop */}
        <div className="hidden sm:flex items-center gap-1">
          {desktopPageRange[0] > 1 && (
            <>
              <Link href={`${basePath}${buildQueryString(1)}`} className="flex items-center justify-center h-8 w-8 rounded-md text-sm text-foreground/80 hover:bg-accent">1</Link>
              {desktopPageRange[0] > 2 && <span className="text-sm text-muted-foreground px-1">...</span>}
            </>
          )}
          {desktopPageRange.map(page => (
            page === currentPage ? (
              <span key={page} className="flex items-center justify-center h-8 w-8 rounded-md text-sm font-medium text-primary-foreground bg-primary" aria-current="page">{page}</span>
            ) : (
              <Link key={page} href={`${basePath}${buildQueryString(page)}`} className="flex items-center justify-center h-8 w-8 rounded-md text-sm text-foreground/80 hover:bg-accent">{page}</Link>
            )
          ))}
          {desktopPageRange[desktopPageRange.length - 1] < totalPages && (
            <>
              {desktopPageRange[desktopPageRange.length - 1] < totalPages - 1 && <span className="text-sm text-muted-foreground px-1">...</span>}
              <Link href={`${basePath}${buildQueryString(totalPages)}`} className="flex items-center justify-center h-8 w-8 rounded-md text-sm text-foreground/80 hover:bg-accent">{totalPages}</Link>
            </>
          )}
        </div>

        {/* Mobile */}
        <div className="flex sm:hidden items-center gap-1">
          {mobilePageRange.map(page => (
            page === currentPage ? (
              <span key={page} className="flex items-center justify-center h-8 w-8 rounded-md text-sm font-medium text-primary-foreground bg-primary" aria-current="page">{page}</span>
            ) : (
              <Link key={page} href={`${basePath}${buildQueryString(page)}`} className="flex items-center justify-center h-8 w-8 rounded-md text-sm text-foreground/80 hover:bg-accent">{page}</Link>
            )
          ))}
          {showMobileEllipsis && (
            <>
              <span className="text-sm text-muted-foreground px-1">...</span>
              {totalPages === currentPage ? (
                <span className="flex items-center justify-center h-8 w-8 rounded-md text-sm font-medium text-primary-foreground bg-primary" aria-current="page">{totalPages}</span>
              ) : (
                <Link href={`${basePath}${buildQueryString(totalPages)}`} className="flex items-center justify-center h-8 w-8 rounded-md text-sm text-foreground/80 hover:bg-accent">{totalPages}</Link>
              )}
            </>
          )}
        </div>
      </div>

      {/* Next */}
      <div className="shrink-0 flex justify-end">
        {currentPage < totalPages ? (
          <Link
            href={`${basePath}${buildQueryString(currentPage + 1)}`}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-foreground/80 bg-background hover:bg-accent hover:text-accent-foreground"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <span aria-disabled="true" className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground bg-muted cursor-not-allowed">
            <span className="hidden sm:inline">Next</span>
            <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
    </nav>
  )
}
