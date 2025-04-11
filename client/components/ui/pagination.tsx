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
    <nav aria-label="Pagination" className={cn("flex justify-center", className)}>
      {/* Desktop pagination */}
      <ul className="hidden sm:inline-flex -space-x-px">
        {/* Previous button */}
        <li>
          {currentPage > 1 ? (
            <Link
              href={`${basePath}${buildQueryString(currentPage - 1)}`}
              className="flex items-center justify-center h-9 px-3 ms-0 border border-e-0 border-border rounded-s-md text-foreground/80 bg-background hover:bg-accent hover:text-accent-foreground"
            >
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              <span>Previous</span>
            </Link>
          ) : (
            <span className="flex items-center justify-center h-9 px-3 ms-0 border border-e-0 border-border rounded-s-md text-muted-foreground bg-muted cursor-not-allowed">
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              <span>Previous</span>
            </span>
          )}
        </li>
        
        {/* First page if not in range */}
        {desktopPageRange[0] > 1 && (
          <>
            <li>
              <Link
                href={`${basePath}${buildQueryString(1)}`}
                className="flex items-center justify-center h-9 px-3 border border-border text-foreground/80 bg-background hover:bg-accent hover:text-accent-foreground"
              >
                1
              </Link>
            </li>
            {desktopPageRange[0] > 2 && (
              <li>
                <span className="flex items-center justify-center h-9 px-3 border border-border text-muted-foreground bg-background">
                  ...
                </span>
              </li>
            )}
          </>
        )}
        
        {/* Page numbers */}
        {desktopPageRange.map(page => (
          <li key={page}>
            {page === currentPage ? (
              <span
                className="flex items-center justify-center h-9 px-3 border border-border text-primary-foreground bg-primary font-medium"
                aria-current="page"
              >
                {page}
              </span>
            ) : (
              <Link
                href={`${basePath}${buildQueryString(page)}`}
                className="flex items-center justify-center h-9 px-3 border border-border text-foreground/80 bg-background hover:bg-accent hover:text-accent-foreground"
              >
                {page}
              </Link>
            )}
          </li>
        ))}
        
        {/* Last page if not in range */}
        {desktopPageRange[desktopPageRange.length - 1] < totalPages && (
          <>
            {desktopPageRange[desktopPageRange.length - 1] < totalPages - 1 && (
              <li>
                <span className="flex items-center justify-center h-9 px-3 border border-border text-muted-foreground bg-background">
                  ...
                </span>
              </li>
            )}
            <li>
              <Link
                href={`${basePath}${buildQueryString(totalPages)}`}
                className="flex items-center justify-center h-9 px-3 border border-border text-foreground/80 bg-background hover:bg-accent hover:text-accent-foreground"
              >
                {totalPages}
              </Link>
            </li>
          </>
        )}
        
        {/* Next button */}
        <li>
          {currentPage < totalPages ? (
            <Link
              href={`${basePath}${buildQueryString(currentPage + 1)}`}
              className="flex items-center justify-center h-9 px-3 border border-border rounded-e-md text-foreground/80 bg-background hover:bg-accent hover:text-accent-foreground"
            >
              <span>Next</span>
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </Link>
          ) : (
            <span className="flex items-center justify-center h-9 px-3 border border-border rounded-e-md text-muted-foreground bg-muted cursor-not-allowed">
              <span>Next</span>
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </span>
          )}
        </li>
      </ul>

      {/* Mobile pagination */}
      <ul className="sm:hidden inline-flex -space-x-px">
        {/* Previous button */}
        <li>
          {currentPage > 1 ? (
            <Link
              href={`${basePath}${buildQueryString(currentPage - 1)}`}
              className="flex items-center justify-center h-9 px-3 ms-0 border border-e-0 border-border rounded-s-md text-foreground/80 bg-background hover:bg-accent hover:text-accent-foreground"
            >
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              <span className="sr-only">Previous</span>
            </Link>
          ) : (
            <span className="flex items-center justify-center h-9 px-3 ms-0 border border-e-0 border-border rounded-s-md text-muted-foreground bg-muted cursor-not-allowed">
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              <span className="sr-only">Previous</span>
            </span>
          )}
        </li>
        
        {/* First 3 pages */}
        {mobilePageRange.map(page => (
          <li key={page}>
            {page === currentPage ? (
              <span
                className="flex items-center justify-center h-9 w-9 border border-border text-primary-foreground bg-primary font-medium"
                aria-current="page"
              >
                {page}
              </span>
            ) : (
              <Link
                href={`${basePath}${buildQueryString(page)}`}
                className="flex items-center justify-center h-9 w-9 border border-border text-foreground/80 bg-background hover:bg-accent hover:text-accent-foreground"
              >
                {page}
              </Link>
            )}
          </li>
        ))}
        
        {/* Ellipsis and last page */}
        {showMobileEllipsis && (
          <>
            <li>
              <span className="flex items-center justify-center h-9 w-9 border border-border text-muted-foreground bg-background">
                ...
              </span>
            </li>
            {totalPages > 3 && (
              <li>
                {totalPages === currentPage ? (
                  <span
                    className="flex items-center justify-center h-9 w-9 border border-border text-primary-foreground bg-primary font-medium"
                    aria-current="page"
                  >
                    {totalPages}
                  </span>
                ) : (
                  <Link
                    href={`${basePath}${buildQueryString(totalPages)}`}
                    className="flex items-center justify-center h-9 w-9 border border-border text-foreground/80 bg-background hover:bg-accent hover:text-accent-foreground"
                  >
                    {totalPages}
                  </Link>
                )}
              </li>
            )}
          </>
        )}
        
        {/* Next button */}
        <li>
          {currentPage < totalPages ? (
            <Link
              href={`${basePath}${buildQueryString(currentPage + 1)}`}
              className="flex items-center justify-center h-9 px-3 border border-border rounded-e-md text-foreground/80 bg-background hover:bg-accent hover:text-accent-foreground"
            >
              <span className="sr-only">Next</span>
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </Link>
          ) : (
            <span className="flex items-center justify-center h-9 px-3 border border-border rounded-e-md text-muted-foreground bg-muted cursor-not-allowed">
              <span className="sr-only">Next</span>
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  )
}
