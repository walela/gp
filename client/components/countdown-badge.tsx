'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import dayjs from '@/lib/dayjs'

interface CountdownBadgeProps {
  targetDate: string
  className?: string
  title?: string
}

function formatCountdown(targetDate: string) {
  const now = dayjs()
  const eventDate = dayjs(targetDate)
  const diffMs = eventDate.diff(now)

  if (diffMs <= 0) {
    return 'Live now'
  }

  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const parts: string[] = []
  if (days > 0) {
    parts.push(`${days}d`)
  }
  if (hours > 0 || days > 0) {
    parts.push(`${hours}h`)
  }
  parts.push(`${minutes}m`)
  parts.push(`${seconds}s`)

  return `${parts.join(' ')} away`
}

export function CountdownBadge({ targetDate, className, title }: CountdownBadgeProps) {
  const [label, setLabel] = useState(() => formatCountdown(targetDate))

  useEffect(() => {
    const interval = setInterval(() => {
      setLabel(formatCountdown(targetDate))
    }, 1000)

    return () => clearInterval(interval)
  }, [targetDate])

  return (
    <span
      className={cn(
        'inline-block text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-medium tracking-wide',
        className
      )}
      title={title}>
      {label}
    </span>
  )
}
