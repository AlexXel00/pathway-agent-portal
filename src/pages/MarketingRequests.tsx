import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Agent, MarketingRequest } from '../lib/types'
import { getAgentInitials } from '../lib/format'

export default function MarketingRequests() {
  const { agent } = useAuth()
  const [messages, setMessages] = useState<MarketingRequest[]>([])
  const [agentsById, setAgentsById] = useState<Record<string, Agent>>({})
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function load() {
    setLoading(true)
    const [{ data: msgs }, { data: agents }] = await Promise.all([
      supabase.from('marketing_requests').select('*').order('created_at', { ascending: true }),
      supabase.from('agents').select('*'),
    ])
    setMessages(msgs ?? [])
    const map: Record<string, Agent> = {}
    ;(agents ?? []).forEach((a) => (map[a.id] = a))
    setAgentsById(map)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!agent || !text.trim()) return
    setSending(true)
    const { data, error } = await supabase
      .from('marketing_requests')
      .insert({ sender_agent_id: agent.id, message: text.trim() })
      .select()
      .single()
    setSending(false)
    if (!error && data) {
      setMessages((prev) => [...prev, data])
      setText('')
    }
  }

  return (
    <div>
      <h1>{agent?.role === 'Marketing' ? 'Request Material' : 'Marketing Requests'}</h1>
      <p style={{ color: 'var(--color-secondary)', marginBottom: 24 }}>
        {agent?.role === 'Marketing'
          ? 'Ask admins for specific marketing material you need.'
          : 'Requests from Marketing for specific material - reply here.'}
      </p>

      <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 700 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 460, overflowY: 'auto', paddingRight: 4 }}>
          {loading ? (
            <p style={{ color: 'var(--color-secondary)' }}>Loading...</p>
          ) : messages.length === 0 ? (
            <p style={{ color: 'var(--color-secondary)' }}>No messages yet.</p>
          ) : (
            messages.map((m) => {
              const sender = agentsById[m.sender_agent_id]
              const isMe = m.sender_agent_id === agent?.id
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    background: isMe ? 'var(--color-primary)' : 'var(--color-ivory)',
                    color: isMe ? 'var(--color-ivory)' : 'var(--color-charcoal)',
                    borderRadius: 14,
                    padding: '10px 14px',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, marginBottom: 4, opacity: 0.8 }}>
                    {sender ? `${sender.name} (${getAgentInitials(sender.name)})` : 'Unknown'}
                  </div>
                  <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-line' }}>{m.message}</div>
                  <div style={{ fontSize: '0.68rem', opacity: 0.7, marginTop: 4 }}>
                    {new Date(m.created_at).toLocaleString()}
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            placeholder={agent?.role === 'Marketing' ? 'What material do you need?' : 'Reply...'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 10,
              border: '1.5px solid var(--color-beige)',
            }}
          />
          <button type="submit" className="btn btn-primary" disabled={sending || !text.trim()}>
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}
