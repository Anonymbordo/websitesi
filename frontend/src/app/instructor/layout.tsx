'use client'

import Link from 'next/link'
import { LayoutDashboard, Loader2, MessageSquare } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { MessageUnreadProvider, useMessageUnread } from '@/components/shared/MessageUnreadContext'
import { useHydration } from '@/hooks/useHydration'
import { needsInstructorApplication } from '@/lib/instructorApplication'
import { useAuthStore } from '@/lib/store'

function InstructorShell({ children }: { children: ReactNode }) {
  const { count } = useMessageUnread()
  const router = useRouter()
  const pathname = usePathname()
  const isHydrated = useHydration()
  const { user, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isHydrated) return

    if (!isAuthenticated) {
      router.push(`/auth/login?next=${encodeURIComponent(pathname || '/instructor/dashboard')}`)
      return
    }

    if (user?.role !== 'instructor') {
      router.push('/courses')
      return
    }

    if (needsInstructorApplication(user)) {
      const nextPath = pathname && pathname !== '/instructors/apply' ? pathname : '/instructor/dashboard'
      router.push(`/instructors/apply?next=${encodeURIComponent(nextPath)}`)
    }
  }, [isAuthenticated, isHydrated, pathname, router, user])

  if (!isHydrated || !isAuthenticated || user?.role !== 'instructor' || needsInstructorApplication(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link
            href="/instructor/dashboard"
            className="inline-flex items-center gap-2 text-gray-900 font-semibold"
          >
            <span className="w-9 h-9 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5" />
            </span>
            Eğitmen Paneli
          </Link>

          <Link
            href="/instructor/messages"
            className="relative inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-white border border-gray-200 hover:bg-gray-50"
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            Mesajlar
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center font-semibold shadow-md">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      <main>{children}</main>
    </div>
  )
}

export default function InstructorLayout({ children }: { children: ReactNode }) {
  return (
    <MessageUnreadProvider>
      <InstructorShell>{children}</InstructorShell>
    </MessageUnreadProvider>
  )
}
