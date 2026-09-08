import { useAuth } from '../context/AuthContext'

// "What happened since your last login" popup - shown once right after a genuine sign-in
// when get_login_digest() found at least one change. See AuthContext for when it is loaded.
export default function LoginDigestModal() {
  const { loginDigest, dismissLoginDigest } = useAuth()

  if (!loginDigest) return null

  const items: string[] = []
  if (loginDigest.new_listings > 0) {
    items.push(
      `${loginDigest.new_listings} new listing${loginDigest.new_listings === 1 ? '' : 's'} ${
        loginDigest.new_listings === 1 ? 'was' : 'were'
      } uploaded`
    )
  }
  if (loginDigest.sold_listings > 0) {
    items.push(
      loginDigest.sold_listings === 1
        ? '1 property was sold'
        : `${loginDigest.sold_listings} properties were sold`
    )
  }
  if (loginDigest.missed_messages > 0) {
    items.push(
      `${loginDigest.missed_messages} missed message${loginDigest.missed_messages === 1 ? '' : 's'}`
    )
  }

  if (items.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(30, 26, 20, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: 24,
      }}
      onClick={dismissLoginDigest}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: 420, padding: '32px 30px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: 6 }}>Welcome back</h2>
        <p style={{ color: 'var(--color-secondary)', marginBottom: 18 }}>
          What happened since your last login:
        </p>
        <ul style={{ margin: '0 0 26px', paddingLeft: 20, lineHeight: 1.8 }}>
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={dismissLoginDigest}>
          Got it
        </button>
      </div>
    </div>
  )
}
