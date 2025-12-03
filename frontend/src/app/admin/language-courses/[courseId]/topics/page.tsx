'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit, Trash2, ArrowLeft, Save } from 'lucide-react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Topic {
  id: number
  title: string
  description: string
  content: string
  order_index: number
  duration_minutes: number
  is_free: boolean
}

export default function TopicsManagement() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    order_index: 0,
    duration_minutes: 0,
    is_free: false
  })

  useEffect(() => {
    fetchTopics()
  }, [courseId])

  const fetchTopics = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/language-courses/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTopics(response.data.topics || [])
    } catch (error) {
      console.error('Error fetching topics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      
      if (editingTopic) {
        await axios.put(
          `${API_URL}/api/language-courses/topics/${editingTopic.id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      } else {
        await axios.post(
          `${API_URL}/api/language-courses/courses/${courseId}/topics`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      }
      
      setShowModal(false)
      setEditingTopic(null)
      setFormData({
        title: '',
        description: '',
        content: '',
        order_index: 0,
        duration_minutes: 0,
        is_free: false
      })
      fetchTopics()
    } catch (error) {
      console.error('Error saving topic:', error)
      alert('Konu kaydedilemedi!')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bu konuyu silmek istediğinizden emin misiniz?')) return
    
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API_URL}/api/language-courses/topics/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchTopics()
    } catch (error) {
      console.error('Error deleting topic:', error)
      alert('Konu silinemedi!')
    }
  }

  const handleEdit = (topic: Topic) => {
    setEditingTopic(topic)
    setFormData({
      title: topic.title,
      description: topic.description || '',
      content: topic.content || '',
      order_index: topic.order_index,
      duration_minutes: topic.duration_minutes || 0,
      is_free: topic.is_free
    })
    setShowModal(true)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Yükleniyor...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri Dön
        </Button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Ders Konuları</h1>
            <p className="text-gray-600">Kurs konularını yönetin</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Konu Ekle
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {topics.sort((a, b) => a.order_index - b.order_index).map((topic) => (
          <Card key={topic.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>#{topic.order_index + 1} - {topic.title}</span>
                <div className="flex gap-2">
                  {topic.is_free && (
                    <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">
                      Ücretsiz Önizleme
                    </span>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleEdit(topic)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(topic.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-2">{topic.description}</p>
              {topic.duration_minutes > 0 && (
                <p className="text-sm text-gray-500">Süre: {topic.duration_minutes} dakika</p>
              )}
              {topic.content && (
                <div className="mt-4 p-4 bg-gray-50 rounded">
                  <p className="text-sm text-gray-700 line-clamp-3">{topic.content}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingTopic ? 'Konuyu Düzenle' : 'Yeni Konu Ekle'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Başlık *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Konu başlığı"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Kısa Açıklama</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Kısa açıklama"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">İçerik</label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    placeholder="Konu içeriği (metin, örnekler, açıklamalar)"
                    rows={10}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Sıra No</label>
                    <Input
                      type="number"
                      value={formData.order_index}
                      onChange={(e) => setFormData({...formData, order_index: parseInt(e.target.value)})}
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Süre (dakika)</label>
                    <Input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value)})}
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_free"
                    checked={formData.is_free}
                    onChange={(e) => setFormData({...formData, is_free: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_free" className="text-sm font-medium">
                    Ücretsiz Önizleme (Satın almadan görülebilir)
                  </label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    {editingTopic ? 'Güncelle' : 'Kaydet'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false)
                      setEditingTopic(null)
                      setFormData({
                        title: '',
                        description: '',
                        content: '',
                        order_index: 0,
                        duration_minutes: 0,
                        is_free: false
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
