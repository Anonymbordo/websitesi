'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Building, 
  Plus, 
  Edit2, 
  Trash2, 
  MapPin,
  Users,
  BookOpen,
  Star,
  Search,
  Filter
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { adminAPI } from '@/lib/api'
import toast from 'react-hot-toast'

interface Institution {
  id: number
  name: string
  description: string
  city: string
  district?: string
  logo?: string
  cover_image?: string
  intro_video?: string
  rating: number
  total_ratings: number
  total_students: number
  total_courses: number
  image_color: string
  is_active: boolean
  is_featured: boolean
  created_at: string
}

export default function AdminInstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchInstitutions()
  }, [filterCity])

  const fetchInstitutions = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (filterCity) params.city = filterCity
      
      const response = await adminAPI.getInstitutions(params)
      setInstitutions(response.data)
    } catch (error) {
      console.error('Error fetching institutions:', error)
      toast.error('Kurumlar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bu kurumu silmek istediğinizden emin misiniz?')) return

    try {
      await adminAPI.deleteInstitution(id)
      toast.success('Kurum silindi')
      fetchInstitutions()
    } catch (error) {
      console.error('Error deleting institution:', error)
      toast.error('Kurum silinemedi')
    }
  }

  const filteredInstitutions = institutions.filter(inst =>
    inst.name.toLowerCase().includes(search.toLowerCase()) ||
    inst.city.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: institutions.length,
    active: institutions.filter(i => i.is_active).length,
    featured: institutions.filter(i => i.is_featured).length,
    totalStudents: institutions.reduce((sum, i) => sum + i.total_students, 0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-2">
              Eğitim Kurumları
            </h1>
            <p className="text-xl text-gray-600">
              Anlaşmalı kurumları yönetin
            </p>
          </div>
          <Button
            onClick={() => router.push('/admin/institutions/create')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Yeni Kurum Ekle
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Toplam Kurum</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Building className="w-12 h-12 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Aktif Kurum</p>
                  <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                </div>
                <Building className="w-12 h-12 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Öne Çıkan</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.featured}</p>
                </div>
                <Star className="w-12 h-12 text-purple-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Toplam Öğrenci</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.totalStudents}</p>
                </div>
                <Users className="w-12 h-12 text-orange-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Kurum ara..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 rounded-xl border-gray-200"
                  />
                </div>
              </div>
              <div className="w-full md:w-64">
                <select
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Tüm Şehirler</option>
                  <option value="İstanbul">İstanbul</option>
                  <option value="Ankara">Ankara</option>
                  <option value="İzmir">İzmir</option>
                  <option value="Bursa">Bursa</option>
                  <option value="Antalya">Antalya</option>
                  <option value="Adana">Adana</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Institutions Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Yükleniyor...</p>
          </div>
        ) : filteredInstitutions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl">
            <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Kurum bulunamadı</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredInstitutions.map((institution) => (
              <Card 
                key={institution.id} 
                className="group hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                {/* Cover Image or Gradient */}
                <div className={`h-32 bg-gradient-to-r ${institution.image_color} flex items-center justify-center`}>
                  {institution.logo ? (
                    <img src={institution.logo} alt={institution.name} className="h-20 w-20 object-contain bg-white rounded-lg p-2" />
                  ) : (
                    <Building className="w-16 h-16 text-white opacity-50" />
                  )}
                </div>

                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 
                        onClick={() => router.push(`/admin/institutions/${institution.id}`)}
                        className="text-xl font-bold text-gray-900 mb-1 cursor-pointer hover:text-blue-600 transition-colors"
                      >
                        {institution.name}
                      </h3>
                      <div className="flex items-center text-sm text-gray-600 gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{institution.city}{institution.district && ` / ${institution.district}`}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {institution.is_featured && (
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      )}
                      <div className={`w-3 h-3 rounded-full ${institution.is_active ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {institution.description}
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                        <Star className="w-3 h-3" />
                        <span className="text-sm font-semibold">{institution.rating.toFixed(1)}</span>
                      </div>
                      <p className="text-xs text-gray-600">({institution.total_ratings})</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                        <Users className="w-3 h-3" />
                        <span className="text-sm font-semibold">{institution.total_students}</span>
                      </div>
                      <p className="text-xs text-gray-600">Öğrenci</p>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded-lg">
                      <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                        <BookOpen className="w-3 h-3" />
                        <span className="text-sm font-semibold">{institution.total_courses}</span>
                      </div>
                      <p className="text-xs text-gray-600">Kurs</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/admin/institutions/${institution.id}`)}
                      className="flex-1 hover:bg-blue-50"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Düzenle
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(institution.id)}
                      className="hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
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
