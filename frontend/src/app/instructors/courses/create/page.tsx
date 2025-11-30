'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { coursesAPI } from '@/lib/api'
import { Upload } from 'lucide-react'

export default function CreateCoursePage() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    short_description: '',
    price: 0,
    discount_price: 0,
    duration_hours: 1,
    level: 'beginner',
    category: '',
    language: 'Turkish',
    is_online: true,
  })
  const [loading, setLoading] = useState(false)
  const [course, setCourse] = useState<any | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }))

  const handleCreate = async () => {
    try {
      setLoading(true)
      setMessage('')
      const payload = {
        title: form.title,
        description: form.description,
        short_description: form.short_description,
        price: Number(form.price),
        discount_price: form.discount_price ? Number(form.discount_price) : undefined,
        duration_hours: Number(form.duration_hours),
        level: form.level,
        category: form.category,
        language: form.language,
        is_online: form.is_online,
      }
      const res = await coursesAPI.createCourse(payload)
      setCourse(res.data)
      setMessage('Kurs başarıyla oluşturuldu. Thumbnail yükleyebilirsiniz.')
    } catch (err: any) {
      console.error(err)
      setMessage(err?.response?.data?.detail || 'Kurs oluşturulurken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadThumbnail = async () => {
    if (!course || !thumbnailFile) return
    try {
      setLoading(true)
      const res = await coursesAPI.uploadThumbnail(course.id, thumbnailFile)
      setCourse((c: any) => ({ ...c, thumbnail: res.data.thumbnail_url }))
      setMessage('Thumbnail yüklendi')
    } catch (err: any) {
      console.error(err)
      setMessage('Thumbnail yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Yeni Kurs Oluştur</h1>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="title">Kurs Başlığı</Label>
            <Input id="title" value={form.title} onChange={(e) => update('title', e.target.value)} />
          </div>

          <div>
            <Label htmlFor="short_description">Kısa Açıklama</Label>
            <Input id="short_description" value={form.short_description} onChange={(e) => update('short_description', e.target.value)} />
          </div>

          <div>
            <Label htmlFor="description">Açıklama</Label>
            <Textarea id="description" value={form.description} onChange={(e) => update('description', e.target.value)} rows={6} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Fiyat (TL)</Label>
              <Input id="price" type="number" value={form.price} onChange={(e) => update('price', Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="discount_price">İndirimli Fiyat (isteğe bağlı)</Label>
              <Input id="discount_price" type="number" value={form.discount_price} onChange={(e) => update('discount_price', Number(e.target.value))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration_hours">Süre (saat)</Label>
              <Input id="duration_hours" type="number" value={form.duration_hours} onChange={(e) => update('duration_hours', Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="level">Seviye</Label>
              <select className="mt-2 w-full p-2 border rounded" value={form.level} onChange={(e) => update('level', e.target.value)}>
                <option value="beginner">Başlangıç</option>
                <option value="intermediate">Orta</option>
                <option value="advanced">İleri</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="category">Kategori</Label>
            <Input id="category" value={form.category} onChange={(e) => update('category', e.target.value)} />
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleCreate} disabled={loading} className="rounded">{loading ? 'Oluşturuluyor...' : 'Kurs Oluştur'}</Button>
            {course && <span className="text-sm text-green-700">Oluşturuldu: ID {course.id}</span>}
          </div>

          {course && (
            <div className="mt-6 border-t pt-4">
              <h2 className="font-semibold mb-2">Kurs için Thumbnail Yükle</h2>
              <input id="thumb" type="file" accept="image/*" onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)} className="sr-only" />
              <label htmlFor="thumb">
                <Button variant="outline"><Upload className="w-4 h-4 mr-2" /> Dosya Seç</Button>
              </label>
              {thumbnailFile && <div className="mt-2 text-sm">Seçilen: {thumbnailFile.name}</div>}
              <div className="mt-3">
                <Button onClick={handleUploadThumbnail} disabled={loading || !thumbnailFile}>{loading ? 'Yükleniyor...' : 'Thumbnail Yükle'}</Button>
              </div>
              {course.thumbnail && <div className="mt-3 text-sm">Thumbnail URL: {course.thumbnail}</div>}
            </div>
          )}

          {message && <div className="mt-4 text-sm text-gray-700">{message}</div>}
        </div>
      </div>
    </div>
  )
}
