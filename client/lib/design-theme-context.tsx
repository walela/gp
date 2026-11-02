'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { usePathname } from 'next/navigation'
import {
  DEFAULT_THEME,
  THEME_EXPIRY_KEY,
  THEME_STORAGE_KEY,
  automaticTheme,
  isThemedPath,
  isDesignThemeId,
  nextThemeSwitch,
  type DesignThemeId,
} from '@/lib/design-themes'

interface DesignThemeContextValue {
  theme: DesignThemeId
  setTheme: (theme: DesignThemeId) => void
}

interface ThemeChoice {
  theme: DesignThemeId
  expires: number
}

const DesignThemeContext = createContext<DesignThemeContextValue | null>(null)

/**
 * Applies the selected design theme by setting `data-theme` on <html>, but only
 * while the user is on a themed public route (tournaments, rankings, ladies,
 * insights, and tournament/player detail pages). On every other route (e.g.
 * admin) the attribute is removed so it keeps its default look. An explicit
 * choice is persisted in localStorage and shared across all themed pages until
 * the next nextThemeSwitch(); without one, the theme follows automaticTheme().
 * Both update live.
 */
function clearStoredChoice() {
  try {
    window.localStorage.removeItem(THEME_STORAGE_KEY)
    window.localStorage.removeItem(THEME_EXPIRY_KEY)
  } catch {
    // ignore
  }
}

function readStoredChoice(): ThemeChoice | null {
  if (typeof window === 'undefined') return null
  try {
    const theme = window.localStorage.getItem(THEME_STORAGE_KEY)
    const expires = Number(window.localStorage.getItem(THEME_EXPIRY_KEY))
    if (isDesignThemeId(theme) && expires > Date.now()) return { theme, expires }
    if (theme) clearStoredChoice()
  } catch {
    // ignore
  }
  return null
}

function readAutomaticTheme(): DesignThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME
  return automaticTheme()
}

export function DesignThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Initialise from storage synchronously so the client's first render already
  // has the right theme — the inline <head> script sets the attribute before
  // paint, and this keeps the provider from flipping it back to default.
  const [choice, setChoice] = useState<ThemeChoice | null>(readStoredChoice)
  const [autoTheme, setAutoTheme] = useState<DesignThemeId>(readAutomaticTheme)
  const theme = choice?.theme ?? autoTheme

  const isThemedRoute = isThemedPath(pathname)

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setAutoTheme(automaticTheme(now))
      if (choice && now.getTime() >= choice.expires) {
        clearStoredChoice()
        setChoice(null)
      }
    }
    update()
    const timer = window.setInterval(update, 60_000)
    return () => window.clearInterval(timer)
  }, [choice])

  useEffect(() => {
    const root = document.documentElement
    if (isThemedRoute && theme !== DEFAULT_THEME) {
      root.setAttribute('data-theme', theme)
    } else {
      root.removeAttribute('data-theme')
    }
    return () => {
      root.removeAttribute('data-theme')
    }
  }, [isThemedRoute, theme])

  const setTheme = useCallback((next: DesignThemeId) => {
    const picked = { theme: next, expires: nextThemeSwitch().getTime() }
    setChoice(picked)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
      window.localStorage.setItem(THEME_EXPIRY_KEY, String(picked.expires))
    } catch {
      // ignore
    }
  }, [])

  return (
    <DesignThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </DesignThemeContext.Provider>
  )
}

export function useDesignTheme() {
  const ctx = useContext(DesignThemeContext)
  if (!ctx) {
    throw new Error('useDesignTheme must be used within a DesignThemeProvider')
  }
  return ctx
}
