'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  MapPin,
  Mail,
  Star,
  Users,
  GraduationCap
} from 'lucide-react'
import { instructorsAPI } from '@/lib/api'
import { getImageUrl, formatPrice } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface InstructorCourse {
  id: number
  title: string
  short_description?: string
  price?: number
  discount_price?: number
  duration_hours?: number
  level?: string
  category?: string
  thumbnail?: string
  rating?: number
  enrollment_count?: number
  is_online?: boolean
  location?: string
}

interface InstructorDetail {
  id: number
  bio?: string
  specialization?: string
  experience_years?: number
  rating?: number
  total_ratings?: number
  total_students?: number
  total_courses?: number
  created_at?: string
  user?: {
    full_name?: string
    city?: string
    district?: string
    profile_image?: string
    email?: string
  }
  courses?: InstructorCourse[]
}

export default function InstructorProfilePage() {
  const params = useParams()
  const router = useRouter()
  const idParam = params?.id
  const instructorId = Number(Array.isArray(idParam) ? idParam[0] : idParam)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [instructor, setInstructor] = useState<InstructorDetail | null>(null)

  useEffect(() => {
    if (!instructorId || Number.isNaN(instructorId)) {
      setError('Eğitmen bulunamadı.')
      setLoading(false)
      return
    }

    const fetchInstructor = async () => {
      try {
        setLoading(true)
        const response = await instructorsAPI.getInstructor(instructorId)
        setInstructor(response.data || null)
        setError(null)
      } catch (err) {
        console.error('Eğitmen profili yüklenemedi:', err)
        setError('Eğitmen profili yüklenemedi.')
        setInstructor(null)
      } finally {
        setLoading(false)
      }
    }

    fetchInstructor()
  }, [instructorId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !instructor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Eğitmen Bulunamadı</h1>
          <p className="text-gray-600 mb-6">{error || 'Bu eğitmen mevcut değil.'}</p>
          <Button onClick={() => router.push('/instructors')}>Eğitmenlere Dön</Button>
        </div>
      </div>
    )
  }

  const avatarUrl = getImageUrl(instructor.user?.profile_image)
  const name = instructor.user?.full_name || 'Eğitmen'
  const location = [instructor.user?.city, instructor.user?.district].filter(Boolean).join(' • ')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6">
          <Button
            variant="ghost"
            className="text-gray-600 hover:text-gray-900"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri Dön
          </Button>
        </div>

        <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-white/90 backdrop-blur-sm">
          <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 p-8">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNGRkZGRkYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
            <div className="relative flex flex-col md:flex-row md:items-center gap-6">
              <div className="w-28 h-28 rounded-3xl bg-white/15 border border-white/30 shadow-xl flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-white text-4xl font-bold">{name.charAt(0)}</div>
                )}
              </div>
              <div className="text-white">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold">{name}</h1>
                  {instructor.specialization && (
                    <Badge className="bg-white/20 text-white border-white/30">
                      {instructor.specialization}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-blue-100">
                  <span className="flex items-center">
                    <Star className="w-4 h-4 mr-1 text-yellow-300" />
                    {instructor.rating?.toFixed(1) || '0.0'} ({instructor.total_ratings || 0})
                  </span>
                  {location && (
                    <span className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {location}
                    </span>
                  )}
                  {instructor.user?.email && (
                    <span className="flex items-center">
                      <Mail className="w-4 h-4 mr-1" />
                      {instructor.user.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <CardContent className="p-8 space-y-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-2xl p-4 text-center">
                <Users className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{instructor.total_students || 0}</p>
                <p className="text-xs text-gray-500">Öğrenci</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center">
                <BookOpen className="w-5 h-5 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{instructor.total_courses || 0}</p>
                <p className="text-xs text-gray-500">Kurs</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center">
                <Star className="w-5 h-5 text-yellow-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{instructor.rating?.toFixed(1) || '0.0'}</p>
                <p className="text-xs text-gray-500">Puan</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center">
                <GraduationCap className="w-5 h-5 text-indigo-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{instructor.experience_years || 0}</p>
                <p className="text-xs text-gray-500">Yıl Deneyim</p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Hakkında</h2>
              <p className="text-gray-600 leading-relaxed">
                {instructor.bio || 'Bu eğitmen için henüz biyografi eklenmemiş.'}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Kurslar</h2>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                  {instructor.courses?.length || 0} kurs
                </Badge>
              </div>

              {instructor.courses && instructor.courses.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {instructor.courses.map((course) => (
                    <Card key={course.id} className="border-0 shadow-lg rounded-2xl overflow-hidden bg-white">
                      <div className="h-40 bg-gray-100 overflow-hidden">
                        {course.thumbnail ? (
                          <img
                            src={getImageUrl(course.thumbnail) || ''}
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-gray-400">
                            <BookOpen className="w-10 h-10" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-5 space-y-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 line-clamp-2">{course.title}</h3>
                          <p className="text-xs text-gray-500">{course.category || 'Kategori'}</p>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>{course.duration_hours || 0} saat</span>
                          <span>{course.level || 'Seviye'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-lg font-bold text-gray-900">
                            {course.discount_price ? (
                              <>
                                {formatPrice(course.discount_price)}
                                <span className="text-xs text-gray-400 line-through ml-2">
                                  {formatPrice(course.price || 0)}
                                </span>
                              </>
                            ) : (
                              formatPrice(course.price || 0)
                            )}
                          </div>
                          <Link href={`/courses/${course.id}`}>
                            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                              Kursu Gör
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <BookOpen className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Bu eğitmene ait kurs bulunamadı.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
