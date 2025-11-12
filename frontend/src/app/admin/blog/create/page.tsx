"use client"

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-')
}

export default function AdminBlogCreatePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('local_categories')
      if (raw) {
        const cats = JSON.parse(raw)
        // show blog and general categories
        const names = cats.filter((c:any)=> c.type === 'blog' || c.type === 'general').map((c:any)=> c.name)
        setCategories(names)
      } else {
        setCategories(['General','Web Geliştirme','Veri Bilimi','Tasarım','Mobil Geliştirme','Kariyer'])
      }
    } catch (err) {
      setCategories(['General','Web Geliştirme','Veri Bilimi','Tasarım','Mobil Geliştirme','Kariyer'])
    }
  }, [])

  const handleImage = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(String(reader.result))
    }
    reader.readAsDataURL(file)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    handleImage(file)
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return
    setSaving(true)

    const slug = slugify(title || `post-${Date.now()}`)
    const post = {
      id: Date.now(),
      title,
      excerpt,
      content,
      slug,
      featured_image: imagePreview,
      category: (document.getElementById('post-category') as HTMLSelectElement)?.value || 'General',
      tags: ((document.getElementById('post-tags') as HTMLInputElement)?.value || '').split(',').map(t => t.trim()).filter(Boolean),
      status: 'draft',
      author: { full_name: 'Site Admin' },
      created_at: new Date().toISOString()
    }

    try {
      const raw = localStorage.getItem('local_blogs')
      const blogs = raw ? JSON.parse(raw) : []
      blogs.unshift(post)
      localStorage.setItem('local_blogs', JSON.stringify(blogs))

      // Redirect to admin list so editor can see posts
      router.push('/admin/blog')
    } catch (err) {
      console.error('Blog kaydedilemedi', err)
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Yeni Blog Yazısı Oluştur</h1>
          <p className="text-sm text-gray-600">Yeni bir blog yazısı oluşturun ve sitenizde yayınlayın.</p>
        </div>

        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Yazı Detayları</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Başlık</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Özgün ve açıklayıcı bir başlık girin" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kısa Özet</label>
                  <Input value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Kısa özet (meta)" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                  <select id="post-category" defaultValue="General" className="px-3 py-2 border border-gray-200 rounded-lg w-full">
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">İçerik</label>
                <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Yazı içeriği (basit HTML/Markdown)" rows={12} />
              </div>

              <div className="md:flex md:items-center md:gap-6">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Öne Çıkan Görsel</label>
                  <div className="flex items-center gap-4">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                    <Button type="button" onClick={() => fileInputRef.current?.click()} className="bg-white border border-gray-200 text-gray-700">
                      Dosya Seç
                    </Button>
                    <span className="text-sm text-gray-500">{imagePreview ? 'Görsel seçildi' : 'Seçilen dosya yok'}</span>
                  </div>
                </div>

                {imagePreview && (
                  <div className="w-48 h-32 rounded-md overflow-hidden bg-gray-100 shadow">
                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Etiketler (virgülle ayırın)</label>
                  <input id="post-tags" className="px-3 py-2 border border-gray-200 rounded-lg w-full" placeholder="örn: react,nextjs,typescript" />
                </div>

              <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-100">
                <Button variant="ghost" onClick={() => router.push('/admin/blog')}>Vazgeç</Button>
                <Button type="submit" className="bg-gradient-to-r from-green-600 to-emerald-600" disabled={saving || !title}>
                  {saving ? 'Kaydediliyor...' : 'Yayınla'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
