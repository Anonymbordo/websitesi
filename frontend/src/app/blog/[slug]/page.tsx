'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, PlayCircle, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BlogVideoEmbed } from '@/components/blog/BlogVideoEmbed'
import { blogAPI } from '@/lib/api'
import {
  BlogPost,
  blogContentContainsHtml,
  estimateBlogReadTime,
  findBlogPostBySlug,
  formatBlogDate,
  getPublishedBlogPosts,
  incrementBlogPostViews,
  normalizeBlogPosts,
  readBlogPosts,
} from '@/lib/blog'

function PlainTextContent({ content }: { content: string }) {
  return (
    <div className="space-y-6 text-base leading-8 text-slate-700">
      {content
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph, index) => (
          <p key={`${paragraph.slice(0, 20)}-${index}`}>{paragraph}</p>
        ))}
    </div>
  )
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()

  const [post, setPost] = useState<BlogPost | null>(null)
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([])

  useEffect(() => {
    const loadPost = async () => {
      try {
        const [postResponse, relatedResponse] = await Promise.all([
          blogAPI.getPostBySlug(slug),
          blogAPI.listPosts({ status: 'published', limit: 6 }),
        ])

        const normalizedPost = normalizeBlogPosts([postResponse.data])[0] || null
        const normalizedRelated = normalizeBlogPosts(relatedResponse.data)

        if (!normalizedPost) {
          setPost(null)
          setRelatedPosts([])
          return
        }

        try {
          const viewResponse = await blogAPI.incrementViews(normalizedPost.id)
          const viewedPost = normalizeBlogPosts([viewResponse.data])[0] || normalizedPost
          setPost(viewedPost)
          setRelatedPosts(
            normalizedRelated
              .filter((item) => item.slug !== slug)
              .sort((left, right) => {
                if (left.category === viewedPost.category && right.category !== viewedPost.category) return -1
                if (left.category !== viewedPost.category && right.category === viewedPost.category) return 1
                return 0
              })
              .slice(0, 3)
          )
        } catch {
          setPost(normalizedPost)
          setRelatedPosts(normalizedRelated.filter((item) => item.slug !== slug).slice(0, 3))
        }
      } catch (error) {
        const posts = readBlogPosts()
        const found = findBlogPostBySlug(posts, slug)

        if (!found) {
          setPost(null)
          setRelatedPosts([])
          return
        }

        const incremented = incrementBlogPostViews(found.id) || found
        setPost(incremented)

        const related = getPublishedBlogPosts(readBlogPosts())
          .filter((item) => item.slug !== slug)
          .sort((left, right) => {
            if (left.category === incremented.category && right.category !== incremented.category) return -1
            if (left.category !== incremented.category && right.category === incremented.category) return 1
            return 0
          })
          .slice(0, 3)

        setRelatedPosts(related)
      }
    }

    loadPost()
  }, [slug])

  const readTime = useMemo(() => (
    post ? estimateBlogReadTime(post.content) : 1
  ), [post])

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 shadow-lg">
            <h1 className="text-2xl font-semibold text-slate-900">Yazı bulunamadı</h1>
            <p className="mt-3 text-slate-600">Bu içerik kaldırılmış olabilir veya bağlantı değişmiş olabilir.</p>
            <Button className="mt-6" onClick={() => router.push('/blog')}>
              Blog sayfasına dön
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-slate-950 pb-16 pt-16 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.20),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.18),_transparent_25%)]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-cyan-200 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Blog listesine dön
          </Link>

          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-end">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white/10 px-4 py-1 text-sm text-cyan-100 backdrop-blur">
                  {post.category}
                </span>
                {post.video_url && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/20 px-4 py-1 text-sm text-rose-100">
                    <PlayCircle className="h-4 w-4" />
                    Video içerik
                  </span>
                )}
                {post.status !== 'published' && (
                  <span className="rounded-full bg-amber-400/20 px-4 py-1 text-sm text-amber-100">
                    Yönetim önizlemesi
                  </span>
                )}
              </div>

              <h1 className="mt-6 text-4xl font-bold leading-tight md:text-6xl">{post.title}</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">{post.excerpt}</p>

              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-slate-300">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatBlogDate(post.published_at || post.created_at)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {post.author.full_name}
                </span>
                <span>{readTime} dk okuma</span>
                <span>{post.views} görüntülenme</span>
              </div>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-cyan-950/20">
              {post.featured_image ? (
                <img
                  src={post.featured_image}
                  alt={post.title}
                  className="aspect-[16/10] h-full w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-cyan-500 via-slate-900 to-emerald-500">
                  <PlayCircle className="h-16 w-16 text-white/80" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="-mt-8 pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 md:p-10">
              {post.video_url && (
                <div className="mb-8">
                  <BlogVideoEmbed url={post.video_url} title={post.video_title || post.title} />
                </div>
              )}

              {blogContentContainsHtml(post.content) ? (
                <div
                  className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-a:text-cyan-700"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              ) : (
                <PlainTextContent content={post.content} />
              )}
            </article>

            <aside className="space-y-6">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
                <h2 className="text-lg font-semibold text-slate-900">İçerik özeti</h2>
                <div className="mt-4 space-y-4 text-sm text-slate-600">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Kategori</div>
                    <div className="mt-1 font-medium text-slate-900">{post.category}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Etiketler</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {post.tags.length > 0 ? post.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                          #{tag}
                        </span>
                      )) : <span>Etiket girilmemiş</span>}
                    </div>
                  </div>
                </div>
              </div>

              {relatedPosts.length > 0 && (
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
                  <h2 className="text-lg font-semibold text-slate-900">Diğer yazılar</h2>
                  <div className="mt-4 space-y-4">
                    {relatedPosts.map((item) => (
                      <Link
                        key={item.id}
                        href={`/blog/${item.slug}`}
                        className="block rounded-2xl border border-slate-100 p-4 transition hover:border-cyan-200 hover:bg-cyan-50/40"
                      >
                        <div className="text-xs text-slate-500">{formatBlogDate(item.published_at || item.created_at)}</div>
                        <div className="mt-2 font-medium text-slate-900">{item.title}</div>
                        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.excerpt}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>
    </div>
  )
}
