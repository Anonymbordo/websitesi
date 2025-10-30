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
import Link from 'next/link'

interface Instructor {
  id: number
  name: string
  title: string
  bio: string
  profile_image?: string
  rating: number
  total_ratings: number
  total_students: number
  total_courses: number
  specialties: string[]
  experience_years: number
  location: string
  is_featured: boolean
  social_links: {
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
      
      // Mock data if API fails
      const mockInstructors: Instructor[] = [
        {
          id: 1,
          name: "Ahmet Yılmaz",
          title: "Senior Full Stack Developer",
          bio: "10+ yıllık deneyime sahip full stack developer. React, Node.js ve modern web teknolojileri konusunda uzman.",
          rating: 4.9,
          total_ratings: 1250,
          total_students: 15000,
          total_courses: 12,
          specialties: ["Web Geliştirme", "React", "Node.js"],
          experience_years: 10,
          location: "İstanbul, Türkiye",
          is_featured: true,
          social_links: {
            linkedin: "https://linkedin.com/in/ahmetyilmaz",
            github: "https://github.com/ahmetyilmaz",
            website: "https://ahmetyilmaz.dev",
            email: "ahmet@example.com"
          }
        },
        {
          id: 2,
          name: "Dr. Zeynep Kaya",
          title: "Veri Bilimci & AI Uzmanı",
          bio: "Machine Learning ve Deep Learning alanında PhD. Python, TensorFlow ve veri analizi konularında eğitim veriyor.",
          rating: 4.8,
          total_ratings: 890,
          total_students: 8500,
          total_courses: 8,
          specialties: ["Veri Bilimi", "Yapay Zeka", "Python"],
          experience_years: 8,
          location: "Ankara, Türkiye",
          is_featured: true,
          social_links: {
            linkedin: "https://linkedin.com/in/zeynepkaya",
            website: "https://zeynepkaya.ai"
          }
        },
        {
          id: 3,
          name: "Mehmet Özkan",
          title: "JavaScript & Frontend Uzmanı",
          bio: "Frontend teknolojileri ve JavaScript framework'leri konusunda uzman. Modern web uygulamaları geliştiriyor.",
          rating: 4.7,
          total_ratings: 650,
          total_students: 12000,
          total_courses: 15,
          specialties: ["Web Geliştirme", "JavaScript", "Vue.js"],
          experience_years: 7,
          location: "İzmir, Türkiye",
          is_featured: false,
          social_links: {
            github: "https://github.com/mehmetozkan",
            linkedin: "https://linkedin.com/in/mehmetozkan"
          }
        },
        {
          id: 4,
          name: "Selin Demir",
          title: "UI/UX Designer & Product Manager",
          bio: "Kullanıcı deneyimi tasarımı ve ürün yönetimi alanında uzman. Tasarım düşüncesi ve kullanıcı araştırması konularında eğitim veriyor.",
          rating: 4.6,
          total_ratings: 420,
          total_students: 6500,
          total_courses: 6,
          specialties: ["UI/UX Tasarım", "Product Management", "Figma"],
          experience_years: 6,
          location: "İstanbul, Türkiye",
          is_featured: true,
          social_links: {
            linkedin: "https://linkedin.com/in/selindemir",
            website: "https://selindemir.design"
          }
        },
        {
          id: 5,
          name: "Can Yıldız",
          title: "DevOps Engineer & Cloud Architect",
          bio: "AWS, Docker, Kubernetes ve DevOps methodologies konusunda uzman. Scalable sistemler tasarlıyor ve geliştiriyor.",
          rating: 4.5,
          total_ratings: 380,
          total_students: 4200,
          total_courses: 9,
          specialties: ["DevOps", "Cloud Computing", "AWS"],
          experience_years: 9,
          location: "Bursa, Türkiye",
          is_featured: false,
          social_links: {
            github: "https://github.com/canyildiz",
            linkedin: "https://linkedin.com/in/canyildiz"
          }
        },
        {
          id: 6,
          name: "Ayşe Koç",
          title: "Digital Marketing Strategist",
          bio: "Dijital pazarlama, sosyal medya stratejileri ve e-ticaret konularında uzman. Performans pazarlama ve analitik alanında deneyimli.",
          rating: 4.4,
          total_ratings: 520,
          total_students: 9800,
          total_courses: 11,
          specialties: ["Pazarlama", "Social Media", "Analytics"],
          experience_years: 5,
          location: "İstanbul, Türkiye",
          is_featured: false,
          social_links: {
            linkedin: "https://linkedin.com/in/aysekoc",
            website: "https://aysekoc.com"
          }
        }
      ]

      setInstructors(response.data || mockInstructors)
    } catch (error) {
      console.error('Eğitmenler yüklenirken hata:', error)
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
    const matchesSearch = instructor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         instructor.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         instructor.bio.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSpecialty = selectedSpecialty === 'all' || 
                            instructor.specialties.some(specialty => 
                              specialty.toLowerCase().includes(selectedSpecialty.toLowerCase())
                            )
    
    return matchesSearch && matchesSpecialty
  })

  // Sort instructors
  const sortedInstructors = [...filteredInstructors].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating
      case 'students':
        return b.total_students - a.total_students
      case 'courses':
        return b.total_courses - a.total_courses
      case 'experience':
        return b.experience_years - a.experience_years
      case 'name':
        return a.name.localeCompare(b.name)
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
          <div className={`w-16 h-16 rounded-2xl ${getAvatarColor(index)} flex items-center justify-center text-white font-bold text-xl flex-shrink-0`}>
            {instructor.name.split(' ').map(n => n[0]).join('')}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xl font-bold text-gray-900 truncate">
                {instructor.name}
              </h3>
              {instructor.is_featured && (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  <Award className="w-3 h-3 mr-1" />
                  Öne Çıkan
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium text-blue-600 mb-1">{instructor.title}</p>
            <div className="flex items-center text-sm text-gray-500">
              <MapPin className="w-3 h-3 mr-1" />
              {instructor.location}
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
            {instructor.specialties.slice(0, 3).map((specialty, i) => (
              <Badge 
                key={i} 
                variant="secondary" 
                className="bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                {specialty}
              </Badge>
            ))}
            {instructor.specialties.length > 3 && (
              <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                +{instructor.specialties.length - 3}
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
            {instructor.social_links.linkedin && (
              <a 
                href={instructor.social_links.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-600 transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            )}
            {instructor.social_links.github && (
              <a 
                href={instructor.social_links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-900 transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
            )}
            {instructor.social_links.website && (
              <a 
                href={instructor.social_links.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-green-600 transition-colors"
              >
                <Globe className="w-5 h-5" />
              </a>
            )}
            {instructor.social_links.email && (
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