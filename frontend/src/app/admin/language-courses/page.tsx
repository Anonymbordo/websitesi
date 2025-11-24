'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit, Trash2, Eye, BookOpen, FileText, Video, ClipboardCheck, Users, PhoneCall } from 'lucide-react'
import axios from 'axios'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface LanguageCourse {
  id: number
  language: string
  level: string
  title: string
  description: string
  price: number
  is_active: boolean
  created_at: string
}

export default function LanguageCoursesAdmin() {
  const router = useRouter()
  const [courses, setCourses] = useState<LanguageCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState<LanguageCourse | null>(null)
  
  const [formData, setFormData] = useState({
    language: 'ingilizce',
    level: 'a1',
    title: '',
    description: '',
    price: 299
  })

  const languages = [
    { value: 'ingilizce', label: 'İngilizce', flag: '🇬🇧' },
    { value: 'almanca', label: 'Almanca', flag: '🇩🇪' },
    { value: 'fransizca', label: 'Fransızca', flag: '🇫🇷' },
    { value: 'ispanyolca', label: 'İspanyolca', flag: '🇪🇸' }
  ]

  const levels = [
    { value: 'a1', label: 'A-1 (Başlangıç)', emoji: '🌱' },
    { value: 'a2', label: 'A-2 (Temel)', emoji: '🌿' },
    { value: 'b1', label: 'B-1 (Orta)', emoji: '🌊' },
    { value: 'b2', label: 'B-2 (Orta Üstü)', emoji: '🌌' },
    { value: 'c1', label: 'C-1 (İleri)', emoji: '⭐' },
    { value: 'c2', label: 'C-2 (Profesyonel)', emoji: '👑' }
  ]

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/language-courses/courses`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCourses(response.data)
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      
      if (editingCourse) {
        await axios.put(
          `${API_URL}/api/language-courses/courses/${editingCourse.id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      } else {
        await axios.post(
          `${API_URL}/api/language-courses/courses`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      }
      
      setShowCreateModal(false)
      setEditingCourse(null)
      setFormData({
        language: 'ingilizce',
        level: 'a1',
        title: '',
        description: '',
        price: 299
      })
      fetchCourses()
    } catch (error) {
      console.error('Error saving course:', error)
      alert('Kurs kaydedilemedi!')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bu kursu silmek istediğinizden emin misiniz?')) return
    
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API_URL}/api/language-courses/courses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchCourses()
    } catch (error) {
      console.error('Error deleting course:', error)
      alert('Kurs silinemedi!')
    }
  }

  const handleEdit = (course: LanguageCourse) => {
    setEditingCourse(course)
    setFormData({
      language: course.language,
      level: course.level,
      title: course.title,
      description: course.description,
      price: course.price
    })
    setShowCreateModal(true)
  }

  const getLanguageLabel = (lang: string) => {
    return languages.find(l => l.value === lang)?.label || lang
  }

  const getLevelLabel = (lvl: string) => {
    return levels.find(l => l.value === lvl)?.label || lvl
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Yükleniyor...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Yabancı Dil Kursları</h1>
          <p className="text-gray-600">Dil kurslarını ve içeriklerini yönetin</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Yeni Kurs Ekle
        </Button>
      </div>

      {/* Courses Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <Card key={course.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {languages.find(l => l.value === course.language)?.flag}
                {course.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Dil: {getLanguageLabel(course.language)}</p>
                <p className="text-sm text-gray-600 mb-1">Seviye: {getLevelLabel(course.level)}</p>
                <p className="text-sm text-gray-600 mb-1">Fiyat: ₺{course.price}</p>
                <p className="text-sm text-gray-600">
                  Durum: <span className={course.is_active ? 'text-green-600' : 'text-red-600'}>
                    {course.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                </p>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm font-semibold mb-3">İçerik Yönetimi:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/language-courses/${course.id}/topics`)}
                    className="flex items-center gap-1 text-xs"
                  >
                    <BookOpen className="w-3 h-3" />
                    Konular
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/language-courses/${course.id}/notes`)}
                    className="flex items-center gap-1 text-xs"
                  >
                    <FileText className="w-3 h-3" />
                    Notlar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/language-courses/${course.id}/videos`)}
                    className="flex items-center gap-1 text-xs"
                  >
                    <Video className="w-3 h-3" />
                    Videolar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/language-courses/${course.id}/exams`)}
                    className="flex items-center gap-1 text-xs"
                  >
                    <ClipboardCheck className="w-3 h-3" />
                    Sınavlar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/language-courses/${course.id}/instructors`)}
                    className="flex items-center gap-1 text-xs"
                  >
                    <Users className="w-3 h-3" />
                    Eğitmenler
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/language-courses/${course.id}/live-requests`)}
                    className="flex items-center gap-1 text-xs"
                  >
                    <PhoneCall className="w-3 h-3" />
                    Canlı Ders
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(course)}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Düzenle
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(course.id)}
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Sil
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingCourse ? 'Kursu Düzenle' : 'Yeni Kurs Ekle'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Dil</label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({...formData, language: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  >
                    {languages.map(lang => (
                      <option key={lang.value} value={lang.value}>
                        {lang.flag} {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Seviye</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({...formData, level: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  >
                    {levels.map(lvl => (
                      <option key={lvl.value} value={lvl.value}>
                        {lvl.emoji} {lvl.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Başlık</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Örn: İngilizce A-1 (Başlangıç)"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Açıklama</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Kurs açıklaması..."
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Fiyat (₺)</label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingCourse ? 'Güncelle' : 'Oluştur'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false)
                      setEditingCourse(null)
                      setFormData({
                        language: 'ingilizce',
                        level: 'a1',
                        title: '',
                        description: '',
                        price: 299
                      })
                    }}
                    className="flex-1"
                  >
                    İptal
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
