'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  GraduationCap, 
  Upload, 
  Video, 
  FileText, 
  Image, 
  Settings,
  Save,
  Eye,
  ArrowLeft,
  Plus,
  X,
  PlayCircle,
  AlertCircle,
  Check,
  Users
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/store'
import { adminAPI } from '@/lib/api'
import { toast } from 'react-hot-toast'

interface Video {
  id: string
  title: string
  description: string
  video_url: string
  duration: number
  order: number
}

interface Note {
  id: string
  title: string
  content: string
  material_type: string
  file_url: string
}

export default function CreateSchoolCourse() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Course Basic Info
  const [basicInfo, setBasicInfo] = useState({
    title: '',
    description: '',
    level: 'ilkokul',
    grade: 3,
    subject: '',
    price: 0,
    discount_price: 0,
    thumbnail: null as File | null,
    preview_video: null as File | null,
    is_active: true,
  })

  // Videos
  const [videos, setVideos] = useState<Video[]>([])

  // Notes/Materials
  const [notes, setNotes] = useState<Note[]>([])

  // Settings
  const [settings, setSettings] = useState({
    is_published: false,
    is_featured: false,
  })

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

  const steps = [
    { id: 1, title: 'Temel Bilgiler', icon: GraduationCap },
    { id: 2, title: 'Videolar', icon: Video },
    { id: 3, title: 'Materyaller', icon: FileText },
    { id: 4, title: 'Önizleme', icon: Eye }
  ]

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'thumbnail' | 'preview_video') => {
    const file = event.target.files?.[0]
    if (file) {
      setBasicInfo(prev => ({
        ...prev,
        [type]: file
      }))
    }
  }

  const addVideo = () => {
    const newVideo: Video = {
      id: Date.now().toString(),
      title: '',
      description: '',
      video_url: '',
      duration: 0,
      order: videos.length + 1
    }
    setVideos([...videos, newVideo])
  }

  const updateVideo = (id: string, updates: Partial<Video>) => {
    setVideos(videos.map(video => 
      video.id === id ? { ...video, ...updates } : video
    ))
  }

  const removeVideo = (id: string) => {
    setVideos(videos.filter(video => video.id !== id))
  }

  const addNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: '',
      content: '',
      material_type: 'PDF',
      file_url: ''
    }
    setNotes([...notes, newNote])
  }

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(notes.map(note => 
      note.id === id ? { ...note, ...updates } : note
    ))
  }

  const removeNote = (id: string) => {
    setNotes(notes.filter(note => note.id !== id))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Validation
      if (!basicInfo.title || !basicInfo.description || !basicInfo.subject) {
        toast.error('Lütfen zorunlu alanları doldurun (Başlık, Açıklama, Ders)')
        setLoading(false)
        return
      }

      // Kurs verilerini hazırla
      const courseData = {
        title: basicInfo.title,
        description: basicInfo.description,
        level: basicInfo.level,
        grade: basicInfo.grade,
        subject: basicInfo.subject,
        price: basicInfo.price,
        discount_price: basicInfo.discount_price > 0 ? basicInfo.discount_price : undefined,
        is_active: basicInfo.is_active,
      }
      
      console.log('Okul kursu oluşturuluyor:', courseData)
      
      // API çağrısı
      const response = await adminAPI.createSchool(courseData)
      
      console.log('Kurs başarıyla oluşturuldu:', response)
      const courseId = response.data?.id

      if (!courseId) {
        throw new Error('Kurs ID alınamadı')
      }

      // Thumbnail yükleme
      if (basicInfo.thumbnail && courseId) {
        try {
          console.log('Thumbnail yükleniyor...')
          const formData = new FormData()
          formData.append('file', basicInfo.thumbnail)
          await adminAPI.updateSchool(courseId, formData)
          console.log('Thumbnail başarıyla yüklendi')
        } catch (uploadError) {
          console.error('Thumbnail yüklenirken hata:', uploadError)
          toast.error('Kurs oluşturuldu ancak resim yüklenemedi')
        }
      }

      // Önizleme videosu yükleme
      if (basicInfo.preview_video && courseId) {
        try {
          console.log('Önizleme videosu yükleniyor...')
          const formData = new FormData()
          formData.append('file', basicInfo.preview_video)
          await adminAPI.updateSchool(courseId, formData)
          console.log('Önizleme videosu başarıyla yüklendi')
        } catch (uploadError) {
          console.error('Video yüklenirken hata:', uploadError)
          toast.error('Kurs oluşturuldu ancak video yüklenemedi')
        }
      }

      // Videoları ekle
      for (const video of videos) {
        if (video.title && video.video_url) {
          try {
            await adminAPI.addSchoolVideo(courseId, {
              title: video.title,
              description: video.description,
              video_url: video.video_url,
              duration: video.duration,
              order: video.order
            })
          } catch (err) {
            console.error('Video eklenirken hata:', err)
          }
        }
      }

      // Materyalleri ekle
      for (const note of notes) {
        if (note.title && note.content) {
          try {
            await adminAPI.addSchoolNote(courseId, {
              title: note.title,
              content: note.content,
              material_type: note.material_type,
              file_url: note.file_url
            })
          } catch (err) {
            console.error('Materyal eklenirken hata:', err)
          }
        }
      }
      
      // Başarılı oluşturma sonrası admin schools sayfasına yönlendir
      toast.success('Okul kursu başarıyla oluşturuldu!')
      router.push('/admin/schools')
    } catch (error: any) {
      console.error('Kurs oluşturulurken hata:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Bilinmeyen hata'
      toast.error('Kurs oluşturulurken bir hata oluştu: ' + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            {/* Temel Bilgiler */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-xl font-bold text-gray-900">
                  <GraduationCap className="w-5 h-5 mr-2 text-orange-600" />
                  Kurs Temel Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Başlık */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kurs Başlığı *
                  </label>
                  <Input
                    value={basicInfo.title}
                    onChange={(e) => setBasicInfo({...basicInfo, title: e.target.value})}
                    placeholder="Örn: 5. Sınıf Matematik - Kesirler"
                    className="rounded-xl border-gray-200 focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                {/* Açıklama */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kurs Açıklaması *
                  </label>
                  <textarea
                    value={basicInfo.description}
                    onChange={(e) => setBasicInfo({...basicInfo, description: e.target.value})}
                    placeholder="Kursunuz hakkında detaylı bilgi verin"
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                  />
                </div>

                {/* Seviye, Sınıf ve Ders */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seviye *
                    </label>
                    <select
                      value={basicInfo.level}
                      onChange={(e) => {
                        const newLevel = e.target.value
                        const grades = getGradesForLevel(newLevel)
                        setBasicInfo({
                          ...basicInfo, 
                          level: newLevel,
                          grade: grades[0] || 1
                        })
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
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
                      value={basicInfo.grade}
                      onChange={(e) => setBasicInfo({...basicInfo, grade: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    >
                      {getGradesForLevel(basicInfo.level).map(grade => (
                        <option key={grade} value={grade}>{grade}. Sınıf</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ders *
                    </label>
                    <select
                      value={basicInfo.subject}
                      onChange={(e) => setBasicInfo({...basicInfo, subject: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    >
                      <option value="">Ders seçin</option>
                      {subjects.map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Fiyat */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fiyat (₺) *
                    </label>
                    <Input
                      type="number"
                      value={basicInfo.price}
                      onChange={(e) => setBasicInfo({...basicInfo, price: parseFloat(e.target.value) || 0})}
                      placeholder="299"
                      className="rounded-xl border-gray-200 focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      İndirimli Fiyat (₺)
                    </label>
                    <Input
                      type="number"
                      value={basicInfo.discount_price}
                      onChange={(e) => setBasicInfo({...basicInfo, discount_price: parseFloat(e.target.value) || 0})}
                      placeholder="199"
                      className="rounded-xl border-gray-200 focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                </div>

                {/* Aktif/Pasif Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <div className="font-medium text-gray-900">Kursu Aktif Et</div>
                    <div className="text-sm text-gray-600">Öğrenciler kursu görebilir</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={basicInfo.is_active}
                      onChange={(e) => setBasicInfo({...basicInfo, is_active: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Medya Yükleme */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-xl font-bold text-gray-900">
                  <Image className="w-5 h-5 mr-2 text-purple-600" />
                  Medya Dosyaları
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Thumbnail */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kurs Kapak Resmi
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-orange-400 transition-colors duration-300">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'thumbnail')}
                      className="hidden"
                    />
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">
                      Kapak resminizi yükleyin (1280x720 önerilen)
                    </p>
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl"
                    >
                      Resim Seç
                    </Button>
                    {basicInfo.thumbnail && (
                      <p className="text-green-600 mt-2">✓ {basicInfo.thumbnail.name}</p>
                    )}
                  </div>
                </div>

                {/* Önizleme Videosu */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Önizleme Videosu
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-orange-400 transition-colors duration-300">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleImageUpload(e, 'preview_video')}
                      className="hidden"
                      id="preview-video"
                    />
                    <PlayCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">
                      Kursunuzun tanıtım videosu (isteğe bağlı)
                    </p>
                    <Button
                      type="button"
                      onClick={() => document.getElementById('preview-video')?.click()}
                      variant="outline"
                      className="rounded-xl border-gray-200"
                    >
                      Video Seç
                    </Button>
                    {basicInfo.preview_video && (
                      <p className="text-green-600 mt-2">✓ {basicInfo.preview_video.name}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 2:
        return (
          <div className="space-y-8">
            {/* Videolar */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-xl font-bold text-gray-900">
                  <div className="flex items-center">
                    <Video className="w-5 h-5 mr-2 text-orange-600" />
                    Ders Videoları
                  </div>
                  <Button
                    onClick={addVideo}
                    className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Video Ekle
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {videos.map((video, index) => (
                  <div key={video.id} className="border border-gray-200 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Video {index + 1}</h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeVideo(video.id)}
                        className="text-red-600 border-red-200 hover:bg-red-50 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Video Başlığı *
                        </label>
                        <Input
                          value={video.title}
                          onChange={(e) => updateVideo(video.id, { title: e.target.value })}
                          placeholder="Örn: Kesirlerle Toplama İşlemi"
                          className="rounded-xl border-gray-200"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Süre (dakika)
                        </label>
                        <Input
                          type="number"
                          value={video.duration}
                          onChange={(e) => updateVideo(video.id, { duration: parseInt(e.target.value) || 0 })}
                          placeholder="15"
                          className="rounded-xl border-gray-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Video URL *
                      </label>
                      <Input
                        value={video.video_url}
                        onChange={(e) => updateVideo(video.id, { video_url: e.target.value })}
                        placeholder="https://..."
                        className="rounded-xl border-gray-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Açıklama
                      </label>
                      <textarea
                        value={video.description}
                        onChange={(e) => updateVideo(video.id, { description: e.target.value })}
                        placeholder="Video hakkında kısa bilgi"
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                      />
                    </div>
                  </div>
                ))}

                {videos.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg mb-4">Henüz video eklenmemiş</p>
                    <Button
                      onClick={addVideo}
                      className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl"
                    >
                      İlk Videoyu Ekle
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )

      case 3:
        return (
          <div className="space-y-8">
            {/* Materyaller */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-xl font-bold text-gray-900">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-orange-600" />
                    Ders Materyalleri
                  </div>
                  <Button
                    onClick={addNote}
                    className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Materyal Ekle
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {notes.map((note, index) => (
                  <div key={note.id} className="border border-gray-200 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Materyal {index + 1}</h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeNote(note.id)}
                        className="text-red-600 border-red-200 hover:bg-red-50 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Materyal Başlığı *
                        </label>
                        <Input
                          value={note.title}
                          onChange={(e) => updateNote(note.id, { title: e.target.value })}
                          placeholder="Örn: Kesirler Konu Anlatımı"
                          className="rounded-xl border-gray-200"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Materyal Tipi
                        </label>
                        <select
                          value={note.material_type}
                          onChange={(e) => updateNote(note.id, { material_type: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
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
                        value={note.file_url}
                        onChange={(e) => updateNote(note.id, { file_url: e.target.value })}
                        placeholder="https://..."
                        className="rounded-xl border-gray-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        İçerik / Notlar *
                      </label>
                      <textarea
                        value={note.content}
                        onChange={(e) => updateNote(note.id, { content: e.target.value })}
                        placeholder="Materyal hakkında detaylı bilgi veya metin içeriği"
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                      />
                    </div>
                  </div>
                ))}

                {notes.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg mb-4">Henüz materyal eklenmemiş</p>
                    <Button
                      onClick={addNote}
                      className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl"
                    >
                      İlk Materyali Ekle
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )

      case 4:
        return (
          <div className="space-y-8">
            {/* Önizleme */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-xl font-bold text-gray-900">
                  <Eye className="w-5 h-5 mr-2 text-orange-600" />
                  Kurs Önizleme
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-xl">
                  <div className="flex items-start space-x-4">
                    <AlertCircle className="w-6 h-6 text-orange-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Yayınlamadan Önce Kontrol Edin</h3>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>✓ Kurs başlığı, seviye, sınıf ve ders doğru mu?</li>
                        <li>✓ Açıklama yeterli mi?</li>
                        <li>✓ Videolar eklenmiş mi?</li>
                        <li>✓ Materyaller yüklenmiş mi?</li>
                        <li>✓ Fiyat bilgileri doğru mu?</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Özet Bilgiler */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Kurs Bilgileri</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Başlık:</span>
                        <span className="font-medium">{basicInfo.title || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Seviye:</span>
                        <span className="font-medium">
                          {levels.find(l => l.value === basicInfo.level)?.label}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sınıf:</span>
                        <span className="font-medium">{basicInfo.grade}. Sınıf</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ders:</span>
                        <span className="font-medium">{basicInfo.subject || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fiyat:</span>
                        <span className="font-medium">₺{basicInfo.price}</span>
                      </div>
                      {basicInfo.discount_price > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">İndirimli Fiyat:</span>
                          <span className="font-medium text-green-600">₺{basicInfo.discount_price}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Durum:</span>
                        <span className={`font-medium ${basicInfo.is_active ? 'text-green-600' : 'text-red-600'}`}>
                          {basicInfo.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">İçerik Özeti</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Video Sayısı:</span>
                        <span className="font-medium">{videos.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Toplam Video Süresi:</span>
                        <span className="font-medium">
                          {videos.reduce((total, v) => total + v.duration, 0)} dakika
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Materyal Sayısı:</span>
                        <span className="font-medium">{notes.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Kapak Resmi:</span>
                        <span className={`font-medium ${basicInfo.thumbnail ? 'text-green-600' : 'text-yellow-600'}`}>
                          {basicInfo.thumbnail ? '✓ Yüklendi' : '✗ Yüklenmedi'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Önizleme Videosu:</span>
                        <span className={`font-medium ${basicInfo.preview_video ? 'text-green-600' : 'text-yellow-600'}`}>
                          {basicInfo.preview_video ? '✓ Yüklendi' : '✗ Yüklenmedi'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Video Listesi */}
                {videos.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Ekli Videolar</h3>
                    <div className="space-y-2">
                      {videos.map((video, index) => (
                        <div key={video.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-600 rounded-full text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{video.title}</div>
                              <div className="text-sm text-gray-500">{video.duration} dakika</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Materyal Listesi */}
                {notes.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Ekli Materyaller</h3>
                    <div className="space-y-2">
                      {notes.map((note, index) => (
                        <div key={note.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{note.title}</div>
                              <div className="text-sm text-gray-500">{note.material_type}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="rounded-xl border-gray-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Geri
              </Button>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-orange-900 to-red-900 bg-clip-text text-transparent">
                  Yeni Okul Kursu Oluştur
                </h1>
                <p className="text-xl text-gray-600">
                  İlkokul, ortaokul veya lise için yeni kurs ekleyin
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                    currentStep >= step.id
                      ? 'bg-orange-600 border-orange-600 text-white'
                      : 'bg-white border-gray-300 text-gray-500'
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <step.icon className="w-6 h-6" />
                  )}
                </div>
                <div className="ml-4">
                  <div className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-orange-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-20 h-0.5 mx-8 ${
                    currentStep > step.id ? 'bg-orange-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-12 pt-8 border-t border-gray-200">
          <Button
            variant="outline"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep(currentStep - 1)}
            className="rounded-xl border-gray-200"
          >
            Önceki Adım
          </Button>

          <div className="flex items-center space-x-4">
            {currentStep < 4 ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl"
              >
                Sonraki Adım
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Kursu Oluştur
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
