'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FileText, Search, Filter, Clock, Eye, User, Tag } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface BlogPost {
  id: number
  title: string
  slug: string
  excerpt: string
  featured_image?: string
  author: {
    full_name: string
    avatar?: string
  }
  category: string
  tags: string[]
  views: number
  published_at: string
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    fetchPosts()
    fetchCategories()
  }, [selectedCategory])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const categoryParam = selectedCategory !== 'all' ? `&category=${selectedCategory}` : ''
      const response = await fetch(`http://localhost:8000/api/blog/posts?limit=20${categoryParam}`)

      if (response.ok) {
        const data = await response.json()
        setPosts(data)
      } else {
        console.error('Blog yazıları yüklenemedi')
        // Fallback mock data
        setPosts([
          {
            id: 1,
            title: "2024 Web Geliştirme Trendleri",
            slug: "2024-web-gelistirme-trendleri",
            excerpt: "Bu yıl web geliştirme dünyasında öne çıkan teknolojiler ve trendler hakkında bilmeniz gerekenler.",
            category: "Web Geliştirme",
            author: { full_name: "Ahmet Yılmaz" },
            tags: ["React", "Next.js", "Web"],
            views: 1250,
            published_at: "2024-01-15T10:00:00Z"
          }
        ])
      }
    } catch (error) {
      console.error('Hata:', error)
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/blog/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Kategoriler yüklenemedi:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5Q0EzQUYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6">
            <FileText className="w-4 h-4 text-yellow-400 mr-2" />
            <span className="text-sm text-white/90 font-medium">Blog & Makaleler</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Bilgi
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent block md:inline"> Merkezi</span>
          </h1>

          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Teknoloji, öğrenme ipuçları ve kariyer tavsiyeleri ile ilgili en güncel içerikler
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-12">
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Search */}
              <div className="md:col-span-8 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Yazı ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Category Filter */}
              <div className="md:col-span-4">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="all">Tüm Kategoriler</option>
                  {categories.map((cat) => (
                    <option key={cat.category} value={cat.category}>
                      {cat.category} ({cat.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Blog Posts Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-96 bg-white/50 rounded-3xl animate-pulse"></div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Yazı bulunamadı</h3>
            <p className="text-gray-600">Arama kriterlerinize uygun blog yazısı bulunamadı.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post, index) => (
              <Card
                key={post.id}
                className="group bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 overflow-hidden rounded-3xl"
              >
                {/* Featured Image */}
                <div className="relative aspect-video overflow-hidden">
                  {post.featured_image ? (
                    <img
                      src={post.featured_image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${
                      index % 4 === 0 ? 'bg-gradient-to-br from-blue-500 to-purple-600' :
                      index % 4 === 1 ? 'bg-gradient-to-br from-purple-500 to-pink-600' :
                      index % 4 === 2 ? 'bg-gradient-to-br from-green-500 to-blue-600' :
                      'bg-gradient-to-br from-orange-500 to-red-600'
                    } group-hover:scale-110 transition-transform duration-500`}>
                      <FileText className="w-12 h-12 text-white" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>

                  {/* Category Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-sm text-gray-900 px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                      {post.category}
                    </span>
                  </div>

                  {/* Views */}
                  {post.views > 0 && (
                    <div className="absolute bottom-4 right-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-black/50 text-white backdrop-blur-sm">
                        <Eye className="w-3 h-3 mr-1" />
                        {post.views.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <CardContent className="p-6 space-y-4">
                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors duration-300">
                    {post.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">
                    {post.excerpt}
                  </p>

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {post.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                          {tag}
                        </span>
                      ))}
                      {post.tags.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                          +{post.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Author & Date */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-medium">
                          {post.author.full_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{post.author.full_name}</div>
                        <div className="text-xs text-gray-500">{formatDate(post.published_at)}</div>
                      </div>
                    </div>

                    <Link href={`/blog/${post.slug}`}>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl px-4 shadow-lg hover:shadow-blue-500/25 transition-all duration-300"
                      >
                        Oku
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
