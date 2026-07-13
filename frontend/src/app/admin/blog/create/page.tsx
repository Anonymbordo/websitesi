'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BlogEditorForm, BlogFormValues } from '@/components/blog/BlogEditorForm'
import { blogAPI } from '@/lib/api'
import { normalizeBlogPost, readBlogPosts, writeBlogPosts } from '@/lib/blog'

const FALLBACK_CATEGORIES = ['Genel', 'Etkinlik', 'Basında Biz', 'Duyurular', 'İş Ortaklıkları']

function loadBlogCategories() {
  if (typeof window === 'undefined') return FALLBACK_CATEGORIES

  try {
    const raw = window.localStorage.getItem('local_categories')
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return FALLBACK_CATEGORIES

    const categories = parsed
      .filter((item: { type?: string; name?: string }) => item.type === 'blog' || item.type === 'general')
      .map((item: { name?: string }) => (item.name || '').trim())
      .filter(Boolean)

    return categories.length > 0 ? categories : FALLBACK_CATEGORIES
  } catch {
    return FALLBACK_CATEGORIES
  }
}

export default function AdminBlogCreatePage() {
  const router = useRouter()
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setCategories(loadBlogCategories())
  }, [])

  const handleSubmit = async (values: BlogFormValues) => {
    setSaving(true)
    const tags = values.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
    const scheduledAt = values.status === 'scheduled' && values.scheduled_at
      ? new Date(values.scheduled_at).toISOString()
      : null
    let saved = false

    try {
      await blogAPI.createPost({
        title: values.title,
        slug: values.slug,
        excerpt: values.excerpt,
        content: values.content,
        category: values.category,
        tags,
        featured_image: values.featured_image,
        video_url: values.video_url,
        video_title: values.video_title,
        author_name: values.author_name,
        status: values.status,
        is_featured: values.is_featured,
        published_at: values.status === 'published' ? new Date().toISOString() : null,
        scheduled_at: scheduledAt,
      })
      saved = true
    } catch (error) {
      try {
        const now = new Date().toISOString()
        const existingPosts = readBlogPosts()
        const createdPost = normalizeBlogPost({
          id: Date.now(),
          title: values.title,
          slug: values.slug,
          excerpt: values.excerpt,
          content: values.content,
          category: values.category,
          tags,
          featured_image: values.featured_image,
          video_url: values.video_url,
          video_title: values.video_title,
          author: {
            full_name: values.author_name,
          },
          status: values.status,
          is_featured: values.is_featured,
          views: 0,
          created_at: now,
          published_at: values.status === 'published' ? now : null,
          scheduled_at: scheduledAt,
        })

        writeBlogPosts([createdPost, ...existingPosts])
        saved = true
      } catch (fallbackError) {
        setSaving(false)
        throw fallbackError
      }
    }

    if (saved) {
      router.push('/admin/blog')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-4 py-1 text-sm font-medium text-cyan-700">
            Blog Yayın Merkezi
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
            Yeni blog yazısı oluştur
          </h1>
          <p className="mt-2 max-w-2xl text-base text-slate-600">
            İçeriği, kapak görselini ve videoyu tek ekrandan hazırlayın. Öne çıkarılan yazılar anasayfadaki blog alanında daha güçlü görünür.
          </p>
        </div>

        <BlogEditorForm
          categories={categories}
          submitLabel="Blogu Kaydet"
          isSaving={saving}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/admin/blog')}
        />
      </div>
    </div>
  )
}
