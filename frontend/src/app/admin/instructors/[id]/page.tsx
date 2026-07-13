'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, CheckCircle, CreditCard, DollarSign, ExternalLink, Star, TrendingUp, Users, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { adminAPI } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { getImageUrl } from '@/lib/utils'

interface InstructorDetail {
  id: number
  bio?: string
  specialization?: string
  title?: string
  company?: string
  location?: string
  portfolio?: string
  linkedin?: string
  github?: string
  website?: string
  previous_teaching?: string
  course_topics?: string
  teaching_motivation?: string
  experience_years: number
  certification?: string
  rating: number
  total_ratings: number
  total_students: number
  published_courses?: number
  draft_courses?: number
  total_sales_count?: number
  total_revenue?: number
  monthly_revenue?: number
  average_sale_value?: number
  last_sale_at?: string | null
  is_approved: boolean | null
  is_featured?: boolean
  created_at: string
  user: {
    id: number
    full_name: string
    email: string
    phone: string
    city?: string
    district?: string
    profile_image?: string
    created_at: string
  }
  total_courses: number
  courses: Array<{
    id: number
    title: string
    is_published: boolean
    price: number
    students_count?: number
    completed_sales_count?: number
    total_revenue?: number
    monthly_revenue?: number
    last_sale_at?: string | null
    average_progress?: number
    lesson_count?: number
    material_count?: number
  }>
  recent_sales?: Array<{
    payment_id: number
    transaction_id?: string
    payment_status?: string
    course_title: string
    amount: number
    payment_date?: string
    payment_method?: string
    student?: {
      full_name?: string
      email?: string
    }
  }>
}

