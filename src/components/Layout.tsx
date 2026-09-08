import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ChatProvider, useChat } from '../context/ChatContext'

// Tightly cropped icon-only mark (no wordmark, no padding) - the header already shows the
// "Pathway" text next to it, so the full logo file (which has a lot of transparent margin
// plus its own "Pathway Real Estate" wordmark baked in) looked tiny and redundant here.
const LOGO_URL = `${import.meta.env.BASE_URL}pathway-icon.png`

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

function UnreadDot() {
  return (
    <span
      style={{
        position: 'absolute',
        top: -1,
        right: -9,
        width: 9,
        height: 9,
        borderRadius: '50%',
        background: 'var(--color-success)',
        border: '1.5px solid #fff',
      }}
    />
  )
}

function ChatNavLink() {
  const { hasUnread } = useChat()
  return (
    <NavLink to="/chat" style={navLinkStyle}>
      <span style={{ position: 'relative' }}>
        Chat
        {hasUnread && <UnreadDot />}
      </span>
    </NavLink>
  )
}

export default function Layout() {
  const { agent, signOut } = useAuth()

  return (
    <ChatProvider>
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
              gap: 24,
              padding: '20px 24px',
              flexWrap: 'wrap',
              minHeight: 118,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginRight: 8 }}>
              <img
                src={LOGO_URL}
                alt="Pathway"
                style={{ height: 78, width: 'auto', objectFit: 'contain' }}
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1.5rem' }}>
                Pathway
              </span>
            </div>

            <nav style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
              <NavLink to="/overview" style={navLinkStyle}>
                Overview
              </NavLink>
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
              <ChatNavLink />
              {(agent?.is_admin || agent?.role === 'Marketing') && (
                <NavLink to="/marketing-material" style={navLinkStyle}>
                  Marketing Material
                </NavLink>
              )}
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
    </ChatProvider>
  )
}
