import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Agent } from '../lib/types'

interface AuthContextValue {
  session: Session | null
  agent: Agent | null
  loading: boolean
  refreshAgent: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadAgent(userId: string) {
    const { data } = await supabase.from('agents').select('*').eq('user_id', userId).maybeSingle()
    setAgent(data ?? null)
  }

  async function refreshAgent() {
    if (session?.user?.id) {
      await loadAgent(session.user.id)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session?.user?.id) {
        await loadAgent(data.session.user.id)
      }
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      if (newSession?.user?.id) {
        await loadAgent(newSession.user.id)
      } else {
        setAgent(null)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setAgent(null)
  }

  return (
    <AuthContext.Provider value={{ session, agent, loading, refreshAgent, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
