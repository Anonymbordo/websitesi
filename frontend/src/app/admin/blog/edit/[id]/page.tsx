'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminBlogEditPage() {
  const router = useRouter()
  const params = useParams() as { id?: string }
  const id = Number(params?.id)
  const [post, setPost] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('local_blogs')
      const blogs = raw ? JSON.parse(raw) : []
      const found = blogs.find((b: any) => b.id === id)
      if (found) setPost(found)
    } catch (err) {
      console.error('post okunamadı', err)
    }
  }, [id])

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="text-gray-600">Yazı bulunamadı veya yükleniyor...</div>
        <div className="mt-6">
          <Button onClick={() => router.push('/admin/blog')}>Geri</Button>
        </div>
      </div>
    )
  }

  const onSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const raw = localStorage.getItem('local_blogs')
      const blogs = raw ? JSON.parse(raw) : []
      const next = blogs.map((b: any) => b.id === id ? post : b)
      localStorage.setItem('local_blogs', JSON.stringify(next))
      router.push('/admin/blog')
    } catch (err) {
      console.error('kaydetme hatası', err)
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Yazıyı Düzenle</h1>
        </div>

        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Düzenle</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSave} className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Başlık</label>
                <Input value={post.title} onChange={(e:any) => setPost({...post, title: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kısa Özet</label>
                <Input value={post.excerpt} onChange={(e:any) => setPost({...post, excerpt: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">İçerik</label>
                <Textarea value={post.content} onChange={(e:any) => setPost({...post, content: e.target.value})} rows={12} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                <select value={post.category || 'General'} onChange={(e) => setPost({...post, category: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg w-full">
                  <option>General</option>
                  <option>Web Geliştirme</option>
                  <option>Veri Bilimi</option>
                  <option>Tasarım</option>
                  <option>Mobil Geliştirme</option>
                  <option>Kariyer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Etiketler (virgülle ayırın)</label>
                <input className="px-3 py-2 border border-gray-200 rounded-lg w-full" value={(post.tags||[]).join(',')} onChange={(e:any) => setPost({...post, tags: e.target.value.split(',').map((t:string)=>t.trim()).filter(Boolean)})} />
              </div>

              <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-100">
                <Button variant="ghost" onClick={() => router.push('/admin/blog')}>Vazgeç</Button>
                <Button type="submit" className="bg-gradient-to-r from-green-600 to-emerald-600" disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
