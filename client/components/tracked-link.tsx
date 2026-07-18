'use client'

import type { AnchorHTMLAttributes } from 'react'
import { trackEvent } from '@/lib/analytics'

interface TrackedLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Plausible custom-event name fired on click. */
  event: string
}

/**
 * Anchor that fires a Plausible custom event on click. Lets server components
 * (which can't carry onClick) opt into click tracking by rendering this instead
 * of a bare <a>. The navigation is untouched — we only enqueue the event first.
 */
export function TrackedLink({ event, onClick, ...props }: TrackedLinkProps) {
  return (
    <a
      {...props}
      onClick={e => {
        trackEvent(event)
        onClick?.(e)
      }}
    />
  )
}
