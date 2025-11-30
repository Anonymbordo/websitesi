'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  Save,
  Loader2,
  Edit2,
  CheckCircle2,
  X
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/lib/store'
import { authAPI, coursesAPI } from '@/lib/api'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const router = useRouter()
  const { user, isAuthenticated, updateUser } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    totalHours: 0
  })
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    city: '',
    district: ''
  })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?next=/student/profile')
      return
    }

    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        city: user.city || '',
        district: user.district || ''
      })
      fetchStats()
    }
  }, [isAuthenticated, user, router])

  const fetchStats = async () => {
    try {
      const response = await authAPI.getProfile()
      const courses = await coursesAPI.getMyCourses()
      const coursesData = courses.data || []
      
      const total = coursesData.length
      const completed = coursesData.filter((c: any) => c.progress === 100).length
      const hours = coursesData.reduce((acc: number, c: any) => acc + (c.duration_hours || 0), 0)
      
      setStats({
        totalCourses: total,
        completedCourses: completed,
        totalHours: hours
      })
    } catch (error) {
      console.error('Stats fetch error:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await authAPI.updateProfile({
        full_name: formData.full_name,
        city: formData.city,
        district: formData.district
      })

      updateUser(response.data)
      toast.success('Profil başarıyla güncellendi!')
      setEditing(false)
    } catch (error: any) {
      console.error('Profile update error:', error)
      toast.error(error.response?.data?.detail || 'Profil güncellenemedi')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
            Profilim
          </h1>
          <p className="text-gray-600 mt-2">Profil bilgilerinizi görüntüleyin ve düzenleyin</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="text-center">
                  {/* Avatar */}
                  <div className="relative inline-block mb-4">
                    <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                      {user.full_name?.charAt(0).toUpperCase() || 'Ö'}
                    </div>
                    <button className="absolute bottom-2 right-2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-blue-200 hover:border-blue-400 transition-colors">
                      <Camera className="w-5 h-5 text-blue-600" />
                    </button>
                  </div>

                  {/* User Info */}
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{user.full_name}</h2>
                  <p className="text-sm text-gray-500 mb-1">{user.email}</p>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    {user.role === 'student' && 'Öğrenci'}
                    {user.role === 'instructor' && 'Eğitmen'}
                    {user.role === 'admin' && 'Admin'}
                  </div>

                  {/* Stats */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
                        <p className="text-xs text-gray-500">Kurslar</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.completedCourses}</p>
                        <p className="text-xs text-gray-500">Tamamlandı</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalHours}</p>
                        <p className="text-xs text-gray-500">Saat</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">Profil Bilgileri</CardTitle>
                  {!editing ? (
                    <Button
                      onClick={() => setEditing(true)}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Düzenle
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setEditing(false)}
                      variant="outline"
                      className="border-gray-300"
                    >
                      <X className="w-4 h-4 mr-2" />
                      İptal
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-gray-700 font-medium">
                      <User className="w-4 h-4 inline mr-2" />
                      Ad Soyad
                    </Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      disabled={!editing}
                      className={`${
                        editing
                          ? 'bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                          : 'bg-gray-50 border-gray-200'
                      } transition-all duration-300`}
                    />
                  </div>

                  {/* Email (Read Only) */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-medium">
                      <Mail className="w-4 h-4 inline mr-2" />
                      E-posta
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      value={formData.email}
                      disabled
                      className="bg-gray-50 border-gray-200 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500">E-posta adresi değiştirilemez</p>
                  </div>

                  {/* Phone (Read Only) */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-700 font-medium">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Telefon
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      disabled
                      className="bg-gray-50 border-gray-200 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500">Telefon numarası değiştirilemez</p>
                  </div>

                  {/* City */}
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-gray-700 font-medium">
                      <MapPin className="w-4 h-4 inline mr-2" />
                      Şehir
                    </Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Şehir seçin"
                      disabled={!editing}
                      className={`${
                        editing
                          ? 'bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                          : 'bg-gray-50 border-gray-200'
                      } transition-all duration-300`}
                    />
                  </div>

                  {/* District */}
                  <div className="space-y-2">
                    <Label htmlFor="district" className="text-gray-700 font-medium">
                      <MapPin className="w-4 h-4 inline mr-2" />
                      İlçe
                    </Label>
                    <Input
                      id="district"
                      name="district"
                      value={formData.district}
                      onChange={handleChange}
                      placeholder="İlçe girin"
                      disabled={!editing}
                      className={`${
                        editing
                          ? 'bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                          : 'bg-gray-50 border-gray-200'
                      } transition-all duration-300`}
                    />
                  </div>

                  {/* Submit Button */}
                  {editing && (
                    <div className="pt-4">
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-6 rounded-2xl shadow-lg hover:shadow-blue-500/25 transition-all duration-300"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Kaydediliyor...
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5 mr-2" />
                            Değişiklikleri Kaydet
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Account Info */}
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm mt-6">
              <CardHeader>
                <CardTitle className="text-xl">Hesap Bilgileri</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Hesap Durumu</p>
                      <p className="text-sm text-gray-500">Aktif</p>
                    </div>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Doğrulama Durumu</p>
                      <p className="text-sm text-gray-500">
                        {user.is_verified ? 'Doğrulandı' : 'Doğrulanmadı'}
                      </p>
                    </div>
                    <CheckCircle2 className={`w-6 h-6 ${user.is_verified ? 'text-green-500' : 'text-gray-300'}`} />
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900 mb-1">Üyelik Tarihi</p>
                    <p className="text-sm text-gray-500">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : 'Bilinmiyor'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
