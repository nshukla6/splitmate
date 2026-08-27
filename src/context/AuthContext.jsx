import { useCallback, useEffect, useMemo, useState } from 'react'
import * as storage from '../data/storage.js'
import { supabase } from '../data/supabaseClient.js'
import { AuthContext } from './auth-context.js'

/**
 * Every piece of authentication lives here: signing in, registering, restoring
 * the session, and signing out — all via Supabase Auth. No other component
 * talks to Supabase Auth directly.
 *
 * Group membership (buildMember, activatePendingMemberships in storage.js)
 * and CreateGroup's invite preview resolve people against storage.js's
 * `users` table, so syncLocalUser mirrors every signed-in Supabase Auth user
 * into that table. Without this, a real registered account would still show
 * up as a guessed-name "pending" invite.
 */

function humanizeAuthError(error, fallback) {
  const message = error?.message ?? ''
  if (/invalid login credentials/i.test(message)) return 'Incorrect email or password.'
  if (/already registered/i.test(message)) return 'That email already has an account. Sign in instead.'
  if (/email.*not confirmed/i.test(message)) return 'Confirm your email before signing in.'
  return message || fallback
}

/** Ensures a `users` row exists for this Supabase Auth user; reuses it if one already does. */
async function syncLocalUser(supabaseUser) {
  const email = storage.normalizeEmail(supabaseUser.email)
  const existing = await storage.findUserByEmail(email)
  if (existing) return { id: supabaseUser.id, name: existing.name, email }

  const name = supabaseUser.user_metadata?.name?.trim() || storage.nameFromEmail(email)
  const created = await storage.createUser({ name, email })
  return { id: supabaseUser.id, name: created.name, email }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    storage.seed()
    let active = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const resolved = session?.user ? await syncLocalUser(session.user) : null
      if (!active) return
      setUser(resolved)
      setInitializing(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) return setUser(null)
      syncLocalUser(session.user).then((resolved) => {
        if (active) setUser(resolved)
      })
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const normalized = storage.normalizeEmail(email)
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalized, password })
    if (error) return { ok: false, error: humanizeAuthError(error, 'Could not sign in.') }

    const resolved = await syncLocalUser(data.user)
    setUser(resolved)
    return { ok: true, user: resolved }
  }, [])

  const register = useCallback(async ({ name, email, password }) => {
    const trimmedName = String(name ?? '').trim()
    const normalized = storage.normalizeEmail(email)

    if (!trimmedName) return { ok: false, error: 'Enter your name.' }
    if (!normalized.includes('@')) return { ok: false, error: 'Enter a valid email address.' }
    if (!password) return { ok: false, error: 'Choose a password.' }

    const { data, error } = await supabase.auth.signUp({
      email: normalized,
      password,
      options: { data: { name: trimmedName } },
    })
    if (error) return { ok: false, error: humanizeAuthError(error, 'Could not create account.') }
    if (!data.session) {
      return {
        ok: false,
        error: 'Account created, but email confirmation is still required — disable it in Supabase Auth settings.',
      }
    }

    const resolved = await syncLocalUser(data.user)
    setUser(resolved)
    return { ok: true, user: resolved }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, login, register, logout }),
    [user, login, register, logout],
  )

  // Avoid a false "signed out" flash on reload while the session is being restored.
  if (initializing) return null

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
