export type DesignThemeId =
  | 'default'
  | 'brutalist'
  | 'neo-brutalist'
  | 'swiss'
  | 'editorial'
  | 'glass'

export interface DesignThemeMeta {
  id: DesignThemeId
  label: string
  blurb: string
}

// Order shown in the picker. "default" is the untouched baseline.
export const DESIGN_THEMES: DesignThemeMeta[] = [
  { id: 'default', label: 'Default', blurb: 'The original look' },
  { id: 'brutalist', label: 'Brutalist', blurb: 'Raw HTML, hard black grid' },
  { id: 'neo-brutalist', label: 'Neo-Brutalist', blurb: 'Chunky borders, offset shadows' },
  { id: 'swiss', label: 'Swiss', blurb: 'Ruled tables, tabular figures, red index' },
  { id: 'editorial', label: 'Editorial', blurb: 'Serif headlines, warm paper' },
  { id: 'glass', label: 'Liquid Glass', blurb: 'Frosted panels, blur, soft depth' },
]

export const DEFAULT_THEME: DesignThemeId = 'default'
export const THEME_STORAGE_KEY = 'gp-design-theme'

// Public content routes that get themed. Detail pages (tournament/player)
// are matched by prefix; admin stays on the default look. "/" matches exactly.
export const THEMED_PATHS = [
  '/',
  '/rankings',
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
