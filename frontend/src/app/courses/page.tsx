'use client'

import { useState, useEffect } from 'react'
import { 
  BookOpen, 
  Search, 
  Filter, 
  Star, 
  Users, 
  Clock,
  Award,
  TrendingUp,
  PlayCircle,
  Grid,
  List,
  MapPin,
  Map
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { coursesAPI, api } from '@/lib/api'
import { formatPrice, getImageUrl } from '@/lib/utils'
import Link from 'next/link'
import citiesData from '@/data/cities.json'
import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues with Google Maps
const CourseMap = dynamic(() => import('@/components/maps/CourseMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] bg-gray-100 rounded-xl flex items-center justify-center">
      <div className="text-center">
        <Map className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse" />
        <p className="text-gray-600">Harita yükleniyor...</p>
      </div>
    </div>
  )
})

interface Course {
  id: number
  title: string
  short_description: string
  price: number
  discount_price?: number
  rating: number
  total_ratings: number
  level: string
  category: string
  city?: string
  district?: string
  location?: string
  thumbnail?: string
  instructor: {
    name: string
  }
  total_students: number
  duration: string
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [selectedCity, setSelectedCity] = useState('all')
  const [selectedDistrict, setSelectedDistrict] = useState('all')
  const [sortBy, setSortBy] = useState('popular')
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid')
  const [categories, setCategories] = useState<string[]>([])

  const cities = citiesData.cities
  const selectedCityData = cities.find(c => c.name === selectedCity)
  const districts = selectedCityData?.districts || []

  const levels = [
    { value: 'beginner', label: 'Başlangıç' },
    { value: 'intermediate', label: 'Orta' },
    { value: 'advanced', label: 'İleri' }
  ]

  const [courseBoxes, setCourseBoxes] = useState<any[]>([])

  useEffect(() => {
    fetchCourses()
    fetchCategories()
    fetchCourseBoxes()
  }, [])

