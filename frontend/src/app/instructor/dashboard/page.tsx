'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Star,
  TrendingUp,
  Plus,
  Search,
  MoreVertical,
  Clock,
  DollarSign,
  BarChart,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Upload,
  Image as ImageIcon,
  ArrowLeft,
  Video,
  FileText,
  Film,
  File,
  Trash2,
  Eye,
  Edit,
  PlayCircle,
  MessageSquare,
  Bell
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/lib/store'
import { instructorsAPI, coursesAPI } from '@/lib/api'
import Link from 'next/link'
import { useHydration } from '@/hooks/useHydration'

export default function InstructorDashboard() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const isHydrated = useHydration()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<any>(null)
  const [showMaterialsModal, setShowMaterialsModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingCourse, setEditingCourse] = useState<any>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)
  
  // Form States
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    duration_hours: '',
    category: '',
    level: 'beginner',
    what_you_will_learn: [''] as string[],
    requirements: [''] as string[]
  })
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [videos, setVideos] = useState<File[]>([])
  const [pdfs, setPdfs] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [courseNotes, setCourseNotes] = useState<Record<number, any[]>>({})
  const [courseMaterials, setCourseMaterials] = useState<any[]>([])
  const [loadingMaterials, setLoadingMaterials] = useState(false)

  useEffect(() => {
    if (!isHydrated) return

    if (!isAuthenticated) {
      router.push('/auth/login?next=/instructor/dashboard')
      return
    }
    fetchData()
  }, [isAuthenticated, isHydrated, router])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await instructorsAPI.getMyProfile()
      setProfile(response.data)
      const coursesData = response.data.courses || []
      setCourses(coursesData)

      // Fetch admin notes for each course
      const notesPromises = coursesData.map(async (course: any) => {
        try {
          const notesResponse = await instructorsAPI.getCourseAdminNotes(course.id)
          const data = notesResponse.data
          const normalizedNotes = Array.isArray(data)
            ? data
            : Array.isArray(data?.notes)
              ? data.notes
              : []
          return { courseId: course.id, notes: normalizedNotes }
        } catch (err) {
          return { courseId: course.id, notes: [] }
        }
      })

      const allNotes = await Promise.all(notesPromises)
      const notesMap: Record<number, any[]> = {}
      allNotes.forEach(({ courseId, notes }) => {
        notesMap[courseId] = Array.isArray(notes) ? notes : []
      })
      setCourseNotes(notesMap)

      // Fetch categories
      try {
        const categoriesResponse = await coursesAPI.getCategories()
        if (categoriesResponse.data && categoriesResponse.data.length > 0) {
          setCategories(categoriesResponse.data)
        } else {
          // Fallback if API returns empty array
          setCategories([
            'İlkokul', 'Ortaokul', 'Lise', 'Kişisel Gelişim',
            'Yazılım', 'Tasarım', 'Pazarlama', 'İş Geliştirme', 
            'Fotoğrafçılık', 'Müzik'
          ])
        }
      } catch (err) {
        console.error('Error fetching categories:', err)
        setCategories([
          'İlkokul', 'Ortaokul', 'Lise', 'Kişisel Gelişim',
          'Yazılım', 'Tasarım', 'Pazarlama', 'İş Geliştirme', 
          'Fotoğrafçılık', 'Müzik'
        ])
      }
    } catch (error: any) {
      console.error('Error fetching instructor data:', error)
      if (error.response?.status === 404) {
        // Not an instructor yet
        router.push('/instructors/apply')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEditCourse = async (course: any) => {
    setEditingCourse(course)
    setFormData({
      title: course.title || '',
      description: course.description || '',
      price: course.price?.toString() || '',
      duration_hours: course.duration_hours?.toString() || '',
      category: course.category || '',
      level: course.level || 'beginner',
      what_you_will_learn: course.what_you_will_learn || [''],
      requirements: course.requirements || ['']
    })
    setIsEditing(true)
    setIsCreating(false)
    
    // Kurs materyallerini yükle
    setLoadingMaterials(true)
    try {
      const response = await coursesAPI.getCourseMaterials(course.id)
      console.log('Materyaller yüklendi:', response.data)
      setCourseMaterials(response.data || [])
    } catch (error: any) {
      console.error('Materyaller yüklenirken hata:', error)
      console.error('Hata detayı:', error.response?.data)
      setCourseMaterials([])
    } finally {
      setLoadingMaterials(false)
    }
  }

  const handleViewCourse = (course: any) => {
    router.push(`/courses/${course.id}`)
  }

  const handleDeleteCourse = (course: any) => {
    setCourseToDelete(course)
    setShowDeleteDialog(true)
  }

  const confirmDeleteCourse = async () => {
    if (!courseToDelete) return
    
    setDeleting(true)
    try {
      await coursesAPI.deleteCourse(courseToDelete.id)
      setCourses(courses.filter(c => c.id !== courseToDelete.id))
      setShowDeleteDialog(false)
      setCourseToDelete(null)
    } catch (error) {
      console.error('Kurs silinirken hata oluştu:', error)
      alert('Kurs silinirken bir hata oluştu.')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteMaterial = async (materialId: number) => {
    if (!confirm('Bu materyali silmek istediğinizden emin misiniz?')) return
    
    try {
      // API çağrısı yapılacak
      setCourseMaterials(courseMaterials.filter(m => m.id !== materialId))
      alert('Materyal başarıyla silindi.')
    } catch (error) {
      console.error('Materyal silinirken hata:', error)
      alert('Materyal silinirken bir hata oluştu.')
    }
  }

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCourse) return

    setSubmitting(true)
    try {
      const courseData = {
        ...formData,
        price: parseFloat(formData.price),
        duration_hours: parseInt(formData.duration_hours),
        what_you_will_learn: formData.what_you_will_learn.filter(item => item.trim() !== ''),
        requirements: formData.requirements.filter(item => item.trim() !== '')
      }
      
      const response = await coursesAPI.updateCourse(editingCourse.id, courseData)
      
      // Thumbnail güncelleme
      if (thumbnail) {
        const presignResp = await coursesAPI.presignUpload(editingCourse.id, {
          kind: 'thumbnail',
          filename: thumbnail.name,
          content_type: thumbnail.type,
        })
        
        await fetch(presignResp.data.upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': thumbnail.type },
          body: thumbnail,
        })
        
        await coursesAPI.setThumbnailUrl(editingCourse.id, presignResp.data.public_url)
      }

      // Kursları yeniden yükle
      await fetchData()
      
      // Form'u temizle
      setIsEditing(false)
      setEditingCourse(null)
      setFormData({
        title: '',
        description: '',
        price: '',
        duration_hours: '',
        category: '',
        level: 'beginner',
        what_you_will_learn: [''],
        requirements: ['']
      })
      setThumbnail(null)
      setCourseMaterials([])
      
    } catch (error) {
      console.error('Kurs güncellenirken hata:', error)
      alert('Kurs güncellenirken bir hata oluştu.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleListChange = (field: 'what_you_will_learn' | 'requirements', index: number, value: string) => {
    const newList = [...formData[field]]
    newList[index] = value
    setFormData({...formData, [field]: newList})
  }

  const addListItem = (field: 'what_you_will_learn' | 'requirements') => {
    setFormData({...formData, [field]: [...formData[field], '']})
  }

  const removeListItem = (field: 'what_you_will_learn' | 'requirements', index: number) => {
    const newList = formData[field].filter((_, i) => i !== index)
    setFormData({...formData, [field]: newList})
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      // 1. Create Course
      const courseData = {
        ...formData,
        price: parseFloat(formData.price),
        duration_hours: parseInt(formData.duration_hours),
        is_online: true,
        what_you_will_learn: formData.what_you_will_learn.filter(item => item.trim() !== ''),
        requirements: formData.requirements.filter(item => item.trim() !== '')
      }
      
      const response = await coursesAPI.createCourse(courseData)
      const newCourse = response.data

      const uploadViaPresign = async (
        kind: 'thumbnail' | 'preview_video' | 'video' | 'document',
        file: File
      ) => {
        const presignResp = await coursesAPI.presignUpload(newCourse.id, {
          kind,
          filename: file.name,
          content_type: file.type,
        })

        const { upload_url, public_url } = presignResp.data

        const putResp = await fetch(upload_url, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        })

        if (!putResp.ok) {
          throw new Error(`S3 upload failed (${putResp.status})`)
        }

        if (kind === 'thumbnail') {
          await coursesAPI.setThumbnailUrl(newCourse.id, public_url)
        } else if (kind === 'preview_video') {
          await coursesAPI.setPreviewVideoUrl(newCourse.id, public_url)
        } else if (kind === 'video') {
          await coursesAPI.addMaterialUrl(newCourse.id, {
            title: file.name,
            material_type: 'video',
            file_url: public_url,
          })
        } else if (kind === 'document') {
          await coursesAPI.addMaterialUrl(newCourse.id, {
            title: file.name,
            material_type: 'document',
            file_url: public_url,
          })
        }
      }

      // 2. Upload Thumbnail if selected
      if (thumbnail && newCourse.id) {
        try {
          await uploadViaPresign('thumbnail', thumbnail)
        } catch (err) {
          console.error('Thumbnail presign upload error:', err)
          await coursesAPI.uploadThumbnail(newCourse.id, thumbnail)
        }
      }

      // 3. Upload Videos if any
      if (videos.length > 0 && newCourse.id) {
        for (const video of videos) {
          try {
            try {
              await uploadViaPresign('video', video)
            } catch (err) {
              console.error('Video presign upload error:', err)
              await coursesAPI.uploadVideo(newCourse.id, video)
            }
          } catch (err) {
            console.error('Video upload error:', err)
          }
        }
      }

      // 4. Upload PDFs if any
      if (pdfs.length > 0 && newCourse.id) {
        for (const pdf of pdfs) {
          try {
            try {
              await uploadViaPresign('document', pdf)
            } catch (err) {
              console.error('PDF presign upload error:', err)
              await coursesAPI.uploadMaterial(newCourse.id, pdf)
            }
          } catch (err) {
            console.error('PDF upload error:', err)
          }
        }
      }

      // 5. Reset and Refresh
      setIsCreating(false)
      setFormData({
        title: '',
        description: '',
        price: '',
        duration_hours: '',
        category: '',
        level: 'beginner',
        what_you_will_learn: [''],
        requirements: ['']
      })
      setThumbnail(null)
      setVideos([])
      setPdfs([])
      fetchData()
      alert('Kurs başarıyla oluşturuldu ve onay için gönderildi!')
    } catch (error) {
      console.error('Error creating course:', error)
      alert('Kurs oluşturulurken bir hata oluştu.')
    } finally {
      setSubmitting(false)
    }
  }

  const removeVideo = (index: number) => {
    setVideos(videos.filter((_, i) => i !== index))
  }

  const removePdf = (index: number) => {
    setPdfs(pdfs.filter((_, i) => i !== index))
  }

  const handleAvatarUpload = async (file: File) => {
    setAvatarUploading(true)
    try {
      const response = await instructorsAPI.uploadAvatar(file)
      if (response.data.avatar_url) {
        // Profili yeniden yükle
        await fetchData()
        alert('Profil fotoğrafı başarıyla güncellendi!')
      }
    } catch (error) {
      console.error('Avatar upload error:', error)
      alert('Profil fotoğrafı yüklenirken bir hata oluştu.')
    } finally {
      setAvatarUploading(false)
    }
  }

  if (loading || !isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    )
  }

  if (isCreating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => setIsCreating(false)}
            className="mb-6 hover:bg-white/50 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Panele Dön
          </Button>

          <Card className="shadow-2xl border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-8">
              <CardTitle className="text-3xl flex items-center">
                <BookOpen className="w-8 h-8 mr-3" />
                Yeni Kurs Oluştur
              </CardTitle>
              <p className="text-blue-100 mt-3 text-lg">
                Kurs detaylarını girin, video ve PDF materyallerini yükleyin.
              </p>
            </CardHeader>
            <CardContent className="p-8 bg-white">
              <form onSubmit={handleCreateCourse} className="space-y-8">
                {/* Temel Bilgiler */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">Temel Bilgiler</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-base">Kurs Başlığı *</Label>
                    <Input
                      id="title"
                      required
                      placeholder="Örn: Sıfırdan İleri Seviye Python"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="text-lg h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-base">Açıklama *</Label>
                    <Textarea
                      id="description"
                      required
                      placeholder="Kurs içeriği hakkında detaylı bilgi..."
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="min-h-[180px] text-base"
                    />
                  </div>
                </div>

                {/* Fiyat ve Süre */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">Fiyat ve Süre</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-base">Fiyat (₺) *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-4 h-5 w-5 text-gray-400" />
                        <Input
                          id="price"
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.price}
                          onChange={(e) => setFormData({...formData, price: e.target.value})}
                          className="pl-10 h-12 text-lg"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration" className="text-base">Süre (Saat) *</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-4 h-5 w-5 text-gray-400" />
                        <Input
                          id="duration"
                          type="number"
                          required
                          min="1"
                          placeholder="10"
                          value={formData.duration_hours}
                          onChange={(e) => setFormData({...formData, duration_hours: e.target.value})}
                          className="pl-10 h-12 text-lg"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kategori ve Seviye */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">Kategori ve Seviye</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-base">Kategori *</Label>
                      <select
                        id="category"
                        required
                        className="flex h-12 w-full items-center justify-between rounded-md border border-input bg-background px-4 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                      >
                        <option value="" disabled>Kategori Seçin</option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="level" className="text-base">Seviye *</Label>
                      <select
                        id="level"
                        className="flex h-12 w-full items-center justify-between rounded-md border border-input bg-background px-4 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.level}
                        onChange={(e) => setFormData({...formData, level: e.target.value})}
                      >
                        <option value="beginner">Başlangıç</option>
                        <option value="intermediate">Orta</option>
                        <option value="advanced">İleri</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* What You Will Learn Section */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">Neler Öğreneceksiniz?</h3>
                  {formData.what_you_will_learn.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Input 
                        value={item} 
                        onChange={(e) => handleListChange('what_you_will_learn', index, e.target.value)}
                        placeholder="Örn: React Hooks kullanımı"
                        className="h-11"
                      />
                      <Button 
                        type="button"
                        variant="destructive" 
                        size="icon"
                        onClick={() => removeListItem('what_you_will_learn', index)}
                        disabled={formData.what_you_will_learn.length === 1}
                        className="h-11 w-11"
                      >
                        <XCircle className="w-5 h-5" />
                      </Button>
                    </div>
                  ))}
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addListItem('what_you_will_learn')}
                    className="mt-2 h-10"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Yeni Madde Ekle
                  </Button>
                </div>

                {/* Requirements Section */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">Gereksinimler</h3>
                  {formData.requirements.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Input 
                        value={item} 
                        onChange={(e) => handleListChange('requirements', index, e.target.value)}
                        placeholder="Örn: Temel JavaScript bilgisi"
                        className="h-11"
                      />
                      <Button 
                        type="button"
                        variant="destructive" 
                        size="icon"
                        onClick={() => removeListItem('requirements', index)}
                        disabled={formData.requirements.length === 1}
                        className="h-11 w-11"
                      >
                        <XCircle className="w-5 h-5" />
                      </Button>
                    </div>
                  ))}
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addListItem('requirements')}
                    className="mt-2 h-10"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Yeni Madde Ekle
                  </Button>
                </div>

                {/* Kapak Görseli */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">Kapak Görseli</h3>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer bg-gray-50"
                       onClick={() => document.getElementById('thumbnail-upload')?.click()}>
                    <input
                      id="thumbnail-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setThumbnail(e.target.files?.[0] || null)}
                    />
                    {thumbnail ? (
                      <div className="flex items-center justify-center text-green-600">
                        <CheckCircle2 className="w-6 h-6 mr-2" />
                        <span className="font-medium">{thumbnail.name}</span>
                      </div>
                    ) : (
                      <div className="text-gray-500">
                        <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p className="font-medium">Görsel yüklemek için tıklayın</p>
                        <p className="text-sm mt-1">PNG, JPG (Max 5MB)</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Video Yükleme */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 border-b pb-2 flex items-center">
                    <Video className="w-6 h-6 mr-2 text-blue-600" />
                    Video Materyalleri (Opsiyonel)
                  </h3>
                  <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer bg-blue-50"
                       onClick={() => document.getElementById('video-upload')?.click()}>
                    <input
                      id="video-upload"
                      type="file"
                      accept="video/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          setVideos([...videos, ...Array.from(e.target.files)])
                        }
                      }}
                    />
                    <Film className="w-12 h-12 mx-auto mb-3 text-blue-500" />
                    <p className="font-medium text-gray-700">Video dosyaları yüklemek için tıklayın</p>
                    <p className="text-sm mt-1 text-gray-500">MP4, MOV, AVI (Max 100MB her biri)</p>
                    <p className="text-xs mt-2 text-blue-600">Birden fazla video seçebilirsiniz</p>
                  </div>

                  {videos.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium text-gray-700">Yüklenen Videolar ({videos.length}):</p>
                      {videos.map((video, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-3">
                            <PlayCircle className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-medium text-gray-700">{video.name}</span>
                            <span className="text-xs text-gray-500">({(video.size / (1024 * 1024)).toFixed(2)} MB)</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeVideo(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* PDF Yükleme */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 border-b pb-2 flex items-center">
                    <FileText className="w-6 h-6 mr-2 text-red-600" />
                    PDF Materyalleri (Opsiyonel)
                  </h3>
                  <div className="border-2 border-dashed border-red-300 rounded-xl p-8 text-center hover:border-red-500 transition-colors cursor-pointer bg-red-50"
                       onClick={() => document.getElementById('pdf-upload')?.click()}>
                    <input
                      id="pdf-upload"
                      type="file"
                      accept=".pdf,application/pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          setPdfs([...pdfs, ...Array.from(e.target.files)])
                        }
                      }}
                    />
                    <File className="w-12 h-12 mx-auto mb-3 text-red-500" />
                    <p className="font-medium text-gray-700">PDF dosyaları yüklemek için tıklayın</p>
                    <p className="text-sm mt-1 text-gray-500">PDF (Max 20MB her biri)</p>
                    <p className="text-xs mt-2 text-red-600">Birden fazla PDF seçebilirsiniz</p>
                  </div>

                  {pdfs.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium text-gray-700">Yüklenen PDF'ler ({pdfs.length}):</p>
                      {pdfs.map((pdf, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-red-600" />
                            <span className="text-sm font-medium text-gray-700">{pdf.name}</span>
                            <span className="text-xs text-gray-500">({(pdf.size / (1024 * 1024)).toFixed(2)} MB)</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePdf(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-6 flex justify-end gap-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsCreating(false)} className="h-12 px-6">
                    İptal
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white min-w-[180px] h-12 shadow-lg"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Oluşturuluyor...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 mr-2" />
                        Kursu Oluştur
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Profil Resmi */}
              <div className="relative group">
                <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-lg">
                  {profile?.user?.profile_image ? (
                    <img 
                      src={profile.user.profile_image} 
                      alt={profile.user.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                      {profile?.user?.full_name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {/* Upload Overlay */}
                <div 
                  className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                >
                  {avatarUploading ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6 text-white" />
                  )}
                </div>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleAvatarUpload(file)
                  }}
                />
              </div>
              
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Eğitmen Paneli
                </h1>
                <p className="text-gray-600 mt-1 flex items-center gap-2">
                  <span className="text-lg">👋</span>
                  Hoş geldin, <span className="font-semibold">{profile?.user?.full_name}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/instructor/messages">
                <Button
                  variant="outline"
                  className="border-gray-200 bg-white hover:bg-gray-50 shadow-sm"
                >
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Mesajlar
                </Button>
              </Link>
              <Button 
                onClick={() => setIsCreating(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-200 hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="w-5 h-5 mr-2" />
                Yeni Kurs Oluştur
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Toplam Öğrenci</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-2">{profile?.total_students || 0}</h3>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <Users className="w-7 h-7" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Aktif Kurslar</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-2">{profile?.total_courses || 0}</h3>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <BookOpen className="w-7 h-7" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Ortalama Puan</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-2">{profile?.rating || '0.0'}</h3>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <Star className="w-7 h-7" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Toplam Kazanç</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-2">₺0.00</h3>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <TrendingUp className="w-7 h-7" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Courses List */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-blue-50 rounded-t-xl px-6 py-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-gray-900">Kurslarım</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input placeholder="Kurs ara..." className="pl-10 h-10 border-gray-300 focus:border-blue-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 bg-white rounded-b-xl">
            {courses.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Henüz kursunuz yok</h3>
                <p className="text-gray-500 mt-2 mb-6 max-w-md mx-auto">
                  İlk kursunuzu oluşturarak öğrencilere ulaşın ve kazanmaya başlayın.
                </p>
                <Button 
                  onClick={() => setIsCreating(true)} 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Kurs Oluştur
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {courses.map((course) => {
                  const notes = Array.isArray(courseNotes[course.id]) ? courseNotes[course.id] : []
                  const unresolvedCount = notes.filter((n: any) => !n?.is_resolved).length

                  return (
                  <div key={course.id} className="p-6 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 flex items-center justify-between group">
                    <div className="flex items-center gap-5">
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow">
                        {course.thumbnail ? (
                          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600">
                            <ImageIcon className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-lg">
                          {course.title}
                        </h4>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-full">
                            <Users className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">{course.enrollment_count}</span>
                          </span>
                          <span className="flex items-center gap-1.5 bg-yellow-50 px-2.5 py-1 rounded-full">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium">{course.rating}</span>
                          </span>
                          <span className="flex items-center gap-1.5 bg-purple-50 px-2.5 py-1 rounded-full">
                            <Clock className="w-4 h-4 text-purple-600" />
                            <span className="font-medium">{course.duration_hours} Saat</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {unresolvedCount > 0 && (
                        <div className="relative">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="hover:bg-orange-100 hover:text-orange-600 relative"
                            title="Admin Notları"
                          >
                            <Bell className="w-5 h-5 text-orange-500" />
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-md">
                              {unresolvedCount}
                            </span>
                          </Button>
                        </div>
                      )}
                      <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                        course.is_published 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md' 
                          : 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white shadow-md'
                      }`}>
                        {course.is_published ? '✓ Yayında' : '⏳ Onay Bekliyor'}
                      </div>
                      <div className="text-right min-w-[80px]">
                        <p className="font-bold text-xl text-gray-900">₺{course.price}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditCourse(course)}
                          className="hover:bg-blue-100 hover:text-blue-600"
                          title="Düzenle"
                        >
                          <Edit className="w-5 h-5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleViewCourse(course)}
                          className="hover:bg-indigo-100 hover:text-indigo-600"
                          title="Görüntüle"
                        >
                          <Eye className="w-5 h-5" />
                        </Button>
                        <div className="relative group/menu">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="hover:bg-gray-100"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-400" />
                          </Button>
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all duration-200 z-50">
                            <button
                              onClick={() => handleDeleteCourse(course)}
                              className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-t-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              Kursu Sil
                            </button>
                            <button
                              onClick={() => handleEditCourse(course)}
                              className="w-full px-4 py-2 text-left text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                              Düzenle
                            </button>
                            <button
                              onClick={() => handleViewCourse(course)}
                              className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-b-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              Görüntüle
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Silme Onay Dialogu */}
      {showDeleteDialog && courseToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Kursu Sil</h3>
                <p className="text-sm text-gray-500">Bu işlem geri alınamaz</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              <span className="font-semibold">{courseToDelete.title}</span> kursunu silmek istediğinizden emin misiniz? 
              Tüm kurs içeriği, öğrenci kayıtları ve değerlendirmeler kalıcı olarak silinecektir.
            </p>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowDeleteDialog(false)
                  setCourseToDelete(null)
                }}
                variant="outline"
                className="flex-1"
                disabled={deleting}
              >
                İptal
              </Button>
              <Button
                onClick={confirmDeleteCourse}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Siliniyor...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Sil
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Düzenleme Modalı */}
      {isEditing && editingCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Edit className="w-6 h-6" />
                <h2 className="text-2xl font-bold">Kursu Düzenle</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsEditing(false)
                  setEditingCourse(null)
                  setCourseMaterials([])
                }}
                className="text-white hover:bg-white/20"
              >
                <XCircle className="w-6 h-6" />
              </Button>
            </div>

            <form onSubmit={handleUpdateCourse} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Kurs Başlığı</Label>
                  <Input
                    id="edit-title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-category">Kategori</Label>
                  <select
                    id="edit-category"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Kategori Seçin</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-price">Fiyat (₺)</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    required
                    min="0"
                    step="0.01"
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-duration">Süre (Saat)</Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    value={formData.duration_hours}
                    onChange={(e) => setFormData({...formData, duration_hours: e.target.value})}
                    required
                    min="0"
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-level">Seviye</Label>
                  <select
                    id="edit-level"
                    value={formData.level}
                    onChange={(e) => setFormData({...formData, level: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="beginner">Başlangıç</option>
                    <option value="intermediate">Orta</option>
                    <option value="advanced">İleri</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-thumbnail">Kapak Görseli</Label>
                  <Input
                    id="edit-thumbnail"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setThumbnail(e.target.files?.[0] || null)}
                    className="border-gray-300"
                  />
                  {editingCourse.thumbnail && (
                    <img src={editingCourse.thumbnail} alt="Mevcut" className="h-20 w-32 object-cover rounded-lg mt-2" />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Açıklama</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                  rows={4}
                  className="border-gray-300"
                />
              </div>

              <div className="space-y-3">
                <Label>Neler Öğreneceksiniz</Label>
                {formData.what_you_will_learn.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => handleListChange('what_you_will_learn', index, e.target.value)}
                      placeholder="Örn: React'in temellerini öğreneceksiniz"
                      className="border-gray-300"
                    />
                    {formData.what_you_will_learn.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeListItem('what_you_will_learn', index)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addListItem('what_you_will_learn')}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ekle
                </Button>
              </div>

              <div className="space-y-3">
                <Label>Gereksinimler</Label>
                {formData.requirements.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => handleListChange('requirements', index, e.target.value)}
                      placeholder="Örn: Temel HTML bilgisi"
                      className="border-gray-300"
                    />
                    {formData.requirements.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeListItem('requirements', index)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addListItem('requirements')}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ekle
                </Button>
              </div>

              {/* Kurs Materyalleri Bölümü */}
              <div className="space-y-3 border-t pt-6">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Kurs Materyalleri</Label>
                  {loadingMaterials && (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  )}
                </div>
                
                {courseMaterials.length === 0 && !loadingMaterials ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm mb-3">Henüz materyal eklenmemiş</p>
                    <p className="text-xs text-gray-400 mb-4">
                      Kurs oluştururken eklediğiniz videolar ve dökümanlar burada görünecek
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false)
                        setEditingCourse(null)
                        setCourseMaterials([])
                        setSelectedCourse(editingCourse)
                        setShowMaterialsModal(true)
                      }}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Materyal Ekle
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {courseMaterials.map((material) => (
                      <div key={material.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            material.material_type === 'video' 
                              ? 'bg-red-100 text-red-600' 
                              : 'bg-blue-100 text-blue-600'
                          }`}>
                            {material.material_type === 'video' ? (
                              <Video className="w-5 h-5" />
                            ) : (
                              <FileText className="w-5 h-5" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{material.title}</p>
                            <p className="text-sm text-gray-500">
                              {material.material_type === 'video' ? 'Video' : 'Döküman'}
                              {material.file_size && ` • ${(material.file_size / 1024 / 1024).toFixed(2)} MB`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(material.file_url, '_blank')}
                            className="text-blue-600 hover:bg-blue-50"
                            title="Önizle"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteMaterial(material.id)}
                            className="text-red-600 hover:bg-red-50"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false)
                    setEditingCourse(null)
                    setCourseMaterials([])
                  }}
                  className="flex-1"
                  disabled={submitting}
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Güncelleniyor...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Güncelle
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
