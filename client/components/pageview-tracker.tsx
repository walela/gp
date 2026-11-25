'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageview } from '@/lib/analytics'

// Bots on residential proxies run the analytics script like a real browser but rarely send
// real input, so a visit only counts once someone touches, clicks, moves the mouse, turns the
// wheel or presses a key. Scroll events are left out because page scripts can trigger them.
const INPUT_EVENTS = ['pointerdown', 'pointermove', 'touchstart', 'wheel', 'keydown'] as const
const HUMAN_KEY = 'gp-human'
const LISTENER_OPTIONS = { capture: true, passive: true }

// Like Plausible's automatic tracking, only path changes count: sorting or filtering a page
// through its query string is not a new pageview.
function countPage(counted: { current: string | null }) {
  if (counted.current === location.pathname) return
  counted.current = location.pathname
  trackPageview()
}

export function PageviewTracker() {
  const pathname = usePathname()
  const human = useRef(false)
  const counted = useRef<string | null>(null)

  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (!event.persisted || !human.current) return
      counted.current = null
      countPage(counted)
    }
    window.addEventListener('pageshow', onPageShow)

    try {
      human.current = sessionStorage.getItem(HUMAN_KEY) === '1'
    } catch {}
    if (human.current) return () => window.removeEventListener('pageshow', onPageShow)

    function onInput(event: Event) {
      if (!event.isTrusted) return
      human.current = true
      try {
        sessionStorage.setItem(HUMAN_KEY, '1')
      } catch {}
      removeInputListeners()
      countPage(counted)
    }
    function removeInputListeners() {
      INPUT_EVENTS.forEach(type => window.removeEventListener(type, onInput, LISTENER_OPTIONS))
    }
    INPUT_EVENTS.forEach(type => window.addEventListener(type, onInput, LISTENER_OPTIONS))
    return () => {
      window.removeEventListener('pageshow', onPageShow)
      removeInputListeners()
    }
  }, [])

  useEffect(() => {
    if (human.current) countPage(counted)
  }, [pathname])

  return null
}
