export type DesignThemeId =
  | 'default'
  | 'neo-brutalist'
  | 'brutalist'
  | 'swiss'
  | 'editorial'
  | 'felt'

export interface DesignThemeMeta {
  id: DesignThemeId
  label: string
  blurb: string
}

// Order shown in the picker. "default" is the untouched baseline.
export const DESIGN_THEMES: DesignThemeMeta[] = [
  { id: 'default', label: 'Default', blurb: 'The original look' },
  { id: 'neo-brutalist', label: 'Neo-Brutalist', blurb: 'Chunky borders, hard shadows' },
  { id: 'brutalist', label: 'Brutalist', blurb: 'Mono type, safety orange' },
  { id: 'swiss', label: 'Swiss', blurb: 'Ruled tables, red accents' },
  { id: 'editorial', label: 'Editorial', blurb: 'Serif headlines, oxblood ink' },
  { id: 'felt', label: 'Felt', blurb: 'Club-table green and brass' },
]

export const DEFAULT_THEME: DesignThemeId = 'default'
export const THEME_STORAGE_KEY = 'gp-design-theme'

// Public content routes that get themed. Detail pages (tournament/player)
// are matched by prefix; admin stays on the default look. "/" matches exactly.
export const THEMED_PATHS = [
  '/',
  '/rankings',
  '/tournaments',
  '/ladies',
  '/insights',
  '/tournament',
  '/player',
]

// True when the given pathname should receive the selected design theme.
export function isThemedPath(pathname: string): boolean {
  if (pathname === '/') return true
  return THEMED_PATHS.some(
    p => p !== '/' && (pathname === p || pathname.startsWith(`${p}/`))
  )
}

export function isDesignThemeId(value: unknown): value is DesignThemeId {
  return typeof value === 'string' && DESIGN_THEMES.some(t => t.id === value)
}
