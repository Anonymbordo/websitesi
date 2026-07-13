'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  Eye,
  Filter,
  Pencil,
  PlayCircle,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { blogAPI } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { BlogPost, formatBlogDate, normalizeBlogPosts, readBlogPosts, writeBlogPosts } from '@/lib/blog'

export default function BlogManagementPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()

  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'scheduled'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const loadPosts = async () => {
    try {
      const response = await blogAPI.listPosts({ include_all: true })
      const normalized = normalizeBlogPosts(response.data)
      setPosts(normalized)
      writeBlogPosts(normalized)
    } catch (error) {
      setPosts(readBlogPosts())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'editor')) {
      router.push('/')
      return
    }

    loadPosts()
  }, [isAuthenticated, router, user?.role])

  const categories = useMemo(() => {
    const distinct = Array.from(new Set(posts.map((post) => post.category))).filter(Boolean)
    return distinct.sort((left, right) => left.localeCompare(right, 'tr'))
  }, [posts])

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch = !searchTerm.trim() || [
        post.title,
        post.excerpt,
        post.author.full_name,
        post.category,
        ...post.tags,
      ].join(' ').toLocaleLowerCase('tr').includes(searchTerm.toLocaleLowerCase('tr'))

      const matchesStatus = statusFilter === 'all' || post.status === statusFilter
      const matchesCategory = categoryFilter === 'all' || post.category === categoryFilter

      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [categoryFilter, posts, searchTerm, statusFilter])

  const stats = useMemo(() => {
    const published = posts.filter((post) => post.status === 'published').length
    const drafts = posts.filter((post) => post.status === 'draft').length
    const videos = posts.filter((post) => Boolean(post.video_url)).length
    const featured = posts.filter((post) => post.is_featured).length

    return { published, drafts, videos, featured }
  }, [posts])

  const spotlightPost = useMemo(() => {
    return posts.find((post) => post.is_featured) || posts[0] || null
  }, [posts])

  const persistPosts = (nextPosts: BlogPost[]) => {
    writeBlogPosts(nextPosts)
    setPosts(readBlogPosts())
  }

  const handleDelete = async (postId: number) => {
    if (!window.confirm('Bu blog yazısını silmek istediğinize emin misiniz?')) return

    try {
      await blogAPI.deletePost(postId)
      await loadPosts()
    } catch (error) {
      persistPosts(posts.filter((post) => post.id !== postId))
    }
  }

  const handleStatusChange = async (postId: number, nextStatus: BlogPost['status']) => {
    const now = new Date().toISOString()
    const currentPost = posts.find((post) => post.id === postId)

    try {
      await blogAPI.updatePost(postId, {
        status: nextStatus,
        published_at: nextStatus === 'published' ? currentPost?.published_at || now : null,
        scheduled_at: nextStatus === 'scheduled' ? currentPost?.scheduled_at || now : null,
      })
      await loadPosts()
    } catch (error) {
      const nextPosts = posts.map((post) => {
        if (post.id !== postId) return post

        return {
          ...post,
          status: nextStatus,
          published_at: nextStatus === 'published' ? post.published_at || now : null,
          scheduled_at: nextStatus === 'scheduled' ? post.scheduled_at || now : null,
        }
      })

      persistPosts(nextPosts)
    }
  }

  const handleToggleFeatured = async (postId: number) => {
    const currentPost = posts.find((post) => post.id === postId)

    try {
      await blogAPI.updatePost(postId, {
        is_featured: !(currentPost?.is_featured || false),
      })
      await loadPosts()
    } catch (error) {
      const nextPosts = posts.map((post) => (
        post.id === postId
          ? { ...post, is_featured: !post.is_featured }
          : post
      ))

      persistPosts(nextPosts)
    }
  }

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'editor')) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-4 py-1 text-sm font-medium text-cyan-700">
              Blog İçerik Merkezi
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">Blog yönetimi</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Yazıları, video içeriklerini ve anasayfa vitrinini buradan kontrol edin.
            </p>
          </div>

          <Button
            onClick={() => router.push('/admin/blog/create')}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Yeni Blog Yazısı
          </Button>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Yayındaki Yazılar', value: stats.published, icon: CheckCircle2, tone: 'from-emerald-500 to-green-500' },
            { label: 'Taslaklar', value: stats.drafts, icon: Pencil, tone: 'from-amber-500 to-orange-500' },
            { label: 'Video İçerikleri', value: stats.videos, icon: PlayCircle, tone: 'from-rose-500 to-pink-500' },
            { label: 'Öne Çıkanlar', value: stats.featured, icon: Star, tone: 'from-sky-500 to-cyan-500' },
          ].map((item) => (
            <Card key={item.label} className="border-0 bg-white/90 shadow-xl shadow-slate-200/60">
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</p>
                </div>
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${item.tone}`}>
                  <item.icon className="h-7 w-7 text-white" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <Card className="border-0 bg-white/90 shadow-xl shadow-slate-200/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Filter className="h-5 w-5 text-cyan-600" />
                Filtreler
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Başlık, özet, kategori veya etiket ara"
                  className="pl-10"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              >
                <option value="all">Tüm durumlar</option>
                <option value="published">Yayında</option>
                <option value="draft">Taslak</option>
                <option value="scheduled">Planlı</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              >
                <option value="all">Tüm kategoriler</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600 md:col-span-2">
                {filteredPosts.length} içerik listeleniyor.
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setCategoryFilter('all')
                }}
              >
                Temizle
              </Button>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-0 bg-slate-950 text-white shadow-2xl shadow-slate-300/40">
            <div className="relative aspect-[4/3] overflow-hidden">
              {spotlightPost?.featured_image ? (
                <img
                  src={spotlightPost.featured_image}
                  alt={spotlightPost.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-slate-900 to-emerald-500" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">
                  {spotlightPost ? 'Vitrindeki içerik' : 'Blog vitrini'}
                </p>
                <h2 className="mt-2 text-2xl font-semibold leading-tight">
                  {spotlightPost?.title || 'Henüz öne çıkarılmış bir blog yazısı yok'}
                </h2>
                <p className="mt-3 line-clamp-3 text-sm text-white/80">
                  {spotlightPost?.excerpt || 'İlk blog yazınızı eklediğinizde burada anasayfadaki görünümün ana fikri yer alır.'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-80 animate-pulse rounded-[2rem] bg-white/80" />
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <Card className="border-0 bg-white/90 shadow-xl shadow-slate-200/60">
            <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <Sparkles className="h-12 w-12 text-cyan-600" />
              <h2 className="mt-4 text-2xl font-semibold text-slate-900">Gösterilecek blog yazısı yok</h2>
              <p className="mt-2 max-w-xl text-slate-600">
                Blog sayfasında video, görsel ve marka hikayesi göstermek için yeni bir içerik oluşturabilirsiniz.
              </p>
              <Button
                className="mt-6 bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
                onClick={() => router.push('/admin/blog/create')}
              >
                <Plus className="mr-2 h-4 w-4" />
                İlk Yazıyı Oluştur
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {filteredPosts.map((post) => (
              <Card key={post.id} className="overflow-hidden border-0 bg-white/90 shadow-xl shadow-slate-200/60">
                <div className="relative aspect-[16/10] overflow-hidden">
                  {post.featured_image ? (
                    <img src={post.featured_image} alt={post.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-cyan-700 to-emerald-500" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                  <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-900">
                      {post.category}
                    </span>
                    <span className="rounded-full bg-slate-900/70 px-3 py-1 text-xs font-medium text-white">
                      {post.status === 'published' ? 'Yayında' : post.status === 'scheduled' ? 'Planlı' : 'Taslak'}
                    </span>
                    {post.video_url && (
                      <span className="rounded-full bg-rose-500/80 px-3 py-1 text-xs font-medium text-white">
                        Video
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
                    <div className="max-w-[70%]">
                      <h2 className="line-clamp-2 text-xl font-semibold text-white">{post.title}</h2>
                      <p className="mt-2 line-clamp-2 text-sm text-white/80">{post.excerpt}</p>
                    </div>
                    <div className="rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white">
                      {formatBlogDate(post.published_at || post.created_at)}
                    </div>
                  </div>
                </div>

                <CardContent className="space-y-4 p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    {post.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                      >
                        #{tag}
                      </span>
                    ))}
                    {post.is_featured && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                        Anasayfada öne çıkıyor
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Yazar: {post.author.full_name}</span>
                    <span>{post.views} görüntülenme</span>
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <Button variant="outline" size="sm" onClick={() => router.push(`/blog/${post.slug}`)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Gör
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push(`/admin/blog/edit/${post.id}`)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Düzenle
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleToggleFeatured(post.id)}>
                      <Star className={`mr-2 h-4 w-4 ${post.is_featured ? 'fill-amber-400 text-amber-500' : ''}`} />
                      {post.is_featured ? 'Öne Çıkarıldı' : 'Öne Al'}
                    </Button>
                    {post.status !== 'published' ? (
                      <Button size="sm" onClick={() => handleStatusChange(post.id, 'published')}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Yayınla
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => handleStatusChange(post.id, 'draft')}>
                        Taslağa Al
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-rose-200 text-rose-600 hover:bg-rose-50"
                      onClick={() => handleDelete(post.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Sil
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
