'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Star, 
  Clock, 
  Users, 
  BookOpen, 
  PlayCircle, 
  CheckCircle2, 
  Award, 
  Share2, 
  Heart,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Lock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { coursesAPI, paymentsAPI } from '@/lib/api'
import { getImageUrl, formatPrice } from '@/lib/utils'
import { useAuthStore } from '@/lib/store'
import { useHydration } from '@/hooks/useHydration'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Lesson {
  id: number
  title: string
  duration: number
  is_free: boolean
  video_url?: string
}

interface Section {
  id: number
  title: string
  lessons: Lesson[]
}

interface CourseDetail {
  id: number
  title: string
  short_description: string
  description: string
  price: number
  discount_price?: number
  rating: number
  total_ratings: number
  total_students: number
  duration: string
  level: string
  category: string
  language: string
  last_updated: string
  thumbnail?: string
  instructor: {
    id: number
    name: string
    title: string
    bio: string
    rating: number
    total_students: number
    total_courses: number
    avatar?: string
  }
  what_you_will_learn: string[]
  requirements: string[]
  sections: Section[]
  is_enrolled: boolean
}

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const isHydrated = useHydration()
  
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<number[]>([])
  const [enrollLoading, setEnrollLoading] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchCourse(Number(params.id))
    }
  }, [params.id])

  const fetchCourse = async (id: number) => {
    try {
      setLoading(true)
      const response = await coursesAPI.getCourse(id)
      
      // API'den gelen veriyi state'e uygun formata dönüştür
      // Not: Backend yapısına göre burası güncellenebilir
      const data = response.data
      
      // Mock data for missing fields if backend doesn't provide them yet
      const enrichedData: CourseDetail = {
        ...data,
        description: data.description || data.short_description,
        what_you_will_learn: data.what_you_will_learn || [
          'Bu kursun sonunda konuya hakim olacaksınız',
          'Gerçek hayat projeleri geliştirebileceksiniz',
          'Sektör standartlarında kod yazabileceksiniz',
          'Portföyünüze ekleyebileceğiniz projeleriniz olacak'
        ],
        requirements: data.requirements || [
          'Temel bilgisayar kullanım bilgisi',
          'İnternet bağlantısı',
          'Öğrenme isteği'
        ],
        sections: data.sections || [
          {
            id: 1,
            title: 'Giriş',
            lessons: [
              { id: 1, title: 'Kursa Hoşgeldiniz', duration: 5, is_free: true },
              { id: 2, title: 'Müfredat Tanıtımı', duration: 10, is_free: true }
            ]
          },
          {
            id: 2,
            title: 'Temel Kavramlar',
            lessons: [
              { id: 3, title: 'Kurulumlar', duration: 15, is_free: false },
              { id: 4, title: 'İlk Proje', duration: 25, is_free: false }
            ]
          }
        ],
        language: data.language || 'Türkçe',
        last_updated: data.updated_at || new Date().toISOString(),
        instructor: {
          id: data.instructor?.id || 0,
          name: data.instructor?.user?.full_name || data.instructor?.name || 'Eğitmen',
          title: data.instructor?.specialization || 'Uzman Eğitmen',
          bio: data.instructor?.bio || 'Deneyimli bir eğitmen.',
          rating: data.instructor?.rating || 4.8,
          total_students: data.instructor?.total_students || 1000,
          total_courses: data.instructor?.total_courses || 5,
          avatar: data.instructor?.profile_image
        }
      }
      
      setCourse(enrichedData)
      // Varsayılan olarak ilk bölümü aç
      if (enrichedData.sections.length > 0) {
        setExpandedSections([enrichedData.sections[0].id])
      }
    } catch (err: any) {
      console.error('Kurs yüklenirken hata:', err)
      setError('Kurs bulunamadı veya yüklenirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (sectionId: number) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/login?next=/courses/${course?.id}`)
      return
    }

    if (!course) return

    setEnrollLoading(true)
    try {
      // Ödeme işlemi başlat (Iyzico entegrasyonu buraya gelecek)
      // Şimdilik doğrudan kayıt ol fonksiyonunu çağırıyoruz veya ödeme sayfasına yönlendiriyoruz
      
      // Eğer kurs ücretsizse veya demo ise direkt kayıt
      if (course.price === 0) {
        await coursesAPI.enrollInCourse(course.id)
        toast.success('Kursa başarıyla kayıt oldunuz!')
        // Sayfayı yenile veya state'i güncelle
        setCourse(prev => prev ? { ...prev, is_enrolled: true } : null)
      } else {
        // Ödeme sayfasına yönlendir veya modal aç
        // Şimdilik mock ödeme
        const confirmPayment = window.confirm(`${formatPrice(course.discount_price || course.price)} tutarındaki ödemeyi onaylıyor musunuz?`)
        if (confirmPayment) {
           // Gerçek senaryoda: await paymentsAPI.createPayment(course.id)
           // Sonra Iyzico sayfasına yönlendirme...
           
           // Mock success
           await coursesAPI.enrollInCourse(course.id)
           toast.success('Ödeme başarılı! Kursa erişebilirsiniz.')
           setCourse(prev => prev ? { ...prev, is_enrolled: true } : null)
        }
      }
    } catch (error: any) {
      console.error('Kayıt hatası:', error)
      toast.error(error.response?.data?.detail || 'Kayıt işlemi başarısız oldu.')
    } finally {
      setEnrollLoading(false)
    }
  }

  if (!isHydrated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Bir Hata Oluştu</h1>
        <p className="text-gray-600 mb-6 text-center">{error || 'Kurs bulunamadı.'}</p>
        <Button onClick={() => router.push('/courses')} variant="outline">
          Kurslara Dön
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Hero Section */}
      <div className="bg-gray-900 text-white py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            <div className="lg:col-span-2 space-y-6">
              {/* Breadcrumb */}
              <div className="flex items-center text-sm text-gray-400 space-x-2">
                <Link href="/courses" className="hover:text-white transition-colors">Kurslar</Link>
                <span>/</span>
                <span className="text-blue-400">{course.category}</span>
                <span>/</span>
                <span className="text-white truncate max-w-[200px]">{course.title}</span>
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
                {course.title}
              </h1>
              
              <p className="text-lg text-gray-300 leading-relaxed">
                {course.short_description}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center text-yellow-400">
                  <span className="font-bold text-lg mr-1">{course.rating}</span>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${i < Math.floor(course.rating) ? 'fill-current' : 'text-gray-600'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-gray-400 ml-2 underline">({course.total_ratings} değerlendirme)</span>
                </div>
                
                <div className="flex items-center text-gray-300">
                  <Users className="w-4 h-4 mr-2" />
                  {(course.total_students || 0).toLocaleString()} öğrenci
                </div>

                <div className="flex items-center text-gray-300">
                  <Clock className="w-4 h-4 mr-2" />
                  Son güncelleme: {(() => {
                    try {
                      return new Date(course.last_updated).toLocaleDateString('tr-TR')
                    } catch (e) {
                      return 'Tarih bilinmiyor'
                    }
                  })()}
                </div>
                
                <div className="flex items-center text-gray-300">
                  <Globe className="w-4 h-4 mr-2" />
                  {course.language}
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-4">
                <img 
                  src={getImageUrl(course.instructor.avatar) || ''} 
                  alt={course.instructor.name}
                  className="w-12 h-12 rounded-full border-2 border-white/20"
                />
                <div>
                  <div className="text-sm text-gray-400">Eğitmen</div>
                  <Link href={`/instructors/${course.instructor.id}`} className="text-blue-400 hover:text-blue-300 font-medium">
                    {course.instructor.name}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-0 lg:-mt-32">
        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8 mt-8 lg:mt-0">
            
            {/* What you'll learn */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 md:p-8">
                <h2 className="text-2xl font-bold mb-6">Neler Öğreneceksiniz?</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {course.what_you_will_learn.map((item, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Course Content */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Kurs İçeriği</h2>
              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <span>{course.sections.length} bölüm • {course.sections.reduce((acc, s) => acc + s.lessons.length, 0)} ders</span>
                <button 
                  onClick={() => setExpandedSections(
                    expandedSections.length === course.sections.length 
                      ? [] 
                      : course.sections.map(s => s.id)
                  )}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  {expandedSections.length === course.sections.length ? 'Tümünü Daralt' : 'Tümünü Genişlet'}
                </button>
              </div>

              <div className="space-y-4">
                {course.sections.map((section) => (
                  <div key={section.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        {expandedSections.includes(section.id) ? (
                          <ChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                        <span className="font-bold text-gray-900">{section.title}</span>
                      </div>
                      <span className="text-sm text-gray-500">{section.lessons.length} ders</span>
                    </button>
                    
                    {expandedSections.includes(section.id) && (
                      <div className="divide-y divide-gray-100">
                        {section.lessons.map((lesson) => (
                          <div key={lesson.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center space-x-3">
                              {lesson.is_free || course.is_enrolled ? (
                                <PlayCircle className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Lock className="w-4 h-4 text-gray-400" />
                              )}
                              <span className={`text-sm ${lesson.is_free || course.is_enrolled ? 'text-gray-900' : 'text-gray-500'}`}>
                                {lesson.title}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4">
                              {lesson.is_free && !course.is_enrolled && (
                                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                  Önizleme
                                </span>
                              )}
                              <span className="text-xs text-gray-500">{lesson.duration} dk</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Requirements */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Gereksinimler</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                {course.requirements.map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
            </div>

            {/* Description */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Açıklama</h2>
              <div className="prose max-w-none text-gray-700">
                <p>{course.description}</p>
              </div>
            </div>

            {/* Instructor Bio */}
            <div className="space-y-6 pt-8 border-t border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Eğitmen</h2>
              <div className="flex items-start space-x-6">
                <img 
                  src={getImageUrl(course.instructor.avatar) || ''} 
                  alt={course.instructor.name}
                  className="w-24 h-24 rounded-full object-cover shadow-lg"
                />
                <div className="space-y-2">
                  <Link href={`/instructors/${course.instructor.id}`} className="text-xl font-bold text-blue-600 hover:underline">
                    {course.instructor.name}
                  </Link>
                  <p className="text-gray-600 font-medium">{course.instructor.title}</p>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-600 py-2">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-500 mr-1" />
                      {course.instructor.rating} Puan
                    </div>
                    <div className="flex items-center">
                      <Award className="w-4 h-4 text-blue-500 mr-1" />
                      {(course.instructor.total_students || 0).toLocaleString()} Öğrenci
                    </div>
                    <div className="flex items-center">
                      <PlayCircle className="w-4 h-4 text-purple-500 mr-1" />
                      {course.instructor.total_courses} Kurs
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {course.instructor.bio}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar (Sticky) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Course Card */}
              <Card className="border-0 shadow-2xl overflow-hidden">
                {/* Video Preview / Thumbnail */}
                <div className="relative aspect-video bg-gray-900 group cursor-pointer">
                  {course.thumbnail ? (
                    <img 
                      src={getImageUrl(course.thumbnail) || ''} 
                      alt={course.title}
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-75 transition-opacity"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600">
                      <BookOpen className="w-16 h-16 text-white" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <PlayCircle className="w-8 h-8 text-blue-600 ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 text-center text-white font-medium text-sm">
                    Önizlemeyi İzle
                  </div>
                </div>

                <CardContent className="p-6 space-y-6">
                  {/* Price */}
                  <div className="flex items-center space-x-3">
                    {course.discount_price ? (
                      <>
                        <span className="text-3xl font-bold text-gray-900">
                          {formatPrice(course.discount_price)}
                        </span>
                        <span className="text-lg text-gray-500 line-through">
                          {formatPrice(course.price)}
                        </span>
                        <Badge variant="destructive" className="text-sm">
                          %{Math.round((1 - course.discount_price / course.price) * 100)} İndirim
                        </Badge>
                      </>
                    ) : (
                      <span className="text-3xl font-bold text-gray-900">
                        {course.price === 0 ? 'Ücretsiz' : formatPrice(course.price)}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    {course.is_enrolled ? (
                      <Link href={`/student/courses/${course.id}/learn`}>
                        <Button className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 text-white">
                          Kursa Devam Et
                        </Button>
                      </Link>
                    ) : (
                      <>
                        <Button 
                          onClick={handleEnroll}
                          disabled={enrollLoading}
                          className="w-full h-12 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-blue-500/25 transition-all"
                        >
                          {enrollLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          ) : null}
                          {course.price === 0 ? 'Hemen Kaydol' : 'Satın Al'}
                        </Button>
                        <Button variant="outline" className="w-full h-12 font-semibold border-2">
                          Sepete Ekle
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="text-center text-xs text-gray-500">
                    30 gün para iade garantisi
                  </div>

                  {/* Includes */}
                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <h3 className="font-bold text-gray-900">Bu kurs şunları içerir:</h3>
                    <ul className="space-y-3 text-sm text-gray-600">
                      <li className="flex items-center">
                        <PlayCircle className="w-4 h-4 mr-3 text-gray-400" />
                        {course.duration} saat video içeriği
                      </li>
                      <li className="flex items-center">
                        <BookOpen className="w-4 h-4 mr-3 text-gray-400" />
                        {course.sections.reduce((acc, s) => acc + s.lessons.length, 0)} ders
                      </li>
                      <li className="flex items-center">
                        <Clock className="w-4 h-4 mr-3 text-gray-400" />
                        Ömür boyu erişim
                      </li>
                      <li className="flex items-center">
                        <Award className="w-4 h-4 mr-3 text-gray-400" />
                        Bitirme sertifikası
                      </li>
                    </ul>
                  </div>

                  {/* Share */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <Button variant="ghost" size="sm" className="text-gray-600">
                      <Share2 className="w-4 h-4 mr-2" />
                      Paylaş
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600">
                      <Heart className="w-4 h-4 mr-2" />
                      Kaydet
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper component for icons
function Globe({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" x2="22" y1="12" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}
