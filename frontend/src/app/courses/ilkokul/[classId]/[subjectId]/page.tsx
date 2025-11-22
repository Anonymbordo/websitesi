'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BookOpen, 
  FileText, 
  ClipboardCheck, 
  Users, 
  Video,
  Lock,
  CreditCard,
  ArrowLeft,
  CheckCircle,
  Globe,
  Calculator
} from 'lucide-react'
import { coursesAPI, paymentsAPI } from '@/lib/api'
import toast from 'react-hot-toast'

export default function SubjectPage() {
  const router = useRouter()
  const params = useParams()
  const classId = params.classId as string
  const subjectId = params.subjectId as string
  
  const classNumber = classId.replace('sinif-', '')
  const [hasAccess, setHasAccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [courseId, setCourseId] = useState<number | null>(null)

  const subjectNames: Record<string, { title: string; icon: any }> = {
    'ingilizce': { title: 'İNGİLİZCE', icon: Globe },
    'matematik': { title: 'MATEMATİK', icon: Calculator },
    'turkce': { title: 'TÜRKÇE', icon: BookOpen }
  }

  const currentSubject = subjectNames[subjectId] || { title: subjectId.toUpperCase(), icon: BookOpen }
  const SubjectIcon = currentSubject.icon

  const sections = [
    {
      id: 'topics',
      title: 'DERS KONULARI',
      description: 'Video dersler ve konu anlatımları',
      icon: BookOpen,
      gradient: 'from-blue-500 to-cyan-500',
      route: 'topics'
    },
    {
      id: 'notes',
      title: 'DERS NOTLARI',
      description: 'İndirilebilir PDF ders notları',
      icon: FileText,
      gradient: 'from-purple-500 to-pink-500',
      route: 'notes'
    },
    {
      id: 'exam',
      title: 'ONLİNE SINAV YAP',
      description: 'Kendinizi test edin, anında sonuç alın',
      icon: ClipboardCheck,
      gradient: 'from-green-500 to-teal-500',
      route: 'exam'
    },
    {
      id: 'instructors',
      title: 'EĞİTMENLER',
      description: 'Uzman eğitmenlerimizi tanıyın',
      icon: Users,
      gradient: 'from-orange-500 to-red-500',
      route: 'instructors'
    },
    {
      id: 'live',
      title: 'CANLI DERS TALEP',
      description: 'Birebir canlı ders randevusu alın',
      icon: Video,
      gradient: 'from-indigo-500 to-purple-500',
      route: 'live'
    }
  ]

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setLoading(false)
        return
      }

      // Mock course ID - gerçek uygulamada API'den gelecek
      // İleri seviye: backend'e classNumber ve subjectId göndererek ilgili kursu bulabilirsiniz
      setCourseId(1)
      
      // Kullanıcının bu kursa kayıtlı olup olmadığını kontrol et
      const enrolledCourses = await coursesAPI.getEnrolledCourses()
      const isEnrolled = enrolledCourses.data.some((course: any) => 
        course.title.toLowerCase().includes(subjectId) && 
        course.title.includes(classNumber)
      )
      
      setHasAccess(isEnrolled)
    } catch (error) {
      console.error('Access check error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push(`/auth/login?next=/courses/ilkokul/${classId}/${subjectId}`)
        return
      }

      if (!courseId) {
        toast.error('Kurs bilgisi bulunamadı')
        return
      }

      toast.loading('Ödeme sayfasına yönlendiriliyorsunuz...')
      
      // Ödeme işlemi başlat
      const paymentResponse = await paymentsAPI.createPayment(courseId, 'credit_card')
      
      if (paymentResponse.data.payment_url) {
        window.location.href = paymentResponse.data.payment_url
      } else {
        toast.dismiss()
        toast.success('Ödeme işlemi tamamlandı! İçeriklere erişebilirsiniz.')
        setHasAccess(true)
      }
    } catch (error: any) {
      toast.dismiss()
      toast.error(error.response?.data?.detail || 'Ödeme işlemi başlatılamadı')
    }
  }

  const handleSectionClick = (route: string) => {
    if (!hasAccess) {
      toast.error('Bu içeriğe erişmek için önce ödeme yapmalısınız')
      return
    }
    router.push(`/courses/ilkokul/${classId}/${subjectId}/${route}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-8 bg-white/80 backdrop-blur-sm hover:bg-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri Dön
        </Button>

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full border border-orange-200 shadow-lg mb-6">
            <SubjectIcon className="w-5 h-5 text-orange-600 mr-2" />
            <span className="text-sm text-gray-700 font-medium">
              {classNumber}. Sınıf - {currentSubject.title}
            </span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent mb-6">
            {currentSubject.title} DERSLERİ
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {hasAccess ? 
              'Tüm ders içeriklerine erişiminiz bulunmaktadır' : 
              'İçeriklere erişmek için ödeme yapmanız gerekmektedir'
            }
          </p>

          {/* Access Status */}
          {hasAccess && (
            <div className="mt-6 inline-flex items-center px-6 py-3 bg-green-100 rounded-full border border-green-300">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-green-700 font-medium">Aktif Üyelik</span>
            </div>
          )}
        </div>

        {/* Payment Card - Only show if no access */}
        {!hasAccess && (
          <Card className="bg-gradient-to-r from-orange-500 to-red-500 border-0 shadow-2xl rounded-3xl max-w-3xl mx-auto mb-16 overflow-hidden">
            <CardContent className="p-10 text-white text-center">
              <Lock className="w-16 h-16 mx-auto mb-4 opacity-90" />
              <h2 className="text-3xl font-bold mb-4">İçerik Kilitli</h2>
              <p className="text-lg mb-6 opacity-90">
                Bu derse ait tüm içeriklere erişmek için ödeme yapmanız gerekmektedir.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <div className="text-2xl font-bold">
                  Ders Ücreti: <span className="text-3xl">₺299</span>
                </div>
                <Button
                  size="lg"
                  onClick={handlePayment}
                  className="bg-white text-orange-600 hover:bg-gray-100 font-bold px-8 py-6 text-lg rounded-2xl shadow-lg"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Ödeme Yap ve Başla
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Sections */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <Card 
                key={section.id}
                className={`group relative bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105 ${hasAccess ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} overflow-hidden rounded-3xl`}
                onClick={() => handleSectionClick(section.route)}
              >
                {/* Lock Overlay */}
                {!hasAccess && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10 flex items-center justify-center rounded-3xl">
                    <Lock className="w-12 h-12 text-white" />
                  </div>
                )}

                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${section.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                
                <CardContent className="relative p-8 text-center space-y-4">
                  {/* Icon */}
                  <div className={`w-16 h-16 mx-auto bg-gradient-to-br ${section.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900">
                    {section.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {section.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Features */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-3">🎥</div>
              <h4 className="font-bold text-gray-900 mb-2">HD Video Dersler</h4>
              <p className="text-sm text-gray-600">Uzman eğitmenlerden profesyonel video anlatımlar</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-3">📱</div>
              <h4 className="font-bold text-gray-900 mb-2">Her Yerden Erişim</h4>
              <p className="text-sm text-gray-600">Bilgisayar, tablet veya telefondan erişebilirsiniz</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-3">🎓</div>
              <h4 className="font-bold text-gray-900 mb-2">Sertifika</h4>
              <p className="text-sm text-gray-600">Dersi tamamladığınızda onaylı sertifika alın</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
