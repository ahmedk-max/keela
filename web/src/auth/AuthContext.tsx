import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth'
import { auth, googleProvider, isAllowedUser } from '../lib/firebase'
import { DEMO } from '../data/demo'

interface AuthState {
  user: User | null
  loading: boolean
  denied: boolean // signed in with a Google account that isn't on the allowlist
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    // Dev-only demo mode: skip Firebase, present a fake signed-in user.
    if (DEMO) {
      setUser({ uid: 'demo', displayName: 'Ahmed' } as User)
      setLoading(false)
      return
    }
    return onAuthStateChanged(auth, (u) => {
      // Client-side allowlist gate (the real lock is firestore.rules). A non-owner
      // account is signed straight back out so it never reaches the app shell.
      if (u && !isAllowedUser(u)) {
        setUser(null)
        setDenied(true)
        setLoading(false)
        fbSignOut(auth).catch(() => {})
        return
      }
      setUser(u)
      if (u) setDenied(false)
      setLoading(false)
    })
  }, [])

  const signIn = async () => {
    setDenied(false)
    await signInWithPopup(auth, googleProvider)
  }
  const signOut = async () => {
    await fbSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, denied, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
