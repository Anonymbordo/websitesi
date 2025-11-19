'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  Star,
  Clock,
  PlayCircle,
  CheckCircle2,
  TrendingUp,
  Filter,
  Search,
  Award,
  Calendar,
  Loader2,
  ArrowRight,
  BarChart3
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/store'
import { coursesAPI } from '@/lib/api'
import Link from 'next/link'
import Image from 'next/image'

interface Course {
  id: number
  title: string
  description: string
  thumbnail?: string
  instructor: {
    name: string
    avatar?: string
  }
  progress: number
  totalLessons: number
  completedLessons: number
  duration: number
  category: string
  level: string
  rating: number
  enrolled_at: string
  last_accessed?: string
  certificate_url?: string
}

export default function MyCoursesPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'in-progress' | 'completed'>('all')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?next=/student/courses')
      return
    }

    fetchMyCourses()
  }, [isAuthenticated, router])

  useEffect(() => {
    filterCourses()
  }, [courses, searchTerm, filterStatus])

  const fetchMyCourses = async () => {
    try {
      setLoading(true)
      const response = await coursesAPI.getMyCourses()
      setCourses(response.data || [])
    } catch (error) {
      console.error('Fetch courses error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterCourses = () => {
    let filtered = courses

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.instructor.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (filterStatus === 'completed') {
      filtered = filtered.filter(course => course.progress === 100)
    } else if (filterStatus === 'in-progress') {
      filtered = filtered.filter(course => course.progress > 0 && course.progress < 100)
    }

    setFilteredCourses(filtered)
  }

  const stats = {
    total: courses.length,
    inProgress: courses.filter(c => c.progress > 0 && c.progress < 100).length,
    completed: courses.filter(c => c.progress === 100).length,
    totalHours: courses.reduce((acc, c) => acc + c.duration, 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Kurslarınız yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-2">
            Kurslarım
          </h1>
          <p className="text-gray-600">Kayıtlı olduğunuz tüm kurslar ve ilerleme durumunuz</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Toplam Kurslar</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <BookOpen className="w-10 h-10 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm mb-1">Devam Eden</p>
                  <p className="text-3xl font-bold">{stats.inProgress}</p>
                </div>
                <PlayCircle className="w-10 h-10 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm mb-1">Tamamlanan</p>
                  <p className="text-3xl font-bold">{stats.completed}</p>
                </div>
                <CheckCircle2 className="w-10 h-10 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm mb-1">Toplam Saat</p>
                  <p className="text-3xl font-bold">{stats.totalHours}</p>
                </div>
                <Clock className="w-10 h-10 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Kurs veya eğitmen ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('all')}
                  className={filterStatus === 'all' ? 'bg-blue-600 text-white' : ''}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Tümü
                </Button>
                <Button
                  variant={filterStatus === 'in-progress' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('in-progress')}
                  className={filterStatus === 'in-progress' ? 'bg-orange-600 text-white' : ''}
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Devam Eden
                </Button>
                <Button
                  variant={filterStatus === 'completed' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('completed')}
                  className={filterStatus === 'completed' ? 'bg-green-600 text-white' : ''}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Tamamlanan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Courses List */}
        {filteredCourses.length === 0 ? (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchTerm || filterStatus !== 'all' ? 'Kurs bulunamadı' : 'Henüz kursa kayıtlı değilsiniz'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || filterStatus !== 'all'
                  ? 'Farklı filtreler veya arama terimleri deneyin'
                  : 'Yeni kurslar keşfedin ve öğrenmeye başlayın'}
              </p>
              <Link href="/courses">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Kursları Keşfet
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredCourses.map((course) => (
              <Card
                key={course.id}
                className="shadow-xl border-0 bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Thumbnail */}
                    <div className="lg:w-64 flex-shrink-0">
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100">
                        {course.thumbnail ? (
                          <Image
                            src={course.thumbnail}
                            alt={course.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <BookOpen className="w-16 h-16 text-blue-300" />
                          </div>
                        )}
                        {course.progress === 100 && (
                          <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Tamamlandı
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <Link href={`/courses/${course.id}`}>
                            <h3 className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors mb-2 line-clamp-1">
                              {course.title}
                            </h3>
                          </Link>
                          <p className="text-gray-600 line-clamp-2 mb-3">{course.description}</p>
                        </div>
                      </div>

                      {/* Meta Info */}
                      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Award className="w-4 h-4 mr-1" />
                          {course.instructor.name}
                        </div>
                        <div className="flex items-center">
                          <Star className="w-4 h-4 mr-1 text-yellow-400 fill-yellow-400" />
                          {course.rating.toFixed(1)}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {course.duration} saat
                        </div>
                        <Badge variant="secondary">{course.category}</Badge>
                        <Badge variant="outline">{course.level}</Badge>
                      </div>

                      {/* Progress */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="font-medium text-gray-700">İlerleme Durumu</span>
                          <span className="text-blue-600 font-semibold">
                            {course.completedLessons}/{course.totalLessons} Ders • %{course.progress}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 relative"
                            style={{ width: `${course.progress}%` }}
                          >
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-3">
                        <Link href={`/courses/${course.id}`}>
                          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700">
                            {course.progress === 0 ? 'Kursa Başla' : 'Devam Et'}
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>

                        {course.progress === 100 && course.certificate_url && (
                          <Link href={course.certificate_url} target="_blank">
                            <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50">
                              <Award className="w-4 h-4 mr-2" />
                              Sertifikayı Görüntüle
                            </Button>
                          </Link>
                        )}

                        <div className="ml-auto text-xs text-gray-500">
                          {course.last_accessed && (
                            <div className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              Son erişim: {new Date(course.last_accessed).toLocaleDateString('tr-TR')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
