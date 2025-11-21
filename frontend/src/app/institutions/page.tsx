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
  Map,
  Building
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatPrice } from '@/lib/utils'
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

interface Institution {
  id: number
  name: string
  description: string
  rating: number
  total_ratings: number
  city: string
  district: string
  total_students: number
  total_courses: number
  image_color: string
}

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCity, setSelectedCity] = useState('all')
  const [selectedDistrict, setSelectedDistrict] = useState('all')
  const [sortBy, setSortBy] = useState('popular')
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid')

  const cities = citiesData.cities
  const selectedCityData = cities.find(c => c.name === selectedCity)
  const districts = selectedCityData?.districts || []

  useEffect(() => {
    fetchInstitutions()
  }, [])

  const fetchInstitutions = async () => {
    try {
      setLoading(true)
      // Mock data for institutions
      const mockInstitutions: Institution[] = [
        {
          id: 1,
          name: "Boğaziçi Eğitim Kurumları",
          description: "Köklü geçmişi ve uzman kadrosuyla geleceğe hazırlıyoruz.",
          rating: 4.9,
          total_ratings: 124,
          city: "İstanbul",
          district: "Beşiktaş",
          total_students: 2500,
          total_courses: 45,
          image_color: "from-blue-500 to-purple-600"
        },
        {
          id: 2,
          name: "Ankara Fen Bilimleri",
          description: "Sayısal alanda lider eğitim kurumu.",
          rating: 4.8,
          total_ratings: 98,
          city: "Ankara",
          district: "Çankaya",
          total_students: 1800,
          total_courses: 32,
          image_color: "from-red-500 to-orange-600"
        },
        {
          id: 3,
          name: "İzmir Yüksek Teknoloji Akademi",
          description: "Teknoloji ve inovasyon odaklı eğitim.",
          rating: 4.7,
          total_ratings: 76,
          city: "İzmir",
          district: "Urla",
          total_students: 1200,
          total_courses: 28,
          image_color: "from-green-500 to-teal-600"
        },
        {
          id: 4,
          name: "Bursa Final Okulları",
          description: "Sınavlara hazırlıkta güvenilir adres.",
          rating: 4.6,
          total_ratings: 150,
          city: "Bursa",
          district: "Nilüfer",
          total_students: 3000,
          total_courses: 50,
          image_color: "from-purple-500 to-pink-600"
        },
        {
          id: 5,
          name: "Antalya Bilim Koleji",
          description: "Uluslararası standartlarda eğitim.",
          rating: 4.8,
          total_ratings: 85,
          city: "Antalya",
          district: "Muratpaşa",
          total_students: 1500,
          total_courses: 35,
          image_color: "from-yellow-500 to-orange-600"
        },
        {
          id: 6,
          name: "Adana Çukurova Eğitim",
          description: "Bölgenin en güçlü eğitim kadrosu.",
          rating: 4.5,
          total_ratings: 110,
          city: "Adana",
          district: "Seyhan",
          total_students: 2200,
          total_courses: 40,
          image_color: "from-indigo-500 to-blue-600"
        }
      ]

      setInstitutions(mockInstitutions)
    } catch (error) {
      console.error('Kurumlar yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredInstitutions = institutions.filter(inst => {
    const matchesSearch = inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inst.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCity = selectedCity === 'all' || inst.city === selectedCity
    const matchesDistrict = selectedDistrict === 'all' || inst.district === selectedDistrict
    
    return matchesSearch && matchesCity && matchesDistrict
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-6">
            Eğitim Kurumları
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Türkiye'nin önde gelen eğitim kurumlarını keşfedin
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-12 bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Kurum ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500/20 text-lg"
                />
              </div>

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
                <option value="newest">En Yeni</option>
              </select>
            </div>

            {/* Active Filters */}
            {(selectedCity !== 'all' || selectedDistrict !== 'all' || searchTerm) && (
              <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-gray-200">
                <span className="text-sm text-gray-600 font-medium">Aktif Filtreler:</span>
                {searchTerm && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    <Search className="w-3 h-3" />
                    {searchTerm}
                    <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-blue-900">×</button>
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
                <span className="font-medium">{filteredInstitutions.length}</span> kurum bulundu
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
            {/* Note: CourseMap might need adaptation for institutions, passing as any for now */}
            <CourseMap courses={filteredInstitutions as any} />
          </div>
        )}

        {/* Institutions Grid/List */}
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
              filteredInstitutions.map((inst, index) => (
              <Card 
                key={inst.id}
                className="group bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 overflow-hidden rounded-3xl"
              >
                {/* Institution Image */}
                <div className="relative aspect-video overflow-hidden">
                  <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${inst.image_color} group-hover:scale-110 transition-transform duration-500`}>
                    <Building className="w-16 h-16 text-white" />
                  </div>
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                  
                  {/* City Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-md text-white border border-white/30">
                      <MapPin className="w-3 h-3 mr-1" />
                      {inst.city} / {inst.district}
                    </span>
                  </div>

                  {/* View Button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                      <Search className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>

                <CardContent className="p-6 space-y-4">
                  {/* Title & Description */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors duration-300 mb-2">
                      {inst.name}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {inst.description}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 mr-1 fill-current" />
                        <span className="font-medium">{inst.rating}</span>
                        <span className="text-gray-500 ml-1">({inst.total_ratings})</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-gray-400 mr-1" />
                        <span>{(inst.total_students || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center">
                        <BookOpen className="w-4 h-4 text-gray-400 mr-1" />
                        <span>{inst.total_courses} Kurs</span>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="text-sm text-gray-500">
                      Detaylı bilgi için inceleyin
                    </div>
                    
                    <Link href={`/institutions/${inst.id}`}>
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
        {!loading && filteredInstitutions.length === 0 && (
          <div className="text-center py-16">
            <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">Kurum Bulunamadı</h3>
            <p className="text-gray-600 mb-6">Arama kriterlerinizi değiştirerek tekrar deneyin</p>
            <Button 
              onClick={() => {
                setSearchTerm('')
                setSelectedCity('all')
                setSelectedDistrict('all')
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
