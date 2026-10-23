import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as api from './api'
import type { SignupInput, User } from './types'

const STORAGE_KEY = 'campus-customs.user'

interface AuthValue {
  user: User | null
  logIn: (email: string, password: string) => Promise<void>
  signUp: (input: SignupInput) => Promise<void>
  logOut: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

/**
 * Holds the signed-in shopper for the session.
 *
 * Only the user record is kept in localStorage — never the password, and never
 * the hash, which the API does not send. This is not a security boundary: it
 * remembers who is signed in between page loads, and a real session token is a
 * later problem.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      setUser(JSON.parse(raw) as User)
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const remember = useCallback((u: User) => {
    setUser(u)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
  }, [])

  const logIn = useCallback(
    async (email: string, password: string) => {
      remember((await api.login(email, password)).user)
    },
    [remember],
  )

  const signUp = useCallback(
    async (input: SignupInput) => {
      remember((await api.signup(input)).user)
    },
    [remember],
  )

  const logOut = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const value = useMemo(() => ({ user, logIn, signUp, logOut }), [user, logIn, signUp, logOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
