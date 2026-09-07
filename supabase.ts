import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in the values.'
  )
}

// If a browser tab sits open in the background for a while, its login session can
// expire without the app noticing (background tabs get throttled, so the automatic
// token refresh sometimes fires too late). Without this, every data request then
// silently fails with 401 and the page just looks broken/empty, with no clue why.
// This intercepts every Supabase request: on a 401 it signs the user out once and
// sends them back to a clean login screen instead of showing a stuck, half-empty page.
let handlingExpiredSession = false

async function fetchWithSessionGuard(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init)
  if (response.status === 401 && !handlingExpiredSession) {
    handlingExpiredSession = true
    try {
      sessionStorage.setItem('pathway-session-expired', '1')
    } catch {
      // ignore - sessionStorage may be unavailable, the message is a nice-to-have
    }
    supabase.auth.signOut().finally(() => {
      handlingExpiredSession = false
    })
  }
  return response
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithSessionGuard },
})

export const MEDIA_BUCKET = 'property-media'
