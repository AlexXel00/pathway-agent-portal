import { useState } from 'react'
import { supabase } from '../lib/supabase'

const LOGO_URL =
  'https://vryeqtjnefdlqprzglmp.supabase.co/storage/v1/object/public/property-media/brand/pathway-logo.jpg'

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setInfo(
          'Konto erstellt. Falls eine Bestaetigungs-Mail noetig ist, schau in deinem Postfach nach, ansonsten bist du jetzt eingeloggt.'
        )
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Etwas ist schiefgelaufen.'
      if (message.toLowerCase().includes('nicht als agent registriert')) {
        setError(
          'Diese Email ist nicht als Agent registriert. Bitte wende dich an einen Admin, damit er dich zuerst im System anlegt.'
        )
      } else {
        setError(message)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #fffaf0 0%, #e4ded3 100%)',
        padding: 24,
      }}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: 420, padding: '40px 36px', textAlign: 'center' }}
      >
        <img
          src={LOGO_URL}
          alt="Pathway Real Estate"
          style={{ width: 84, height: 84, objectFit: 'contain', margin: '0 auto 18px' }}
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.display = 'none'
          }}
        />
        <h1 style={{ fontSize: '1.6rem' }}>Pathway Agent Portal</h1>
        <p style={{ color: 'var(--color-secondary)', marginBottom: 28 }}>
          {mode === 'signin' ? 'Melde dich mit deinem Agent-Konto an.' : 'Konto fuer dein Agent-Profil anlegen.'}
        </p>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Passwort</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p style={{ color: 'var(--color-danger)', fontSize: '0.88rem', marginBottom: 14 }}>{error}</p>
          )}
          {info && (
            <p style={{ color: 'var(--color-success)', fontSize: '0.88rem', marginBottom: 14 }}>{info}</p>
          )}

          <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Bitte warten...' : mode === 'signin' ? 'Anmelden' : 'Konto erstellen'}
          </button>
        </form>

        <button
          type="button"
          className="btn btn-ghost"
          style={{ marginTop: 18 }}
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError(null)
            setInfo(null)
          }}
        >
          {mode === 'signin'
            ? 'Noch kein Konto? Erstelle eins mit deiner Agent-Email'
            : 'Bereits ein Konto? Zur Anmeldung'}
        </button>
      </div>
    </div>
  )
}
