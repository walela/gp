const TOKEN_KEY = 'gp-admin-token'
const EXPIRY_KEY = 'gp-admin-expiry'
const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null
  const expiry = localStorage.getItem(EXPIRY_KEY)
  if (expiry && Date.now() > parseInt(expiry)) {
    clearAdminToken()
    return null
  }
  return localStorage.getItem(TOKEN_KEY)
}

export function setAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + TTL_MS))
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EXPIRY_KEY)
}
