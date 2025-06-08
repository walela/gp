'use client'

import { useState, useEffect } from 'react'

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

export function Countdown({ targetDate }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    const calculateTimeLeft = (): TimeLeft | null => {
      const now = new Date().getTime()
      // Assume 9am start time
      const target = new Date(targetDate + ' 09:00:00').getTime()
      const difference = target - now

      if (difference <= 0) {
        setIsExpired(true)
        return null
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000)
      }
    }

    // Initial calculation
    const initialTimeLeft = calculateTimeLeft()
    setTimeLeft(initialTimeLeft)

    // Set up interval
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft()
      setTimeLeft(newTimeLeft)
    }, 1000)

    return () => clearInterval(timer)
  }, [targetDate, isClient])

  if (!isClient) {
    return <span className="text-sm text-gray-500">Loading...</span>
  }

  if (isExpired) {
    return <span className="text-sm text-green-600 font-medium">Tournament Started!</span>
  }

  if (!timeLeft) {
    return <span className="text-sm text-gray-500">Loading...</span>
  }

  // Format time - always include seconds
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