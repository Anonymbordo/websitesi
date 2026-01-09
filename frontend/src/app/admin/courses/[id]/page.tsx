'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft,
  BookOpen, 
  Users,
  Star,
  Clock,
  DollarSign,
  Calendar,
  Video,
  FileText,
  Image as ImageIcon,
  Download,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  MessageSquare,
  Send,
  Trash2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/lib/store'
import { adminAPI, coursesAPI } from '@/lib/api'

interface CourseNote {
  id: number
  note: string
  note_type: string
  is_resolved: boolean
  created_at: string
  admin_name: string
}

interface CourseMaterial {
  id: number
  title: string
  material_type: string
  file_url: string
  created_at: string
}

interface CourseEnrollment {
  id: number
  student: {
    id: number | null
    full_name: string
    email?: string | null
    phone?: string | null
  }
  enrolled_at?: string | null
  progress_percentage: number
  completed_at?: string | null
}

export default function AdminCourseDetail() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const courseId = Number(params.id)
  
  const [course, setCourse] = useState<any>(null)
  const [materials, setMaterials] = useState<CourseMaterial[]>([])
  const [notes, setNotes] = useState<CourseNote[]>([])
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails()
    }
  }, [courseId])

  const fetchCourseDetails = async () => {
    try {
      setLoading(true)
      
      // Kurs detaylarını al (includes materials and notes)
      const detailsResponse = await adminAPI.getCourseDetails(courseId)
      const data = detailsResponse.data
      
      setCourse(data.course)
      
      // Combine videos and documents into materials
      const previewVideoMaterial = data?.course?.preview_video
        ? [
            {
              id: -1,
              title: 'Önizleme Videosu',
              material_type: 'video',
              file_url: data.course.preview_video,
              created_at: data?.course?.created_at || new Date().toISOString(),
            },
          ]
        : []

      const allMaterials = [
        ...previewVideoMaterial,
        ...(data.videos || []).map((v: any) => ({ ...v, material_type: 'video' })),
        ...(data.documents || []).map((d: any) => ({ ...d, material_type: 'document' }))
      ]
      setMaterials(allMaterials)
      
      // Notes are in admin_notes field
      setNotes(data.admin_notes || [])

      // Enrollments (course applications/registrations)
      setEnrollments(Array.isArray(data.enrollments) ? data.enrollments : [])
      
    } catch (error) {
      console.error('Error fetching course details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    
    try {
      setSubmitting(true)
      await adminAPI.createCourseNote(courseId, {
        note: newNote,
        note_type: 'general'
      })
      setNewNote('')
      fetchCourseDetails()
    } catch (error) {
      console.error('Error adding note:', error)
      alert('Not eklenirken hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm('Bu notu silmek istediğinizden emin misiniz?')) return
    
    try {
      await adminAPI.deleteCourseNote(courseId, noteId)
      fetchCourseDetails()
    } catch (error) {
      console.error('Error deleting note:', error)
      alert('Not silinirken hata oluştu')
    }
  }

  const handlePublishToggle = async () => {
    try {
      if (course.is_published) {
        await adminAPI.unpublishCourse(courseId)
      } else {
        await adminAPI.publishCourse(courseId)
      }
      fetchCourseDetails()
    } catch (error) {
      console.error('Error toggling publish status:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Kurs bulunamadı</h2>
          <Button onClick={() => router.push('/admin/courses')}>
            Kurslara Dön
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/admin/courses')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kurslara Dön
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{course.title}</h1>
              <p className="text-gray-600">Eğitmen: {course.instructor?.user?.full_name || 'Bilinmiyor'}</p>
            </div>
            
            <Button 
              onClick={handlePublishToggle}
              className={`${
                course.is_published 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Course Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card className="border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <CardTitle>Kurs Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {course.thumbnail && (
                  <div className="aspect-video rounded-xl overflow-hidden bg-gray-100">
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Açıklama</h3>
                  <p className="text-gray-600">{course.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-500">Fiyat</p>
                      <p className="font-semibold">₺{course.price}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-500">Süre</p>
                      <p className="font-semibold">{course.duration_hours} Saat</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-500">Öğrenci</p>
                      <p className="font-semibold">{course.enrollment_count || 0}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="text-sm text-gray-500">Puan</p>
                      <p className="font-semibold">{course.rating || '0.0'}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>Oluşturulma: {formatDate(course.created_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Course Materials */}
            <Card className="border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <CardTitle className="flex items-center">
                  <Video className="w-5 h-5 mr-2" />
                  Kurs İçeriği ({materials.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {materials.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>Henüz içerik eklenmemiş</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {materials.map((material) => (
                      <div 
                        key={material.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {material.material_type === 'video' ? (
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Video className="w-5 h-5 text-blue-600" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                              <FileText className="w-5 h-5 text-red-600" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{material.title}</p>
                            <p className="text-sm text-gray-500">
                              {material.material_type === 'video' ? 'Video' : 'Döküman'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => window.open(material.file_url, '_blank')}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Görüntüle
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => window.open(material.file_url, '_blank')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Course Enrollments */}
            <Card className="border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-emerald-600 to-green-600 text-white">
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Başvurular / Kayıtlı Öğrenciler ({enrollments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {enrollments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>Bu kursa henüz başvuru/kayıt yok</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {enrollments.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{e.student?.full_name || 'Bilinmiyor'}</p>
                          <p className="text-sm text-gray-600 truncate">
                            {e.student?.email ? e.student.email : 'E-posta yok'}
                            {e.student?.phone ? ` • ${e.student.phone}` : ''}
                          </p>
                          {e.enrolled_at && (
                            <p className="text-xs text-gray-500 mt-1">Kayıt: {formatDateTime(e.enrolled_at)}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">%{Math.round(e.progress_percentage || 0)}</p>
                            <p className="text-xs text-gray-500">İlerleme</p>
                          </div>
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              e.completed_at ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {e.completed_at ? 'Tamamlandı' : 'Devam Ediyor'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Admin Notes */}
          <div className="space-y-6">
            <Card className="border-0 shadow-xl sticky top-8">
              <CardHeader className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
                <CardTitle className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Admin Notları
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {/* Add New Note */}
                <div className="mb-6">
                  <Textarea
                    placeholder="Eğitmen için not ekleyin..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="mb-3"
                    rows={4}
                  />
                  <Button 
                    onClick={handleAddNote}
                    disabled={submitting || !newNote.trim()}
                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
                  >
                    {submitting ? (
                      'Ekleniyor...'
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Not Ekle
                      </>
                    )}
                  </Button>
                </div>

                {/* Notes List */}
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {notes.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      Henüz not eklenmemiş
                    </p>
                  ) : (
                    notes.map((note) => (
                      <div 
                        key={note.id}
                        className="p-4 bg-orange-50 rounded-lg border border-orange-200"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-semibold text-orange-900">
                            {note.admin_name}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteNote(note.id)}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{note.note}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatDate(note.created_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
