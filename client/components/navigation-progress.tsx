'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

// Warm-cache navigations finish well inside this, so the bar only appears when a page is slow.
const SHOW_AFTER_MS = 200

type Phase = 'idle' | 'waiting' | 'loading'

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const route = `${pathname}?${searchParams}`
  const routeRef = useRef(route)
  const [phase, setPhase] = useState<Phase>('idle')
  const [from, setFrom] = useState<string | null>(null)

  useEffect(() => {
    routeRef.current = route
  }, [route])

  useEffect(() => {
    let timer: number | undefined
    // Capture phase: Next's Link calls preventDefault before a bubbling listener would run.
    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = (event.target as Element | null)?.closest('a')
      if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return
      const url = new URL(link.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      const start = routeRef.current
      window.clearTimeout(timer)
      setFrom(start)
      setPhase('waiting')
      timer = window.setTimeout(() => {
        setPhase(p => (p === 'waiting' && routeRef.current === start ? 'loading' : p))
      }, SHOW_AFTER_MS)
    }
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.clearTimeout(timer)
    }
  }, [])

  const visible = phase === 'loading'
  const finishing = visible && from !== route

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5">
      <div
        onTransitionEnd={() => {
          if (!finishing) return
          setPhase('idle')
          setFrom(null)
        }}
        className={cn(
          'h-full origin-left bg-blue-600',
          !visible && 'scale-x-0 opacity-0',
          visible && !finishing && 'animate-nav-progress motion-reduce:animate-none motion-reduce:scale-x-100',
          finishing && 'scale-x-100 opacity-0 transition-opacity delay-100 duration-300',
        )}
      />
    </div>
  )
}
