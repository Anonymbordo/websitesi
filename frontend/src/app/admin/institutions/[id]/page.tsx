'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Building, 
  ArrowLeft, 
  Save, 
  MapPin, 
  Phone, 
  Mail, 
  Globe,
  Star,
  Users,
  BookOpen,
  Upload,
  FileText,
  Video,
  Image as ImageIcon,
  Trash2
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
  logo: string | null
  cover_image: string | null
  intro_video: string | null
  brochure_pdf: string | null
  city: string
  district: string
  address: string
  phone: string
  email: string
  website: string
  rating: number
  total_ratings: number
  total_students: number
  total_courses: number
  image_color: string
  is_active: boolean
  is_featured: boolean
  courses: any[]
}

export default function AdminInstitutionEditPage() {
  const params = useParams()
  const router = useRouter()
  
  const [institution, setInstitution] = useState<Institution | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  
  const logoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<Partial<Institution>>({})

  const cities = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep']
  const colors = [
    { value: 'from-blue-500 to-purple-600', label: 'Mavi-Mor' },
    { value: 'from-red-500 to-orange-600', label: 'Kırmızı-Turuncu' },
    { value: 'from-green-500 to-teal-600', label: 'Yeşil-Turkuaz' },
    { value: 'from-purple-500 to-pink-600', label: 'Mor-Pembe' },
    { value: 'from-yellow-500 to-orange-600', label: 'Sarı-Turuncu' },
    { value: 'from-indigo-500 to-blue-600', label: 'İndigo-Mavi' },
  ]

  useEffect(() => {
    fetchInstitution()
  }, [params.id])

  const fetchInstitution = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getInstitution(Number(params.id))
      setInstitution(response.data)
      setFormData(response.data)
    } catch (error) {
      console.error('Error fetching institution:', error)
      toast.error('Kurum bilgileri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (kind: 'logo' | 'cover_image' | 'intro_video' | 'brochure_pdf', file: File) => {
    if (!institution) return
    
    try {
      setUploading(kind)
      
      // Get presigned URL
      const presignResp = await adminAPI.presignInstitutionUpload(institution.id, {
        kind,
        filename: file.name,
        content_type: file.type
      })
      
      const { upload_url, public_url } = presignResp.data
      
      // Upload to S3
      const uploadResp = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      })
      
      if (!uploadResp.ok) {
        throw new Error(`S3 upload failed: ${uploadResp.status}`)
      }
      
      // Update institution with URL
      if (kind === 'logo') {
        await adminAPI.setInstitutionLogo(institution.id, public_url)
      } else if (kind === 'cover_image') {
        await adminAPI.setInstitutionCover(institution.id, public_url)
      } else if (kind === 'intro_video') {
        await adminAPI.setInstitutionVideo(institution.id, public_url)
      } else if (kind === 'brochure_pdf') {
        await adminAPI.setInstitutionBrochure(institution.id, public_url)
      }
      
      const fileNames: Record<string, string> = {
        logo: 'Logo',
        cover_image: 'Kapak resmi',
        intro_video: 'Video',
        brochure_pdf: 'Broşür'
      }
      toast.success(`${fileNames[kind]} yüklendi`)
      fetchInstitution()
    } catch (error) {
      console.error(`Error uploading ${kind}:`, error)
      toast.error('Dosya yüklenemedi')
    } finally {
      setUploading(null)
    }
  }

  const handleUpdate = async () => {
    if (!institution) return
    
    try {
      setSaving(true)
      await adminAPI.updateInstitution(institution.id, formData)
      toast.success('Kurum güncellendi')
      router.push('/admin/institutions')
    } catch (error) {
      console.error('Error updating institution:', error)
      toast.error('Kurum güncellenemedi')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Building className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 text-lg">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!institution) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Kurum bulunamadı</p>
          <Button onClick={() => router.push('/admin/institutions')} className="mt-4">
            Geri Dön
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/admin/institutions')}
              className="hover:bg-white/50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                Kurum Düzenle
              </h1>
              <p className="text-gray-600 mt-1">{institution.name}</p>
            </div>
          </div>
          <Button
            onClick={handleUpdate}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="w-5 h-5 mr-2 text-blue-600" />
                  Temel Bilgiler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Kurum Adı *</label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Açıklama *</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Şehir *</label>
                    <select
                      value={formData.city || ''}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Şehir seçin</option>
                      {cities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">İlçe</label>
                    <Input
                      value={formData.district || ''}
                      onChange={(e) => setFormData({...formData, district: e.target.value})}
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Adres</label>
                  <Input
                    value={formData.address || ''}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Telefon</label>
                    <Input
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">E-posta</label>
                    <Input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Website</label>
                  <Input
                    value={formData.website || ''}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    placeholder="https://www.kurum.com"
                    className="rounded-xl"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Media Files */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-600" />
                  Medya Dosyaları
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Intro Video */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center">
                      <Video className="w-4 h-4 mr-2" />
                      Tanıtım Videosu
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={uploading === 'intro_video'}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading === 'intro_video' ? 'Yükleniyor...' : 'Yükle'}
                    </Button>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload('intro_video', file)
                      }}
                      className="hidden"
                    />
                  </div>
                  {institution.intro_video ? (
                    <div className="relative group">
                      <video 
                        src={institution.intro_video} 
                        controls 
                        preload="metadata"
                        poster={institution.cover_image || undefined}
                        className="w-full rounded-xl shadow-lg"
                      />
                      <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        <Video className="w-4 h-4 inline mr-1" />
                        Video Player
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                      <Video className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">Henüz video yüklenmemiş</p>
                    </div>
                  )}
                </div>

                {/* Brochure PDF */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Kurum Broşürü (PDF)
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => pdfInputRef.current?.click()}
                      disabled={uploading === 'brochure_pdf'}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading === 'brochure_pdf' ? 'Yükleniyor...' : 'Yükle'}
                    </Button>
                    <input
                      ref={pdfInputRef}
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload('brochure_pdf', file)
                      }}
                      className="hidden"
                    />
                  </div>
                  {institution.brochure_pdf ? (
                    <a 
                      href={institution.brochure_pdf} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <FileText className="w-8 h-8 text-red-600 mr-3" />
                      <div>
                        <p className="font-medium">Kurum Broşürü</p>
                        <p className="text-sm text-gray-600">PDF dosyasını görüntüle</p>
                      </div>
                    </a>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">Henüz broşür yüklenmemiş</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Logo */}
            <Card>
              <CardHeader>
                <CardTitle>Logo</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                {institution.logo ? (
                  <img 
                    src={institution.logo} 
                    alt={institution.name}
                    className="w-32 h-32 object-contain mx-auto mb-4 rounded-xl"
                  />
                ) : (
                  <div className={`w-32 h-32 bg-gradient-to-br ${institution.image_color} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                    <Building className="w-16 h-16 text-white" />
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploading === 'logo'}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading === 'logo' ? 'Yükleniyor...' : 'Logo Değiştir'}
                </Button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload('logo', file)
                  }}
                  className="hidden"
                />
              </CardContent>
            </Card>

            {/* Cover Image */}
            <Card>
              <CardHeader>
                <CardTitle>Kapak Resmi</CardTitle>
              </CardHeader>
              <CardContent>
                {institution.cover_image && (
                  <img 
                    src={institution.cover_image} 
                    alt="Cover"
                    className="w-full h-32 object-cover rounded-xl mb-4"
                  />
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploading === 'cover_image'}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading === 'cover_image' ? 'Yükleniyor...' : 'Kapak Değiştir'}
                </Button>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload('cover_image', file)
                  }}
                  className="hidden"
                />
              </CardContent>
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Ayarlar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Renk Teması</label>
                  <select
                    value={formData.image_color || ''}
                    onChange={(e) => setFormData({...formData, image_color: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20"
                  >
                    {colors.map(color => (
                      <option key={color.value} value={color.value}>{color.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Aktif</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Öne Çıkan</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData({...formData, is_featured: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>İstatistikler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Öğrenci Sayısı</label>
                  <Input
                    type="number"
                    value={formData.total_students || 0}
                    onChange={(e) => setFormData({...formData, total_students: parseInt(e.target.value) || 0})}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Kurs Sayısı</label>
                  <Input
                    type="number"
                    value={formData.total_courses || 0}
                    onChange={(e) => setFormData({...formData, total_courses: parseInt(e.target.value) || 0})}
                    className="rounded-xl"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
