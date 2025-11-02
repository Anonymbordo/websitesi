'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  BookOpen, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  CheckCircle, 
  XCircle,
  Users,
  Star,
  DollarSign,
  Calendar,
  Clock,
  AlertTriangle,
  TrendingUp,
  Award,
  PlayCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/store'
import { adminAPI } from '@/lib/api'

interface Course {
  id: number
  title: string
  short_description: string
  price: number
  discount_price?: number
  category: string
  level: 'beginner' | 'intermediate' | 'advanced'
  duration_hours: number
  is_published: boolean
  is_featured: boolean
  thumbnail?: string
  instructor: {
    id: number
    user: {
      full_name: string
    }
  }
  total_students: number
  rating: number
  total_ratings: number
  created_at: string
  published_at?: string
}

export default function AdminCourses() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterLevel, setFilterLevel] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/')
      return
    }

    fetchCourses()
  }, [isAuthenticated, user, router, currentPage, searchTerm, filterCategory, filterStatus, filterLevel])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      
      const params = {
        page: currentPage,
        limit: 20,
        search: searchTerm || undefined,
        category: filterCategory !== 'all' ? filterCategory : undefined,
        is_published: filterStatus === 'published' ? true : filterStatus === 'draft' ? false : undefined,
        level: filterLevel !== 'all' ? filterLevel : undefined
      }

      const response = await adminAPI.getCourses(params)
      
      // Mock data if API doesn't return data
      const mockCourses: Course[] = [
        {
          id: 1,
          title: 'Modern React Development',
          short_description: 'React 18 ve modern web development teknikleri ile kapsamlı frontend eğitimi',
          price: 899,
          discount_price: 699,
          category: 'Frontend Development',
          level: 'intermediate',
          duration_hours: 24,
          is_published: true,
          is_featured: true,
          thumbnail: '/api/placeholder/400/225',
          instructor: {
            id: 1,
            user: {
              full_name: 'Dr. Ayşe Kaya'
            }
          },
          total_students: 1247,
          rating: 4.9,
          total_ratings: 156,
          created_at: '2024-01-10T08:15:00Z',
          published_at: '2024-01-12T10:30:00Z'
        },
        {
          id: 2,
          title: 'Python Machine Learning',
          short_description: 'Python ile makine öğrenmesi algoritmalarını öğrenin ve uygulamalı projeler geliştirin',
          price: 1299,
          category: 'Data Science',
          level: 'advanced',
          duration_hours: 36,
          is_published: false,
          is_featured: false,
          instructor: {
            id: 2,
            user: {
              full_name: 'Prof. Dr. Mehmet Demir'
            }
          },
          total_students: 0,
          rating: 0,
          total_ratings: 0,
          created_at: '2024-01-18T14:22:00Z'
        },
        {
          id: 3,
          title: 'UI/UX Design Masterclass',
          short_description: 'Modern kullanıcı arayüzü ve kullanıcı deneyimi tasarımı prensipleri',
          price: 799,
          discount_price: 599,
          category: 'Design',
          level: 'beginner',
          duration_hours: 18,
          is_published: true,
          is_featured: false,
          instructor: {
            id: 3,
            user: {
              full_name: 'Fatma Şahin'
            }
          },
          total_students: 892,
          rating: 4.7,
          total_ratings: 94,
          created_at: '2024-01-08T14:30:00Z',
          published_at: '2024-01-10T16:45:00Z'
        },
        {
          id: 4,
          title: 'Flutter Mobile Development',
          short_description: 'Flutter ile cross-platform mobil uygulama geliştirme',
          price: 999,
          category: 'Mobile Development',
          level: 'intermediate',
          duration_hours: 30,
          is_published: true,
          is_featured: true,
          instructor: {
            id: 4,
            user: {
              full_name: 'Ali Özkan'
            }
          },
          total_students: 634,
          rating: 4.8,
          total_ratings: 72,
          created_at: '2024-01-15T09:20:00Z',
          published_at: '2024-01-17T11:00:00Z'
        }
      ]

      setCourses(response.data?.courses || mockCourses)
      setTotalPages(response.data?.total_pages || 1)
    } catch (error) {
      console.error('Kurslar yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCourseAction = async (courseId: number, action: 'publish' | 'unpublish') => {
    try {
      if (action === 'publish') {
        await adminAPI.publishCourse(courseId)
      } else {
        await adminAPI.unpublishCourse(courseId)
      }
      
      // Kurs listesini yenile
      fetchCourses()
    } catch (error) {
      console.error('Kurs işlemi sırasında hata:', error)
    }
  }

  const handleFeatureToggle = async (courseId: number, isFeatured: boolean) => {
    try {
      if (isFeatured) {
        await adminAPI.unfeatureCourse(courseId)
      } else {
        await adminAPI.featureCourse(courseId)
      }
      
      // Kurs listesini yenile
      fetchCourses()
    } catch (error) {
      console.error('Öne çıkarma işlemi sırasında hata:', error)
    }
  }

  const getLevelText = (level: string) => {
    switch (level) {
      case 'beginner': return 'Başlangıç'
      case 'intermediate': return 'Orta'
      case 'advanced': return 'İleri'
      default: return level
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return null
  }

  const publishedCount = courses.filter(c => c.is_published).length
  const draftCount = courses.filter(c => !c.is_published).length
  const featuredCount = courses.filter(c => c.is_featured).length
  const totalRevenue = courses.reduce((sum, course) => sum + (course.discount_price || course.price) * course.total_students, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-2">
                Kurs Yönetimi
              </h1>
              <p className="text-xl text-gray-600">
                Platform kurslarını görüntüleyin ve yönetin
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => router.push('/admin/courses/create')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Yeni Kurs Ekle
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: 'Yayında',
              value: publishedCount,
              icon: CheckCircle,
              gradient: 'from-green-500 to-emerald-500',
              bgGradient: 'from-green-50 to-emerald-50'
            },
            {
              title: 'Taslak',
              value: draftCount,
              icon: Edit,
              gradient: 'from-yellow-500 to-orange-500',
              bgGradient: 'from-yellow-50 to-orange-50'
            },
            {
              title: 'Öne Çıkan',
              value: featuredCount,
              icon: Award,
              gradient: 'from-purple-500 to-pink-500',
              bgGradient: 'from-purple-50 to-pink-50'
            },
            {
              title: 'Toplam Gelir',
              value: formatPrice(totalRevenue),
              icon: DollarSign,
              gradient: 'from-blue-500 to-cyan-500',
              bgGradient: 'from-blue-50 to-cyan-50'
            }
          ].map((stat, index) => (
            <Card 
              key={index}
              className="group relative overflow-hidden bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 cursor-pointer"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
              
              <CardContent className="relative p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 group-hover:scale-110 transition-transform duration-300">
                      {stat.value}
                    </p>
                  </div>
                  
                  <div className={`w-12 h-12 bg-gradient-to-r ${stat.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Kurs ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="all">Tüm Kategoriler</option>
                <option value="Frontend Development">Frontend Development</option>
                <option value="Backend Development">Backend Development</option>
                <option value="Data Science">Data Science</option>
                <option value="Mobile Development">Mobile Development</option>
                <option value="Design">Design</option>
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="published">Yayında</option>
                <option value="draft">Taslak</option>
              </select>

              {/* Level Filter */}
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="all">Tüm Seviyeler</option>
                <option value="beginner">Başlangıç</option>
                <option value="intermediate">Orta</option>
                <option value="advanced">İleri</option>
              </select>

              {/* Reset Button */}
              <Button 
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setFilterCategory('all')
                  setFilterStatus('all')
                  setFilterLevel('all')
                }}
                className="rounded-xl border-gray-200 hover:bg-gray-50"
              >
                <Filter className="w-4 h-4 mr-2" />
                Temizle
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="h-80 bg-gray-100 rounded-3xl animate-pulse"></div>
            ))
          ) : (
            courses.map((course) => (
              <Card 
                key={course.id}
                className="group bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 overflow-hidden rounded-3xl"
              >
                {/* Course Image */}
                <div className="relative aspect-video overflow-hidden">
                  {course.thumbnail ? (
                    <img 
                      src={course.thumbnail} 
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/80 to-purple-600/80">
                      <BookOpen className="w-12 h-12 text-white" />
                    </div>
                  )}
                  
                  {/* Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                  
                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex items-center space-x-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getLevelColor(course.level)}`}>
                      {getLevelText(course.level)}
                    </span>
                    
                    {course.is_featured && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Award className="w-3 h-3 mr-1" />
                        Öne Çıkan
                      </span>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      course.is_published 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {course.is_published ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Yayında
                        </>
                      ) : (
                        <>
                          <Edit className="w-3 h-3 mr-1" />
                          Taslak
                        </>
                      )}
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
                  {/* Title & Description */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors duration-300">
                      {course.title}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2 mt-2">
                      {course.short_description}
                    </p>
                  </div>

                  {/* Instructor & Category */}
                  <div className="text-sm text-gray-600">
                    <div>Eğitmen: {course.instructor.user.full_name}</div>
                    <div>Kategori: {course.category}</div>
                  </div>

                  {/* Stats */}
                  {course.is_published && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1 text-gray-400" />
                          <span>{course.total_students}</span>
                        </div>
                        <div className="flex items-center">
                          <Star className="w-4 h-4 mr-1 text-yellow-400" />
                          <span>{course.rating.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1 text-gray-400" />
                          <span>{course.duration_hours}s</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Price */}
                  <div className="flex items-center justify-between">
                    <div>
                      {course.discount_price ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold text-green-600">
                            {formatPrice(course.discount_price)}
                          </span>
                          <span className="text-sm text-gray-500 line-through">
                            {formatPrice(course.price)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-lg font-bold text-gray-900">
                          {formatPrice(course.price)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="text-xs text-gray-500">
                    Oluşturulma: {formatDate(course.created_at)}
                    {course.published_at && (
                      <span className="ml-4">
                        Yayın: {formatDate(course.published_at)}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" className="rounded-lg">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-lg">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleFeatureToggle(course.id, course.is_featured)}
                        className={`rounded-lg ${
                          course.is_featured 
                            ? 'border-orange-400 bg-orange-50 text-orange-700' 
                            : ''
                        }`}
                      >
                        <Star className={`w-4 h-4 ${course.is_featured ? 'fill-current' : ''}`} />
                      </Button>
                    </div>

                    <Button 
                      size="sm"
                      onClick={() => handleCourseAction(course.id, course.is_published ? 'unpublish' : 'publish')}
                      className={`rounded-lg ${
                        course.is_published 
                          ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700' 
                          : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                      } text-white`}
                    >
                      {course.is_published ? (
                        <>
                          <XCircle className="w-4 h-4 mr-2" />
                          Yayından Kaldır
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Yayınla
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center mt-12">
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="rounded-xl"
              >
                Önceki
              </Button>
              
              <span className="px-4 py-2 text-sm text-gray-600">
                Sayfa {currentPage} / {totalPages}
              </span>
              
              <Button 
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="rounded-xl"
              >
                Sonraki
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}