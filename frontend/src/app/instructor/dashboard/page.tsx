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
  ArrowLeft
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
  const [submitting, setSubmitting] = useState(false)

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
      setCourses(response.data.courses || [])

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

      // 2. Upload Thumbnail if selected
      if (thumbnail && newCourse.id) {
        await coursesAPI.uploadThumbnail(newCourse.id, thumbnail)
      }

      // 3. Reset and Refresh
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
      fetchData()
      alert('Kurs başarıyla oluşturuldu ve onay için gönderildi!')
    } catch (error) {
      console.error('Error creating course:', error)
      alert('Kurs oluşturulurken bir hata oluştu.')
    } finally {
      setSubmitting(false)
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
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => setIsCreating(false)}
            className="mb-6 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Panele Dön
          </Button>

          <Card className="shadow-xl border-0">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-xl">
              <CardTitle className="text-2xl flex items-center">
                <BookOpen className="w-6 h-6 mr-2" />
                Yeni Kurs Oluştur
              </CardTitle>
              <p className="text-blue-100 mt-2">
                Kurs detaylarını girin ve onaya gönderin.
              </p>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleCreateCourse} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Kurs Başlığı</Label>
                  <Input
                    id="title"
                    required
                    placeholder="Örn: Sıfırdan İleri Seviye Python"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Açıklama</Label>
                  <Textarea
                    id="description"
                    required
                    placeholder="Kurs içeriği hakkında detaylı bilgi..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="min-h-[150px]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="price">Fiyat (₺)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="price"
                        type="number"
                        required
                        min="0"
                        placeholder="0.00"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Süre (Saat)</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="duration"
                        type="number"
                        required
                        min="1"
                        placeholder="10"
                        value={formData.duration_hours}
                        onChange={(e) => setFormData({...formData, duration_hours: e.target.value})}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="category">Kategori</Label>
                    <select
                      id="category"
                      required
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                    <Label htmlFor="level">Seviye</Label>
                    <select
                      id="level"
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData.level}
                      onChange={(e) => setFormData({...formData, level: e.target.value})}
                    >
                      <option value="beginner">Başlangıç</option>
                      <option value="intermediate">Orta</option>
                      <option value="advanced">İleri</option>
                    </select>
                  </div>
                </div>

                {/* What You Will Learn Section */}
                <div className="space-y-2">
                  <Label>Neler Öğreneceksiniz?</Label>
                  {formData.what_you_will_learn.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Input 
                        value={item} 
                        onChange={(e) => handleListChange('what_you_will_learn', index, e.target.value)}
                        placeholder="Örn: React Hooks kullanımı"
                      />
                      <Button 
                        type="button"
                        variant="destructive" 
                        size="icon"
                        onClick={() => removeListItem('what_you_will_learn', index)}
                        disabled={formData.what_you_will_learn.length === 1}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addListItem('what_you_will_learn')}
                    className="mt-2"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Yeni Madde Ekle
                  </Button>
                </div>

                {/* Requirements Section */}
                <div className="space-y-2">
                  <Label>Gereksinimler</Label>
                  {formData.requirements.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Input 
                        value={item} 
                        onChange={(e) => handleListChange('requirements', index, e.target.value)}
                        placeholder="Örn: Temel JavaScript bilgisi"
                      />
                      <Button 
                        type="button"
                        variant="destructive" 
                        size="icon"
                        onClick={() => removeListItem('requirements', index)}
                        disabled={formData.requirements.length === 1}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addListItem('requirements')}
                    className="mt-2"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Yeni Madde Ekle
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Kapak Görseli</Label>
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

                <div className="pt-4 flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                    İptal
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Oluşturuluyor...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Eğitmen Paneli</h1>
              <p className="text-gray-500 mt-1">Hoş geldin, {profile?.user?.full_name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => setIsCreating(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Yeni Kurs Oluştur
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Toplam Öğrenci</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{profile?.total_students || 0}</h3>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Aktif Kurslar</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{profile?.total_courses || 0}</h3>
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                  <BookOpen className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Ortalama Puan</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{profile?.rating || '0.0'}</h3>
                </div>
                <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center text-yellow-600">
                  <Star className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Toplam Kazanç</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">₺0.00</h3>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Courses List */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-white rounded-t-xl px-6 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Kurslarım</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input placeholder="Kurs ara..." className="pl-9 h-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 bg-white rounded-b-xl">
            {courses.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Henüz kursunuz yok</h3>
                <p className="text-gray-500 mt-1 mb-6">İlk kursunuzu oluşturarak kazanmaya başlayın.</p>
                <Button onClick={() => setIsCreating(true)} variant="outline">
                  Kurs Oluştur
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {courses.map((course) => (
                  <div key={course.id} className="p-6 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                        {course.thumbnail ? (
                          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {course.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            {course.enrollment_count} Öğrenci
                          </span>
                          <span className="flex items-center">
                            <Star className="w-3 h-3 mr-1 text-yellow-500" />
                            {course.rating}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {course.duration_hours} Saat
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        course.is_published 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}>
                        {course.is_published ? 'Yayında' : 'Onay Bekliyor'}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">₺{course.price}</p>
                      </div>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
