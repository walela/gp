"use client"

import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

interface SortableHeaderProps {
  column: string
  label: string
  align?: "left" | "right"
  basePath?: string
}

export function SortableHeader({ column, label, align = "left", basePath = "/rankings" }: SortableHeaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sort = searchParams.get("sort")
  const dir = searchParams.get("dir")
  const isActive = sort === column
  const isAsc = isActive && dir === "asc"

  const handleSort = () => {
    const params = new URLSearchParams(searchParams)
    params.set("sort", column)
    params.set("dir", isActive && dir === "desc" ? "asc" : "desc")
    router.push(`${basePath}?${params.toString()}`)
  }

  return (
    <TableHead className={cn("cursor-pointer select-none", align === "right" && "text-right")} onClick={handleSort}>
      <div className={cn("flex items-center gap-1", align === "right" ? "justify-end" : "justify-start")}>
        <span>{label}</span>
        <span className="text-muted-foreground">
          {isActive ? (
            isAsc ? (
              <ArrowUpIcon className="h-4 w-4" />
            ) : (
              <ArrowDownIcon className="h-4 w-4" />
            )
          ) : (
            <ArrowUpDownIcon className="h-4 w-4" />
          )}
        </span>
      </div>
    </TableHead>
  )
}
