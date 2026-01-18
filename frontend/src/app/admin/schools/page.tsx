'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  BookOpen, 
  Plus, 
  Edit2, 
  Trash2, 
  Video, 
  FileText,
  Users,
  Search,
  Filter
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { adminAPI } from '@/lib/api'
import toast from 'react-hot-toast'

interface SchoolCourse {
  id: number
  level: string
  grade: number
  subject: string
  title: string
  description: string
  price: number
  is_active: boolean
  thumbnail?: string
  preview_video?: string
  videos_count: number
  notes_count: number
  topics_count: number
  created_at: string
}

export default function AdminSchoolCoursesPage() {
  const [courses, setCourses] = useState<SchoolCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [filterGrade, setFilterGrade] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchCourses()
  }, [filterLevel, filterGrade])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (filterLevel) params.level = filterLevel
      if (filterGrade) params.grade = filterGrade
      
      const response = await adminAPI.getSchools(params)
      setCourses(response.data)
    } catch (error) {
      console.error('Error fetching courses:', error)
      toast.error('Kurslar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bu eğitim kurumunu silmek istediğinizden emin misiniz?')) return

    try {
      await adminAPI.deleteSchool(id)
      toast.success('Kurum silindi')
      fetchCourses()
    } catch (error) {
      console.error('Error deleting course:', error)
      toast.error('Silme işlemi başarısız')
    }
  }

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(search.toLowerCase()) ||
    course.subject.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Eğitim Kurumları Yönetimi
          </h1>
          <p className="text-gray-600">
            İlkokul, ortaokul ve lise kurslarını yönetin
          </p>
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Kurs ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tüm Seviyeler</option>
              <option value="ilkokul">İlkokul</option>
              <option value="ortaokul">Ortaokul</option>
              <option value="lise">Lise</option>
            </select>

            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tüm Sınıflar</option>
              {[...Array(10)].map((_, i) => (
                <option key={i + 3} value={i + 3}>{i + 3}. Sınıf</option>
              ))}
            </select>

            {/* Add Button */}
            <Button
              onClick={() => router.push('/admin/schools/create')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6"
            >
              <Plus className="w-5 h-5 mr-2" />
              Yeni Kurum Ekle
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Toplam Kurum</p>
                  <p className="text-3xl font-bold text-gray-900">{courses.length}</p>
                </div>
                <BookOpen className="w-10 h-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Toplam Video</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {courses.reduce((sum, c) => sum + c.videos_count, 0)}
                  </p>
                </div>
                <Video className="w-10 h-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Toplam Materyal</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {courses.reduce((sum, c) => sum + c.notes_count, 0)}
                  </p>
                </div>
                <FileText className="w-10 h-10 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Aktif Kurum</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {courses.filter(c => c.is_active).length}
                  </p>
                </div>
                <Users className="w-10 h-10 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Yükleniyor...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Kurum bulunamadı</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <Card key={course.id} className="group hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        course.level === 'ilkokul' ? 'bg-blue-100 text-blue-800' :
                        course.level === 'ortaokul' ? 'bg-purple-100 text-purple-800' :
                        'bg-indigo-100 text-indigo-800'
                      }`}>
                        {course.level === 'ilkokul' ? 'İlkokul' : 
                         course.level === 'ortaokul' ? 'Ortaokul' : 'Lise'} - {course.grade}. Sınıf
                      </span>
                      <h3 className="text-xl font-bold text-gray-900 mt-2 mb-1">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-600 capitalize">{course.subject}</p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${course.is_active ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {course.description || 'Açıklama yok'}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Video className="w-4 h-4" />
                      <span>{course.videos_count} video</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      <span>{course.notes_count} materyal</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-2xl font-bold text-gray-900">
                      ₺{course.price}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/admin/schools/${course.id}`)}
                        className="hover:bg-blue-50"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(course.id)}
                        className="hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
