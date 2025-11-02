"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Globe, 
  Plus, 
  Search, 
  Edit,
  Trash2,
  Eye,
  Clock,
  User,
  Calendar,
  MoreVertical,
  Settings
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { pagesAPI } from '@/lib/api'
import toast from 'react-hot-toast'

interface Page {
  id: number
  title: string
  slug: string
  status: 'published' | 'draft'
  show_in_header: boolean
  blocks: any[]
  created_at: string
  updated_at: string
}

export default function PagesManagement() {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')

  useEffect(() => {
    fetchPages()
  }, [])

  const fetchPages = async () => {
    try {
      setLoading(true)
      console.log('🔄 API\'den sayfalar çekiliyor...')
      
      // API'den sayfaları çek
      const response = await pagesAPI.getPages()
      console.log('� API Response:', response)
      console.log('�📄 Backend\'den gelen sayfalar:', response.data)
      
      const pagesData = response.data || []
      console.log('✅ Toplam sayfa sayısı:', pagesData.length)
      
      // Statik sayfaları ekle
      const builtInPages: Page[] = [
        { id: -1, title: '🏠 Ana Sayfa', slug: '/', status: 'published', show_in_header: true, blocks: [], created_at: '2024-01-01T00:00:00', updated_at: new Date().toISOString() },
        { id: -2, title: '📚 Kurslar', slug: 'courses', status: 'published', show_in_header: true, blocks: [], created_at: '2024-01-01T00:00:00', updated_at: new Date().toISOString() },
        { id: -3, title: '👨‍🏫 Eğitmenler', slug: 'instructors', status: 'published', show_in_header: true, blocks: [], created_at: '2024-01-01T00:00:00', updated_at: new Date().toISOString() },
        { id: -4, title: 'ℹ️ Hakkımızda', slug: 'about', status: 'published', show_in_header: true, blocks: [], created_at: '2024-01-01T00:00:00', updated_at: new Date().toISOString() },
        { id: -5, title: '📧 İletişim', slug: 'contact', status: 'published', show_in_header: true, blocks: [], created_at: '2024-01-01T00:00:00', updated_at: new Date().toISOString() }
      ]
      
      const allPages = [...builtInPages, ...pagesData]
      setPages(allPages)
      
      if (pagesData.length === 0) {
        console.log('⚠️ Hiç sayfa bulunamadı. Yeni sayfa oluşturun.')
      }
    } catch (error: any) {
      console.error('❌ Sayfalar yüklenirken hata:', error)
      console.error('❌ Hata detayı:', error.response?.data)
      console.error('❌ Hata mesajı:', error.message)
      toast.error('Sayfalar yüklenemedi: ' + (error.response?.data?.detail || error.message))
      setPages([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'private': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published': return 'Yayında'
      case 'draft': return 'Taslak'
      case 'private': return 'Özel'
      default: return status
    }
  }

  const filteredPages = pages.filter(page => {
    const matchesSearch = page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         page.slug.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || page.status === selectedStatus
    
    return matchesSearch && matchesStatus
  })

  const handleDeletePage = async (page: Page) => {
    // Built-in sayfaları silme
    if (page.id < 0) {
      toast.error('Bu sayfa sistem sayfasıdır, silinemez!')
      return
    }
    
    if (!confirm(`"${page.title}" sayfasını silmek istediğinizden emin misiniz?`)) return
    
    try {
      await pagesAPI.deletePage(page.slug)
      toast.success('Sayfa silindi')
      fetchPages() // Listeyi yeniden yükle
    } catch (error: any) {
      console.error('Sayfa silinirken hata:', error)
      toast.error(error.response?.data?.detail || 'Sayfa silinemedi')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sayfa Yönetimi</h1>
          <p className="text-gray-600 mt-2">Site sayfalarınızı oluşturun ve yönetin</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Link href="/admin/pages/create">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Yeni Sayfa
            </Button>
          </Link>
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Sayfa Ayarları
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Sayfa</p>
                <p className="text-2xl font-bold text-gray-900">{pages.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Globe className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Yayında</p>
                <p className="text-2xl font-bold text-gray-900">
                  {pages.filter(p => p.status === 'published').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taslak</p>
                <p className="text-2xl font-bold text-gray-900">
                  {pages.filter(p => p.status === 'draft').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Görüntüleme</p>
                <p className="text-2xl font-bold text-gray-900">
                  {pages.length * 1234} {/* Mock views */}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Sayfa ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="published">Yayında</option>
                <option value="draft">Taslak</option>
                <option value="private">Özel</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pages List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Sayfalar ({filteredPages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPages.map((page) => (
              <div key={`${(page.slug ?? page.id).toString()}-${page.id}`} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {page.title}
                      </h3>
                      {page.show_in_header && (
                        <Badge className="bg-purple-100 text-purple-800">Menüde</Badge>
                      )}
                      <Badge className={getStatusColor(page.status)}>
                        {getStatusText(page.status)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Globe className="w-4 h-4 mr-1" />
                        /{page.slug}
                      </span>
                      <span className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        {page.blocks.length} blok
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(page.updated_at).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Link 
                    href={page.id < 0 ? page.slug : `/${page.slug.toString().replace(/^\//,'')}`} 
                    target="_blank"
                  >
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                  
                  <Link href={`/admin/pages/${page.id}/edit`}>
                    <Button variant="outline" size="sm" disabled={page.id < 0}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>
                  
                  {page.id >= 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeletePage(page)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  
                  <Button variant="outline" size="sm" disabled={page.id < 0}>
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredPages.length === 0 && (
            <div className="text-center py-12">
              <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Sayfa bulunamadı</h3>
              <p className="text-gray-600 mb-6">Arama kriterlerinizi değiştirin veya yeni bir sayfa oluşturun.</p>
              <Link href="/admin/pages/create">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Yeni Sayfa Oluştur
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
