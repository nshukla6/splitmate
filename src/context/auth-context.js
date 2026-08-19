import { createContext, useContext } from 'react'

/**
 * Lives apart from the provider component so that consuming a fast-refresh
 * boundary never re-creates the context.
 */
export const AuthContext = createContext(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
