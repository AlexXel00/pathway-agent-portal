import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type { Agent, ChatChannel, ChatMessage } from '../lib/types'

export interface ChannelInfo {
  channel: ChatChannel
  // A channel is "mine" if it's the shared group channel, or I'm an actual DM participant -
  // as opposed to a DM the head admin can merely see for oversight.
  isMine: boolean
  label: string
}

interface ChatContextValue {
  channels: ChannelInfo[]
  agentsById: Record<string, Agent>
  loading: boolean
  unreadChannelIds: Set<string>
  hasUnread: boolean
  refresh: (preferSelect?: string) => Promise<void>
  markRead: (channelId: string) => void
  startChat: (otherAgentId: string) => Promise<string | null>
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { agent } = useAuth()
  const [channels, setChannels] = useState<ChannelInfo[]>([])
  const [agentsById, setAgentsById] = useState<Record<string, Agent>>({})
  const [loading, setLoading] = useState(true)
  const [unreadChannelIds, setUnreadChannelIds] = useState<Set<string>>(new Set())
  const preferSelectRef = useRef<string | undefined>(undefined)

  const refresh = useCallback(
    async (preferSelect?: string) => {
      if (!agent) return
      setLoading(true)
      if (preferSelect) preferSelectRef.current = preferSelect

      const [{ data: allAgents }, { data: allChannels }, { data: myMemberships }, { data: reads }] = await Promise.all([
        supabase.from('agents').select('*'),
        supabase.from('chat_channels').select('*').order('created_at', { ascending: false }),
        supabase.from('chat_channel_members').select('channel_id').eq('agent_id', agent.id),
        supabase.from('chat_reads').select('channel_id, last_read_at').eq('agent_id', agent.id),
      ])

      const byId: Record<string, Agent> = {}
      ;(allAgents ?? []).forEach((a) => (byId[a.id] = a))
      setAgentsById(byId)

      const myChannelIds = new Set((myMemberships ?? []).map((m) => m.channel_id))
      const readByChannel: Record<string, string> = {}
      ;(reads ?? []).forEach((r) => (readByChannel[r.channel_id] = r.last_read_at))

      const dmChannelIds = (allChannels ?? []).filter((c) => !c.is_group).map((c) => c.id)
      const membersByChannel: Record<string, string[]> = {}
      if (dmChannelIds.length > 0) {
        const { data: members } = await supabase
          .from('chat_channel_members')
          .select('channel_id, agent_id')
          .in('channel_id', dmChannelIds)
        ;(members ?? []).forEach((m) => {
          if (!membersByChannel[m.channel_id]) membersByChannel[m.channel_id] = []
          membersByChannel[m.channel_id].push(byId[m.agent_id]?.name ?? 'Unknown')
        })
      }

      // Latest message per channel (for the mine-channels only, to keep this cheap), used to
      // decide whether a channel has anything unread relative to my last-read marker.
      const myAndGroupChannelIds = (allChannels ?? [])
        .filter((c) => c.is_group || myChannelIds.has(c.id))
        .map((c) => c.id)
      const lastMessageByChannel: Record<string, ChatMessage> = {}
      if (myAndGroupChannelIds.length > 0) {
        const { data: recentMessages } = await supabase
          .from('chat_messages')
          .select('*')
          .in('channel_id', myAndGroupChannelIds)
          .order('created_at', { ascending: false })
          .limit(300)
        ;(recentMessages ?? []).forEach((m) => {
          if (!lastMessageByChannel[m.channel_id]) lastMessageByChannel[m.channel_id] = m
        })
      }

      const infos: ChannelInfo[] = (allChannels ?? []).map((c) => {
        const isMine = c.is_group || myChannelIds.has(c.id)
        let label = 'All Agents'
        if (!c.is_group) {
          const names = (membersByChannel[c.id] ?? []).filter((n) => n !== agent.name)
          label = names.length > 0 ? names.join(', ') : 'Direct message'
        }
        return { channel: c, isMine, label }
      })
      infos.sort((a, b) => (a.channel.is_group === b.channel.is_group ? 0 : a.channel.is_group ? -1 : 1))
      setChannels(infos)

      const unread = new Set<string>()
      myAndGroupChannelIds.forEach((channelId) => {
        const last = lastMessageByChannel[channelId]
        if (!last || last.sender_agent_id === agent.id) return
        const readAt = readByChannel[channelId]
        if (!readAt || new Date(last.created_at) > new Date(readAt)) {
          unread.add(channelId)
        }
      })
      setUnreadChannelIds(unread)

      setLoading(false)
    },
    [agent]
  )

  useEffect(() => {
    if (agent) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.id])

  useEffect(() => {
    if (!agent) return
    const sub = supabase
      .channel('chat_messages_global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const msg = payload.new as ChatMessage
        if (msg.sender_agent_id === agent.id) return
        refresh()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(sub)
    }
  }, [agent, refresh])

  function markRead(channelId: string) {
    if (!agent) return
    setUnreadChannelIds((prev) => {
      if (!prev.has(channelId)) return prev
      const next = new Set(prev)
      next.delete(channelId)
      return next
    })
    supabase
      .from('chat_reads')
      .upsert({ channel_id: channelId, agent_id: agent.id, last_read_at: new Date().toISOString() })
      .then(() => {})
  }

  async function startChat(otherAgentId: string) {
    const { data, error } = await supabase.rpc('get_or_create_dm_channel', { other_agent_id: otherAgentId })
    if (!error && data) {
      await refresh(data as string)
      return data as string
    }
    return null
  }

  const hasUnread = channels.some((c) => c.isMine && unreadChannelIds.has(c.channel.id))

  return (
    <ChatContext.Provider value={{ channels, agentsById, loading, unreadChannelIds, hasUnread, refresh, markRead, startChat }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within a ChatProvider')
  return ctx
}
