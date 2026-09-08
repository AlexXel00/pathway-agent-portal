import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Agent, LoginDigest } from '../lib/types'

interface AuthContextValue {
  session: Session | null
  agent: Agent | null
  loading: boolean
  refreshAgent: () => Promise<void>
  signOut: () => Promise<void>
  loginDigest: LoginDigest | null
  dismissLoginDigest: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [loginDigest, setLoginDigest] = useState<LoginDigest | null>(null)

  async function loadAgent(userId: string) {
    const { data } = await supabase.from('agents').select('*').eq('user_id', userId).maybeSingle()
    setAgent(data ?? null)
  }

  async function refreshAgent() {
    if (session?.user?.id) {
      await loadAgent(session.user.id)
    }
  }

  // Only meaningful right after a genuine sign-in (see the SIGNED_IN check below), not on
  // every page load/session restore. Silently skipped on a first-ever login (no previous
  // login to compare against) or when nothing changed since last time.
  async function loadLoginDigest() {
    const { data, error } = await supabase.rpc('get_login_digest')
    if (error) return
    const row = Array.isArray(data) ? data[0] : data
    if (!row || !row.previous_login_at) return
    const newListings = Number(row.new_listings) || 0
    const soldListings = Number(row.sold_listings) || 0
    const missedMessages = Number(row.missed_messages) || 0
    if (!newListings && !soldListings && !missedMessages) return
    setLoginDigest({
      new_listings: newListings,
      sold_listings: soldListings,
      missed_messages: missedMessages,
      previous_login_at: row.previous_login_at,
    })
  }

  function dismissLoginDigest() {
    setLoginDigest(null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session?.user?.id) {
        await loadAgent(data.session.user.id)
      }
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession)
      if (newSession?.user?.id) {
        await loadAgent(newSession.user.id)
        // SIGNED_IN fires on a genuine new sign-in; a page refresh/session restore fires
        // INITIAL_SESSION instead, so the digest popup only ever shows right after logging in.
        if (event === 'SIGNED_IN') {
          void loadLoginDigest()
        }
      } else {
        setAgent(null)
      }
    })

    // A tab left in the background for a while gets its timers throttled by the
    // browser, so the automatic pre-expiry token refresh can fire too late. Re-check
    // the session as soon as the tab becomes visible again so it gets refreshed before
    // the user starts clicking around on an already-expired session.
    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      sub.subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setAgent(null)
  }

  return (
    <AuthContext.Provider
      value={{ session, agent, loading, refreshAgent, signOut, loginDigest, dismissLoginDigest }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
