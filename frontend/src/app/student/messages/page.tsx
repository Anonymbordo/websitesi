'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import MessagesTerminal from '@/components/shared/MessagesTerminal'
import { useAuthStore } from '@/lib/store'
import { useHydration } from '@/hooks/useHydration'

export default function StudentMessagesPage() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const hydrated = useHydration()

  useEffect(() => {
    if (!hydrated) return

    if (!isAuthenticated) {
      router.push('/auth/login?next=/student/messages')
      return
    }

    if (user?.role !== 'student') {
      router.push('/')
    }
  }, [hydrated, isAuthenticated, user, router])

  if (!hydrated) return null
  if (!isAuthenticated || user?.role !== 'student') return null

  return <MessagesTerminal baslik="Mesajlar" />
}
