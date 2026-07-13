'use client'

import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { useMessageUnreadCount } from '@/hooks/useMessageUnreadCount'

type MessageUnreadContextValue = {
  count: number
  refresh: () => void
}

const MessageUnreadContext = createContext<MessageUnreadContextValue | null>(null)

export function MessageUnreadProvider({ children }: { children: ReactNode }) {
  const { count, refresh } = useMessageUnreadCount()
  return (
    <MessageUnreadContext.Provider value={{ count, refresh }}>
      {children}
    </MessageUnreadContext.Provider>
  )
}

export function useMessageUnread() {
  const ctx = useContext(MessageUnreadContext)
  if (!ctx) {
    return { count: 0, refresh: () => {} }
  }
  return ctx
}
