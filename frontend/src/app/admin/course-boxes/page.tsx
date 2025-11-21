'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Eye,
  EyeOff,
  Loader2,
  BookOpen,
  GraduationCap,
  Award,
  Trophy,
  Sparkles
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

const ICON_OPTIONS = [
  { name: 'BookOpen', component: BookOpen },
  { name: 'GraduationCap', component: GraduationCap },
  { name: 'Award', component: Award },
  { name: 'Trophy', component: Trophy },
  { name: 'Sparkles', component: Sparkles }
]

interface CourseBox {
  id: number
  title_tr: string
  title_en?: string
  title_ar?: string
  category: string
  icon?: string
  color_from: string
  color_to: string
  order_index: number
  is_active: boolean
}

export default function CourseBoxesManager() {
  const [boxes, setBoxes] = useState<CourseBox[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [formData, setFormData] = useState({
    title_tr: '',
    title_en: '',
    title_ar: '',
    category: '',
    icon: 'BookOpen',
    color_from: '#3B82F6',
    color_to: '#8B5CF6',
    order_index: 0,
    is_active: true
  })

  useEffect(() => {
    fetchBoxes()
  }, [showInactive])

  const fetchBoxes = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/api/course-boxes?is_active=${showInactive ? '' : 'true'}`)
      setBoxes(response.data)
    } catch (error) {
      console.error('Failed to fetch boxes:', error)
      toast.error('Kutular yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.title_tr || !formData.category) {
      toast.error('Türkçe başlık ve kategori zorunludur')
      return
    }

    try {
      await api.post('/api/course-boxes', formData)
      toast.success('Kutu başarıyla oluşturuldu')
      resetForm()
      fetchBoxes()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Oluşturma başarısız')
    }
  }

  const handleUpdate = async (id: number) => {
    try {
      await api.put(`/api/course-boxes/${id}`, formData)
      toast.success('Kutu başarıyla güncellendi')
      setEditingId(null)
      resetForm()
      fetchBoxes()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Güncelleme başarısız')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bu kutuyu silmek istediğinizden emin misiniz?')) return

    try {
      await api.delete(`/api/course-boxes/${id}`)
      toast.success('Kutu başarıyla silindi')
      fetchBoxes()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Silme başarısız')
    }
  }

  const startEdit = (box: CourseBox) => {
    setEditingId(box.id)
    setFormData({
      title_tr: box.title_tr,
      title_en: box.title_en || '',
      title_ar: box.title_ar || '',
      category: box.category,
      icon: box.icon || 'BookOpen',
      color_from: box.color_from,
      color_to: box.color_to,
      order_index: box.order_index,
      is_active: box.is_active
    })
  }

  const resetForm = () => {
    setFormData({
      title_tr: '',
      title_en: '',
      title_ar: '',
      category: '',
      icon: 'BookOpen',
      color_from: '#3B82F6',
      color_to: '#8B5CF6',
      order_index: 0,
      is_active: true
    })
    setEditingId(null)
  }

  const seedDefaultBoxes = async () => {
    try {
      const response = await api.post('/api/course-boxes/seed')
      toast.success(response.data.message)
      fetchBoxes()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Seed işlemi başarısız')
    }
  }

  const IconComponent = ICON_OPTIONS.find(i => i.name === formData.icon)?.component || BookOpen

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ders Kutuları Yönetimi</h2>
          <p className="text-gray-600 mt-1">Ana sayfadaki ders kutularını özelleştirin</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowInactive(!showInactive)}
            className="flex items-center gap-2"
          >
            {showInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showInactive ? 'Sadece Aktif' : 'Tümünü Göster'}
          </Button>
          <Button
            onClick={seedDefaultBoxes}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Varsayılanları Yükle
          </Button>
        </div>
      </div>

      {/* Create/Edit Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {editingId ? 'Kutu Düzenle' : 'Yeni Kutu Oluştur'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label>Başlık (Türkçe) *</Label>
            <Input
              value={formData.title_tr}
              onChange={(e) => setFormData({ ...formData, title_tr: e.target.value })}
              placeholder="9. Sınıf Dersleri"
            />
          </div>
          <div>
            <Label>Title (English)</Label>
            <Input
              value={formData.title_en}
              onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
              placeholder="9th Grade Courses"
            />
          </div>
          <div>
            <Label>العنوان (العربية)</Label>
            <Input
              value={formData.title_ar}
              onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
              placeholder="دورات الصف التاسع"
              dir="rtl"
            />
          </div>
          <div>
            <Label>Kategori *</Label>
            <Input
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="grade_9"
            />
          </div>
          <div>
            <Label>Icon</Label>
            <select
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {ICON_OPTIONS.map(icon => (
                <option key={icon.name} value={icon.name}>{icon.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Sıra</Label>
            <Input
              type="number"
              value={formData.order_index}
              onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
            />
          </div>
          <div>
            <Label>Renk (Başlangıç)</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={formData.color_from}
                onChange={(e) => setFormData({ ...formData, color_from: e.target.value })}
                className="w-20"
              />
              <Input
                value={formData.color_from}
                onChange={(e) => setFormData({ ...formData, color_from: e.target.value })}
                placeholder="#3B82F6"
              />
            </div>
          </div>
          <div>
            <Label>Renk (Bitiş)</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={formData.color_to}
                onChange={(e) => setFormData({ ...formData, color_to: e.target.value })}
                className="w-20"
              />
              <Input
                value={formData.color_to}
                onChange={(e) => setFormData({ ...formData, color_to: e.target.value })}
                placeholder="#8B5CF6"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <Label>Aktif</Label>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <Label className="mb-2 block">Önizleme:</Label>
          <div
            className="inline-flex items-center gap-3 px-6 py-3 rounded-xl text-white font-semibold shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${formData.color_from} 0%, ${formData.color_to} 100%)`
            }}
          >
            <IconComponent className="w-6 h-6" />
            {formData.title_tr || 'Başlık Giriniz'}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          {editingId ? (
            <>
              <Button onClick={() => handleUpdate(editingId)} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Kaydet
              </Button>
              <Button onClick={resetForm} variant="outline" className="flex items-center gap-2">
                <X className="w-4 h-4" />
                İptal
              </Button>
            </>
          ) : (
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Oluştur
            </Button>
          )}
        </div>
      </div>

      {/* Boxes List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sıra</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Önizleme</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Türkçe</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">English</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">العربية</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {boxes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Henüz kutu oluşturulmamış. "Varsayılanları Yükle" butonuna tıklayın.
                  </td>
                </tr>
              ) : (
                boxes.map((box) => {
                  const IconComp = ICON_OPTIONS.find(i => i.name === box.icon)?.component || BookOpen
                  return (
                    <tr key={box.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{box.order_index}</td>
                      <td className="px-6 py-4">
                        <div
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold"
                          style={{
                            background: `linear-gradient(135deg, ${box.color_from} 0%, ${box.color_to} 100%)`
                          }}
                        >
                          <IconComp className="w-4 h-4" />
                          {box.title_tr}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{box.title_tr}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{box.title_en || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600" dir="rtl">{box.title_ar || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <code className="px-2 py-1 bg-gray-100 rounded text-xs">{box.category}</code>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            box.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {box.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(box)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(box.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
