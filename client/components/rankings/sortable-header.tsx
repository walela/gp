"use client"

import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { ArrowUpDownIcon } from "lucide-react"
import Link from "next/link"

interface SortableHeaderProps {
  column: string
  label: string
  basePath: string
  align?: 'left' | 'right'
  className?: string
}

export function SortableHeader({ column, label, basePath, align = 'left', className }: SortableHeaderProps) {
  return (
    <TableHead className={cn("cursor-pointer select-none", className)}>
      <Link 
        href={{
          pathname: basePath,
          query: {
            sort: column,
            dir: 'desc'
          }
        }}
        className="flex items-center gap-1"
        style={{ justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}
      >
        <span>{label}</span>
        <span className="text-muted-foreground">
          <ArrowUpDownIcon className="h-4 w-4" />
        </span>
      </Link>
    </TableHead>
  )
}