  const fetchCourseBoxes = async () => {
    try {
      const response = await api.get('/api/course-boxes?is_active=true')
      setCourseBoxes(response.data)
    } catch (error) {
      console.error('Error fetching course boxes:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await coursesAPI.getCategories()
      setCategories(response.data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      // Fallback kategoriler
      setCategories([
        'İlkokul',
        'Ortaokul',
        'Lise',
        'Kişisel Gelişim',
        'Programlama',
        'Web Geliştirme', 
        'Mobil Geliştirme',
        'Veri Bilimi',
        'Yapay Zeka',
        'Tasarım',
        'Pazarlama',
        'İş Geliştirme'
      ])
    }
  }

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const response = await coursesAPI.getCourses()
      
      // Mock data if API fails
      const mockCourses: Course[] = [
        {
          id: 1,
          title: "React ile Modern Web Geliştirme",
          short_description: "Sıfırdan ileri seviyeye React öğrenin ve modern web uygulamaları geliştirin",
          price: 299,
          discount_price: 199,
          rating: 4.8,
          total_ratings: 324,
          level: 'intermediate',
          category: 'Web Geliştirme',
          instructor: { name: "Ahmet Yılmaz" },
          total_students: 1250,
          duration: "12 saat"
        },
        {
          id: 2,
          title: "Python ile Veri Bilimi",
          short_description: "Python kullanarak veri analizi, machine learning ve yapay zeka öğrenin",
          price: 399,
          discount_price: 299,
          rating: 4.9,
          total_ratings: 156,
          level: 'advanced',
          category: 'Veri Bilimi',
          instructor: { name: "Zeynep Kaya" },
          total_students: 890,
          duration: "18 saat"
        },
        {
          id: 3,
          title: "JavaScript Temelleri",
          short_description: "Web geliştirmenin temel taşı JavaScript'i sıfırdan öğrenin",
          price: 199,
          rating: 4.7,
          total_ratings: 89,
          level: 'beginner',
          category: 'Programlama',
          instructor: { name: "Mehmet Özkan" },
          total_students: 650,
          duration: "8 saat"
        },
        {
          id: 4,
          title: "UI/UX Tasarım Prensipleri",
          short_description: "Kullanıcı deneyimi ve arayüz tasarımının temellerini öğrenin",
          price: 349,
          discount_price: 249,
          rating: 4.6,
          total_ratings: 67,
          level: 'intermediate',
          category: 'Tasarım',
          instructor: { name: "Selin Demir" },
          total_students: 420,
          duration: "14 saat"
        },
        {
          id: 5,
          title: "Node.js ve Express",
          short_description: "Backend geliştirme için Node.js ve Express framework'ünü öğrenin",
          price: 279,
          rating: 4.5,
          total_ratings: 112,
          level: 'intermediate',
          category: 'Web Geliştirme',
          instructor: { name: "Can Yıldız" },
          total_students: 380,
          duration: "16 saat"
        },
        {
          id: 6,
          title: "Digital Marketing Stratejileri",
          short_description: "Dijital pazarlama dünyasında başarılı olmak için gerekli tüm stratejiler",
          price: 199,
          discount_price: 149,
          rating: 4.4,
          total_ratings: 234,
          level: 'beginner',
          category: 'Pazarlama',
          instructor: { name: "Ayşe Koç" },
          total_students: 520,
          duration: "10 saat"
        }
      ]

      setCourses(response.data || mockCourses)
    } catch (error) {
      console.error('Kurslar yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const getLevelText = (level: string) => {
    const levelObj = levels.find(l => l.value === level)
    return levelObj ? levelObj.label : level
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.short_description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory
    const matchesLevel = selectedLevel === 'all' || course.level === selectedLevel
    const matchesCity = selectedCity === 'all' || course.city === selectedCity
    const matchesDistrict = selectedDistrict === 'all' || course.district === selectedDistrict
    
    return matchesSearch && matchesCategory && matchesLevel && matchesCity && matchesDistrict
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-6">
            Tüm Kurslar
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Uzman eğitmenlerimizden öğrenerek kariyerinizi ileriye taşıyın
          </p>
        </div>

        {/* Quick Categories - Dynamic from Database */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {courseBoxes.length > 0 ? (
            courseBoxes.map((box) => {
              // Detect browser language
              const browserLang = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'tr'
              const title = browserLang === 'ar' && box.title_ar ? box.title_ar : 
                            browserLang === 'en' && box.title_en ? box.title_en : 
                            box.title_tr
              
              return (
                <div 
                  key={box.id}
                  onClick={() => setSelectedCategory(box.category)}
                  className="cursor-pointer relative overflow-hidden rounded-3xl p-6 text-white shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 group"
                  style={{
                    background: `linear-gradient(135deg, ${box.color_from} 0%, ${box.color_to} 100%)`
                  }}
                >
                  <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold mb-1">{title}</h3>
                    <p className="text-white/90 text-sm font-medium">Kategoriye göz atın</p>
                  </div>
                </div>
              )
            })
          ) : (
            // Fallback boxes while loading
            [
              { title: 'İlkokul', icon: '🎒', color: 'from-orange-400 to-red-500', desc: 'Temel eğitim dersleri', route: '/courses/ilkokul' },
              { title: 'Ortaokul', icon: '📚', color: 'from-blue-400 to-indigo-500', desc: 'LGS hazırlık ve takviye', route: '/courses/ortaokul' },
              { title: 'Lise', icon: '🎓', color: 'from-purple-400 to-pink-500', desc: 'YKS hazırlık ve okul dersleri', route: '/courses/lise' },
              { title: 'Kişisel Gelişim', icon: '🌱', color: 'from-green-400 to-emerald-500', desc: 'Kendinizi geliştirin', route: null }
            ].map((item) => (
              <Link 
                key={item.title}
                href={item.route || '#'}
                onClick={(e) => {
                  if (!item.route) {
                    e.preventDefault()
                    setSelectedCategory(item.title)
                  }
                }}
                className={`cursor-pointer relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br ${item.color} text-white shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 group block`}
              >
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-1">{item.title}</h3>
                  <p className="text-white/90 text-sm font-medium">{item.desc}</p>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Filters */}
        <Card className="mb-12 bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-6">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Kurs ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500/20 text-lg"
                />
              </div>

              {/* Category */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-12 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-700"
              >
                <option value="all">Tüm Kategoriler</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              {/* Level */}
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="h-12 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-700"
              >
                <option value="all">Tüm Seviyeler</option>
                {levels.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>

              {/* City Filter */}
              <select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value)
                  setSelectedDistrict('all') // Reset district when city changes
                }}
                className="h-12 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-700"
              >
                <option value="all">Tüm İller</option>
                {cities.map(city => (
                  <option key={city.id} value={city.name}>{city.name}</option>
                ))}
              </select>

              {/* District Filter */}
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                disabled={selectedCity === 'all'}
                className="h-12 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
              >
                <option value="all">
                  {selectedCity === 'all' ? 'Önce İl Seçin' : 'Tüm İlçeler'}
                </option>
                {districts.map((district, index) => (
                  <option key={index} value={district}>{district}</option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-12 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-700"
              >
                <option value="popular">Popüler</option>
                <option value="rating">En Yüksek Puan</option>
                <option value="price_low">Fiyat (Düşük)</option>
                <option value="price_high">Fiyat (Yüksek)</option>
                <option value="newest">En Yeni</option>
              </select>
            </div>

            {/* Active Filters */}
            {(selectedCategory !== 'all' || selectedLevel !== 'all' || selectedCity !== 'all' || selectedDistrict !== 'all' || searchTerm) && (
              <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-gray-200">
                <span className="text-sm text-gray-600 font-medium">Aktif Filtreler:</span>
                {searchTerm && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    <Search className="w-3 h-3" />
                    {searchTerm}
                    <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-blue-900">×</button>
                  </span>
                )}
                {selectedCategory !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    <Filter className="w-3 h-3" />
                    {selectedCategory}
                    <button onClick={() => setSelectedCategory('all')} className="ml-1 hover:text-purple-900">×</button>
                  </span>
                )}
                {selectedLevel !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    <TrendingUp className="w-3 h-3" />
                    {getLevelText(selectedLevel)}
                    <button onClick={() => setSelectedLevel('all')} className="ml-1 hover:text-green-900">×</button>
                  </span>
                )}
                {selectedCity !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                    <MapPin className="w-3 h-3" />
                    {selectedCity}
                    <button onClick={() => { setSelectedCity('all'); setSelectedDistrict('all'); }} className="ml-1 hover:text-orange-900">×</button>
                  </span>
                )}
                {selectedDistrict !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                    <MapPin className="w-3 h-3" />
                    {selectedDistrict}
                    <button onClick={() => setSelectedDistrict('all')} className="ml-1 hover:text-orange-900">×</button>
                  </span>
                )}
                <button 
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedCategory('all')
                    setSelectedLevel('all')
                    setSelectedCity('all')
                    setSelectedDistrict('all')
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Tümünü Temizle
                </button>
              </div>
            )}

            {/* View Mode & Results */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
              <div className="text-gray-600">
                <span className="font-medium">{filteredCourses.length}</span> kurs bulundu
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-lg"
                  title="Grid Görünümü"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-lg"
                  title="Liste Görünümü"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'map' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('map')}
                  className="rounded-lg"
                  title="Harita Görünümü"
                >
                  <Map className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map View */}
        {viewMode === 'map' && (
          <div className="mb-12">
            <CourseMap courses={filteredCourses as any} />
          </div>
        )}

        {/* Courses Grid/List */}
        {viewMode !== 'map' && (
          <div className={`grid gap-8 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="h-96 bg-gray-100 rounded-3xl animate-pulse"></div>
              ))
            ) : (
              filteredCourses.map((course, index) => (
              <Card 
                key={course.id}
                className="group bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 overflow-hidden rounded-3xl"
              >
                {/* Course Image */}
                <div className="relative aspect-video overflow-hidden">
                  {course.thumbnail ? (
                    <img 
                      src={getImageUrl(course.thumbnail) || ''} 
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${
                      index % 4 === 0 ? 'bg-gradient-to-br from-blue-500 to-purple-600' :
                      index % 4 === 1 ? 'bg-gradient-to-br from-purple-500 to-pink-600' :
                      index % 4 === 2 ? 'bg-gradient-to-br from-green-500 to-blue-600' :
                      'bg-gradient-to-br from-orange-500 to-red-600'
                    } group-hover:scale-110 transition-transform duration-500`}>
                      <BookOpen className="w-16 h-16 text-white" />
                    </div>
                  )}
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                  
                  {/* Level Badge */}
                  <div className="absolute top-4 left-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getLevelColor(course.level)}`}>
                      {getLevelText(course.level)}
                    </span>
                  </div>

                  {/* Discount Badge */}
                  {course.discount_price && (
                    <div className="absolute top-4 right-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        %{Math.round((1 - course.discount_price / course.price) * 100)} indirim
                      </span>
                    </div>
                  )}

                  {/* Play Button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                      <PlayCircle className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>

                <CardContent className="p-6 space-y-4">
                  {/* Category */}
                  <div className="text-sm text-blue-600 font-medium">
                    {course.category}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors duration-300 mb-2">
                      {course.title}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {course.short_description}
                    </p>
                  </div>

                  {/* Instructor */}
                  <div className="text-sm text-gray-600">
                    Eğitmen: <span className="font-medium text-gray-900">{course.instructor.name}</span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 mr-1 fill-current" />
                        <span className="font-medium">{course.rating}</span>
                        <span className="text-gray-500 ml-1">({course.total_ratings})</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-gray-400 mr-1" />
                        <span>{(course.total_students || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-gray-400 mr-1" />
                        <span>{course.duration}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price & CTA */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div>
                      {course.discount_price ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-bold text-green-600">
                            {formatPrice(course.discount_price)}
                          </span>
                          <span className="text-sm text-gray-500 line-through">
                            {formatPrice(course.price)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-2xl font-bold text-gray-900">
                          {formatPrice(course.price)}
                        </span>
                      )}
                    </div>
                    
                    <Link href={`/courses/${course.id}`}>
                      <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl px-6">
                        İncele
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredCourses.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">Kurs Bulunamadı</h3>
            <p className="text-gray-600 mb-6">Arama kriterlerinizi değiştirerek tekrar deneyin</p>
            <Button 
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('all')
                setSelectedLevel('all')
              }}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl"
            >
              Filtreleri Temizle
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}