'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, Eye, Upload, X, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/store'

export default function EditBlogPost() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuthStore()
  const postId = params.id

  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    featured_image: '',
    category: '',
    tags: [] as string[],
    status: 'draft',
    is_featured: false,
    scheduled_at: ''
  })

  const [currentTag, setCurrentTag] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    if (postId) {
      fetchPost()
    }
  }, [postId])

  const fetchPost = async () => {
    try {
      setFetching(true)
      const token = localStorage.getItem('access_token')

      const response = await fetch(`http://localhost:8000/api/admin/blog/${postId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setFormData({
          title: data.title,
          excerpt: data.excerpt,
          content: data.content,
          featured_image: data.featured_image || '',
          category: data.category,
          tags: data.tags || [],
          status: data.status,
          is_featured: data.is_featured,
          scheduled_at: data.scheduled_at ? new Date(data.scheduled_at).toISOString().slice(0, 16) : ''
        })
      } else {
        alert('Blog yazısı yüklenemedi')
        router.push('/admin/blog')
      }
    } catch (error) {
      console.error('Blog yazısı yüklenirken hata:', error)
      alert('Bir hata oluştu')
      router.push('/admin/blog')
    } finally {
      setFetching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = localStorage.getItem('access_token')

      const response = await fetch(`http://localhost:8000/api/admin/blog/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null
        })
      })

      if (response.ok) {
        alert('Blog yazısı başarıyla güncellendi!')
        router.push('/admin/blog')
      } else {
        const error = await response.json()
        alert(`Hata: ${error.detail || 'Blog yazısı güncellenemedi'}`)
      }
    } catch (error) {
      console.error('Blog yazısı güncellenirken hata:', error)
      alert('Blog yazısı güncellenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleAddTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, currentTag.trim()]
      })
      setCurrentTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    })
  }

  if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
    router.push('/')
    return null
  }

  if (fetching) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Blog yazısı yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/blog')}
            className="mb-4 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri Dön
          </Button>

          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-2">
            Blog Yazısını Düzenle
          </h1>
          <p className="text-xl text-gray-600">
            Mevcut blog yazısını düzenleyin
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Content Card */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>İçerik Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Başlık *
                </label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Blog yazısının başlığı..."
                  required
                  className="rounded-xl"
                />
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Özet *
                </label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="Blog yazısının kısa özeti..."
                  required
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  İçerik *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Blog yazısının tam içeriği..."
                  required
                  rows={15}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Markdown formatında yazabilirsiniz
                </p>
              </div>

              {/* Featured Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Öne Çıkan Görsel URL
                </label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={formData.featured_image}
                    onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    className="rounded-xl flex-1"
                  />
                  <Button type="button" variant="outline" className="rounded-xl">
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
                {formData.featured_image && (
                  <div className="mt-4">
                    <img
                      src={formData.featured_image}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-xl"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Settings Card */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Ayarlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Kategori Seçin</option>
                  <option value="Web Geliştirme">Web Geliştirme</option>
                  <option value="Veri Bilimi">Veri Bilimi</option>
                  <option value="Tasarım">Tasarım</option>
                  <option value="Mobil Geliştirme">Mobil Geliştirme</option>
                  <option value="Kişisel Gelişim">Kişisel Gelişim</option>
                  <option value="Yapay Zeka">Yapay Zeka</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Etiketler
                </label>
                <div className="flex gap-2 mb-3">
                  <Input
                    type="text"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddTag()
                      }
                    }}
                    placeholder="Etiket ekle..."
                    className="rounded-xl flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleAddTag}
                    variant="outline"
                    className="rounded-xl"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 hover:text-blue-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durum
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="draft">Taslak</option>
                  <option value="published">Yayınla</option>
                  <option value="scheduled">Planla</option>
                </select>
              </div>

              {/* Scheduled At */}
              {formData.status === 'scheduled' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yayın Tarihi
                  </label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              )}

              {/* Is Featured */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_featured" className="ml-2 text-sm font-medium text-gray-700">
                  Öne Çıkan Yazı
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreview(!preview)}
              className="rounded-xl"
            >
              <Eye className="w-4 h-4 mr-2" />
              {preview ? 'Düzenlemeye Dön' : 'Önizle'}
            </Button>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/blog')}
                className="rounded-xl"
              >
                İptal
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Güncelleniyor...' : 'Güncelle'}
              </Button>
            </div>
          </div>
        </form>

        {/* Preview */}
        {preview && (
          <Card className="mt-8 bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Önizleme</CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none">
              <h1>{formData.title || 'Başlık girilmedi'}</h1>
              {formData.featured_image && (
                <img src={formData.featured_image} alt={formData.title} className="w-full rounded-xl" />
              )}
              <p className="lead">{formData.excerpt}</p>
              <div className="whitespace-pre-wrap">{formData.content}</div>

              <div className="flex flex-wrap gap-2 mt-6">
                {formData.tags.map((tag, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
