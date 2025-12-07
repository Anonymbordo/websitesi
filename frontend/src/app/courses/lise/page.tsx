'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, GraduationCap, ArrowRight } from 'lucide-react'

export default function LisePage() {
  const router = useRouter()

  const classes = [
    {
      id: 9,
      title: '9. SINIF DERSLERİ',
      description: 'Dokuzuncu sınıf ders içeriklerine ulaşın',
      icon: '9️⃣',
      gradient: 'from-indigo-500 to-blue-500',
      bgPattern: 'bg-indigo-50',
      subjects: ['Türk Dili ve Edebiyatı', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'İngilizce']
    },
    {
      id: 10,
      title: '10. SINIF DERSLERİ',
      description: 'Onuncu sınıf ders içeriklerine ulaşın',
      icon: '🔟',
      gradient: 'from-violet-500 to-purple-500',
      bgPattern: 'bg-violet-50',
      subjects: ['Türk Dili ve Edebiyatı', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'İngilizce']
    },
    {
      id: 11,
      title: '11. SINIF DERSLERİ',
      description: 'On birinci sınıf ders içeriklerine ulaşın',
      icon: '1️⃣1️⃣',
      gradient: 'from-fuchsia-500 to-pink-500',
      bgPattern: 'bg-fuchsia-50',
      subjects: ['Türk Dili ve Edebiyatı', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'İngilizce']
    },
    {
      id: 12,
      title: '12. SINIF DERSLERİ',
      description: 'On ikinci sınıf ders içeriklerine ulaşın - YKS Hazırlık',
      icon: '1️⃣2️⃣',
      gradient: 'from-rose-500 to-red-500',
      bgPattern: 'bg-rose-50',
      subjects: ['Türk Dili ve Edebiyatı', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'İngilizce', 'YKS Hazırlık']
    }
  ]

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100"></div>
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center px-6 py-3 bg-white/90 backdrop-blur-md rounded-full border-2 border-purple-200/50 shadow-xl mb-8 hover:scale-105 transition-transform duration-300">
            <GraduationCap className="w-5 h-5 text-purple-600 mr-2 animate-pulse" />
            <span className="text-sm text-gray-700 font-bold tracking-wide">LİSE - YKS HAZIRLIK</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-extrabold mb-8 relative">
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-lg">
              YKS Hazırlık ve Okul Dersleri
            </span>
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full"></div>
          </h1>
          
          <p className="text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed font-medium mt-8">
            Sınıf seviyenizi seçerek ders içeriklerine ve YKS hazırlık materyallerine ulaşabilirsiniz
          </p>
        </div>

        {/* Class Selection */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {classes.map((classItem, index) => (
            <button
              key={classItem.id}
              onClick={() => {
                console.log('Lise tıklandı:', classItem.id)
                router.push(`/courses/lise/sinif-${classItem.id}`)
              }}
              className="w-full"
            >
              <Card className="group relative bg-white/95 backdrop-blur-lg border-2 border-white/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden rounded-3xl">
                <CardContent className="relative p-8 text-center space-y-4">
                  <div className="text-7xl mb-4">
                    {classItem.icon}
                  </div>

                  <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">
                    {classItem.title}
                  </h2>

                  <p className="text-gray-600 text-sm mb-4">
                    {classItem.description}
                  </p>

                  {/* Subjects List */}
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {classItem.subjects.slice(0, 3).map((subject, i) => (
                      <span key={i} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-medium border border-indigo-100">
                        {subject}
                      </span>
                    ))}
                    {classItem.subjects.length > 3 && (
                      <span className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded-full font-medium border border-gray-100">
                        +{classItem.subjects.length - 3}
                      </span>
                    )}
                  </div>

                  <div className={`pt-4 inline-flex items-center bg-gradient-to-r ${classItem.gradient} text-white font-bold px-6 py-3 text-sm rounded-xl`}>
                    <span className="mr-2">Derslere Git</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>

        {/* Info Section */}
        <div className="text-center">
          <Card className="relative bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 backdrop-blur-lg border-2 border-white/50 shadow-2xl rounded-[2.5rem] max-w-4xl mx-auto overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-300/20 to-purple-300/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-pink-300/20 to-fuchsia-300/20 rounded-full blur-3xl"></div>
            
            <CardContent className="relative p-12">
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-3xl shadow-xl mb-6 transform hover:rotate-12 transition-transform duration-300">
                  <GraduationCap className="w-10 h-10 text-white" />
                </div>
              </div>
              
              <h3 className="text-4xl font-extrabold mb-6">
                <span className="bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">
                  YKS'ye Hazırlanın
                </span>
              </h3>
              
              <p className="text-xl text-gray-700 leading-relaxed max-w-2xl mx-auto font-medium mb-8">
                Her ders için detaylı video anlatımlar, kapsamlı ders notları, test çözümleri ve canlı ders imkanı. 
                YKS'de başarı için ihtiyacınız olan her şey burada!
              </p>

              {/* Feature Pills */}
              <div className="flex flex-wrap justify-center gap-3">
                {['📹 Video Dersler', '📝 Ders Notları', '📊 Test Çözümleri', '✅ Online Sınav', '👨‍🏫 Canlı Ders', '🎯 YKS Taktikleri'].map((feature) => (
                  <span 
                    key={feature}
                    className="px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full text-sm font-bold text-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 border-2 border-purple-200/50"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add blob animation styles */}
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
