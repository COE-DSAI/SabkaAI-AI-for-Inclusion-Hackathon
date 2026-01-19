/**
 * Get authentication token from localStorage (for backward compatibility).
 * NOTE: Primary authentication now uses httpOnly cookies which are sent automatically.
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

/**
 * Set token in localStorage (for backward compatibility).
 * NOTE: Primary authentication now uses httpOnly cookies set by backend.
 */
export function setToken(token: string): void {
  // Keep localStorage for backward compatibility, but cookies are primary
  localStorage.setItem('access_token', token)
}

/**
 * Clear all authentication data including localStorage and cookies.
 * NOTE: httpOnly cookies are cleared by backend /logout endpoint.
 */
export function clearToken(): void {
  localStorage.removeItem('access_token')
  localStorage.removeItem('protego-store')
  // Note: httpOnly cookies can only be cleared by backend
  // The /api/auth/logout endpoint handles this
}

/**
 * Check if user is authenticated.
 * Checks both localStorage token (backward compat) and cookie presence.
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false

  // Check localStorage token
  const localToken = localStorage.getItem('access_token')
  if (localToken) return true

  // Check for access_token cookie (even though we can't read httpOnly cookies,
  // we can check if any auth-related data exists in store)
  const store = localStorage.getItem('protego-store')
  if (store) {
    try {
      const parsed = JSON.parse(store)
      return !!parsed?.state?.user
    } catch {
      return false
    }
  }

  return false
}

/**
 * Get cookie value by name (for non-httpOnly cookies only).
 * NOTE: httpOnly cookies cannot be read by JavaScript.
 */
export function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=')
    if (key === name) return value
  }
  return null
}
