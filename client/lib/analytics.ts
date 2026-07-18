/**
 * Thin wrapper around Plausible custom events.
 *
 * Custom *properties* are a Business-plan feature, so we encode any dimension we
 * care about (e.g. the chosen theme) into the event name itself. Each distinct
 * name is a normal custom-event goal, which works on every paid plan.
 */
declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string | number | boolean> }) => void
  }
}

export function trackEvent(name: string) {
  if (typeof window === 'undefined') return
  window.plausible?.(name)
}
