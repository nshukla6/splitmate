import { useCallback, useMemo, useState } from 'react'
import * as storage from '../data/storage.js'
import { AuthContext } from './auth-context.js'

/**
 * Every piece of authentication lives here: seeding the test accounts,
 * registering, signing in, restoring the session, and signing out.
 * No other component reads users or the session out of storage.
 *
 * Passwords are compared in plain text on purpose — this build is local only.
 */
export function AuthProvider({ children }) {
  // Seeding and the session read are synchronous, so the first render already
  // knows who is signed in and a refresh never flashes the signed-out view.
  const [user, setUser] = useState(() => {
    storage.seed()
    const sessionId = storage.getSessionUserId()
    return sessionId ? storage.findUserById(sessionId) : null
  })

  const login = useCallback((email, password) => {
    const normalized = storage.normalizeEmail(email)
    const match = storage.findUserByEmail(normalized)

    if (!match) return { ok: false, error: 'No account uses that email address.' }
    if (match.password !== password) return { ok: false, error: 'That password does not match.' }

    storage.setSessionUserId(match.id)
    setUser(match)
    return { ok: true, user: match }
  }, [])

  const register = useCallback(({ name, email, password }) => {
    const trimmedName = String(name ?? '').trim()
    const normalized = storage.normalizeEmail(email)

    if (!trimmedName) return { ok: false, error: 'Enter your name.' }
    if (!normalized.includes('@')) return { ok: false, error: 'Enter a valid email address.' }
    if (!password) return { ok: false, error: 'Choose a password.' }
    if (storage.findUserByEmail(normalized)) {
      return { ok: false, error: 'That email already has an account. Sign in instead.' }
    }

    const created = storage.createUser({ name: trimmedName, email: normalized, password })
    storage.setSessionUserId(created.id)
    setUser(created)
    return { ok: true, user: created }
  }, [])

  const logout = useCallback(() => {
    storage.clearSession()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, login, register, logout }),
    [user, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
