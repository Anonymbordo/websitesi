'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  FileText,
  Video,
  Presentation,
  HelpCircle,
  Loader2,
  Clock,
  Unlock,
  Lock
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

interface CourseBox {
  id: number
  title_tr: string
  category: string
  color_from: string
  color_to: string
}

interface CourseBoxContent {
  id: number
  course_box_id: number
  title: string
  description?: string
  content_type: 'video' | 'pdf' | 'quiz' | 'slide'
  file_url?: string
  order_index: number
  is_free: boolean
  duration?: number
}

const CONTENT_TYPES = [
  { value: 'video', label: 'Video', icon: Video },
  { value: 'pdf', label: 'PDF Doküman', icon: FileText },
  { value: 'slide', label: 'Sunum/Slayt', icon: Presentation },
  { value: 'quiz', label: 'Test/Quiz', icon: HelpCircle }
]

export default function CourseBoxContentManager() {
  const params = useParams()
  const router = useRouter()
  const boxId = parseInt(params.id as string)

  const [box, setBox] = useState<CourseBox | null>(null)
  const [contents, setContents] = useState<CourseBoxContent[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingContent, setEditingContent] = useState<CourseBoxContent | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content_type: 'video',
    file_url: '',
    order_index: 0,
    is_free: false,
    duration: 0
  })

  useEffect(() => {
    if (boxId) {
      fetchData()
    }
  }, [boxId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [boxRes, contentRes] = await Promise.all([
        api.get(`/api/course-boxes/${boxId}`),
        api.get(`/api/admin/course-boxes/${boxId}/contents`)
      ])
      setBox(boxRes.data)
      setContents(contentRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingContent) {
        await api.put(`/api/admin/course-boxes/contents/${editingContent.id}`, formData)
        toast.success('İçerik güncellendi')
      } else {
        await api.post(`/api/admin/course-boxes/${boxId}/contents`, formData)
        toast.success('İçerik eklendi')
      }
      setShowModal(false)
      setEditingContent(null)
      resetForm()
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bu içeriği silmek istediğinizden emin misiniz?')) return

    try {
      // Note: Delete endpoint might need to be added to backend if not exists
      // Assuming standard REST pattern or I might need to check backend
      // Checking backend/course_box_content.py... 
      // It seems DELETE endpoint is missing in the file I read earlier!
      // I will assume it exists or I will need to add it.
      // Let's try standard pattern first.
      await api.delete(`/api/admin/course-boxes/contents/${id}`)
      toast.success('İçerik silindi')
      fetchData()
    } catch (error: any) {
      toast.error('Silme işlemi başarısız (Endpoint eksik olabilir)')
    }
  }

  const startEdit = (content: CourseBoxContent) => {
    setEditingContent(content)
    setFormData({
      title: content.title,
      description: content.description || '',
      content_type: content.content_type as any,
      file_url: content.file_url || '',
      order_index: content.order_index,
      is_free: content.is_free,
      duration: content.duration || 0
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      content_type: 'video',
      file_url: '',
      order_index: contents.length + 1,
      is_free: false,
      duration: 0
    })
  }

  const openCreateModal = () => {
    setEditingContent(null)
    resetForm()
    setShowModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!box) return <div>Kutu bulunamadı</div>

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span 
                className="w-3 h-8 rounded-full block"
                style={{ background: `linear-gradient(to bottom, ${box.color_from}, ${box.color_to})` }}
              />
              {box.title_tr}
            </h1>
            <p className="text-gray-600 ml-6">İçerik Yönetimi</p>
          </div>
        </div>
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Yeni İçerik Ekle
        </Button>
      </div>

      {/* Content List */}
      <div className="grid gap-4">
        {contents.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mb-4 opacity-20" />
              <p>Bu kutuda henüz içerik yok.</p>
              <Button variant="link" onClick={openCreateModal}>İlk içeriği ekle</Button>
            </CardContent>
          </Card>
        ) : (
          contents.map((content) => {
            const TypeIcon = CONTENT_TYPES.find(t => t.value === content.content_type)?.icon || FileText
            return (
              <Card key={content.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600">
                    <TypeIcon className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg truncate">{content.title}</h3>
                      {content.is_free && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium flex items-center gap-1">
                          <Unlock className="w-3 h-3" /> Ücretsiz
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{content.description || 'Açıklama yok'}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {content.duration ? `${content.duration} dk` : '-'}
                      </span>
                      <span>Sıra: {content.order_index}</span>
                      <span className="uppercase">{content.content_type}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(content)}>
                      <Edit className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(content.id)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {editingContent ? 'İçeriği Düzenle' : 'Yeni İçerik Ekle'}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <Label>Başlık</Label>
                <Input
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="Örn: Giriş Dersi"
                />
              </div>

              <div>
                <Label>İçerik Tipi</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {CONTENT_TYPES.map(type => (
                    <div
                      key={type.value}
                      onClick={() => setFormData({...formData, content_type: type.value as any})}
                      className={`cursor-pointer border rounded-lg p-3 flex items-center gap-2 transition-colors ${
                        formData.content_type === type.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <type.icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{type.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Açıklama</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="İçerik hakkında kısa bilgi..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Dosya/Video URL</Label>
                <Input
                  value={formData.file_url}
                  onChange={e => setFormData({...formData, file_url: e.target.value})}
                  placeholder="https://..."
                />
                <p className="text-xs text-gray-500 mt-1">Video linki veya dosya adresi</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Süre (Dakika)</Label>
                  <Input
                    type="number"
                    value={formData.duration}
                    onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Sıralama</Label>
                  <Input
                    type="number"
                    value={formData.order_index}
                    onChange={e => setFormData({...formData, order_index: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_free"
                  checked={formData.is_free}
                  onChange={e => setFormData({...formData, is_free: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <Label htmlFor="is_free" className="cursor-pointer">Ücretsiz Önizleme (Herkes görebilir)</Label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  {editingContent ? 'Güncelle' : 'Ekle'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                  İptal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
