'use client'

import { useCallback, useEffect, useState } from 'react'
import { messagesAPI, api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { useHydration } from '@/hooks/useHydration'

type Options = {
  enabled?: boolean
  pollIntervalMs?: number
}

const DEFAULT_POLL_INTERVAL = 30000

function getApiBaseUrl() {
  const base = api.defaults.baseURL || ''
  return base.replace(/\/$/, '')
}

export function useMessageUnreadCount(options: Options = {}) {
  const { enabled = true, pollIntervalMs = DEFAULT_POLL_INTERVAL } = options
  const hydrated = useHydration()
  const { user, isAuthenticated } = useAuthStore()
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!user?.id) return
    try {
      const resp = await messagesAPI.listThreads()
      const data = Array.isArray(resp.data) ? resp.data : []
      const lastSeenRaw = localStorage.getItem(`messages_last_seen_${user.id}`)
      const lastSeenTime = lastSeenRaw ? new Date(lastSeenRaw).getTime() : 0

      let next = 0
      for (const thread of data) {
        const lastAt = thread?.last_message_at ? new Date(thread.last_message_at).getTime() : 0
        const senderId = thread?.last_message_sender_id
        if (lastAt > lastSeenTime && senderId && senderId !== user.id) {
          next += 1
        }
      }

      setCount(next)
    } catch {
      setCount(0)
    }
  }, [user?.id])

  useEffect(() => {
    if (!hydrated || !enabled || !isAuthenticated || !user?.id) return
    refresh()
  }, [hydrated, enabled, isAuthenticated, user?.id, refresh])

  useEffect(() => {
    if (!hydrated || !enabled || !isAuthenticated || !user?.id) return
    const interval = window.setInterval(refresh, pollIntervalMs)
    return () => window.clearInterval(interval)
  }, [hydrated, enabled, isAuthenticated, user?.id, refresh, pollIntervalMs])

  useEffect(() => {
    if (!hydrated || !enabled || !isAuthenticated || !user?.id) return
    const handler = () => refresh()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }

    window.addEventListener('messages:last-seen', handler)
    window.addEventListener('storage', handler)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('messages:last-seen', handler)
      window.removeEventListener('storage', handler)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [hydrated, enabled, isAuthenticated, user?.id, refresh])

  useEffect(() => {
    if (!hydrated || !enabled || !isAuthenticated || !user?.id) return
    const token = localStorage.getItem('access_token')
    if (!token) return

    const baseUrl = getApiBaseUrl()
    const url = `${baseUrl}/api/messages/events?token=${encodeURIComponent(token)}`
    const source = new EventSource(url)

    source.onmessage = () => {
      refresh()
    }

    source.onerror = () => {
      // EventSource will auto-retry; polling is a fallback.
    }

    return () => {
      source.close()
    }
  }, [hydrated, enabled, isAuthenticated, user?.id, refresh])

  return { count, refresh }
}
