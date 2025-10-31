'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  GraduationCap, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Star,
  Users,
  BookOpen,
  Mail,
  Calendar,
  Eye,
  MessageSquare,
  Award,
  TrendingUp
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/store'
import { adminAPI } from '@/lib/api'

interface Instructor {
  id: number
  user: {
    id: number
    full_name: string
    email: string
    phone: string
  }
  specialization: string
  experience_years: number
  bio: string
  status: 'pending' | 'approved' | 'rejected'
  rating: number
  total_students: number
  total_courses: number
  total_ratings: number
  created_at: string
  approved_at?: string
}

export default function AdminInstructors() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/')
      return
    }

    fetchInstructors()
  }, [isAuthenticated, user, router, currentPage, searchTerm, filterStatus])

  const fetchInstructors = async () => {
    try {
      setLoading(true)
      
      const params = {
        page: currentPage,
        limit: 20,
        search: searchTerm || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined
      }

      const response = await adminAPI.getInstructors(params)
      
      // Mock data if API doesn't return data
      const mockInstructors: Instructor[] = [
        {
          id: 1,
          user: {
            id: 2,
            full_name: 'Dr. Ayşe Kaya',
            email: 'ayse@example.com',
            phone: '+90 555 234 5678'
          },
          specialization: 'Web Development & JavaScript',
          experience_years: 8,
          bio: 'Frontend ve backend teknolojilerde 8 yıllık deneyime sahip yazılım geliştirici. React, Node.js ve modern web teknolojileri konularında uzman.',
          status: 'approved',
          rating: 4.9,
          total_students: 1247,
          total_courses: 12,
          total_ratings: 156,
          created_at: '2024-01-10T08:15:00Z',
          approved_at: '2024-01-12T10:30:00Z'
        },
        {
          id: 2,
          user: {
            id: 4,
            full_name: 'Prof. Dr. Mehmet Demir',
            email: 'mehmet@example.com',
            phone: '+90 555 345 6789'
          },
          specialization: 'Data Science & Machine Learning',
          experience_years: 15,
          bio: 'Yapay zeka ve makine öğrenmesi alanında 15 yıllık akademik ve endüstriyel deneyim. Python, TensorFlow ve veri analizi konularında uzman.',
          status: 'pending',
          rating: 0,
          total_students: 0,
          total_courses: 0,
          total_ratings: 0,
          created_at: '2024-01-18T14:22:00Z'
        },
        {
          id: 3,
          user: {
            id: 6,
            full_name: 'Fatma Şahin',
            email: 'fatma@example.com',
            phone: '+90 555 456 7890'
          },
          specialization: 'UI/UX Design & Graphic Design',
          experience_years: 6,
          bio: 'Kullanıcı deneyimi tasarımı ve görsel iletişim alanlarında 6 yıllık deneyim. Adobe Creative Suite ve Figma konularında uzman.',
          status: 'approved',
          rating: 4.7,
          total_students: 892,
          total_courses: 8,
          total_ratings: 94,
          created_at: '2024-01-08T14:30:00Z',
          approved_at: '2024-01-10T16:45:00Z'
        },
        {
          id: 4,
          user: {
            id: 8,
            full_name: 'Ali Özkan',
            email: 'ali@example.com',
            phone: '+90 555 567 8901'
          },
          specialization: 'Mobile App Development',
          experience_years: 4,
          bio: 'React Native ve Flutter ile mobil uygulama geliştirme konusunda 4 yıllık deneyim.',
          status: 'rejected',
          rating: 0,
          total_students: 0,
          total_courses: 0,
          total_ratings: 0,
          created_at: '2024-01-15T09:20:00Z'
        },
        {
          id: 5,
          user: {
            id: 10,
            full_name: 'Zeynep Yılmaz',
            email: 'zeynep@example.com',
            phone: '+90 555 678 9012'
          },
          specialization: 'Digital Marketing & SEO',
          experience_years: 5,
          bio: 'Dijital pazarlama stratejileri ve SEO optimizasyonu konularında 5 yıllık deneyim.',
          status: 'pending',
          rating: 0,
          total_students: 0,
          total_courses: 0,
          total_ratings: 0,
          created_at: '2024-01-19T11:45:00Z'
        }
      ]

      setInstructors(response.data?.instructors || mockInstructors)
      setTotalPages(response.data?.total_pages || 1)
    } catch (error) {
      console.error('Eğitmenler yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInstructorAction = async (instructorId: number, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await adminAPI.approveInstructor(instructorId)
      } else {
        await adminAPI.rejectInstructor(instructorId)
      }
      
      // Eğitmen listesini yenile
      fetchInstructors()
    } catch (error) {
      console.error('Eğitmen işlemi sırasında hata:', error)
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Beklemede'
      case 'approved': return 'Onaylandı'
      case 'rejected': return 'Reddedildi'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock
      case 'approved': return CheckCircle
      case 'rejected': return XCircle
      default: return Clock
    }
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

  const pendingCount = instructors.filter(i => i.status === 'pending').length
  const approvedCount = instructors.filter(i => i.status === 'approved').length
  const rejectedCount = instructors.filter(i => i.status === 'rejected').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-2">
                Eğitmen Yönetimi
              </h1>
              <p className="text-xl text-gray-600">
                Eğitmen başvurularını inceleyin ve onaylayın
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Bekleyen Başvuru</div>
                <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            {
              title: 'Beklemede',
              value: pendingCount,
              icon: Clock,
              gradient: 'from-yellow-500 to-orange-500',
              bgGradient: 'from-yellow-50 to-orange-50'
            },
            {
              title: 'Onaylandı',
              value: approvedCount,
              icon: CheckCircle,
              gradient: 'from-green-500 to-emerald-500',
              bgGradient: 'from-green-50 to-emerald-50'
            },
            {
              title: 'Reddedildi',
              value: rejectedCount,
              icon: XCircle,
              gradient: 'from-red-500 to-rose-500',
              bgGradient: 'from-red-50 to-rose-50'
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
                    <p className="text-3xl font-bold text-gray-900 group-hover:scale-110 transition-transform duration-300">
                      {stat.value}
                    </p>
                  </div>
                  
                  <div className={`w-16 h-16 bg-gradient-to-r ${stat.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                    <stat.icon className="w-8 h-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Eğitmen ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="pending">Beklemede</option>
                <option value="approved">Onaylandı</option>
                <option value="rejected">Reddedildi</option>
              </select>

              {/* Reset Button */}
              <Button 
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setFilterStatus('all')
                }}
                className="rounded-xl border-gray-200 hover:bg-gray-50"
              >
                <Filter className="w-4 h-4 mr-2" />
                Temizle
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructors Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-100 rounded-3xl animate-pulse"></div>
            ))
          ) : (
            instructors.map((instructor) => {
              const StatusIcon = getStatusIcon(instructor.status)
              
              return (
                <Card 
                  key={instructor.id}
                  className="group bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 overflow-hidden rounded-3xl"
                >
                  <CardContent className="p-8">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg">
                          <span className="text-white text-2xl font-bold">
                            {instructor.user.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                            {instructor.user.full_name}
                          </h3>
                          <p className="text-gray-600 font-medium">{instructor.specialization}</p>
                        </div>
                      </div>
                      
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(instructor.status)}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {getStatusText(instructor.status)}
                      </span>
                    </div>

                    {/* Bio */}
                    <p className="text-gray-700 text-sm leading-relaxed mb-6 line-clamp-3">
                      {instructor.bio}
                    </p>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div>
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <Mail className="w-4 h-4 mr-2" />
                          {instructor.user.email}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          {instructor.experience_years} yıl deneyim
                        </div>
                      </div>
                      
                      {instructor.status === 'approved' && (
                        <div className="space-y-2">
                          <div className="flex items-center text-sm">
                            <Star className="w-4 h-4 mr-2 text-yellow-400" />
                            <span className="font-medium">{instructor.rating.toFixed(1)}</span>
                            <span className="text-gray-500 ml-1">({instructor.total_ratings})</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Users className="w-4 h-4 mr-2" />
                            {instructor.total_students} öğrenci
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <BookOpen className="w-4 h-4 mr-2" />
                            {instructor.total_courses} kurs
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Date Info */}
                    <div className="text-xs text-gray-500 mb-6">
                      Başvuru: {formatDate(instructor.created_at)}
                      {instructor.approved_at && (
                        <span className="ml-4">
                          Onay: {formatDate(instructor.approved_at)}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="rounded-xl border-gray-200 hover:bg-gray-50"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Detayları Görüntüle
                      </Button>

                      {instructor.status === 'pending' && (
                        <div className="flex items-center space-x-2">
                          <Button 
                            size="sm"
                            onClick={() => handleInstructorAction(instructor.id, 'reject')}
                            className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reddet
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleInstructorAction(instructor.id, 'approve')}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Onayla
                          </Button>
                        </div>
                      )}

                      {instructor.status === 'approved' && (
                        <Button 
                          size="sm"
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Mesaj Gönder
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
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