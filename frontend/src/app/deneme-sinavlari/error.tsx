'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function MockExamsPublicError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('Public mock exams page crashed:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-5 inline-flex rounded-2xl bg-red-50 p-3 text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Deneme sayfası yüklenirken hata oluştu</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Deneme içeriği okunurken beklenmeyen bir kayıt geldi. Sayfayı tekrar deneyebilir veya biraz sonra yeniden açabilirsiniz.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={reset} className="rounded-full bg-slate-900 text-white hover:bg-slate-800">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tekrar Dene
          </Button>
        </div>
      </div>
    </div>
  )
}
