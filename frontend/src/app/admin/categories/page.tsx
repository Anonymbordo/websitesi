'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Tag, 
  Plus, 
  Search, 
  Edit,
  Trash2,
  MoreVertical,
  BookOpen,
  MessageSquare,
  Users,
  TrendingUp,
  Hash
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Category {
  id: number
  name: string
  slug: string
  description: string
  type: 'course' | 'blog' | 'general'
  color: string
  itemCount: number
  isActive: boolean
  parentId?: number
  children?: Category[]
  createdAt: string
  updatedAt: string
}

export default function CategoriesManagement() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    type: 'course' as 'course' | 'blog' | 'general',
    color: '#3B82F6',
    parentId: null as number | null
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      
      // Mock data
      const mockCategories: Category[] = [
        {
          id: 1,
          name: 'Web Geliştirme',
          slug: 'web-gelistirme',
          description: 'Web teknolojileri ve framework\'ler',
          type: 'course',
          color: '#3B82F6',
          itemCount: 45,
          isActive: true,
          createdAt: '2024-01-15',
          updatedAt: '2024-10-30',
          children: [
            {
              id: 11,
              name: 'Frontend',
              slug: 'frontend',
              description: 'React, Vue, Angular',
              type: 'course',
              color: '#10B981',
              itemCount: 25,
              isActive: true,
              parentId: 1,
              createdAt: '2024-01-15',
              updatedAt: '2024-10-29'
            },
            {
              id: 12,
              name: 'Backend',
              slug: 'backend',
              description: 'Node.js, Python, PHP',
              type: 'course',
              color: '#8B5CF6',
              itemCount: 20,
              isActive: true,
              parentId: 1,
              createdAt: '2024-01-15',
              updatedAt: '2024-10-28'
            }
          ]
        },
        {
          id: 2,
          name: 'Mobil Geliştirme',
          slug: 'mobil-gelistirme',
          description: 'iOS ve Android uygulama geliştirme',
          type: 'course',
          color: '#F59E0B',
          itemCount: 28,
          isActive: true,
          createdAt: '2024-01-20',
          updatedAt: '2024-10-25'
        },
        {
          id: 3,
          name: 'Veri Bilimi',
          slug: 'veri-bilimi',
          description: 'Data Science, Machine Learning, AI',
          type: 'course',
          color: '#EF4444',
          itemCount: 32,
          isActive: true,
          createdAt: '2024-02-01',
          updatedAt: '2024-10-20'
        },
        {
          id: 4,
          name: 'Tasarım',
          slug: 'tasarim',
          description: 'UI/UX, Grafik Tasarım',
          type: 'course',
          color: '#EC4899',
          itemCount: 18,
          isActive: true,
          createdAt: '2024-02-10',
          updatedAt: '2024-10-15'
        },
        {
          id: 5,
          name: 'Teknoloji Haberleri',
          slug: 'teknoloji-haberleri',
          description: 'Güncel teknoloji haberleri ve trendler',
          type: 'blog',
          color: '#06B6D4',
          itemCount: 67,
          isActive: true,
          createdAt: '2024-03-01',
          updatedAt: '2024-10-30'
        },
        {
          id: 6,
          name: 'Eğitim İpuçları',
          slug: 'egitim-ipuclari',
          description: 'Öğrenme stratejileri ve ipuçları',
          type: 'blog',
          color: '#84CC16',
          itemCount: 34,
          isActive: true,
          createdAt: '2024-03-15',
          updatedAt: '2024-10-28'
        },
        {
          id: 7,
          name: 'Kariyer',
          slug: 'kariyer',
          description: 'Kariyer geliştirme ve iş fırsatları',
          type: 'blog',
          color: '#F97316',
          itemCount: 23,
          isActive: true,
          createdAt: '2024-04-01',
          updatedAt: '2024-10-25'
        }
      ]

      setCategories(mockCategories)
    } catch (error) {
      console.error('Kategoriler yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'course': return BookOpen
      case 'blog': return MessageSquare
      case 'general': return Tag
      default: return Tag
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'course': return 'Kurs'
      case 'blog': return 'Blog'
      case 'general': return 'Genel'
      default: return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'course': return 'bg-blue-100 text-blue-800'
      case 'blog': return 'bg-green-100 text-green-800'
      case 'general': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) return

    const category: Category = {
      id: Date.now(),
      name: newCategory.name,
      slug: newCategory.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      description: newCategory.description,
      type: newCategory.type,
      color: newCategory.color,
      itemCount: 0,
      isActive: true,
      parentId: newCategory.parentId || undefined,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    }

    setCategories([...categories, category])
    setNewCategory({
      name: '',
      description: '',
      type: 'course',
      color: '#3B82F6',
      parentId: null
    })
    setShowCreateForm(false)
  }

  const handleDeleteCategory = (categoryId: number) => {
    if (confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) {
      setCategories(categories.filter(cat => cat.id !== categoryId))
    }
  }

  const flattenCategories = (cats: Category[]): Category[] => {
    let result: Category[] = []
    cats.forEach(cat => {
      result.push(cat)
      if (cat.children) {
        result = result.concat(flattenCategories(cat.children))
      }
    })
    return result
  }

  const filteredCategories = flattenCategories(categories).filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType === 'all' || category.type === selectedType
    
    return matchesSearch && matchesType
  })

  const courseCategories = categories.filter(cat => cat.type === 'course')
  const blogCategories = categories.filter(cat => cat.type === 'blog')
  const totalItems = categories.reduce((sum, cat) => sum + cat.itemCount, 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Kategori Yönetimi</h1>
          <p className="text-gray-600 mt-2">Kurs ve blog kategorilerini organize edin</p>
        </div>
        
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Yeni Kategori
        </Button>
      </div>

      {/* Quick Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Yeni Kategori Oluştur</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori Adı *
                </label>
                <Input
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                  placeholder="Kategori adı"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tür *
                </label>
                <select
                  value={newCategory.type}
                  onChange={(e) => setNewCategory({...newCategory, type: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="course">Kurs</option>
                  <option value="blog">Blog</option>
                  <option value="general">Genel</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Açıklama
              </label>
              <Input
                value={newCategory.description}
                onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                placeholder="Kategori açıklaması"
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Renk
                </label>
                <input
                  type="color"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
              </div>
              
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Üst Kategori
                </label>
                <select
                  value={newCategory.parentId || ''}
                  onChange={(e) => setNewCategory({...newCategory, parentId: e.target.value ? Number(e.target.value) : null})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Ana kategori</option>
                  {categories.filter(cat => !cat.parentId).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button onClick={handleCreateCategory}>
                Kategori Oluştur
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                İptal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Kategori</p>
                <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Tag className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Kurs Kategorileri</p>
                <p className="text-2xl font-bold text-gray-900">{courseCategories.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Blog Kategorileri</p>
                <p className="text-2xl font-bold text-gray-900">{blogCategories.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam İçerik</p>
                <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
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
                  placeholder="Kategori ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tüm Türler</option>
                <option value="course">Kurs</option>
                <option value="blog">Blog</option>
                <option value="general">Genel</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Kategoriler ({filteredCategories.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCategories.map((category) => {
              const IconComponent = getTypeIcon(category.type)
              return (
                <div key={category.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4 flex-1">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: category.color + '20' }}
                    >
                      <IconComponent 
                        className="w-6 h-6" 
                        style={{ color: category.color }}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {category.parentId && <Hash className="w-4 h-4 inline mr-1 text-gray-400" />}
                          {category.name}
                        </h3>
                        <Badge className={getTypeColor(category.type)}>
                          {getTypeText(category.type)}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {category.itemCount} öğe
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                      <p className="text-xs text-gray-500">
                        Oluşturulma: {new Date(category.createdAt).toLocaleDateString('tr-TR')} | 
                        Güncelleme: {new Date(category.updatedAt).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeleteCategory(category.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    
                    <Button variant="outline" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredCategories.length === 0 && (
            <div className="text-center py-12">
              <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Kategori bulunamadı</h3>
              <p className="text-gray-600 mb-6">Arama kriterlerinizi değiştirin veya yeni bir kategori oluşturun.</p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Yeni Kategori Oluştur
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}