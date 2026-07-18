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
  THEME_STORAGE_KEY,
  isThemedPath,
  isDesignThemeId,
  type DesignThemeId,
} from '@/lib/design-themes'

interface DesignThemeContextValue {
  theme: DesignThemeId
  setTheme: (theme: DesignThemeId) => void
}

const DesignThemeContext = createContext<DesignThemeContextValue | null>(null)

/**
 * Applies the selected design theme by setting `data-theme` on <html>, but only
 * while the user is on a themed public route (tournaments, rankings, ladies,
 * insights, and tournament/player detail pages). On every other route (e.g.
 * admin) the attribute is removed so it keeps its default look. The choice is
 * persisted in localStorage and shared across all themed pages.
 */
function readStoredTheme(): DesignThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isDesignThemeId(saved) ? saved : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function DesignThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Initialise from storage synchronously so the client's first render already
  // has the right theme — the inline <head> script sets the attribute before
  // paint, and this keeps the provider from flipping it back to default.
  const [theme, setThemeState] = useState<DesignThemeId>(readStoredTheme)

  const isThemedRoute = isThemedPath(pathname)

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
    setThemeState(next)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
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