export default function AdminInstructorDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isAuthenticated } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [instructor, setInstructor] = useState<InstructorDetail | null>(null)
  const instructorId = Number(Array.isArray(params?.id) ? params?.id[0] : params?.id)

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/')
      return
    }
    if (!instructorId || Number.isNaN(instructorId)) {
      router.push('/admin/instructors')
      return
    }
    fetchInstructor()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, instructorId])

  const fetchInstructor = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getInstructorDetail(instructorId)
      setInstructor(response.data)
    } catch (error: any) {
      console.error('Eğitmen detayları yüklenirken hata:', error)
      toast.error('Eğitmen detayları yüklenemedi.')
      router.push('/admin/instructors')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!instructor) return
    try {
      const loadingToast = toast.loading('Eğitmen onaylanıyor...')
      await adminAPI.approveInstructor(instructor.id)
      toast.success('✅ Eğitmen onaylandı!', { id: loadingToast })
      await fetchInstructor()
    } catch (error: any) {
      toast.error('❌ Onay başarısız: ' + (error.response?.data?.detail || 'Hata oluştu'))
    }
  }

  const handleReject = async () => {
    if (!instructor) return
    try {
      const loadingToast = toast.loading('Eğitmen reddediliyor...')
      await adminAPI.rejectInstructor(instructor.id)
      toast.success('✅ Eğitmen reddedildi', { id: loadingToast })
      await fetchInstructor()
    } catch (error: any) {
      toast.error('❌ Reddetme başarısız: ' + (error.response?.data?.detail || 'Hata oluştu'))
    }
  }

  const handleFeature = async () => {
    if (!instructor) return
    try {
      const loadingToast = toast.loading(instructor.is_featured ? 'Öne çıkarma kaldırılıyor...' : 'Öne çıkarılıyor...')
      if (instructor.is_featured) {
        await adminAPI.unfeatureInstructor(instructor.id)
      } else {
        await adminAPI.featureInstructor(instructor.id)
      }
      toast.success('✅ Güncellendi', { id: loadingToast })
      await fetchInstructor()
    } catch (error: any) {
      toast.error('❌ İşlem başarısız: ' + (error.response?.data?.detail || 'Hata oluştu'))
    }
  }

  const certs = useMemo(() => {
    const raw = instructor?.certification || ''
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }, [instructor?.certification])

  const topics = useMemo(() => {
    const raw = instructor?.course_topics || ''
    const parts = raw.includes('|') ? raw.split('|') : raw.split(',')
    return parts.map((item) => item.trim()).filter(Boolean)
  }, [instructor?.course_topics])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!instructor) return null

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(Number(amount || 0))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => router.push('/admin/instructors')} className="rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Eğitmenlere Dön
          </Button>
          <div className="flex items-center gap-3">
            {!instructor.is_approved && (
              <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700 text-white rounded-xl">
                <CheckCircle className="w-4 h-4 mr-2" />
                Onayla
              </Button>
            )}
            <Button variant="outline" onClick={handleReject} className="rounded-xl border-red-200 text-red-600 hover:bg-red-50">
              <XCircle className="w-4 h-4 mr-2" />
              Reddet
            </Button>
            {instructor.is_approved && (
              <Button variant={instructor.is_featured ? 'outline' : 'default'} onClick={handleFeature} className="rounded-xl">
                <Star className="w-4 h-4 mr-2" />
                {instructor.is_featured ? 'Öne Çıkmış' : 'Öne Çıkar'}
              </Button>
            )}
          </div>
        </div>

        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900">Eğitmen Detayı</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex items-center gap-4">
              {instructor.user.profile_image ? (
                <img
                  src={getImageUrl(instructor.user.profile_image) || ''}
                  alt={instructor.user.full_name}
                  className="w-20 h-20 rounded-2xl object-cover shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                  {instructor.user.full_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{instructor.user.full_name}</h2>
                <p className="text-gray-600">{instructor.title || instructor.specialization || 'Eğitmen'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">İletişim</h3>
                <p className="text-gray-700">E-posta: {instructor.user.email}</p>
                <p className="text-gray-700">Telefon: {instructor.user.phone}</p>
                {(instructor.location || instructor.user.city || instructor.user.district) && (
                  <p className="text-gray-700">
                    Konum: {instructor.location || [instructor.user.city, instructor.user.district].filter(Boolean).join(' / ')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">Profesyonel</h3>
                {instructor.company && <p className="text-gray-700">Şirket/Kurum: {instructor.company}</p>}
                <p className="text-gray-700">Deneyim: {instructor.experience_years} yıl</p>
                <p className="text-gray-700">Uzmanlık: {instructor.specialization || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-blue-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="text-xs text-blue-700">Öğrenci</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{instructor.total_students || 0}</p>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <span className="text-xs text-indigo-700">Satış</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{instructor.total_sales_count || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {instructor.published_courses || 0} yayında / {instructor.draft_courses || 0} taslak
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs text-emerald-700">Toplam Ciro</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(Number(instructor.total_revenue || 0))}</p>
              </div>
              <div className="rounded-2xl bg-orange-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                  <span className="text-xs text-orange-700">Aylık Ciro</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(Number(instructor.monthly_revenue || 0))}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Ortalama satış: {formatCurrency(Number(instructor.average_sale_value || 0))}
                </p>
              </div>
            </div>

            {instructor.bio && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Biyografi</h3>
                <p className="text-gray-700 leading-relaxed">{instructor.bio}</p>
              </div>
            )}

            {(instructor.portfolio || instructor.linkedin || instructor.github || instructor.website) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Bağlantılar</h3>
                <div className="flex flex-wrap gap-3">
                  {instructor.portfolio && (
                    <a className="inline-flex items-center text-blue-600 hover:underline" href={instructor.portfolio} target="_blank" rel="noreferrer">
                      Portfolio <ExternalLink className="w-4 h-4 ml-1" />
                    </a>
                  )}
                  {instructor.linkedin && (
                    <a className="inline-flex items-center text-blue-600 hover:underline" href={instructor.linkedin} target="_blank" rel="noreferrer">
                      LinkedIn <ExternalLink className="w-4 h-4 ml-1" />
                    </a>
                  )}
                  {instructor.github && (
                    <a className="inline-flex items-center text-blue-600 hover:underline" href={instructor.github} target="_blank" rel="noreferrer">
                      GitHub <ExternalLink className="w-4 h-4 ml-1" />
                    </a>
                  )}
                  {instructor.website && (
                    <a className="inline-flex items-center text-blue-600 hover:underline" href={instructor.website} target="_blank" rel="noreferrer">
                      Website <ExternalLink className="w-4 h-4 ml-1" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {(instructor.previous_teaching || instructor.teaching_motivation || topics.length > 0) && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Eğitmenlik Bilgileri</h3>
                {instructor.previous_teaching && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Önceki Eğitmenlik</p>
                    <p className="text-gray-700">{instructor.previous_teaching}</p>
                  </div>
                )}
                {topics.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Öğretmek İstediği Konular</p>
                    <div className="flex flex-wrap gap-2">
                      {topics.map((topic) => (
                        <span key={topic} className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {instructor.teaching_motivation && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Motivasyon</p>
                    <p className="text-gray-700">{instructor.teaching_motivation}</p>
                  </div>
                )}
              </div>
            )}

            {certs.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Belgeler</h3>
                <ul className="space-y-2">
                  {certs.map((url, idx) => (
                    <li key={`${url}-${idx}`}>
                      <a className="inline-flex items-center text-blue-600 hover:underline" href={url} target="_blank" rel="noreferrer">
                        Belge {idx + 1} <ExternalLink className="w-4 h-4 ml-1" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Son Satışlar</h3>
                {instructor.last_sale_at && (
                  <p className="text-sm text-gray-500">
                    Son satış: {new Date(instructor.last_sale_at).toLocaleDateString('tr-TR')}
                  </p>
                )}
              </div>
              {!instructor.recent_sales || instructor.recent_sales.length === 0 ? (
                <p className="text-sm text-gray-500">Henüz tamamlanmış satış yok.</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {instructor.recent_sales.slice(0, 6).map((sale) => (
                    <div key={sale.payment_id} className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{sale.course_title}</p>
                          <p className="text-sm text-gray-600">{sale.student?.full_name || 'Öğrenci'}</p>
                          <p className="text-xs text-gray-500">
                            {sale.payment_date ? new Date(sale.payment_date).toLocaleString('tr-TR') : '-'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-700">{formatCurrency(Number(sale.amount || 0))}</p>
                          <p className="text-xs text-gray-500">{sale.payment_method || 'ödeme'}</p>
                          <Button
                            type="button"
                            variant="outline"
                            className="mt-2 rounded-xl"
                            onClick={() => router.push(`/admin/payments?paymentId=${sale.payment_id}`)}
                          >
                            <CreditCard className="mr-2 h-4 w-4" />
                            Ödemeye Git
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Kurs Performansı</h3>
              {instructor.courses.length === 0 ? (
                <p className="text-sm text-gray-500">Kurs bulunamadı.</p>
              ) : (
                <div className="space-y-3">
                  {instructor.courses.map((course) => (
                    <div key={course.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                          <p className="font-semibold text-gray-900">{course.title}</p>
                          <p className="text-sm text-gray-500">
                            ₺{Number(course.price || 0).toLocaleString('tr-TR')} • {course.students_count || 0} öğrenci • {course.completed_sales_count || 0} satış
                          </p>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">Toplam</p>
                            <p className="font-semibold text-gray-900">{formatCurrency(Number(course.total_revenue || 0))}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Bu ay</p>
                            <p className="font-semibold text-gray-900">{formatCurrency(Number(course.monthly_revenue || 0))}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">İlerleme</p>
                            <p className="font-semibold text-gray-900">%{Math.round(Number(course.average_progress || 0))}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">İçerik</p>
                            <p className="font-semibold text-gray-900">{course.lesson_count || 0} ders / {course.material_count || 0} materyal</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
