'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles, ArrowRight, Lock, CheckCircle } from 'lucide-react'

export default function KisiselGelisimPage() {
  const router = useRouter()

  const buildSlug = (topic?: string) => {
    if (!topic) return 'kisisel-gelisim'
    return encodeURIComponent(topic.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, ''))
  }

  const handlePurchase = (topic?: string) => {
    router.push(`/purchase/${buildSlug(topic)}`)
  }

  const handleGoToDetail = (topic: string) => {
    router.push(`/courses/kisisel-gelisim/${buildSlug(topic)}`)
  }

  const topics = [
    'Analiz Karar Verme ve Sonuç Odaklılık',
    'Analitik Düşünme Teknikleri',
    'Algı ve İkna Teknikleri',
    'Başarıyı Sınıflandıran Düşünce ve Davranışlar',
    'Başarılı Takımın Oyuncusu Olma',
    'Başarı ve Sonuç Odaklılık',
    'Beden Dili',
    'Bilişsel Beceri Geliştirme',
    'Çatışma Yönetimi',
    'Dokümantasyon ve Raporlama',
    'Diksiyon',
    'Ekip Çalışması ve Motivasyon',
    'Esnek Çalışma Modeli',
    'Etkili Diyaloglar',
    'Etkili İletişim',
    'Etkili İletişim ve Diksiyon',
    'Etkili Sunum Teknikleri',
    'Farkındalık Atölyesi',
    'Farkındalık',
    'Fasilitasyon',
    'Geri Bildirim Verme',
    'Hedef Belirleme',
    'Hikaye Anlatım Tekniği',
    'Hizmet Psikolojisi ve İletişim',
    'İkna Yönetimi',
    'İletişim',
    'İlişki Yönetimi',
    'İnovasyon',
    'İş Yerinde Duygusal Zeka',
    'İş Yerinde Yetkinlik',
    'İşte Güven ve Farkındalık',
    'İş ve Özel Yaşam Dengesi',
    'Kişisel İmaj Yönetimi',
    'Kişisel Verilerin Korunması (KVKK) ve Veri Gizliliği',
    'Kurumsal Çeviklik (Agility)',
    'Kurumsal Firmalarda Farklı Kültürlerin Yönetimi',
    'Kurumsal Gelişim',
    'Kurumsallaşma ve Kurum Kültürü',
    'Kurumsal Yazışma Teknikleri',
    'Kuşaklar Arası İletişim',
    'Mazeretten Sonuca Ulaşma',
    'Mindfulness',
    'Mobbing',
    'Motivasyon',
    'Motivasyon ve Özgüven Kazanımı için Altın İpuçları',
    'Nefes',
    'Oryantasyon',
    'Öz Motivasyon',
    'Pandemi Sonrası İş Hayatında Alınabilecek Tedbirler',
    'Personel İletişimi ve Yönetimi',
    'PowerPoint',
    'Pozitif Düşünme Teknikleri',
    'Problem Çözme ve Sonuç Odaklılık',
    'Profesyonel Yaşamda Verimlilik',
    'Profesyonel Sunumlarda Hikâye Anlatımı Tekniğinin Kullanımı',
    'Protokol ve Sosyal Davranış Kuralları',
    'Psikolojik Sağlamlık',
    'Stres Yönetimi',
    'Sunum ve Servis Hizmetleri',
    'Takım Ruhu ve İnovasyon',
    'Takım Ruhu / Takım Çalışması',
    'Temel Enneagram',
    'Toplantı Yönetimi',
    'Yaratıcılık',
    'Yapay Zeka',
    'Yazışma ve E-Posta Kullanımı',
    'Zaman Yönetimi',
    'Zor Durum ve Zor İnsanları İkna Yönetimi'
  ]

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-100 via-cyan-50 to-blue-100"></div>
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-teal-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center px-6 py-3 bg-white/90 backdrop-blur-md rounded-full border-2 border-teal-200/50 shadow-xl mb-8 hover:scale-105 transition-transform duration-300">
            <Sparkles className="w-5 h-5 text-teal-600 mr-2 animate-pulse" />
            <span className="text-sm text-gray-700 font-bold tracking-wide">KİŞİSEL GELİŞİM</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-extrabold mb-8 relative">
            <span className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent drop-shadow-lg">
              Kişisel Gelişim Eğitimleri
            </span>
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full"></div>
          </h1>
          
          <p className="text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed font-medium mt-8">
            Kariyer, CV hazırlama, Zaman yönetimi, İletişim becerileri, Girişimcilik ve daha fazlası
          </p>

          <div className="mt-6 inline-flex items-center gap-2 bg-gradient-to-r from-orange-100 to-yellow-100 px-6 py-3 rounded-full border-2 border-orange-200">
            <span className="text-2xl">📜</span>
            <span className="text-sm font-bold text-orange-800">Dijital Katılım Sertifikası Verilir</span>
          </div>
        </div>

        {/* Locked Content Hero intentionally removed per request */}

        {/* Topics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {topics.map((topic, index) => (
            <Card
              key={index}
              onClick={() => handleGoToDetail(topic)}
              className="group relative overflow-hidden h-full bg-white/70 backdrop-blur-sm border-2 border-teal-100 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
            >
              <CardContent className="p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 opacity-70 group-hover:opacity-50 transition-opacity"></div>

                <div className="relative z-10">
                  <div className="absolute top-4 right-4 bg-gray-800 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Lock className="w-4 h-4" /> Kilitli
                  </div>

                  <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    {topic}
                  </h3>

                  <p className="text-sm text-gray-600 mb-4">
                    İçerik kilitli. Satın alarak erişebilirsiniz.
                  </p>

                  <div className="mt-4 w-full inline-flex items-center justify-center bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold px-6 py-3 text-sm rounded-xl shadow-lg">
                    <span className="mr-2">Detaya Git</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {[
            { icon: '💼', title: 'Kariyer Gelişimi', desc: 'Profesyonel yaşamınızı ileriye taşıyın' },
            { icon: '🎯', title: 'Hedef Odaklı', desc: 'Kişisel ve profesyonel hedeflerinize ulaşın' },
            { icon: '📜', title: 'Sertifikalı', desc: 'Tamamladığınız her eğitim için dijital sertifika' }
          ].map((feature, index) => (
            <Card key={index} className="border-2 border-teal-100 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
