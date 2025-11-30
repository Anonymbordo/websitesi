'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Phone, Calendar, MapPin, Award, BookOpen, Users, Star, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/store'
import { instructorsAPI, adminAPI } from '@/lib/api'
import toast from 'react-hot-toast'

export default function InstructorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const [instructor, setInstructor] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/')
      return
    }

    fetchInstructorDetails()
  }, [params.id])

  const fetchInstructorDetails = async () => {
    try {
      setLoading(true)
      // Admin endpoint kullan - onay durumu fark etmez
      const response = await adminAPI.getInstructorDetail(Number(params.id))
      setInstructor(response.data)
    } catch (error) {
      console.error('Eğitmen detayları yüklenirken hata:', error)
      toast.error('Eğitmen detayları yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: 'approve' | 'reject') => {
    try {
      const loadingToast = toast.loading(action === 'approve' ? 'Onaylanıyor...' : 'Reddediliyor...')
      
      if (action === 'approve') {
        await adminAPI.approveInstructor(Number(params.id))
        toast.success('✅ Eğitmen onaylandı!', { id: loadingToast })
      } else {
        await adminAPI.rejectInstructor(Number(params.id))
        toast.success('✅ Başvuru reddedildi', { id: loadingToast })
      }
      
      fetchInstructorDetails()
    } catch (error: any) {
      console.error('İşlem hatası:', error)
      toast.error('❌ ' + (error.response?.data?.detail || 'İşlem başarısız'))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!instructor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Eğitmen Bulunamadı</h2>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri Dön
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="mb-6 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri Dön
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-white text-5xl font-bold">
                    {instructor.user?.full_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {instructor.user?.full_name}
                </h2>
                
                <p className="text-gray-600 font-medium mb-4">{instructor.specialization}</p>
                
                <Badge className={`${
                  instructor.status === 'approved' ? 'bg-green-100 text-green-800' :
                  instructor.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {instructor.status === 'approved' ? 'Onaylı' :
                   instructor.status === 'pending' ? 'Beklemede' : 'Reddedildi'}
                </Badge>

                {instructor.status === 'pending' && (
                  <div className="mt-6 space-y-2">
                    <Button
                      onClick={() => handleAction('approve')}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Onayla
                    </Button>
                    <Button
                      onClick={() => handleAction('reject')}
                      variant="outline"
                      className="w-full rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reddet
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4">İletişim Bilgileri</h3>
                
                <div className="flex items-center text-gray-700">
                  <Mail className="w-5 h-5 mr-3 text-blue-600" />
                  <span className="text-sm">{instructor.user?.email}</span>
                </div>
                
                <div className="flex items-center text-gray-700">
                  <Phone className="w-5 h-5 mr-3 text-blue-600" />
                  <span className="text-sm">{instructor.user?.phone}</span>
                </div>
                
                <div className="flex items-center text-gray-700">
                  <Calendar className="w-5 h-5 mr-3 text-blue-600" />
                  <span className="text-sm">{instructor.experience_years} yıl deneyim</span>
                </div>

                {instructor.user?.city && (
                  <div className="flex items-center text-gray-700">
                    <MapPin className="w-5 h-5 mr-3 text-blue-600" />
                    <span className="text-sm">{instructor.user.city}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            {instructor.status === 'approved' && (
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">İstatistikler</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-gray-700">
                      <Star className="w-5 h-5 mr-2 text-yellow-400" />
                      <span className="text-sm font-medium">Puan</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {instructor.rating?.toFixed(1) || '0.0'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-gray-700">
                      <Users className="w-5 h-5 mr-2 text-blue-600" />
                      <span className="text-sm font-medium">Öğrenci</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {instructor.total_students || 0}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-gray-700">
                      <BookOpen className="w-5 h-5 mr-2 text-purple-600" />
                      <span className="text-sm font-medium">Kurs</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {instructor.total_courses || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <Award className="w-6 h-6 mr-2 text-blue-600" />
                  Hakkında
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {instructor.bio || 'Henüz biyografi eklenmemiş.'}
                </p>
              </CardContent>
            </Card>

            {/* Certification */}
            {instructor.certification && (
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Sertifikalar</h3>
                  <div className="prose prose-lg max-w-none">
                    <p className="text-gray-700">{instructor.certification}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Courses (if approved) */}
            {instructor.status === 'approved' && instructor.courses && instructor.courses.length > 0 && (
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <BookOpen className="w-6 h-6 mr-2 text-blue-600" />
                    Kurslar
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {instructor.courses.map((course: any) => (
                      <div
                        key={course.id}
                        className="p-4 border border-gray-200 rounded-xl hover:shadow-lg transition-shadow"
                      >
                        <h4 className="font-bold text-gray-900 mb-2">{course.title}</h4>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{course.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">{course.enrollment_count} öğrenci</span>
                          <span className="text-sm font-bold text-blue-600">{course.price} ₺</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
