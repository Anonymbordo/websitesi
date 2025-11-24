'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BookOpen, 
  FileText, 
  Video, 
  ClipboardCheck, 
  UserCheck, 
  PhoneCall,
  Lock,
  CheckCircle,
  ArrowLeft 
} from 'lucide-react'
import { coursesAPI, paymentsAPI } from '@/lib/api'

export default function AlmancaLevelDetailPage() {
  const router = useRouter()
  const params = useParams()
  const levelId = params.levelId as string
  
  const [hasAccess, setHasAccess] = useState(false)
  const [loading, setLoading] = useState(true)

  const levelTitles: Record<string, string> = {
    'a1': 'A-1 (Başlangıç)',
    'a2': 'A-2 (Temel)',
    'b1': 'B-1 (Orta)',
    'b2': 'B-2 (Orta Üstü)',
    'c1': 'C-1 (İleri)',
    'c2': 'C-2 (Profesyonel)'
  }

  const levelEmojis: Record<string, string> = {
    'a1': '🌱',
    'a2': '🌿',
    'b1': '🌊',
    'b2': '🌌',
    'c1': '⭐',
    'c2': '👑'
  }

  const levelGradients: Record<string, string> = {
    'a1': 'from-red-400 to-yellow-500',
    'a2': 'from-red-500 to-orange-500',
    'b1': 'from-orange-400 to-amber-500',
    'b2': 'from-amber-500 to-yellow-500',
    'c1': 'from-yellow-500 to-red-500',
    'c2': 'from-red-500 to-rose-500'
  }

  const levelTitle = levelTitles[levelId] || levelId
  const levelEmoji = levelEmojis[levelId] || '📚'
  const levelGradient = levelGradients[levelId] || 'from-red-500 to-yellow-500'

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }
      
      const response = await coursesAPI.getEnrolledCourses()
      const enrolledCourses = response.data || []
      const courseKey = `almanca-${levelId}`
      setHasAccess(enrolledCourses.some((course: any) => course.id === courseKey))
    } catch (error) {
      console.error('Error checking access:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const paymentData = {
        courseId: `almanca-${levelId}`,
        courseName: `Almanca ${levelTitle}`,
        amount: 299
      }

      const response = await paymentsAPI.createPayment(paymentData as any)
      
      if (response.data?.paymentPageUrl) {
        window.location.href = response.data.paymentPageUrl
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('Ödeme işlemi başlatılamadı. Lütfen tekrar deneyin.')
    }
  }

  const contentSections = [
    {
      id: 'topics',
      title: 'Ders Konuları',
      description: 'Tüm konuların detaylı anlatımı ve açıklamaları',
      icon: BookOpen,
      color: 'blue'
    },
    {
      id: 'notes',
      title: 'Ders Notları',
      description: 'İndirilebilir PDF ders notları ve özet kartlar',
      icon: FileText,
      color: 'green'
    },
    {
      id: 'videos',
      title: 'Ders Videoları',
      description: 'HD kalitede video dersler ve konu anlatımları',
      icon: Video,
      color: 'red'
    },
    {
      id: 'exams',
      title: 'Online Sınav',
      description: 'Konuya özel testler ve sınav simülasyonları',
      icon: ClipboardCheck,
      color: 'purple'
    },
    {
      id: 'instructors',
      title: 'Eğitmenler',
      description: 'Native speaker eğitmenlerimiz',
      icon: UserCheck,
      color: 'amber'
    },
    {
      id: 'live',
      title: 'Canlı Ders Talebi',
      description: 'Birebir veya grup canlı ders talep edin',
      icon: PhoneCall,
      color: 'pink'
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-100 via-yellow-50 to-orange-100"></div>
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-8 bg-white/90 backdrop-blur-md hover:bg-white border-2 border-white/50 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 font-bold"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri Dön
        </Button>

        <div className="text-center mb-20">
          <div className="inline-flex items-center px-8 py-4 bg-white/90 backdrop-blur-md rounded-full border-2 border-red-200/50 shadow-xl mb-8 hover:scale-105 transition-transform duration-300">
            <span className="text-5xl mr-4 drop-shadow-lg">{levelEmoji}</span>
            <span className="text-lg text-gray-700 font-bold tracking-wide">ALMANCA - {levelTitle.toUpperCase()}</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-extrabold mb-8 relative">
            <span className={`bg-gradient-to-r ${levelGradient} bg-clip-text text-transparent drop-shadow-lg`}>
              {levelTitle}
            </span>
            <div className={`absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-40 h-1 bg-gradient-to-r ${levelGradient} rounded-full`}></div>
          </h1>
          
          {!hasAccess && (
            <div className="max-w-3xl mx-auto">
              <Card className={`relative bg-gradient-to-br ${levelGradient} border-0 shadow-3xl rounded-[2rem] overflow-hidden`}>
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                </div>
                
                <CardContent className="relative p-10 text-white text-center">
                  <Lock className="w-20 h-20 mx-auto mb-6 drop-shadow-2xl animate-pulse" />
                  <h2 className="text-4xl font-extrabold mb-4 drop-shadow-lg">İçerik Kilitli</h2>
                  <p className="text-xl mb-8 leading-relaxed font-medium opacity-95">
                    Bu seviyenin tüm içeriklerine erişmek için <strong className="font-extrabold text-yellow-300">₺299</strong> karşılığında satın alabilirsiniz.
                  </p>
                  <Button 
                    size="lg"
                    onClick={handlePayment}
                    className="bg-white text-gray-900 hover:bg-gray-100 font-extrabold text-xl px-12 py-7 rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-500 relative overflow-hidden group"
                  >
                    <span className="absolute inset-0 bg-yellow-300 opacity-0 group-hover:opacity-30 transition-opacity duration-300"></span>
                    <span className="relative flex items-center">
                      <CheckCircle className="w-7 h-7 mr-3" />
                      Hemen Satın Al - ₺299
                    </span>
                  </Button>
                  
                  <div className="flex justify-center gap-2 mt-6">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-2xl animate-bounce" style={{ animationDelay: `${i * 100}ms` }}>⭐</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {contentSections.map((section, index) => {
            const Icon = section.icon
            return (
              <Card 
                key={section.id}
                className={`group relative ${hasAccess ? 'bg-white/95' : 'bg-gray-200/60'} backdrop-blur-lg border-2 ${hasAccess ? 'border-white/50' : 'border-gray-300/50'} shadow-2xl transition-all duration-700 ${hasAccess ? 'hover:shadow-3xl hover:scale-105 hover:-translate-y-2 cursor-pointer' : 'cursor-not-allowed'} overflow-hidden rounded-[2rem]`}
                onClick={() => hasAccess && router.push(`/courses/yabanci-dil/almanca/${levelId}/${section.id}`)}
                style={{
                  animationDelay: `${index * 100}ms`,
                  opacity: hasAccess ? 1 : 0.6
                }}
              >
                {hasAccess && (
                  <>
                    <div className={`absolute inset-0 bg-gradient-to-br ${levelGradient} opacity-0 group-hover:opacity-15 transition-opacity duration-700`}></div>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    </div>
                  </>
                )}
                
                <CardContent className="relative p-8 text-center space-y-4">
                  {!hasAccess && (
                    <div className="absolute top-4 right-4">
                      <Lock className="w-6 h-6 text-gray-500" />
                    </div>
                  )}
                  
                  <div className="relative">
                    {hasAccess && (
                      <div className={`absolute inset-0 bg-gradient-to-br ${levelGradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-70 transition-opacity duration-500`}></div>
                    )}
                    <div className={`relative w-20 h-20 mx-auto ${hasAccess ? `bg-gradient-to-br ${levelGradient}` : 'bg-gray-400'} rounded-2xl flex items-center justify-center shadow-2xl ${hasAccess ? 'group-hover:scale-110 group-hover:rotate-6' : ''} transition-all duration-500`}>
                      <Icon className="w-10 h-10 text-white drop-shadow-lg" />
                    </div>
                  </div>

                  <h3 className="text-lg font-extrabold">
                    <span className={hasAccess ? `bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent` : 'text-gray-600'}>
                      {section.title}
                    </span>
                  </h3>

                  <p className={`text-sm leading-relaxed font-medium ${hasAccess ? 'text-gray-600 group-hover:text-gray-700' : 'text-gray-500'} transition-colors duration-300`}>
                    {section.description}
                  </p>

                  {hasAccess && (
                    <>
                      <div className={`absolute top-4 right-4 w-2 h-2 bg-${section.color}-400 rounded-full animate-ping opacity-40`}></div>
                      <div className={`absolute bottom-4 left-4 w-2 h-2 bg-${section.color}-400 rounded-full animate-pulse opacity-40`}></div>
                    </>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {hasAccess && (
          <div className="text-center">
            <Card className={`relative bg-gradient-to-br ${levelGradient} border-0 shadow-3xl rounded-[2.5rem] max-w-4xl mx-auto overflow-hidden`}>
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              </div>
              
              <CardContent className="relative p-12 text-white">
                <div className="mb-6">
                  <span className="text-7xl animate-bounce inline-block">🎉</span>
                </div>
                
                <h3 className="text-4xl font-extrabold mb-6 drop-shadow-lg">
                  Tebrikler! İçeriğe Erişim Sağlandı
                </h3>
                
                <p className="text-xl leading-relaxed max-w-2xl mx-auto font-medium opacity-95">
                  Artık tüm ders içeriklerine, videolara, notlara ve sınavlara <strong className="font-extrabold text-yellow-300">sınırsız erişim</strong> hakkınız var. 
                  Başarılar dileriz! 🚀
                </p>

                <div className="flex justify-center gap-3 mt-8">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-3xl animate-pulse" style={{ animationDelay: `${i * 200}ms` }}>⭐</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

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
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </div>
  )
}
