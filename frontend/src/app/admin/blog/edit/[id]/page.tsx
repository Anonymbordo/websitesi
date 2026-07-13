'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BlogEditorForm, BlogFormValues } from '@/components/blog/BlogEditorForm'
import { blogAPI } from '@/lib/api'
import { BlogPost, findBlogPostById, normalizeBlogPost, normalizeBlogPosts, readBlogPosts, writeBlogPosts } from '@/lib/blog'

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

export default function AdminBlogEditPage() {
  const router = useRouter()
  const params = useParams<{ id?: string }>()
  const postId = Number(params?.id)

  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES)
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadPost = async () => {
      setCategories(loadBlogCategories())

      try {
        const response = await blogAPI.getPostById(postId)
        const normalized = normalizeBlogPosts([response.data])[0] || null
        setPost(normalized)
      } catch (error) {
        const posts = readBlogPosts()
        setPost(findBlogPostById(posts, postId))
      } finally {
        setLoading(false)
      }
    }

    loadPost()
  }, [postId])

  const handleSubmit = async (values: BlogFormValues) => {
    setSaving(true)
    const tags = values.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
    const scheduledAt = values.status === 'scheduled' && values.scheduled_at
      ? new Date(values.scheduled_at).toISOString()
      : null
    let saved = false

    try {
      await blogAPI.updatePost(postId, {
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
        published_at: values.status === 'published' ? post?.published_at || new Date().toISOString() : null,
        scheduled_at: scheduledAt,
      })
      saved = true
    } catch (error) {
      try {
        const posts = readBlogPosts()
        const nextPosts = posts.map((item) => {
          if (item.id !== postId) return item

          return normalizeBlogPost({
            ...item,
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
              avatar: item.author.avatar,
            },
            status: values.status,
            is_featured: values.is_featured,
            published_at: values.status === 'published'
              ? item.published_at || new Date().toISOString()
              : null,
            scheduled_at: scheduledAt,
          })
        })

        writeBlogPosts(nextPosts)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-100">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="h-12 w-64 animate-pulse rounded-2xl bg-slate-200" />
          <div className="mt-6 h-[640px] animate-pulse rounded-[2rem] bg-white/80" />
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-100">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-10 shadow-xl">
            <h1 className="text-2xl font-semibold text-slate-900">Blog yazısı bulunamadı</h1>
            <p className="mt-3 text-slate-600">
              Düzenlemek istediğiniz kayıt silinmiş olabilir veya henüz bu tarayıcıda kayıtlı değildir.
            </p>
            <Button className="mt-6" onClick={() => router.push('/admin/blog')}>
              Blog listesine dön
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-1 text-sm font-medium text-amber-700">
            Blog Düzenleme
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
            İçeriği güncelle
          </h1>
          <p className="mt-2 max-w-2xl text-base text-slate-600">
            Görsel, video ve metni aynı form üzerinden yenileyin. Değişiklikler kaydedildiğinde anasayfa blog alanı da buna göre güncellenir.
          </p>
        </div>

        <BlogEditorForm
          initialPost={post}
          categories={categories}
          submitLabel="Değişiklikleri Kaydet"
          isSaving={saving}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/admin/blog')}
        />
      </div>
    </div>
  )
}
