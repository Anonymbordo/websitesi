"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { pagesAPI } from '@/lib/api'

// Catch-all for admin-created pages at root level (e.g., /adsada)
export default function DynamicPage() {
  const params = useParams() as { slug?: string }
  const slug = (params?.slug || '').toString()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState<any | null>(null)

  useEffect(() => {
    const fetchPage = async () => {
      try {
        setLoading(true)
        console.log('🔍 Sayfa çekiliyor:', slug)
        
        // API'den sayfayı çek
        const response = await pagesAPI.getPageBySlug(slug)
        console.log('📄 Sayfa bulundu:', response.data)
        
        const pageData = response.data
        
        // Sadece yayında olan sayfaları göster
        if (pageData && pageData.status === 'published') {
          setPage(pageData)
        } else {
          console.log('⚠️ Sayfa yayında değil:', pageData?.status)
          setPage(null)
        }
      } catch (error: any) {
        console.error('❌ Sayfa yüklenemedi:', error)
        console.error('❌ Hata detayı:', error.response?.data)
        setPage(null)
      } finally {
        setLoading(false)
      }
    }

    // Reserved route'ları kontrol et
    const reserved = ['admin', 'auth', 'courses', 'instructors', 'contact', 'about', 'p', 'blog']
    if (reserved.includes(slug)) {
      setLoading(false)
      return
    }

    fetchPage()
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

  // Blocks'tan HTML generate et (create/page.tsx'deki aynı fonksiyon)
  const generateHtmlFromBlocks = (blocks: any[]) => {
    return blocks.map(block => {
      const style = block.style || {}
      
      // Style class'larını oluştur
      const bgClass = style.bgColor || ''
      const bgOpacityClass = style.bgOpacity ? `bg-opacity-${style.bgOpacity}` : ''
      const textClass = style.textColor || ''
      const fontSizeClass = style.fontSize || ''
      const fontWeightClass = style.fontWeight || ''
      const paddingClass = style.padding || ''
      const borderClass = style.border || ''
      const borderColorClass = style.borderColor || ''
      const borderRadiusClass = style.borderRadius || ''
      const shadowClass = style.shadow || ''
      const backdropBlurClass = style.backdropBlur || ''
      const hoverEffectClass = style.hoverEffect || ''
      const transitionDurationClass = style.transitionDuration || ''
      
      const combinedClasses = [
        bgClass, bgOpacityClass, textClass, fontSizeClass,
        fontWeightClass, paddingClass, borderClass, borderColorClass,
        borderRadiusClass, shadowClass, backdropBlurClass,
        hoverEffectClass, transitionDurationClass, 'transition-all'
      ].filter(Boolean).join(' ')

      // Her blok tipine göre HTML oluştur
      switch (block.type) {
        case 'hero':
          return `
            <div class="${combinedClasses || 'bg-gradient-to-r from-blue-600 to-purple-600 py-20'}">
              <div class="container mx-auto px-4 text-center">
                <h1 class="text-5xl md:text-7xl font-bold ${style.textColor || 'text-white'} mb-6">${block.data.heading || ''}</h1>
                <p class="text-xl md:text-2xl ${style.textColor || 'text-white'} opacity-90 mb-8 max-w-3xl mx-auto">${block.data.sub || ''}</p>
              </div>
            </div>
          `
        
        case 'text':
          return `
            <div class="${combinedClasses || 'bg-white py-12'}">
              <div class="container mx-auto px-4">
                <div class="prose prose-lg max-w-none ${style.textColor || 'text-gray-900'}">${block.data.html || block.data.content || ''}</div>
              </div>
            </div>
          `
        
        case 'stats':
          const items = block.data.items || []
          return `
            <div class="${combinedClasses || 'bg-white py-12'}">
              <div class="container mx-auto px-4">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
                  ${items.map((item: any) => `
                    <div class="text-center">
                      <div class="text-5xl font-bold ${style.textColor || 'text-blue-600'} mb-3">${item.number || ''}</div>
                      <div class="text-gray-600 font-medium">${item.label || ''}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `
        
        default:
          // Diğer blok tipleri için basit render
          return `<div class="${combinedClasses}">${JSON.stringify(block.data)}</div>`
      }
    }).join('')
  }

  const htmlContent = generateHtmlFromBlocks(page.blocks || [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Render page content from blocks */}
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </div>
  )
}
