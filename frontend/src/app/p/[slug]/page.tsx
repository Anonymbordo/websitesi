"use client"

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function StaticPage() {
  const params = useParams() as { slug?: string }
  const slug = (params?.slug || '').toString()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState<any | null>(null)

  useEffect(() => {
    // Read local pages and try to find matching slug (be tolerant)
    try {
      const raw = localStorage.getItem('local_pages')
      if (!raw) {
        setLoading(false)
        return
      }
      const pages = JSON.parse(raw)
      const found = pages.find((p: any) => ((p.slug || '').toString().replace(/^\//,'') === slug))
      if (found) {
        // Prefer root path for friendly URLs: /contact instead of /p/contact
        const normalized = (found.slug || '').toString().replace(/^\//,'')
        const target = normalized === '' ? '/' : `/${normalized}`
        // If we're not already at the friendly URL, redirect there
        if (location.pathname !== target) {
          router.replace(target)
          return
        }
        // If already at target (rare), set page to render
        setPage(found)
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [slug, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900">Yükleniyor...</h1>
        </div>
      </div>
    )
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="container mx-auto px-4 text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 shadow-xl max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
              Sayfa Bulunamadı
            </h1>
            <p className="text-gray-600 text-lg mb-6">Bu sayfa henüz oluşturulmamış olabilir.</p>
            <a 
              href="/" 
              className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              ← Ana Sayfaya Dön
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div dangerouslySetInnerHTML={{ __html: page.content }} />
    </div>
  )
}
