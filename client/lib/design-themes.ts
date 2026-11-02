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
  { id: 'felt', label: 'Felt', blurb: 'Club-table green and brass' },
  { id: 'neo-brutalist', label: 'Neo-Brutalist', blurb: 'Chunky borders, hard shadows' },
  { id: 'brutalist', label: 'Brutalist', blurb: 'Mono type, safety orange' },
  { id: 'swiss', label: 'Swiss', blurb: 'Ruled tables, red accents' },
  { id: 'editorial', label: 'Editorial', blurb: 'Serif headlines, oxblood ink' },
]

export const DEFAULT_THEME: DesignThemeId = 'default'
export const THEME_STORAGE_KEY = 'gp-design-theme'
export const THEME_EXPIRY_KEY = 'gp-design-theme-expires'

// Visitors who haven't picked a theme get Felt when it's night in Kenya
// (20:00-06:00 EAT, UTC+3 with no DST), whatever their device's colour scheme.
// A picked theme lasts until the next switch, then the automatic theme resumes.
export const NIGHT_THEME: DesignThemeId = 'felt'
const EAT_UTC_OFFSET_MS = 3 * 60 * 60 * 1000
const NIGHT_START_HOUR = 20
const NIGHT_END_HOUR = 6

export function isEatNight(now = new Date()): boolean {
  const hour = new Date(now.getTime() + EAT_UTC_OFFSET_MS).getUTCHours()
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR
}

export function automaticTheme(now = new Date()): DesignThemeId {
  return isEatNight(now) ? NIGHT_THEME : DEFAULT_THEME
}

// The next 06:00 or 20:00 EAT, when the automatic theme changes.
export function nextThemeSwitch(now = new Date()): Date {
  const eat = new Date(now.getTime() + EAT_UTC_OFFSET_MS)
  const next = new Date(eat)
  next.setUTCHours(isEatNight(now) ? NIGHT_END_HOUR : NIGHT_START_HOUR, 0, 0, 0)
  if (next <= eat) next.setUTCDate(next.getUTCDate() + 1)
  return new Date(next.getTime() - EAT_UTC_OFFSET_MS)
}

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
