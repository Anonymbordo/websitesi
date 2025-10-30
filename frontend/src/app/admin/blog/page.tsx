'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  FileText, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2,
  Plus,
  Calendar,
  User,
  Tag,
  TrendingUp,
  Clock,
  Image as ImageIcon,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/store'

interface BlogPost {
  id: number
  title: string
  excerpt: string
  content: string
  slug: string
  featured_image?: string
  author: {
    full_name: string
    avatar?: string
  }
  category: string
  tags: string[]
  status: 'draft' | 'published' | 'scheduled'
  is_featured: boolean
  views: number
  created_at: string
  published_at?: string
  scheduled_at?: string
}

export default function BlogManagement() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'editor')) {
      router.push('/')
      return
    }

    fetchPosts()
  }, [isAuthenticated, user, router, currentPage, searchTerm, filterCategory, filterStatus])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      
      // Mock blog posts data
      const mockPosts: BlogPost[] = [
        {
          id: 1,
          title: '2024 Web Geliştirme Trendleri',
          excerpt: 'Bu yıl web geliştirme dünyasında öne çıkan teknolojiler ve trendler',
          content: 'Blog içeriği buraya gelecek...',
          slug: '2024-web-gelistirme-trendleri',
          featured_image: '/api/placeholder/800/400',
          author: {
            full_name: 'Ahmet Yılmaz',
            avatar: '/api/placeholder/40/40'
          },
          category: 'Web Geliştirme',
          tags: ['React', 'Next.js', 'TypeScript', 'Web Trends'],
          status: 'published',
          is_featured: true,
          views: 2847,
          created_at: '2024-01-15T10:30:00Z',
          published_at: '2024-01-16T08:00:00Z'
        },
        {
          id: 2,
          title: 'Python ile Veri Analizi Başlangıç Rehberi',
          excerpt: 'Python kullanarak veri analizi yapmaya başlamak isteyenler için kapsamlı rehber',
          content: 'Blog içeriği buraya gelecek...',
          slug: 'python-veri-analizi-rehberi',
          featured_image: '/api/placeholder/800/400',
          author: {
            full_name: 'Zeynep Kaya',
            avatar: '/api/placeholder/40/40'
          },
          category: 'Veri Bilimi',
          tags: ['Python', 'Data Analysis', 'Pandas', 'NumPy'],
          status: 'published',
          is_featured: false,
          views: 1523,
          created_at: '2024-01-12T14:20:00Z',
          published_at: '2024-01-13T09:00:00Z'
        },
        {
          id: 3,
          title: 'UI/UX Tasarımda Kullanılabilirlik Prensipleri',
          excerpt: 'Kullanıcı deneyimini iyileştirmek için temel tasarım prensipleri',
          content: 'Blog içeriği buraya gelecek...',
          slug: 'ui-ux-kullanilabilirlik-prensipleri',
          author: {
            full_name: 'Fatma Şahin',
            avatar: '/api/placeholder/40/40'
          },
          category: 'Tasarım',
          tags: ['UI Design', 'UX Design', 'Usability', 'Design Principles'],
          status: 'draft',
          is_featured: false,
          views: 0,
          created_at: '2024-01-18T16:45:00Z'
        },
        {
          id: 4,
          title: 'Mobil Uygulama Geliştirmede Flutter vs React Native',
          excerpt: 'İki popüler cross-platform framework\'ün detaylı karşılaştırması',
          content: 'Blog içeriği buraya gelecek...',
          slug: 'flutter-vs-react-native',
          featured_image: '/api/placeholder/800/400',
          author: {
            full_name: 'Can Özkan',
            avatar: '/api/placeholder/40/40'
          },
          category: 'Mobil Geliştirme',
          tags: ['Flutter', 'React Native', 'Mobile Development', 'Cross-platform'],
          status: 'scheduled',
          is_featured: true,
          views: 0,
          created_at: '2024-01-20T11:30:00Z',
          scheduled_at: '2024-01-25T10:00:00Z'
        }
      ]

      setPosts(mockPosts)
      setTotalPages(1)
    } catch (error) {
      console.error('Blog yazıları yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (postId: number, newStatus: 'draft' | 'published') => {
    try {
      // API call to update post status
      setPosts(posts.map(post => 
        post.id === postId ? { ...post, status: newStatus } : post
      ))
    } catch (error) {
      console.error('Blog yazısı durumu güncellenirken hata:', error)
    }
  }

  const handleDelete = async (postId: number) => {
    if (window.confirm('Bu blog yazısını silmek istediğinizden emin misiniz?')) {
      try {
        // API call to delete post
        setPosts(posts.filter(post => post.id !== postId))
      } catch (error) {
        console.error('Blog yazısı silinirken hata:', error)
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published': return 'Yayında'
      case 'draft': return 'Taslak'
      case 'scheduled': return 'Planlandı'
      default: return status
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const publishedCount = posts.filter(p => p.status === 'published').length
  const draftCount = posts.filter(p => p.status === 'draft').length
  const scheduledCount = posts.filter(p => p.status === 'scheduled').length
  const totalViews = posts.reduce((sum, post) => sum + post.views, 0)

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'editor')) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-2">
                Blog Yönetimi
              </h1>
              <p className="text-xl text-gray-600">
                Blog yazılarını yönetin ve yeni içerikler oluşturun
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => router.push('/admin/blog/create')}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Yeni Yazı
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: 'Yayında',
              value: publishedCount,
              icon: CheckCircle,
              gradient: 'from-green-500 to-emerald-500',
              bgGradient: 'from-green-50 to-emerald-50'
            },
            {
              title: 'Taslak',
              value: draftCount,
              icon: Edit,
              gradient: 'from-yellow-500 to-orange-500',
              bgGradient: 'from-yellow-50 to-orange-50'
            },
            {
              title: 'Planlandı',
              value: scheduledCount,
              icon: Clock,
              gradient: 'from-blue-500 to-cyan-500',
              bgGradient: 'from-blue-50 to-cyan-50'
            },
            {
              title: 'Toplam Görüntülenme',
              value: totalViews.toLocaleString(),
              icon: TrendingUp,
              gradient: 'from-purple-500 to-pink-500',
              bgGradient: 'from-purple-50 to-pink-50'
            }
          ].map((stat, index) => (
            <Card 
              key={index}
              className="group relative overflow-hidden bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 cursor-pointer"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
              
              <CardContent className="relative p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 group-hover:scale-110 transition-transform duration-300">
                      {stat.value}
                    </p>
                  </div>
                  
                  <div className={`w-12 h-12 bg-gradient-to-r ${stat.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
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
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="all">Tüm Kategoriler</option>
                <option value="Web Geliştirme">Web Geliştirme</option>
                <option value="Veri Bilimi">Veri Bilimi</option>
                <option value="Tasarım">Tasarım</option>
                <option value="Mobil Geliştirme">Mobil Geliştirme</option>
                <option value="Kişisel Gelişim">Kişisel Gelişim</option>
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="published">Yayında</option>
                <option value="draft">Taslak</option>
                <option value="scheduled">Planlandı</option>
              </select>

              {/* Reset Button */}
              <Button 
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setFilterCategory('all')
                  setFilterStatus('all')
                }}
                className="rounded-xl border-gray-200 hover:bg-gray-50"
              >
                <Filter className="w-4 h-4 mr-2" />
                Temizle
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="h-80 bg-gray-100 rounded-3xl animate-pulse"></div>
            ))
          ) : (
            posts.map((post) => (
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
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-500/80 to-slate-600/80">
                      <FileText className="w-12 h-12 text-white" />
                    </div>
                  )}
                  
                  {/* Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                  
                  {/* Status Badge */}
                  <div className="absolute top-4 left-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(post.status)}`}>
                      {post.status === 'published' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {post.status === 'draft' && <Edit className="w-3 h-3 mr-1" />}
                      {post.status === 'scheduled' && <Clock className="w-3 h-3 mr-1" />}
                      {getStatusText(post.status)}
                    </span>
                  </div>

                  {/* Featured Badge */}
                  {post.is_featured && (
                    <div className="absolute top-4 right-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Öne Çıkan
                      </span>
                    </div>
                  )}

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
                  {/* Category & Tags */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <Tag className="w-3 h-3 mr-1" />
                      {post.category}
                    </span>
                    <div className="text-xs text-gray-500">
                      {formatDate(post.created_at)}
                    </div>
                  </div>

                  {/* Title & Excerpt */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors duration-300 mb-2">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {post.excerpt}
                    </p>
                  </div>

                  {/* Author */}
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        {post.author.full_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{post.author.full_name}</div>
                    </div>
                  </div>

                  {/* Tags */}
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {post.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
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

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" className="rounded-lg">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="rounded-lg"
                        onClick={() => router.push(`/admin/blog/edit/${post.id}`)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 border-red-200 hover:bg-red-50 rounded-lg"
                        onClick={() => handleDelete(post.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-center space-x-2">
                      {post.status === 'draft' && (
                        <Button 
                          size="sm"
                          onClick={() => handleStatusChange(post.id, 'published')}
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Yayınla
                        </Button>
                      )}
                      
                      {post.status === 'published' && (
                        <Button 
                          size="sm"
                          onClick={() => handleStatusChange(post.id, 'draft')}
                          className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Geri Al
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Publish/Schedule Info */}
                  {post.published_at && (
                    <div className="text-xs text-green-600">
                      Yayınlandı: {formatDate(post.published_at)}
                    </div>
                  )}
                  
                  {post.scheduled_at && (
                    <div className="text-xs text-blue-600">
                      Planlandı: {formatDate(post.scheduled_at)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center mt-12">
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="rounded-xl"
              >
                Önceki
              </Button>
              
              <span className="px-4 py-2 text-sm text-gray-600">
                Sayfa {currentPage} / {totalPages}
              </span>
              
              <Button 
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="rounded-xl"
              >
                Sonraki
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}