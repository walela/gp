import type { PlayerRanking } from '@/services/api'

export function getDisplayName(fullName: string): string {
  if (fullName.length <= 22) {
    return fullName
  }

  const parts = fullName.trim().split(' ')
  if (parts.length >= 2) {
    const allButLast = parts.slice(0, -1).join(' ')
    const lastPart = parts[parts.length - 1]

    return `${allButLast} ${lastPart.charAt(0)}.`
  }

  return fullName.substring(0, 20) + '...'
}

// 17 characters is the most that fits the rankings table on a 360px phone
// in every theme, including Brutalist's monospace.
const MOBILE_NAME_MAX = 17

export function getMobileDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  for (let i = parts.length - 1; i >= 1 && parts.join(' ').length > MOBILE_NAME_MAX; i--) {
    if (!parts[i].endsWith('.')) parts[i] = `${parts[i].charAt(0)}.`
  }
  while (parts.length > 2 && parts.join(' ').length > MOBILE_NAME_MAX) parts.pop()
  const name = parts.join(' ')
  return name.length > MOBILE_NAME_MAX ? `${name.substring(0, MOBILE_NAME_MAX - 1)}…` : name
}

export function getRankMovement(player: PlayerRanking): {
  label: string
  className: string
  ariaLabel: string
} | null {
  const change = player.rank_change ?? null
  const isNew = player.is_new ?? false

  if (isNew) {
    return {
      label: 'NEW',
      className: 'bg-cyan-100 text-cyan-700',
      ariaLabel: 'New entrant in top rankings'
    }
  }

  if (change === null) {
    return null
  }

  if (change > 0) {
    return {
      label: `↑${change}`,
      className: 'bg-green-100 text-green-700',
      ariaLabel: `Moved up ${change} ${change === 1 ? 'spot' : 'spots'}`
    }
  }

  const magnitude = Math.abs(change)
  if (magnitude === 0) {
    return {
      label: '-',
      className: 'text-gray-500',
      ariaLabel: 'No change in ranking'
    }
  }

  return {
    label: `↓${magnitude}`,
    className: 'bg-red-100 text-red-700',
    ariaLabel: `Moved down ${magnitude} ${magnitude === 1 ? 'spot' : 'spots'}`
  }
}
