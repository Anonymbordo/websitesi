"use client"

import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock, CheckCircle, Star, ArrowLeft, BookOpen, FileText, Video, ClipboardList, Users, PhoneCall } from 'lucide-react'

const contentSections = [
  { title: 'Ders Konuları', description: 'Tüm konuların detaylı anlatımı ve açıklamaları', icon: BookOpen },
  { title: 'Ders Notları', description: 'İndirilebilir PDF ders notları ve özet kartlar', icon: FileText },
  { title: 'Ders Videoları', description: 'HD kalitede video dersler ve konu anlatımları', icon: Video },
  { title: 'Online Sınav', description: 'Konuya özel testler ve sınav simülasyonları', icon: ClipboardList },
  { title: 'Eğitmenler', description: 'Alanında uzman eğitmenlerimiz', icon: Users },
  { title: 'Canlı Ders Talebi', description: 'Birebir veya grup canlı ders talep edin', icon: PhoneCall }
]

const formatSlugForDisplay = (slug: string) => {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const buildPurchaseSlug = (slug: string) => encodeURIComponent(slug)

export default function KisiselGelisimDetailPage() {
  const router = useRouter()
  const params = useParams()
  const rawSlug = Array.isArray(params?.slug) ? params?.slug[0] : params?.slug || 'kisisel-gelisim'
  const decodedSlug = decodeURIComponent(rawSlug)
  const displayTitle = formatSlugForDisplay(decodedSlug)
  const purchaseSlug = buildPurchaseSlug(decodedSlug.toLowerCase())

  const handlePurchase = () => {
    router.push(`/purchase/${purchaseSlug}`)
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-teal-50 via-cyan-50 to-blue-50">
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-10 right-10 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-6 bg-white/90 backdrop-blur-md hover:bg-white border-2 border-white/50 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 font-bold"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri Dön
        </Button>

        <Card className="relative overflow-hidden border-0 shadow-3xl bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 rounded-[2rem] mb-10">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer"></div>
          </div>
          <CardContent className="relative p-10 md:p-12 text-white text-center">
            <div className="inline-flex items-center px-6 py-3 bg-white/10 rounded-full border border-white/20 mb-6">
              <span className="text-sm font-semibold tracking-wide">KİŞİSEL GELİŞİM</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 drop-shadow-lg">{displayTitle}</h1>
            <p className="text-lg md:text-xl mb-8 opacity-95">
              Bu dersin tüm içeriklerine erişmek için <strong className="font-extrabold text-yellow-300">₺299</strong> karşılığında satın alabilirsiniz.
            </p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={handlePurchase}
                className="bg-white text-gray-900 hover:bg-gray-100 font-extrabold text-lg px-8 py-6 rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300"
              >
                <CheckCircle className="w-6 h-6 mr-2" />
                Hemen Satın Al - ₺299
              </Button>
              <div className="flex items-center gap-1 text-yellow-300 text-2xl">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="fill-yellow-300" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contentSections.map((section, index) => {
            const Icon = section.icon
            return (
              <Card
                key={section.title}
                className="relative overflow-hidden bg-white/80 backdrop-blur-sm border border-white/60 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl cursor-not-allowed"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <CardContent className="p-6 text-center space-y-4">
                  <div className="absolute top-4 right-4">
                    <Lock className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="w-14 h-14 mx-auto bg-gradient-to-br from-gray-300 to-gray-400 rounded-2xl flex items-center justify-center shadow-lg">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{section.title}</h3>
                  <p className="text-sm text-gray-600">{section.description}</p>
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500">
                    <Lock className="w-4 h-4" /> İçerik Kilitli
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
