'use client'

import { useState, useEffect } from 'react'
import { 
  Search, 
  Star, 
  Users, 
  BookOpen, 
  Award,
  MapPin,
  Mail,
  Linkedin,
  Github,
  Globe,
  Calendar,
  TrendingUp,
  Filter,
  Grid,
  List
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { instructorsAPI } from '@/lib/api'
import { getImageUrl } from '@/lib/utils'
import Link from 'next/link'

interface Instructor {
  id: number
  name?: string
  title?: string
  bio?: string
  profile_image?: string
  rating: number
  total_ratings: number
  total_students: number
  total_courses: number
  specialties?: string[]
  experience_years: number
  location?: string
  is_featured?: boolean
  specialization?: string
  user?: {
    full_name?: string
    email?: string
  }
  social_links?: {
    linkedin?: string
    github?: string
    website?: string
    email?: string
  }
}

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSpecialty, setSelectedSpecialty] = useState('all')
  const [sortBy, setSortBy] = useState('rating')
  const [viewMode, setViewMode] = useState('grid')

  const specialties = [
    'Web Geliştirme',
    'Mobil Geliştirme', 
    'Veri Bilimi',
    'Yapay Zeka',
    'Siber Güvenlik',
    'Cloud Computing',
    'DevOps',
    'UI/UX Tasarım',
    'Blockchain',
    'İş Geliştirme',
    'Pazarlama',
    'Kişisel Gelişim'
  ]

  useEffect(() => {
    fetchInstructors()
  }, [])

  const fetchInstructors = async () => {
    try {
      setLoading(true)
      const response = await instructorsAPI.getInstructors()
      
      // Backend'den gelen veriye uyumlu hale getir
      const instructorsData = (response.data || []).map((instructor: any) => ({
        id: instructor.id,
        name: instructor.user?.full_name || 'İsimsiz Eğitmen',
        title: instructor.specialization || 'Eğitmen',
        bio: instructor.bio || 'Bio bilgisi bulunmuyor.',
        rating: instructor.rating || 0,
        total_ratings: instructor.total_ratings || 0,
        total_students: instructor.total_students || 0,
        total_courses: instructor.total_courses || 0,
        specialties: instructor.specialization ? [instructor.specialization] : [],
        experience_years: instructor.experience_years || 0,
        location: instructor.user?.city || 'Belirtilmemiş',
        is_featured: instructor.is_approved && instructor.total_students > 1000,
        profile_image: instructor.profile_image,
        user: instructor.user,
        social_links: {
          email: instructor.user?.email
        }
      }))

      setInstructors(instructorsData)
    } catch (error) {
      console.error('Eğitmenler yüklenirken hata:', error)
      setInstructors([])
    } finally {
      setLoading(false)
    }
  }

  const getAvatarColor = (index: number) => {
    const colors = [
      'bg-gradient-to-br from-blue-500 to-purple-600',
      'bg-gradient-to-br from-purple-500 to-pink-600',
      'bg-gradient-to-br from-green-500 to-blue-600',
      'bg-gradient-to-br from-orange-500 to-red-600',
      'bg-gradient-to-br from-teal-500 to-cyan-600',
      'bg-gradient-to-br from-indigo-500 to-blue-600'
    ]
    return colors[index % colors.length]
  }

  const filteredInstructors = instructors.filter(instructor => {
    const name = instructor.name || instructor.user?.full_name || ''
    const title = instructor.title || instructor.specialization || ''
    const bio = instructor.bio || ''
    const specialties = instructor.specialties || []
    
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bio.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSpecialty = selectedSpecialty === 'all' || 
                            specialties.some((specialty: string) => 
                              specialty.toLowerCase().includes(selectedSpecialty.toLowerCase())
                            )
    
    return matchesSearch && matchesSpecialty
  })

  // Sort instructors
  const sortedInstructors = [...filteredInstructors].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return (b.rating || 0) - (a.rating || 0)
      case 'students':
        return (b.total_students || 0) - (a.total_students || 0)
      case 'courses':
        return (b.total_courses || 0) - (a.total_courses || 0)
      case 'experience':
        return (b.experience_years || 0) - (a.experience_years || 0)
      case 'name':
        const nameA = a.name || a.user?.full_name || ''
        const nameB = b.name || b.user?.full_name || ''
        return nameA.localeCompare(nameB)
      default:
        return 0
    }
  })

  // Separate featured instructors
  const featuredInstructors = sortedInstructors.filter(instructor => instructor.is_featured)
  const regularInstructors = sortedInstructors.filter(instructor => !instructor.is_featured)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-6">
            Uzman Eğitmenlerimiz
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Sektörün en deneyimli ve başarılı profesyonellerinden öğrenin
          </p>
          
          {/* CTA Button */}
          <Link href="/instructors/apply">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl px-8 py-3 text-lg font-medium">
              Eğitmen Olmak İstiyorum
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-12 bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Eğitmen ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500/20 text-lg"
                />
              </div>

              {/* Specialty */}
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="h-12 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-700"
              >
                <option value="all">Tüm Uzmanlık Alanları</option>
                {specialties.map(specialty => (
                  <option key={specialty} value={specialty}>{specialty}</option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-12 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-700"
              >
                <option value="rating">En Yüksek Puan</option>
                <option value="students">En Çok Öğrenci</option>
                <option value="courses">En Çok Kurs</option>
                <option value="experience">En Deneyimli</option>
                <option value="name">İsim (A-Z)</option>
              </select>
            </div>

            {/* View Mode & Results */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
              <div className="text-gray-600">
                <span className="font-medium">{filteredInstructors.length}</span> eğitmen bulundu
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-lg"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-lg"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Featured Instructors */}
        {featuredInstructors.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center">
              <Award className="w-8 h-8 text-yellow-500 mr-3" />
              Öne Çıkan Eğitmenler
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredInstructors.map((instructor, index) => (
                <InstructorCard 
                  key={instructor.id} 
                  instructor={instructor} 
                  index={index}
                  viewMode={viewMode}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Instructors */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Tüm Eğitmenler
          </h2>
          
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
              regularInstructors.map((instructor, index) => (
                <InstructorCard 
                  key={instructor.id} 
                  instructor={instructor} 
                  index={index + featuredInstructors.length}
                  viewMode={viewMode}
                />
              ))
            )}
          </div>
        </div>

        {/* Empty State */}
        {!loading && filteredInstructors.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">Eğitmen Bulunamadı</h3>
            <p className="text-gray-600 mb-6">Arama kriterlerinizi değiştirerek tekrar deneyin</p>
            <Button 
              onClick={() => {
                setSearchTerm('')
                setSelectedSpecialty('all')
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

function InstructorCard({ instructor, index, viewMode }: { 
  instructor: Instructor
  index: number
  viewMode: string 
}) {
  const getAvatarColor = (index: number) => {
    const colors = [
      'bg-gradient-to-br from-blue-500 to-purple-600',
      'bg-gradient-to-br from-purple-500 to-pink-600',
      'bg-gradient-to-br from-green-500 to-blue-600',
      'bg-gradient-to-br from-orange-500 to-red-600',
      'bg-gradient-to-br from-teal-500 to-cyan-600',
      'bg-gradient-to-br from-indigo-500 to-blue-600'
    ]
    return colors[index % colors.length]
  }

  return (
    <Card className="group bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 overflow-hidden rounded-3xl">
      <CardContent className="p-8">
        {/* Header */}
        <div className="flex items-start space-x-4 mb-6">
          {/* Avatar */}
          {instructor.profile_image ? (
            <img 
              src={getImageUrl(instructor.profile_image) || ''} 
              alt={instructor.name || 'Eğitmen'} 
              className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 shadow-lg"
            />
          ) : (
            <div className={`w-16 h-16 rounded-2xl ${getAvatarColor(index)} flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-lg`}>
              {(instructor.name || instructor.user?.full_name || 'N').split(' ').map(n => n[0]).join('')}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xl font-bold text-gray-900 truncate">
                {instructor.name || instructor.user?.full_name || 'İsimsiz Eğitmen'}
              </h3>
              {instructor.is_featured && (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  <Award className="w-3 h-3 mr-1" />
                  Öne Çıkan
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium text-blue-600 mb-1">{instructor.title || instructor.specialization || 'Eğitmen'}</p>
            <div className="flex items-center text-sm text-gray-500">
              <MapPin className="w-3 h-3 mr-1" />
              {instructor.location || 'Belirtilmemiş'}
            </div>
          </div>
        </div>

        {/* Bio */}
        <p className="text-gray-600 text-sm line-clamp-3 mb-6">
          {instructor.bio}
        </p>

        {/* Specialties */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {(instructor.specialties || []).slice(0, 3).map((specialty, i) => (
              <Badge 
                key={i} 
                variant="secondary" 
                className="bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                {specialty}
              </Badge>
            ))}
            {(instructor.specialties || []).length > 3 && (
              <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                +{(instructor.specialties || []).length - 3}
              </Badge>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Star className="w-4 h-4 text-yellow-400 mr-1 fill-current" />
              <span className="font-bold text-lg">{instructor.rating}</span>
            </div>
            <p className="text-xs text-gray-500">({instructor.total_ratings} değerlendirme)</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Users className="w-4 h-4 text-blue-500 mr-1" />
              <span className="font-bold text-lg">{instructor.total_students.toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-500">öğrenci</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <BookOpen className="w-4 h-4 text-green-500 mr-1" />
              <span className="font-bold text-lg">{instructor.total_courses}</span>
            </div>
            <p className="text-xs text-gray-500">kurs</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Calendar className="w-4 h-4 text-purple-500 mr-1" />
              <span className="font-bold text-lg">{instructor.experience_years}</span>
            </div>
            <p className="text-xs text-gray-500">yıl deneyim</p>
          </div>
        </div>

        {/* Social Links */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-100">
          <div className="flex items-center space-x-3">
            {instructor.social_links?.linkedin && (
              <a 
                href={instructor.social_links.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-600 transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            )}
            {instructor.social_links?.github && (
              <a 
                href={instructor.social_links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-900 transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
            )}
            {instructor.social_links?.website && (
              <a 
                href={instructor.social_links.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-green-600 transition-colors"
              >
                <Globe className="w-5 h-5" />
              </a>
            )}
            {instructor.social_links?.email && (
              <a 
                href={`mailto:${instructor.social_links.email}`}
                className="text-gray-400 hover:text-red-600 transition-colors"
              >
                <Mail className="w-5 h-5" />
              </a>
            )}
          </div>
          
          <Link href={`/instructors/${instructor.id}`}>
            <Button 
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl"
            >
              Profili Görüntüle
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}