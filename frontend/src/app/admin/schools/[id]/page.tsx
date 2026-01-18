'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  GraduationCap, 
  Upload, 
  Video, 
  FileText, 
  Image, 
  Save,
  ArrowLeft,
  Plus,
  X,
  PlayCircle,
  Trash2,
  Edit2,
  Users,
  Check,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/store'
import { adminAPI } from '@/lib/api'
import { toast } from 'react-hot-toast'

interface Video {
  id: number
  title: string
  description: string
  video_url: string
  duration: number
  order: number
}

interface Note {
  id: number
  title: string
  content: string
  material_type: string
  file_url: string
}

interface Instructor {
  id: number
  name: string
  email: string
  bio: string
  profile_picture: string
}

interface SchoolCourse {
  id: number
  title: string
  description: string
  level: string
  grade: number
  subject: string
  price: number
  discount_price: number
  thumbnail: string
  preview_video: string
  is_active: boolean
  videos: Video[]
  notes: Note[]
  instructors: Instructor[]
  created_at: string
  updated_at: string
}

export default function SchoolCourseDetail() {
  const router = useRouter()
  const params = useParams()
  const courseId = params?.id as string
  const { user, isAuthenticated } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [course, setCourse] = useState<SchoolCourse | null>(null)

  // Edit states
  const [editBasicInfo, setEditBasicInfo] = useState({
    title: '',
    description: '',
    level: 'ilkokul',
    grade: 3,
    subject: '',
    price: 0,
    discount_price: 0,
    is_active: true,
  })

  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    video_url: '',
    duration: 0,
    order: 0
  })

  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    material_type: 'PDF',
    file_url: ''
  })

  const [showAddVideo, setShowAddVideo] = useState(false)
  const [showAddNote, setShowAddNote] = useState(false)

  const levels = [
    { value: 'ilkokul', label: 'İlkokul' },
    { value: 'ortaokul', label: 'Ortaokul' },
    { value: 'lise', label: 'Lise' }
  ]

  const subjects = [
    'Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce',
    'Din Kültürü', 'Beden Eğitimi', 'Görsel Sanatlar', 'Müzik',
    'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'Felsefe',
    'Edebiyat', 'Geometri', 'Almanca', 'Fransızca'
  ]

  const materialTypes = [
    'PDF', 'Word', 'PowerPoint', 'Excel', 'Resim', 'Video', 'Ses', 'Diğer'
  ]

  const getGradesForLevel = (level: string) => {
    switch (level) {
      case 'ilkokul':
        return [1, 2, 3, 4]
      case 'ortaokul':
        return [5, 6, 7, 8]
      case 'lise':
        return [9, 10, 11, 12]
      default:
        return []
    }
  }

  useEffect(() => {
    if (courseId) {
      fetchCourse()
    }
  }, [courseId])

  const fetchCourse = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getSchool(parseInt(courseId))
      const data = response.data
      setCourse(data)
      setEditBasicInfo({
        title: data.title,
        description: data.description,
        level: data.level,
        grade: data.grade,
        subject: data.subject,
        price: data.price,
        discount_price: data.discount_price || 0,
        is_active: data.is_active,
      })
    } catch (error) {
      console.error('Kurs yüklenirken hata:', error)
      toast.error('Kurs bilgileri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveBasicInfo = async () => {
    try {
      setSaving(true)
      await adminAPI.updateSchool(parseInt(courseId), editBasicInfo)
      toast.success('Kurs bilgileri güncellendi')
      setEditMode(false)
      fetchCourse()
    } catch (error) {
      console.error('Güncelleme hatası:', error)
      toast.error('Kurs güncellenemedi')
    } finally {
      setSaving(false)
    }
  }

  const handleAddVideo = async () => {
    if (!newVideo.title || !newVideo.video_url) {
      toast.error('Lütfen video başlığı ve URL girin')
      return
    }

    try {
      const videoData = {
        ...newVideo,
        order: course?.videos.length || 0
      }
      await adminAPI.addSchoolVideo(parseInt(courseId), videoData)
      toast.success('Video eklendi')
      setShowAddVideo(false)
      setNewVideo({ title: '', description: '', video_url: '', duration: 0, order: 0 })
      fetchCourse()
    } catch (error) {
      console.error('Video eklenirken hata:', error)
      toast.error('Video eklenemedi')
    }
  }

  const handleDeleteVideo = async (videoId: number) => {
    if (!confirm('Bu videoyu silmek istediğinizden emin misiniz?')) return

    try {
      await adminAPI.deleteSchoolVideo(parseInt(courseId), videoId)
      toast.success('Video silindi')
      fetchCourse()
    } catch (error) {
      console.error('Video silinirken hata:', error)
      toast.error('Video silinemedi')
    }
  }

  const handleAddNote = async () => {
    if (!newNote.title || !newNote.content) {
      toast.error('Lütfen materyal başlığı ve içerik girin')
      return
    }

    try {
      await adminAPI.addSchoolNote(parseInt(courseId), newNote)
      toast.success('Materyal eklendi')
      setShowAddNote(false)
      setNewNote({ title: '', content: '', material_type: 'PDF', file_url: '' })
      fetchCourse()
    } catch (error) {
      console.error('Materyal eklenirken hata:', error)
      toast.error('Materyal eklenemedi')
    }
  }

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm('Bu materyali silmek istediğinizden emin misiniz?')) return

    try {
      await adminAPI.deleteSchoolNote(parseInt(courseId), noteId)
      toast.success('Materyal silindi')
      fetchCourse()
    } catch (error) {
      console.error('Materyal silinirken hata:', error)
      toast.error('Materyal silinemedi')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Kurs yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 text-xl mb-2">Kurs bulunamadı</p>
          <Button onClick={() => router.push('/admin/schools')} className="mt-4">
            Geri Dön
          </Button>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => router.push('/admin/schools')}
                className="rounded-xl border-gray-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Geri
              </Button>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-orange-900 to-red-900 bg-clip-text text-transparent">
                  {course.title}
                </h1>
                <p className="text-xl text-gray-600">
                  {levels.find(l => l.value === course.level)?.label} - {course.grade}. Sınıf - {course.subject}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {!editMode ? (
                <Button
                  onClick={() => setEditMode(true)}
                  className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Düzenle
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditMode(false)
                      setEditBasicInfo({
                        title: course.title,
                        description: course.description,
                        level: course.level,
                        grade: course.grade,
                        subject: course.subject,
                        price: course.price,
                        discount_price: course.discount_price || 0,
                        is_active: course.is_active,
                      })
                    }}
                    className="rounded-xl"
                  >
                    <X className="w-4 h-4 mr-2" />
                    İptal
                  </Button>
                  <Button
                    onClick={handleSaveBasicInfo}
                    disabled={saving}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Kaydet
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sol Kolon - Temel Bilgiler */}
          <div className="lg:col-span-2 space-y-8">
            {/* Temel Bilgiler Kartı */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-xl font-bold text-gray-900">
                  <GraduationCap className="w-5 h-5 mr-2 text-orange-600" />
                  Kurs Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {editMode ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kurs Başlığı *
                      </label>
                      <Input
                        value={editBasicInfo.title}
                        onChange={(e) => setEditBasicInfo({...editBasicInfo, title: e.target.value})}
                        className="rounded-xl border-gray-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Açıklama *
                      </label>
                      <textarea
                        value={editBasicInfo.description}
                        onChange={(e) => setEditBasicInfo({...editBasicInfo, description: e.target.value})}
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Seviye *
                        </label>
                        <select
                          value={editBasicInfo.level}
                          onChange={(e) => {
                            const newLevel = e.target.value
                            const grades = getGradesForLevel(newLevel)
                            setEditBasicInfo({
                              ...editBasicInfo,
                              level: newLevel,
                              grade: grades[0] || 1
                            })
                          }}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20"
                        >
                          {levels.map(level => (
                            <option key={level.value} value={level.value}>{level.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sınıf *
                        </label>
                        <select
                          value={editBasicInfo.grade}
                          onChange={(e) => setEditBasicInfo({...editBasicInfo, grade: parseInt(e.target.value)})}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20"
                        >
                          {getGradesForLevel(editBasicInfo.level).map(grade => (
                            <option key={grade} value={grade}>{grade}. Sınıf</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ders *
                        </label>
                        <select
                          value={editBasicInfo.subject}
                          onChange={(e) => setEditBasicInfo({...editBasicInfo, subject: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20"
                        >
                          {subjects.map(subject => (
                            <option key={subject} value={subject}>{subject}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fiyat (₺) *
                        </label>
                        <Input
                          type="number"
                          value={editBasicInfo.price}
                          onChange={(e) => setEditBasicInfo({...editBasicInfo, price: parseFloat(e.target.value) || 0})}
                          className="rounded-xl border-gray-200"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          İndirimli Fiyat (₺)
                        </label>
                        <Input
                          type="number"
                          value={editBasicInfo.discount_price}
                          onChange={(e) => setEditBasicInfo({...editBasicInfo, discount_price: parseFloat(e.target.value) || 0})}
                          className="rounded-xl border-gray-200"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <div className="font-medium text-gray-900">Kursu Aktif Et</div>
                        <div className="text-sm text-gray-600">Öğrenciler kursu görebilir</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editBasicInfo.is_active}
                          onChange={(e) => setEditBasicInfo({...editBasicInfo, is_active: e.target.checked})}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                      </label>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Açıklama</h3>
                      <p className="text-gray-900">{course.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Fiyat</h3>
                        <div className="flex items-center space-x-2">
                          {course.discount_price > 0 ? (
                            <>
                              <span className="text-2xl font-bold text-green-600">₺{course.discount_price}</span>
                              <span className="text-lg text-gray-500 line-through">₺{course.price}</span>
                            </>
                          ) : (
                            <span className="text-2xl font-bold text-gray-900">₺{course.price}</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Durum</h3>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          course.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {course.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Videolar */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-xl font-bold text-gray-900">
                  <div className="flex items-center">
                    <Video className="w-5 h-5 mr-2 text-orange-600" />
                    Videolar ({course.videos?.length || 0})
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowAddVideo(!showAddVideo)}
                    className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Video Ekle
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Video Form */}
                {showAddVideo && (
                  <div className="border-2 border-dashed border-orange-200 rounded-xl p-6 space-y-4 bg-orange-50/50">
                    <h3 className="font-semibold text-gray-900">Yeni Video Ekle</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Video Başlığı *
                        </label>
                        <Input
                          value={newVideo.title}
                          onChange={(e) => setNewVideo({...newVideo, title: e.target.value})}
                          placeholder="Örn: Kesirlerle Toplama"
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Süre (dakika)
                        </label>
                        <Input
                          type="number"
                          value={newVideo.duration}
                          onChange={(e) => setNewVideo({...newVideo, duration: parseInt(e.target.value) || 0})}
                          placeholder="15"
                          className="rounded-xl"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Video URL *
                      </label>
                      <Input
                        value={newVideo.video_url}
                        onChange={(e) => setNewVideo({...newVideo, video_url: e.target.value})}
                        placeholder="https://..."
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Açıklama
                      </label>
                      <textarea
                        value={newVideo.description}
                        onChange={(e) => setNewVideo({...newVideo, description: e.target.value})}
                        placeholder="Video hakkında kısa bilgi"
                        rows={2}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 resize-none"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAddVideo(false)
                          setNewVideo({ title: '', description: '', video_url: '', duration: 0, order: 0 })
                        }}
                        className="rounded-xl"
                      >
                        İptal
                      </Button>
                      <Button
                        onClick={handleAddVideo}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Video Ekle
                      </Button>
                    </div>
                  </div>
                )}

                {/* Video List */}
                {course.videos && course.videos.length > 0 ? (
                  <div className="space-y-3">
                    {course.videos.map((video, index) => (
                      <div key={video.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="flex items-center justify-center w-10 h-10 bg-orange-100 text-orange-600 rounded-full font-semibold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{video.title}</h4>
                            {video.description && (
                              <p className="text-sm text-gray-600 mt-1">{video.description}</p>
                            )}
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                              <span>{video.duration} dakika</span>
                              <a
                                href={video.video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-orange-600 hover:text-orange-700"
                              >
                                Videoyu Aç →
                              </a>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteVideo(video.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50 rounded-lg ml-4"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Video className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p>Henüz video eklenmemiş</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Materyaller */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-xl font-bold text-gray-900">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-orange-600" />
                    Materyaller ({course.notes?.length || 0})
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowAddNote(!showAddNote)}
                    className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Materyal Ekle
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Note Form */}
                {showAddNote && (
                  <div className="border-2 border-dashed border-orange-200 rounded-xl p-6 space-y-4 bg-orange-50/50">
                    <h3 className="font-semibold text-gray-900">Yeni Materyal Ekle</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Materyal Başlığı *
                        </label>
                        <Input
                          value={newNote.title}
                          onChange={(e) => setNewNote({...newNote, title: e.target.value})}
                          placeholder="Örn: Kesirler Konu Anlatımı"
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Materyal Tipi
                        </label>
                        <select
                          value={newNote.material_type}
                          onChange={(e) => setNewNote({...newNote, material_type: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20"
                        >
                          {materialTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dosya URL
                      </label>
                      <Input
                        value={newNote.file_url}
                        onChange={(e) => setNewNote({...newNote, file_url: e.target.value})}
                        placeholder="https://..."
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        İçerik / Notlar *
                      </label>
                      <textarea
                        value={newNote.content}
                        onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                        placeholder="Materyal hakkında detaylı bilgi"
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 resize-none"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAddNote(false)
                          setNewNote({ title: '', content: '', material_type: 'PDF', file_url: '' })
                        }}
                        className="rounded-xl"
                      >
                        İptal
                      </Button>
                      <Button
                        onClick={handleAddNote}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Materyal Ekle
                      </Button>
                    </div>
                  </div>
                )}

                {/* Notes List */}
                {course.notes && course.notes.length > 0 ? (
                  <div className="space-y-3">
                    {course.notes.map((note, index) => (
                      <div key={note.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-full font-semibold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-semibold text-gray-900">{note.title}</h4>
                              <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                                {note.material_type}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{note.content}</p>
                            {note.file_url && (
                              <a
                                href={note.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-orange-600 hover:text-orange-700 mt-2 inline-block"
                              >
                                Dosyayı Aç →
                              </a>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50 rounded-lg ml-4"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p>Henüz materyal eklenmemiş</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sağ Kolon - İstatistikler ve Medya */}
          <div className="space-y-8">
            {/* İstatistikler */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-gray-900">
                  İstatistikler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Video className="w-5 h-5 text-orange-600" />
                    <span className="text-sm text-gray-700">Toplam Video</span>
                  </div>
                  <span className="font-bold text-gray-900">{course.videos?.length || 0}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-gray-700">Toplam Materyal</span>
                  </div>
                  <span className="font-bold text-gray-900">{course.notes?.length || 0}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-purple-600" />
                    <span className="text-sm text-gray-700">Eğitmenler</span>
                  </div>
                  <span className="font-bold text-gray-900">{course.instructors?.length || 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* Kapak Resmi */}
            {course.thumbnail && (
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-gray-900">
                    Kapak Resmi
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full aspect-video object-cover"
                  />
                </CardContent>
              </Card>
            )}

            {/* Tarihler */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-gray-900">
                  Tarihler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-500">Oluşturulma:</span>
                  <p className="font-medium text-gray-900">
                    {new Date(course.created_at).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Son Güncelleme:</span>
                  <p className="font-medium text-gray-900">
                    {new Date(course.updated_at).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
