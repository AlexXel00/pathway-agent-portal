import type { Agent } from '../lib/types'

const AVATAR_COLORS = ['#7e6454', '#4f7a5c', '#a1493f', '#5c7d8a', '#9c6b53', '#8d7764', '#b6a180']

function colorForName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

interface Props {
  agent: Agent
}

export default function AgentCard({ agent }: Props) {
  const joined = new Date(agent.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: '22px 26px',
        marginBottom: 28,
        flexWrap: 'wrap',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: colorForName(agent.name),
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.3rem',
          fontWeight: 700,
          fontFamily: 'var(--font-heading)',
          flexShrink: 0,
        }}
      >
        {initials(agent.name) || '?'}
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>{agent.name}</h2>
          <span className={`badge ${agent.is_admin ? 'badge-active' : 'badge-neutral'}`}>
            {agent.is_admin ? 'Admin' : 'Agent'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--color-secondary)', marginTop: 8 }}>
          {agent.email && <span>{agent.email}</span>}
          {agent.phone && <span>{agent.phone}</span>}
          <span>With Pathway since {joined}</span>
        </div>
      </div>
    </div>
  )
}
