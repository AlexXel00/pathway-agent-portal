import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Agent, ChatChannel, ChatMessage } from '../lib/types'
import { getAgentInitials } from '../lib/format'

interface ChannelInfo {
  channel: ChatChannel
  isMine: boolean
  label: string
}

export default function Chat() {
  const { agent } = useAuth()
  const [agents, setAgents] = useState<Agent[]>([])
  const [channels, setChannels] = useState<ChannelInfo[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const selectedIdRef = useRef<string | null>(null)
  selectedIdRef.current = selectedId

  async function loadChannels(preferSelect?: string) {
    setLoading(true)
    const [{ data: allAgents }, { data: allChannels }, { data: myMemberships }] = await Promise.all([
      supabase.from('agents').select('*'),
      supabase.from('chat_channels').select('*').order('created_at', { ascending: false }),
      supabase.from('chat_channel_members').select('channel_id').eq('agent_id', agent?.id ?? ''),
    ])

    setAgents((allAgents ?? []).filter((a) => a.id !== agent?.id))
    const myChannelIds = new Set((myMemberships ?? []).map((m) => m.channel_id))

    const dmChannelIds = (allChannels ?? []).filter((c) => !c.is_group).map((c) => c.id)
    const membersByChannel: Record<string, string[]> = {}
    if (dmChannelIds.length > 0) {
      const { data: members } = await supabase
        .from('chat_channel_members')
        .select('channel_id, agent_id')
        .in('channel_id', dmChannelIds)
      const agentsById: Record<string, Agent> = {}
      ;(allAgents ?? []).forEach((a) => (agentsById[a.id] = a))
      ;(members ?? []).forEach((m) => {
        if (!membersByChannel[m.channel_id]) membersByChannel[m.channel_id] = []
        membersByChannel[m.channel_id].push(agentsById[m.agent_id]?.name ?? 'Unknown')
      })
    }

    const infos: ChannelInfo[] = (allChannels ?? []).map((c) => {
      const isMine = c.is_group || myChannelIds.has(c.id)
      let label = 'All Agents'
      if (!c.is_group) {
        const names = (membersByChannel[c.id] ?? []).filter((n) => n !== agent?.name)
        label = names.length > 0 ? names.join(', ') : 'Direct message'
      }
      return { channel: c, isMine, label }
    })
    infos.sort((a, b) => (a.channel.is_group === b.channel.is_group ? 0 : a.channel.is_group ? -1 : 1))

    setChannels(infos)
    setLoading(false)

    if (preferSelect) {
      setSelectedId(preferSelect)
    } else if (!selectedIdRef.current) {
      const general = infos.find((i) => i.channel.is_group)
      if (general) setSelectedId(general.channel.id)
    }
  }

  useEffect(() => {
    if (agent) loadChannels()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.id])

  async function loadMessages(channelId: string) {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
    setMessages(data ?? [])
  }

  useEffect(() => {
    if (!selectedId) return
    loadMessages(selectedId)

    const sub = supabase
      .channel(`chat_messages_${selectedId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${selectedId}` },
        (payload) => {
          setMessages((prev) => (prev.some((m) => m.id === (payload.new as ChatMessage).id) ? prev : [...prev, payload.new as ChatMessage]))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sub)
    }
  }, [selectedId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!agent || !text.trim() || !selectedId) return
    setSending(true)
    const { error } = await supabase
      .from('chat_messages')
      .insert({ channel_id: selectedId, sender_agent_id: agent.id, message: text.trim() })
    setSending(false)
    if (!error) setText('')
  }

  async function startChat(otherAgentId: string) {
    setStarting(otherAgentId)
    const { data, error } = await supabase.rpc('get_or_create_dm_channel', { other_agent_id: otherAgentId })
    setStarting(null)
    if (!error && data) {
      await loadChannels(data as string)
    }
  }

  const myChannels = channels.filter((c) => c.isMine)
  const otherChannels = channels.filter((c) => !c.isMine)
  const canSendInSelected = myChannels.some((c) => c.channel.id === selectedId)

  const agentsById: Record<string, Agent> = {}
  agents.forEach((a) => (agentsById[a.id] = a))
  if (agent) agentsById[agent.id] = agent

  const channelButtonStyle = (active: boolean): React.CSSProperties => ({
    textAlign: 'left',
    padding: '8px 10px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    background: active ? 'var(--color-primary)' : 'transparent',
    color: active ? 'var(--color-ivory)' : 'var(--color-charcoal)',
    fontSize: '0.86rem',
  })

  return (
    <div>
      <h1>Chat</h1>
      <p style={{ color: 'var(--color-secondary)', marginBottom: 28 }}>
        Message other agents directly, or use the General channel for the whole team.
      </p>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: '16px 18px' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: 4 }}>Conversations</h3>
            <p style={{ color: 'var(--color-secondary)', fontSize: '0.76rem', marginBottom: 10 }}>
              "All Agents" reaches the whole team.
            </p>
            {loading ? (
              <p style={{ color: 'var(--color-secondary)', fontSize: '0.85rem' }}>Loading...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {myChannels.map((c) => (
                  <button
                    key={c.channel.id}
                    type="button"
                    onClick={() => setSelectedId(c.channel.id)}
                    style={{ ...channelButtonStyle(selectedId === c.channel.id), fontWeight: c.channel.is_group ? 600 : 500 }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: '16px 18px' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: 10 }}>Start a new chat</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {agents.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => startChat(a.id)}
                  disabled={starting === a.id}
                  className="btn btn-outline"
                  style={{ fontSize: '0.82rem', justifyContent: 'flex-start' }}
                >
                  {starting === a.id ? '...' : `${a.name} (${getAgentInitials(a.name)})`}
                </button>
              ))}
            </div>
          </div>

          {agent?.is_head_admin && otherChannels.length > 0 && (
            <div className="card" style={{ padding: '16px 18px' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: 4 }}>All conversations</h3>
              <p style={{ color: 'var(--color-secondary)', fontSize: '0.76rem', marginBottom: 10 }}>
                Visible to you only, as head admin.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {otherChannels.map((c) => (
                  <button
                    key={c.channel.id}
                    type="button"
                    onClick={() => setSelectedId(c.channel.id)}
                    style={channelButtonStyle(selectedId === c.channel.id)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ flex: 1, minWidth: 320, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!selectedId ? (
            <p style={{ color: 'var(--color-secondary)' }}>Select a conversation.</p>
          ) : (
            <>
              {!canSendInSelected && (
                <p style={{ color: 'var(--color-secondary)', fontSize: '0.78rem', margin: 0 }}>
                  Read-only - you are viewing this conversation as head admin.
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 480, overflowY: 'auto', paddingRight: 4 }}>
                {messages.length === 0 ? (
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
                          maxWidth: '75%',
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

              {canSendInSelected && (
                <form onSubmit={send} style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--color-beige)' }}
                  />
                  <button type="submit" className="btn btn-primary" disabled={sending || !text.trim()}>
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
