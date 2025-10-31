'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  BookOpen, 
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
  ChevronDown,
  AlertCircle,
  Check
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/store'

interface Lesson {
  id: string
  title: string
  duration: number
  type: 'video' | 'text' | 'quiz'
  content: string
  is_preview: boolean
}

interface Chapter {
  id: string
  title: string
  lessons: Lesson[]
}

export default function CreateCourse() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Course Basic Info
  const [basicInfo, setBasicInfo] = useState({
    title: '',
    short_description: '',
    long_description: '',
    category: '',
    subcategory: '',
    level: 'beginner',
    language: 'tr',
    price: 0,
    discount_price: 0,
    thumbnail: null as File | null,
    preview_video: null as File | null
  })

  // Course Content
  const [chapters, setChapters] = useState<Chapter[]>([
    {
      id: '1',
      title: 'Giriş',
      lessons: [
        {
          id: '1-1',
          title: 'Kursa Hoş Geldiniz',
          duration: 5,
          type: 'video',
          content: '',
          is_preview: true
        }
      ]
    }
  ])

  // Course Settings
  const [settings, setSettings] = useState({
    is_published: false,
    is_featured: false,
    allow_reviews: true,
    certificate_enabled: true,
    difficulty_level: 'beginner',
    estimated_duration: 0,
    requirements: [''],
    what_you_will_learn: [''],
    target_audience: ['']
  })

  const categories = [
    'Programlama',
    'Web Geliştirme',
    'Mobil Geliştirme',
    'Veri Bilimi',
    'Yapay Zeka',
    'Tasarım',
    'Pazarlama',
    'İş Geliştirme',
    'Kişisel Gelişim',
    'Dil Öğrenimi',
    'Müzik',
    'Fotoğrafçılık'
  ]

  const levels = [
    { value: 'beginner', label: 'Başlangıç' },
    { value: 'intermediate', label: 'Orta' },
    { value: 'advanced', label: 'İleri' }
  ]

  const steps = [
    { id: 1, title: 'Temel Bilgiler', icon: BookOpen },
    { id: 2, title: 'İçerik', icon: Video },
    { id: 3, title: 'Ayarlar', icon: Settings },
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

  const addChapter = () => {
    const newChapter: Chapter = {
      id: Date.now().toString(),
      title: 'Yeni Bölüm',
      lessons: []
    }
    setChapters([...chapters, newChapter])
  }

  const addLesson = (chapterId: string) => {
    const newLesson: Lesson = {
      id: `${chapterId}-${Date.now()}`,
      title: 'Yeni Ders',
      duration: 0,
      type: 'video',
      content: '',
      is_preview: false
    }

    setChapters(chapters.map(chapter => 
      chapter.id === chapterId
        ? { ...chapter, lessons: [...chapter.lessons, newLesson] }
        : chapter
    ))
  }

  const removeChapter = (chapterId: string) => {
    setChapters(chapters.filter(chapter => chapter.id !== chapterId))
  }

  const removeLesson = (chapterId: string, lessonId: string) => {
    setChapters(chapters.map(chapter => 
      chapter.id === chapterId
        ? { ...chapter, lessons: chapter.lessons.filter(lesson => lesson.id !== lessonId) }
        : chapter
    ))
  }

  const updateChapter = (chapterId: string, title: string) => {
    setChapters(chapters.map(chapter => 
      chapter.id === chapterId ? { ...chapter, title } : chapter
    ))
  }

  const updateLesson = (chapterId: string, lessonId: string, updates: Partial<Lesson>) => {
    setChapters(chapters.map(chapter => 
      chapter.id === chapterId
        ? {
            ...chapter,
            lessons: chapter.lessons.map(lesson => 
              lesson.id === lessonId ? { ...lesson, ...updates } : lesson
            )
          }
        : chapter
    ))
  }

  const addListItem = (field: 'requirements' | 'what_you_will_learn' | 'target_audience') => {
    setSettings(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }))
  }

  const updateListItem = (field: 'requirements' | 'what_you_will_learn' | 'target_audience', index: number, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }))
  }

  const removeListItem = (field: 'requirements' | 'what_you_will_learn' | 'target_audience', index: number) => {
    setSettings(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // API call to create course
      const courseData = {
        ...basicInfo,
        chapters,
        settings
      }
      
      console.log('Kurs oluşturuluyor:', courseData)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      router.push('/admin/courses')
    } catch (error) {
      console.error('Kurs oluşturulurken hata:', error)
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
                  <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
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
                    placeholder="Örn: Modern React ile Web Geliştirme"
                    className="rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Kısa Açıklama */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kısa Açıklama *
                  </label>
                  <textarea
                    value={basicInfo.short_description}
                    onChange={(e) => setBasicInfo({...basicInfo, short_description: e.target.value})}
                    placeholder="Kursunuzu kısaca tanımlayın (1-2 cümle)"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Uzun Açıklama */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Detaylı Açıklama
                  </label>
                  <textarea
                    value={basicInfo.long_description}
                    onChange={(e) => setBasicInfo({...basicInfo, long_description: e.target.value})}
                    placeholder="Kursunuz hakkında detaylı bilgi verin"
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Kategori ve Seviye */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kategori *
                    </label>
                    <select
                      value={basicInfo.category}
                      onChange={(e) => setBasicInfo({...basicInfo, category: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">Kategori seçin</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seviye *
                    </label>
                    <select
                      value={basicInfo.level}
                      onChange={(e) => setBasicInfo({...basicInfo, level: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      {levels.map(level => (
                        <option key={level.value} value={level.value}>{level.label}</option>
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
                      className="rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500/20"
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
                      className="rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
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
                    Kurs Kapak Resmi *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors duration-300">
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
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl"
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
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors duration-300">
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
            {/* İçerik Yapısı */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-xl font-bold text-gray-900">
                  <div className="flex items-center">
                    <Video className="w-5 h-5 mr-2 text-blue-600" />
                    Kurs İçeriği
                  </div>
                  <Button
                    onClick={addChapter}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Bölüm
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {chapters.map((chapter, chapterIndex) => (
                  <div key={chapter.id} className="border border-gray-200 rounded-xl p-6 space-y-4">
                    {/* Bölüm Başlığı */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <Input
                          value={chapter.title}
                          onChange={(e) => updateChapter(chapter.id, e.target.value)}
                          placeholder="Bölüm başlığı"
                          className="text-lg font-semibold rounded-xl border-gray-200"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          onClick={() => addLesson(chapter.id)}
                          className="bg-green-600 hover:bg-green-700 text-white rounded-lg"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Ders Ekle
                        </Button>
                        {chapters.length > 1 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeChapter(chapter.id)}
                            className="text-red-600 border-red-200 hover:bg-red-50 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Dersler */}
                    <div className="space-y-3 ml-4">
                      {chapter.lessons.map((lesson, lessonIndex) => (
                        <div key={lesson.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Input
                              value={lesson.title}
                              onChange={(e) => updateLesson(chapter.id, lesson.id, { title: e.target.value })}
                              placeholder="Ders başlığı"
                              className="rounded-lg border-gray-200"
                            />
                            
                            <select
                              value={lesson.type}
                              onChange={(e) => updateLesson(chapter.id, lesson.id, { type: e.target.value as 'video' | 'text' | 'quiz' })}
                              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20"
                            >
                              <option value="video">Video</option>
                              <option value="text">Metin</option>
                              <option value="quiz">Quiz</option>
                            </select>

                            <Input
                              type="number"
                              value={lesson.duration}
                              onChange={(e) => updateLesson(chapter.id, lesson.id, { duration: parseInt(e.target.value) || 0 })}
                              placeholder="Süre (dk)"
                              className="rounded-lg border-gray-200"
                            />

                            <div className="flex items-center space-x-2">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={lesson.is_preview}
                                  onChange={(e) => updateLesson(chapter.id, lesson.id, { is_preview: e.target.checked })}
                                  className="mr-2"
                                />
                                <span className="text-sm">Önizleme</span>
                              </label>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeLesson(chapter.id, lesson.id)}
                            className="text-red-600 border-red-200 hover:bg-red-50 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}

                      {chapter.lessons.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p>Bu bölümde henüz ders bulunmuyor</p>
                          <Button
                            onClick={() => addLesson(chapter.id)}
                            variant="outline"
                            className="mt-4 rounded-xl"
                          >
                            İlk Dersi Ekle
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {chapters.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg mb-4">Henüz bölüm eklenmemiş</p>
                    <Button
                      onClick={addChapter}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl"
                    >
                      İlk Bölümü Ekle
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
            {/* Kurs Ayarları */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-xl font-bold text-gray-900">
                  <Settings className="w-5 h-5 mr-2 text-green-600" />
                  Kurs Ayarları
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Yayın Ayarları */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <div className="font-medium text-gray-900">Kursu Yayınla</div>
                      <div className="text-sm text-gray-600">Öğrenciler kursu görebilir</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.is_published}
                        onChange={(e) => setSettings({...settings, is_published: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <div className="font-medium text-gray-900">Öne Çıkan Kurs</div>
                      <div className="text-sm text-gray-600">Ana sayfada görüntüle</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.is_featured}
                        onChange={(e) => setSettings({...settings, is_featured: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <div className="font-medium text-gray-900">Değerlendirmelere İzin Ver</div>
                      <div className="text-sm text-gray-600">Öğrenciler yorum yapabilir</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.allow_reviews}
                        onChange={(e) => setSettings({...settings, allow_reviews: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <div className="font-medium text-gray-900">Sertifika Etkin</div>
                      <div className="text-sm text-gray-600">Tamamlama sertifikası ver</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.certificate_enabled}
                        onChange={(e) => setSettings({...settings, certificate_enabled: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {/* Gereksinimler */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kurs Gereksinimleri
                  </label>
                  <div className="space-y-2">
                    {settings.requirements.map((req, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input
                          value={req}
                          onChange={(e) => updateListItem('requirements', index, e.target.value)}
                          placeholder="Örn: Temel HTML bilgisi"
                          className="flex-1 rounded-xl border-gray-200"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeListItem('requirements', index)}
                          className="text-red-600 border-red-200 hover:bg-red-50 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => addListItem('requirements')}
                      className="w-full rounded-xl border-gray-200"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Gereksinim Ekle
                    </Button>
                  </div>
                </div>

                {/* Ne Öğrenecekler */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bu Kursta Ne Öğrenecekler
                  </label>
                  <div className="space-y-2">
                    {settings.what_you_will_learn.map((item, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input
                          value={item}
                          onChange={(e) => updateListItem('what_you_will_learn', index, e.target.value)}
                          placeholder="Örn: Modern React uygulamaları geliştirebilme"
                          className="flex-1 rounded-xl border-gray-200"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeListItem('what_you_will_learn', index)}
                          className="text-red-600 border-red-200 hover:bg-red-50 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => addListItem('what_you_will_learn')}
                      className="w-full rounded-xl border-gray-200"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Öğrenim Çıktısı Ekle
                    </Button>
                  </div>
                </div>

                {/* Hedef Kitle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hedef Kitle
                  </label>
                  <div className="space-y-2">
                    {settings.target_audience.map((item, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input
                          value={item}
                          onChange={(e) => updateListItem('target_audience', index, e.target.value)}
                          placeholder="Örn: Web geliştirme öğrenmek isteyen kişiler"
                          className="flex-1 rounded-xl border-gray-200"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeListItem('target_audience', index)}
                          className="text-red-600 border-red-200 hover:bg-red-50 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => addListItem('target_audience')}
                      className="w-full rounded-xl border-gray-200"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Hedef Kitle Ekle
                    </Button>
                  </div>
                </div>
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
                  <Eye className="w-5 h-5 mr-2 text-blue-600" />
                  Kurs Önizleme
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl">
                  <div className="flex items-start space-x-4">
                    <AlertCircle className="w-6 h-6 text-blue-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Yayınlamadan Önce Kontrol Edin</h3>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>✓ Kurs başlığı ve açıklaması doğru mu?</li>
                        <li>✓ Tüm bölümler ve dersler eklenmiş mi?</li>
                        <li>✓ Fiyat bilgileri doğru mu?</li>
                        <li>✓ Kapak resmi yüklenmiş mi?</li>
                        <li>✓ Kurs ayarları istediğiniz gibi mi?</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Kurs Kartı Önizleme */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Kurs Kartı Önizleme</h3>
                  <div className="max-w-sm mx-auto">
                    <Card className="overflow-hidden">
                      <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        {basicInfo.thumbnail ? (
                          <img 
                            src={URL.createObjectURL(basicInfo.thumbnail)} 
                            alt={basicInfo.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <BookOpen className="w-12 h-12 text-white" />
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-gray-900 line-clamp-2 mb-2">
                          {basicInfo.title || 'Kurs Başlığı'}
                        </h4>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {basicInfo.short_description || 'Kurs açıklaması buraya gelecek...'}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              basicInfo.level === 'beginner' ? 'bg-green-100 text-green-800' :
                              basicInfo.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {levels.find(l => l.value === basicInfo.level)?.label || 'Seviye'}
                            </span>
                          </div>
                          <div className="text-right">
                            {basicInfo.discount_price > 0 ? (
                              <div>
                                <span className="text-lg font-bold text-green-600">
                                  ₺{basicInfo.discount_price}
                                </span>
                                <span className="text-sm text-gray-500 line-through ml-2">
                                  ₺{basicInfo.price}
                                </span>
                              </div>
                            ) : (
                              <span className="text-lg font-bold text-gray-900">
                                ₺{basicInfo.price}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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
                        <span className="text-gray-600">Kategori:</span>
                        <span className="font-medium">{basicInfo.category || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Seviye:</span>
                        <span className="font-medium">
                          {levels.find(l => l.value === basicInfo.level)?.label}
                        </span>
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
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">İçerik Özeti</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bölüm Sayısı:</span>
                        <span className="font-medium">{chapters.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ders Sayısı:</span>
                        <span className="font-medium">
                          {chapters.reduce((total, chapter) => total + chapter.lessons.length, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Toplam Süre:</span>
                        <span className="font-medium">
                          {chapters.reduce((total, chapter) => 
                            total + chapter.lessons.reduce((chapterTotal, lesson) => chapterTotal + lesson.duration, 0), 0
                          )} dakika
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Yayın Durumu:</span>
                        <span className={`font-medium ${settings.is_published ? 'text-green-600' : 'text-yellow-600'}`}>
                          {settings.is_published ? 'Yayında' : 'Taslak'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'instructor')) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
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
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                  Yeni Kurs Oluştur
                </h1>
                <p className="text-xl text-gray-600">
                  Öğrencilere sunmak için yeni bir kurs hazırlayın
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
                      ? 'bg-blue-600 border-blue-600 text-white'
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
                    currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-20 h-0.5 mx-8 ${
                    currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
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
            <Button
              variant="outline"
              className="rounded-xl border-gray-200"
            >
              Taslak Olarak Kaydet
            </Button>

            {currentStep < 4 ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl"
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