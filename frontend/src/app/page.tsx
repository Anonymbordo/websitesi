'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BookOpen, 
  Users, 
  Award, 
  Star, 
  PlayCircle, 
  TrendingUp,
  MessageCircle,
  Brain,
  Shield,
  Globe
} from 'lucide-react'
import { coursesAPI, instructorsAPI } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { useHydration } from '@/hooks/useHydration'

export default function HomePage() {
  const [featuredCourses, setFeaturedCourses] = useState<any[]>([])
  const [topInstructors, setTopInstructors] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalInstructors: 0,
    totalStudents: 0,
    averageRating: 0
  })
  
  const hydrated = useHydration()

  useEffect(() => {
    if (!hydrated) return
    
    const fetchData = async () => {
      try {
        // Gerçek API çağrıları test edelim
        console.log('API çağrısı yapılıyor...')
        const coursesResponse = await coursesAPI.getCourses({ limit: 6 })
        console.log('Kurslar geldi:', coursesResponse)
        
        const instructorsResponse = await instructorsAPI.getInstructors({ limit: 4 })
        console.log('Eğitmenler geldi:', instructorsResponse)

        // Eğer veri yoksa mock data kullan
        if (coursesResponse.data && coursesResponse.data.length > 0) {
          setFeaturedCourses(coursesResponse.data)
        } else {
          console.log('API boş veri döndü, mock data kullanılıyor')
          const mockCourses = [
            {
              id: 1,
              title: "React ile Modern Web Geliştirme",
              description: "Sıfırdan ileri seviyeye React öğrenin",
              price: 299,
              rating: 4.8,
              students_count: 1250,
              instructor: { name: "Ahmet Yılmaz", avatar: "/api/placeholder/40/40" },
              thumbnail: "/api/placeholder/300/200",
              duration: "12 saat"
            },
            {
              id: 2,
              title: "Python ile Veri Bilimi",
              description: "Python kullanarak veri analizi ve machine learning",
              price: 399,
              rating: 4.9,
              students_count: 890,
              instructor: { name: "Zeynep Kaya", avatar: "/api/placeholder/40/40" },
              thumbnail: "/api/placeholder/300/200",
              duration: "18 saat"
            }
          ]
          setFeaturedCourses(mockCourses)
        }

        if (instructorsResponse.data && instructorsResponse.data.length > 0) {
          setTopInstructors(instructorsResponse.data)
        } else {
          console.log('Instructors API boş veri döndü, mock data kullanılıyor')
          const mockInstructors = [
            {
              id: 1,
              name: "Ahmet Yılmaz",
              bio: "Senior Full Stack Developer", 
              rating: 4.9,
              students_count: 3500,
              courses_count: 12,
              avatar: "/api/placeholder/60/60"
            },
            {
              id: 2,
              name: "Zeynep Kaya",
              bio: "Data Scientist & AI Expert",
              rating: 4.8,
              students_count: 2800,
              courses_count: 8,
              avatar: "/api/placeholder/60/60"
            }
          ]
          setTopInstructors(mockInstructors)
        }

        // İstatistikleri hesapla
        setStats({
          totalCourses: 180,
          totalInstructors: 67,
          totalStudents: 12500,
          averageRating: 4.7
        })
      } catch (error) {
        console.error('Veri yüklenirken hata:', error)
        
        // API çalışmıyorsa fallback mock data
          const mockCourses = [
            {
              id: 1,
              title: "React ile Modern Web Geliştirme",
              short_description: "Sıfırdan ileri seviyeye React öğrenin ve modern web uygulamaları geliştirin",
              price: 299,
              discount_price: 199,
              rating: 4.8,
              total_ratings: 324,
              level: 'intermediate',
              instructor: { name: "Ahmet Yılmaz", avatar: "/api/placeholder/40/40" },
              thumbnail: "/api/placeholder/300/200",
              duration: "12 saat"
            },
            {
              id: 2,
              title: "Python ile Veri Bilimi",
              short_description: "Python kullanarak veri analizi, machine learning ve yapay zeka öğrenin",
              price: 399,
              discount_price: 299,
              rating: 4.9,
              total_ratings: 156,
              level: 'advanced',
              instructor: { name: "Zeynep Kaya", avatar: "/api/placeholder/40/40" },
              thumbnail: "/api/placeholder/300/200",
              duration: "18 saat"
            },
            {
              id: 3,
              title: "JavaScript Temelleri",
              short_description: "Web geliştirmenin temel taşı JavaScript'i sıfırdan öğrenin",
              price: 199,
              rating: 4.7,
              total_ratings: 89,
              level: 'beginner',
              instructor: { name: "Mehmet Özkan", avatar: "/api/placeholder/40/40" },
              thumbnail: "/api/placeholder/300/200",
              duration: "8 saat"
            },
            {
              id: 4,
              title: "UI/UX Tasarım Prensipleri",
              short_description: "Kullanıcı deneyimi ve arayüz tasarımının temellerini öğrenin",
              price: 349,
              discount_price: 249,
              rating: 4.6,
              total_ratings: 67,
              level: 'intermediate',
              instructor: { name: "Selin Demir", avatar: "/api/placeholder/40/40" },
              thumbnail: "/api/placeholder/300/200",
              duration: "14 saat"
            },
            {
              id: 5,
              title: "Node.js ve Express",
              short_description: "Backend geliştirme için Node.js ve Express framework'ünü öğrenin",
              price: 279,
              rating: 4.5,
              total_ratings: 112,
              level: 'intermediate',
              instructor: { name: "Can Yıldız", avatar: "/api/placeholder/40/40" },
              thumbnail: "/api/placeholder/300/200",
              duration: "16 saat"
            },
            {
              id: 6,
              title: "Digital Marketing Stratejileri",
              short_description: "Dijital pazarlama dünyasında başarılı olmak için gerekli tüm stratejiler",
              price: 199,
              discount_price: 149,
              rating: 4.4,
              total_ratings: 234,
              level: 'beginner',
              instructor: { name: "Ayşe Koç", avatar: "/api/placeholder/40/40" },
              thumbnail: "/api/placeholder/300/200",
              duration: "10 saat"
            }
          ]

        const mockInstructors = [
          {
            id: 1,
            user: { full_name: "Ahmet Yılmaz" },
            specialization: "Senior Full Stack Developer & React Expert",
            rating: 4.9,
            total_students: 3500,
            total_courses: 12,
            total_ratings: 428,
            avatar: "/api/placeholder/60/60"
          },
          {
            id: 2,
            user: { full_name: "Zeynep Kaya" },
            specialization: "Data Scientist & AI Specialist",
            rating: 4.8,
            total_students: 2800,
            total_courses: 8,
            total_ratings: 367,
            avatar: "/api/placeholder/60/60"
          },
          {
            id: 3,
            user: { full_name: "Mehmet Özkan" },
            specialization: "JavaScript & Frontend Developer",
            rating: 4.7,
            total_students: 1950,
            total_courses: 6,
            total_ratings: 234,
            avatar: "/api/placeholder/60/60"
          },
          {
            id: 4,
            user: { full_name: "Selin Demir" },
            specialization: "UI/UX Designer & Product Manager",
            rating: 4.6,
            total_students: 1200,
            total_courses: 4,
            total_ratings: 189,
            avatar: "/api/placeholder/60/60"
          }
        ]

        setFeaturedCourses(mockCourses)
        setTopInstructors(mockInstructors)
      }
    }

    fetchData()
  }, [hydrated])

  // Hydration hatası için client-side render kontrolü
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5Q0EzQUYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
          
          {/* Floating Elements */}
          <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                  <Brain className="w-4 h-4 text-yellow-400 mr-2" />
                  <span className="text-sm text-white/90 font-medium">AI Destekli Öğrenme Platformu</span>
                </div>
                
                <h1 className="text-5xl md:text-7xl font-bold leading-tight text-white">
                  Geleceğinizi 
                  <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 bg-clip-text text-transparent block md:inline"> Şekillendirin</span>
                </h1>
                
                <p className="text-xl md:text-2xl text-white/80 leading-relaxed max-w-2xl">
                  Yapay zeka destekli kişiselleştirilmiş öğrenme deneyimi ile 
                  binlerce kurs ve uzman eğitmenlerden öğrenin.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/courses">
                  <Button 
                    size="lg" 
                    className="group bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-gray-900 font-semibold px-8 py-4 rounded-2xl shadow-2xl hover:shadow-yellow-400/25 transition-all duration-300 transform hover:scale-105 border-0"
                  >
                    <span className="mr-2">Kurslara Göz At</span>
                    <PlayCircle className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                  </Button>
                </Link>
                <Link href="/instructors/apply">
                  <Button 
                    size="lg" 
                    className="group bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border border-white/30 hover:border-white/50 font-semibold px-8 py-4 rounded-2xl transition-all duration-300 transform hover:scale-105"
                  >
                    <span className="mr-2">Eğitmen Ol</span>
                    <TrendingUp className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative">
              {/* Glassmorphism Stats Card */}
              <div className="relative bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl"></div>
                
                <div className="relative grid grid-cols-2 gap-8">
                  <div className="text-center group cursor-pointer">
                    <div className="text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform duration-300">
                      {stats.totalCourses}+
                    </div>
                    <div className="text-white/70 font-medium">Online Kurs</div>
                    <div className="w-12 h-0.5 bg-gradient-to-r from-yellow-400 to-orange-400 mx-auto mt-2 rounded-full"></div>
                  </div>
                  
                  <div className="text-center group cursor-pointer">
                    <div className="text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform duration-300">
                      {stats.totalInstructors}+
                    </div>
                    <div className="text-white/70 font-medium">Uzman Eğitmen</div>
                    <div className="w-12 h-0.5 bg-gradient-to-r from-blue-400 to-cyan-400 mx-auto mt-2 rounded-full"></div>
                  </div>
                  
                  <div className="text-center group cursor-pointer">
                    <div className="text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform duration-300">
                      {stats.totalStudents}+
                    </div>
                    <div className="text-white/70 font-medium">Aktif Öğrenci</div>
                    <div className="w-12 h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto mt-2 rounded-full"></div>
                  </div>
                  
                  <div className="text-center group cursor-pointer">
                    <div className="text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform duration-300">
                      {stats.averageRating}
                    </div>
                    <div className="text-white/70 font-medium">Ortalama Puan</div>
                    <div className="w-12 h-0.5 bg-gradient-to-r from-green-400 to-emerald-400 mx-auto mt-2 rounded-full"></div>
                  </div>
                </div>

                {/* Floating Indicators */}
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-yellow-400 rounded-full animate-ping opacity-20"></div>
                <div className="absolute -bottom-4 -right-4 w-6 h-6 bg-blue-400 rounded-full animate-ping opacity-20 delay-1000"></div>
              </div>

              {/* Background Cards */}
              <div className="absolute -top-6 -left-6 w-full h-full bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 -z-10"></div>
              <div className="absolute -top-3 -left-3 w-full h-full bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 -z-20"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 relative">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/50 to-transparent"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-sm font-medium mb-6">
              <Award className="w-4 h-4 mr-2" />
              Neden Bizi Seçmelisiniz?
            </div>
            
            <h2 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-6">
              Modern Öğrenmenin
              <span className="block">Geleceği Burada</span>
            </h2>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Teknoloji ve pedagojinin mükemmel birleşimi ile öğrenme deneyiminizi 
              yeni boyutlara taşıyoruz.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: 'Yapay Zeka Desteği',
                description: 'Kişiselleştirilmiş öğrenme önerileri, akıllı quiz oluşturma ve 7/24 AI asistan desteği.',
                gradient: 'from-purple-500 to-pink-500',
                bgGradient: 'from-purple-50 to-pink-50'
              },
              {
                icon: Users,
                title: 'Uzman Eğitmenler',
                description: 'Sektörün önde gelen uzmanlarından pratik bilgiler ve gerçek deneyimler.',
                gradient: 'from-blue-500 to-cyan-500',
                bgGradient: 'from-blue-50 to-cyan-50'
              },
              {
                icon: Award,
                title: 'Sertifikalı Eğitimler',
                description: 'Tamamladığınız kurslar için geçerli sertifikalar ve referans mektupları.',
                gradient: 'from-emerald-500 to-teal-500',
                bgGradient: 'from-emerald-50 to-teal-50'
              },
              {
                icon: MessageCircle,
                title: 'İnteraktif Öğrenme',
                description: 'Canlı dersler, Q&A seansları ve eğitmenlerle birebir iletişim imkanı.',
                gradient: 'from-orange-500 to-red-500',
                bgGradient: 'from-orange-50 to-red-50'
              },
              {
                icon: Shield,
                title: 'Güvenli Ödemeler',
                description: 'İyzico entegrasyonu ile güvenli ödeme sistemi ve esnek ödeme seçenekleri.',
                gradient: 'from-indigo-500 to-purple-500',
                bgGradient: 'from-indigo-50 to-purple-50'
              },
              {
                icon: Globe,
                title: 'Her Yerden Erişim',
                description: 'Mobil ve web uyumlu platform ile istediğiniz yerden öğrenme özgürlüğü.',
                gradient: 'from-green-500 to-blue-500',
                bgGradient: 'from-green-50 to-blue-50'
              }
            ].map((feature, index) => (
              <Card 
                key={index} 
                className="group relative overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 cursor-pointer"
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                
                <CardHeader className="relative">
                  <div className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <CardTitle className="text-2xl font-bold text-center group-hover:text-gray-900 transition-colors duration-300">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="relative text-center">
                  <p className="text-gray-600 group-hover:text-gray-700 leading-relaxed transition-colors duration-300">
                    {feature.description}
                  </p>
                  
                  {/* Hover Effect Arrow */}
                  <div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className={`inline-flex items-center text-sm font-medium bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>
                      Daha fazla bilgi
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </CardContent>

                {/* Decorative Elements */}
                <div className="absolute top-4 right-4 w-2 h-2 bg-gray-200 rounded-full group-hover:bg-gray-300 transition-colors duration-300"></div>
                <div className="absolute bottom-4 left-4 w-1 h-1 bg-gray-200 rounded-full group-hover:bg-gray-300 transition-colors duration-300"></div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-32 relative">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5Q0EzQUYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-10"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-16 gap-8">
            <div>
              <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6">
                <BookOpen className="w-4 h-4 text-yellow-400 mr-2" />
                <span className="text-sm text-white/90 font-medium">Popüler Kurslar</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Öne Çıkan 
                <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent block md:inline"> Kurslar</span>
              </h2>
              
              <p className="text-xl text-white/70 max-w-2xl">
                En popüler ve en çok tercih edilen kurslarımızla kariyerinizi ileriye taşıyın
              </p>
            </div>
            
            <Link href="/courses">
              <Button 
                variant="outline" 
                className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white hover:text-gray-900 transition-all duration-300 transform hover:scale-105 px-8 py-3 rounded-xl"
              >
                Tümünü Gör
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredCourses.slice(0, 6).map((course: any, index: number) => (
              <Card 
                key={course.id} 
                className="group bg-white/10 backdrop-blur-lg border border-white/20 hover:border-white/40 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:scale-105"
              >
                <div className="relative aspect-video overflow-hidden">
                  <div className={`w-full h-full flex items-center justify-center ${
                    index % 4 === 0 ? 'bg-gradient-to-br from-blue-500 to-purple-600' :
                    index % 4 === 1 ? 'bg-gradient-to-br from-purple-500 to-pink-600' :
                    index % 4 === 2 ? 'bg-gradient-to-br from-green-500 to-blue-600' :
                    'bg-gradient-to-br from-orange-500 to-red-600'
                  } group-hover:scale-110 transition-transform duration-500`}>
                    <BookOpen className="w-12 h-12 text-white" />
                  </div>
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                  
                  {/* Level Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-sm text-gray-900 px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                      {course.level === 'beginner' ? 'Başlangıç' : 
                       course.level === 'intermediate' ? 'Orta' : 'İleri'}
                    </span>
                  </div>

                  {/* Play Button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                      <PlayCircle className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>

                <CardContent className="p-6 space-y-4">
                  <h3 className="text-xl font-bold text-white line-clamp-2 group-hover:text-yellow-400 transition-colors duration-300">
                    {course.title}
                  </h3>
                  
                  <p className="text-white/70 text-sm line-clamp-2 leading-relaxed">
                    {course.short_description}
                  </p>
                  
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${i < Math.floor(course.rating) ? 'text-yellow-400 fill-current' : 'text-white/30'}`} 
                      />
                    ))}
                    <span className="text-sm text-white/70 ml-2">({course.total_ratings || 0})</span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="flex items-center space-x-3">
                      {course.discount_price ? (
                        <>
                          <span className="text-2xl font-bold text-yellow-400">
                            {formatPrice(course.discount_price)}
                          </span>
                          <span className="text-sm text-white/50 line-through">
                            {formatPrice(course.price)}
                          </span>
                        </>
                      ) : (
                        <span className="text-2xl font-bold text-white">
                          {formatPrice(course.price)}
                        </span>
                      )}
                    </div>
                    
                    <Link href={`/courses/${course.id}`}>
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-gray-900 font-medium rounded-xl px-6 shadow-lg hover:shadow-yellow-400/25 transition-all duration-300"
                      >
                        İncele
                      </Button>
                    </Link>
                  </div>
                </CardContent>

                {/* Decorative Elements */}
                <div className="absolute top-6 right-6 w-3 h-3 bg-yellow-400/50 rounded-full animate-pulse"></div>
                <div className="absolute bottom-6 left-6 w-2 h-2 bg-blue-400/50 rounded-full animate-pulse delay-1000"></div>
              </Card>
            ))}
          </div>

          {/* Floating Elements */}
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-yellow-400/10 to-orange-400/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-2xl"></div>
        </div>
      </section>

      {/* Top Instructors */}
      <section className="py-32 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100"></div>
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full border border-white/20 shadow-lg mb-6">
              <Users className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-sm text-gray-700 font-medium">Uzman Kadromuz</span>
            </div>
            
            <h2 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-6">
              Sektörün En İyi
              <span className="block">Eğitmenleri</span>
            </h2>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Deneyimli profesyonellerden öğrenme fırsatı yakalayin ve kariyerinizi ileriye taşıyın
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {topInstructors.map((instructor: any, index: number) => (
              <Card 
                key={instructor.id} 
                className="group relative bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 cursor-pointer overflow-hidden rounded-3xl"
              >
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <CardContent className="relative p-8 text-center space-y-6">
                  {/* Avatar */}
                  <div className="relative mx-auto">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl group-hover:shadow-blue-500/25 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                      <span className="text-white text-3xl font-bold">
                        {instructor.user?.full_name?.charAt(0)}
                      </span>
                    </div>
                    
                    {/* Status Indicator */}
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full border-4 border-white shadow-lg animate-pulse"></div>
                    
                    {/* Floating Badge */}
                    <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
                      <div className="bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                        ⭐ {instructor.rating}
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                      {instructor.user?.full_name}
                    </h3>
                    
                    <p className="text-sm text-gray-600 group-hover:text-gray-700 font-medium">
                      {instructor.specialization}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                    <div className="text-center group-hover:scale-110 transition-transform duration-300">
                      <div className="text-lg font-bold text-blue-600">
                        {instructor.total_students || 0}
                      </div>
                      <div className="text-xs text-gray-500">Öğrenci</div>
                    </div>
                    
                    <div className="text-center group-hover:scale-110 transition-transform duration-300 delay-75">
                      <div className="text-lg font-bold text-purple-600">
                        {instructor.total_courses || 0}
                      </div>
                      <div className="text-xs text-gray-500">Kurs</div>
                    </div>
                    
                    <div className="text-center group-hover:scale-110 transition-transform duration-300 delay-150">
                      <div className="text-lg font-bold text-yellow-600">
                        {instructor.total_ratings || 0}
                      </div>
                      <div className="text-xs text-gray-500">Değerlendirme</div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Link href={`/instructors/${instructor.id}`}>
                    <Button 
                      size="sm" 
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl shadow-lg hover:shadow-blue-500/25 transition-all duration-300 group-hover:scale-105"
                    >
                      Profili Görüntüle
                      <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </Link>
                </CardContent>

                {/* Decorative Elements */}
                <div className="absolute top-4 right-4 w-2 h-2 bg-blue-400/50 rounded-full animate-pulse"></div>
                <div className="absolute bottom-4 left-4 w-1 h-1 bg-purple-400/50 rounded-full animate-pulse delay-1000"></div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 overflow-hidden">
        {/* Dynamic Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5Q0EzQUYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
          
          {/* Animated Elements */}
          <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-yellow-400/10 to-orange-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="relative max-w-6xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          {/* Badge */}
          <div className="inline-flex items-center px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-8">
            <TrendingUp className="w-4 h-4 text-yellow-400 mr-2" />
            <span className="text-sm text-white/90 font-medium">Kariyerinizi Geliştirin</span>
          </div>

          {/* Main Heading */}
          <h2 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
            Öğrenme Yolculuğunuza
            <span className="block bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 bg-clip-text text-transparent">
              Bugün Başlayın
            </span>
          </h2>
          
          {/* Description */}
          <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-4xl mx-auto leading-relaxed">
            Binlerce kurs arasından size uygun olanı seçin ve kariyerinizi ileriye taşıyın. 
            İlk kursa kaydolun ve öğrenmenin keyfini çıkarın.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link href="/courses">
              <Button 
                size="lg" 
                className="group bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-gray-900 font-bold px-12 py-6 text-lg rounded-2xl shadow-2xl hover:shadow-yellow-400/25 transition-all duration-300 transform hover:scale-105"
              >
                <span className="mr-3">Kurslara Başla</span>
                <BookOpen className="w-6 h-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
              </Button>
            </Link>
            
            <Link href="/about">
              <Button 
                size="lg" 
                className="group bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border-2 border-white/30 hover:border-white/50 font-semibold px-12 py-6 text-lg rounded-2xl transition-all duration-300 transform hover:scale-105"
              >
                <span className="mr-3">Daha Fazla Bilgi</span>
                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: '99%', label: 'Öğrenci Memnuniyeti' },
              { number: '24/7', label: 'Destek Hizmeti' },
              { number: '50+', label: 'Farklı Kategori' },
              { number: '∞', label: 'Öğrenme Fırsatı' }
            ].map((stat, index) => (
              <div key={index} className="text-center group cursor-pointer">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2 group-hover:scale-110 transition-transform duration-300">
                  {stat.number}
                </div>
                <div className="text-white/70 font-medium group-hover:text-white transition-colors duration-300">
                  {stat.label}
                </div>
                <div className="w-12 h-0.5 bg-gradient-to-r from-yellow-400 to-orange-400 mx-auto mt-3 rounded-full group-hover:w-16 transition-all duration-300"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
