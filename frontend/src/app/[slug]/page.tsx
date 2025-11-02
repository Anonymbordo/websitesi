"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Catch-all for admin-created pages at root level (e.g., /deneme_sayfasi)
export default function DynamicPage() {
  const params = useParams() as { slug?: string }
  const slug = (params?.slug || '').toString()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState<any | null>(null)

  useEffect(() => {
    // Read local pages and find matching slug
    try {
      const raw = localStorage.getItem('local_pages')
      if (!raw) {
        setLoading(false)
        return
      }
      const pages = JSON.parse(raw)
      // Normalize slugs: strip leading slash from both stored and URL slug
      const normalizedSlug = slug.replace(/^\//, '')
      const found = pages.find((p: any) => {
        const pageSlug = (p.slug || '').toString().replace(/^\//, '')
        return pageSlug === normalizedSlug
      })
      if (found && found.status === 'published') {
        setPage(found)
      }
    } catch (e) {
      console.error('Error loading page:', e)
    } finally {
      setLoading(false)
    }
  }, [slug])

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
    // Check if this is a reserved/default route and return null to let default page handle
    const reserved = ['admin', 'auth', 'courses', 'instructors', 'contact', 'about', 'p']
    if (reserved.includes(slug)) {
      return null // Let default route handle
    }
    
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
      {/* Render page content - blocks already have container mx-auto in their HTML */}
      <div dangerouslySetInnerHTML={{ __html: page.content || '' }} />
    </div>
  )
}
