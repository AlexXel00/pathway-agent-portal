import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const LOGO_URL =
  'https://vryeqtjnefdlqprzglmp.supabase.co/storage/v1/object/public/property-media/brand/pathway-logo.jpg'

const navLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  padding: '8px 14px',
  borderRadius: 999,
  fontSize: '0.88rem',
  fontWeight: 600,
  textDecoration: 'none',
  color: isActive ? 'var(--color-ivory)' : 'var(--color-charcoal)',
  background: isActive ? 'var(--color-primary)' : 'transparent',
  whiteSpace: 'nowrap',
})

export default function Layout() {
  const { agent, signOut } = useAuth()

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          background: '#fff',
          borderBottom: '1px solid var(--color-beige)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            padding: '14px 24px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 8 }}>
            <img
              src={LOGO_URL}
              alt="Pathway"
              style={{ width: 34, height: 34, objectFit: 'contain' }}
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1.1rem' }}>
              Pathway
            </span>
          </div>

          <nav style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
            <NavLink to="/listings" style={navLinkStyle}>
              Listings
            </NavLink>
            <NavLink to="/my-activity" style={navLinkStyle}>
              My Activity
            </NavLink>
            <NavLink to="/agents" style={navLinkStyle}>
              Agents
            </NavLink>
            <NavLink to="/company" style={navLinkStyle}>
              Company Info
            </NavLink>
            {agent?.is_admin && (
              <NavLink to="/admin/new-listing" style={navLinkStyle}>
                + New Listing
              </NavLink>
            )}
            {agent?.is_admin && (
              <NavLink to="/admin/agents" style={navLinkStyle}>
                Manage Agents
              </NavLink>
            )}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-secondary)' }}>
              {agent?.name ?? '...'}
              {agent?.is_admin ? ' (Admin)' : ''}
            </span>
            <button className="btn btn-outline" onClick={() => signOut()}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, padding: '32px 0 64px' }}>
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
