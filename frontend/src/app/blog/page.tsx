'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Calendar, PlayCircle, Sparkles } from 'lucide-react'
import { blogAPI } from '@/lib/api'
import {
  BlogPost,
  estimateBlogReadTime,
  formatBlogDate,
  getPublishedBlogPosts,
  normalizeBlogPosts,
  readBlogPosts,
} from '@/lib/blog'

export default function BlogListPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const response = await blogAPI.listPosts({ status: 'published' })
        setPosts(normalizeBlogPosts(response.data))
      } catch (error) {
        setPosts(getPublishedBlogPosts(readBlogPosts()))
      }
    }

    loadPosts()
  }, [])

  const orderedPosts = useMemo(() => {
    return [...posts].sort((left, right) => {
      if (left.is_featured === right.is_featured) return 0
      return left.is_featured ? -1 : 1
    })
  }, [posts])

  const heroPost = orderedPosts[0] || null
  const topStories = heroPost ? orderedPosts.slice(1, 3) : []
  const remainingPosts = heroPost ? orderedPosts.slice(3) : []

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-50">
      <section className="relative overflow-hidden pb-16 pt-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.20),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.18),_transparent_28%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1 text-sm font-medium text-cyan-200">
              Marka Hikayeleri ve Etkinlikler
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-white md:text-6xl">
              Blog ve
              <span className="block bg-gradient-to-r from-cyan-300 via-white to-emerald-300 bg-clip-text text-transparent">
                video içerikleri
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              Sponsorluk hikayeleri, etkinlik videoları ve markaya değer katan tüm içerikler burada tek akışta gösterilir.
            </p>
          </div>

          {heroPost ? (
            <div className="mt-12 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
              <Link
                href={`/blog/${heroPost.slug}`}
                className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-cyan-950/20 backdrop-blur"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  {heroPost.featured_image ? (
                    <img
                      src={heroPost.featured_image}
                      alt={heroPost.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-slate-900 to-emerald-500" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                  <div className="absolute left-6 top-6 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-900">
                      {heroPost.category}
                    </span>
                    {heroPost.video_url && (
                      <span className="rounded-full bg-rose-500/90 px-3 py-1 text-xs font-medium text-white">
                        Video içerik
                      </span>
                    )}
                    {heroPost.is_featured && (
                      <span className="rounded-full bg-cyan-500/90 px-3 py-1 text-xs font-medium text-white">
                        Öne çıkan
                      </span>
                    )}
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                    <h2 className="max-w-3xl text-3xl font-semibold leading-tight text-white md:text-4xl">
                      {heroPost.title}
                    </h2>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
                      {heroPost.excerpt}
                    </p>
                    <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-slate-200">
                      <span className="inline-flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatBlogDate(heroPost.published_at || heroPost.created_at)}
                      </span>
                      <span>{estimateBlogReadTime(heroPost.content)} dk okuma</span>
                    </div>
                  </div>
                </div>
              </Link>

              <div className="grid gap-6">
                {topStories.map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="group rounded-[2rem] border border-white/10 bg-white/5 p-5 text-white shadow-xl shadow-slate-950/20 backdrop-blur transition hover:-translate-y-1"
                  >
                    <div className="mb-4 overflow-hidden rounded-[1.5rem]">
                      {post.featured_image ? (
                        <img
                          src={post.featured_image}
                          alt={post.title}
                          className="h-44 w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-44 items-center justify-center bg-gradient-to-br from-slate-800 to-cyan-800">
                          <Sparkles className="h-10 w-10 text-cyan-200" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-cyan-200">
                      <span>{post.category}</span>
                      {post.video_url && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-white/90">
                          <PlayCircle className="h-3 w-3" />
                          Video
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 text-xl font-semibold leading-tight">{post.title}</h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-300">{post.excerpt}</p>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-12 rounded-[2rem] border border-white/10 bg-white/5 px-6 py-16 text-center text-slate-300 backdrop-blur">
              Henüz yayınlanmış blog yazısı yok.
            </div>
          )}
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Tüm yazılar</h2>
              <p className="mt-2 text-slate-600">Anasayfada öne çıkan içerikler dahil tüm yayınlar.</p>
            </div>
            <div className="text-sm text-slate-500">{orderedPosts.length} yayın</div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {(heroPost ? [heroPost, ...topStories, ...remainingPosts] : orderedPosts).map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-lg shadow-slate-200/60 transition hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  {post.featured_image ? (
                    <img
                      src={post.featured_image}
                      alt={post.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-cyan-700 to-emerald-500" />
                  )}
                  <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-900">
                      {post.category}
                    </span>
                    {post.video_url && (
                      <span className="rounded-full bg-rose-500/90 px-3 py-1 text-xs font-medium text-white">
                        Video
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4 p-6">
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>{formatBlogDate(post.published_at || post.created_at)}</span>
                    <span>{estimateBlogReadTime(post.content)} dk</span>
                  </div>
                  <h3 className="text-xl font-semibold leading-tight text-slate-900">{post.title}</h3>
                  <p className="line-clamp-3 text-sm leading-6 text-slate-600">{post.excerpt}</p>
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-cyan-700">
                    Devamını oku
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
