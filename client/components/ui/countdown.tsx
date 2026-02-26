'use client'

import { useSyncExternalStore, useCallback } from 'react'

interface CountdownProps {
  targetDate: string
  tournamentName?: string
  location?: string
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calculateTimeLeft(targetDate: string): TimeLeft | null {
  const now = new Date().getTime()
  // Assume 9am start time
  const target = new Date(targetDate + ' 09:00:00').getTime()
  const difference = target - now

  if (difference <= 0) return null

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((difference % (1000 * 60)) / 1000)
  }
}

function subscribe(callback: () => void) {
  const id = setInterval(callback, 1000)
  return () => clearInterval(id)
}

export function Countdown({ targetDate }: CountdownProps) {
  const getSnapshot = useCallback(() => {
    const tl = calculateTimeLeft(targetDate)
    return tl ? JSON.stringify(tl) : null
  }, [targetDate])

  const getServerSnapshot = useCallback(() => null, [])

  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const timeLeft: TimeLeft | null = raw ? JSON.parse(raw) : null

  if (raw === null && typeof window === 'undefined') {
    return <span className="text-sm text-gray-500">Loading...</span>
  }

  if (!timeLeft) {
    return <span className="text-sm text-green-600 font-medium">Tournament Started!</span>
  }

  const formatTime = () => {
    if (timeLeft.days > 0) {
      return `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`
    } else if (timeLeft.hours > 0) {
      return `${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`
    } else {
      return `${timeLeft.minutes}m ${timeLeft.seconds}s`
    }
  }

  return <span className="font-mono text-sm">{formatTime()}</span>
}
