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
  Edit,
  Upload,
  FileText,
  Video,
  Image as ImageIcon,
  Trash2,
  Plus
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { adminAPI, institutionsAPI } from '@/lib/api'
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

export default function InstitutionDetailPage() {
  const params = useParams()
  const router = useRouter()
  
  // Check if user is admin by trying admin API
  const [isAdmin, setIsAdmin] = useState(false)
  
  const [institution, setInstitution] = useState<Institution | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  
  const logoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<Partial<Institution>>({})

  useEffect(() => {
    fetchInstitution()
    checkAdminStatus()
  }, [params.id])

  const checkAdminStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        // Try to fetch with admin API to check if user is admin
        await adminAPI.getInstitution(Number(params.id))
        setIsAdmin(true)
      }
    } catch (error) {
      setIsAdmin(false)
    }
  }

  const fetchInstitution = async () => {
    try {
      setLoading(true)
      const response = isAdmin 
        ? await adminAPI.getInstitution(Number(params.id))
        : await institutionsAPI.getPublicInstitutions()
      
      const data = isAdmin ? response.data : response.data.find((i: any) => i.id === Number(params.id))
      setInstitution(data)
      setFormData(data)
    } catch (error) {
      console.error('Error fetching institution:', error)
      toast.error('Kurum bilgileri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (kind: 'logo' | 'cover_image' | 'intro_video' | 'brochure_pdf', file: File) => {
    if (!isAdmin || !institution) return
    
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
    if (!isAdmin || !institution) return
    
    try {
      await adminAPI.updateInstitution(institution.id, formData)
      toast.success('Kurum güncellendi')
      setEditing(false)
      fetchInstitution()
    } catch (error) {
      console.error('Error updating institution:', error)
      toast.error('Kurum güncellenemedi')
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
          <Button onClick={() => router.push('/institutions')} className="mt-4">
            Geri Dön
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/institutions')}
            className="mb-4 hover:bg-white/50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                {institution.name}
              </h1>
              <p className="text-gray-600 mt-2">{institution.description}</p>
            </div>
            {isAdmin && (
              <Button
                onClick={() => setEditing(!editing)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                {editing ? 'İptal' : 'Düzenle'}
              </Button>
            )}
          </div>
        </div>

        {/* Cover Image */}
        {institution.cover_image && (
          <Card className="mb-8 overflow-hidden">
            <img 
              src={institution.cover_image} 
              alt={institution.name}
              className="w-full h-64 object-cover"
            />
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="w-5 h-5 mr-2 text-blue-600" />
                  Kurum Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editing ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">Kurum Adı</label>
                      <Input
                        value={formData.name || ''}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Açıklama</label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Şehir</label>
                        <Input
                          value={formData.city || ''}
                          onChange={(e) => setFormData({...formData, city: e.target.value})}
                          className="rounded-xl"
                        />
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
                    <Button onClick={handleUpdate} className="w-full bg-blue-600 hover:bg-blue-700">
                      <Save className="w-4 h-4 mr-2" />
                      Kaydet
                    </Button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                      <div>
                        <p className="font-medium">{institution.city}, {institution.district}</p>
                        <p className="text-sm text-gray-600">{institution.address}</p>
                      </div>
                    </div>
                    {institution.phone && (
                      <div className="flex items-center">
                        <Phone className="w-5 h-5 text-gray-400 mr-3" />
                        <p>{institution.phone}</p>
                      </div>
                    )}
                    {institution.email && (
                      <div className="flex items-center">
                        <Mail className="w-5 h-5 text-gray-400 mr-3" />
                        <p>{institution.email}</p>
                      </div>
                    )}
                    {institution.website && (
                      <div className="flex items-center">
                        <Globe className="w-5 h-5 text-gray-400 mr-3" />
                        <a href={institution.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {institution.website}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Video & Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-600" />
                    Videolar ve Dokümanlar
                  </span>
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
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => videoInputRef.current?.click()}
                        disabled={uploading === 'intro_video'}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading === 'intro_video' ? 'Yükleniyor...' : 'Yükle'}
                      </Button>
                    )}
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
                    <video 
                      src={institution.intro_video} 
                      controls 
                      className="w-full rounded-xl"
                    />
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
                      Kurum Broşürü
                    </h3>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => pdfInputRef.current?.click()}
                        disabled={uploading === 'brochure_pdf'}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading === 'brochure_pdf' ? 'Yükleniyor...' : 'Yükle'}
                      </Button>
                    )}
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
              <CardContent className="p-6">
                <div className="text-center">
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
                  {isAdmin && (
                    <>
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
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>İstatistikler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Star className="w-5 h-5 text-yellow-500 mr-2" />
                    <span className="text-gray-600">Puan</span>
                  </div>
                  <span className="font-bold">{institution.rating} ({institution.total_ratings})</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="w-5 h-5 text-blue-500 mr-2" />
                    <span className="text-gray-600">Öğrenci</span>
                  </div>
                  <span className="font-bold">{institution.total_students.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BookOpen className="w-5 h-5 text-green-500 mr-2" />
                    <span className="text-gray-600">Kurs</span>
                  </div>
                  <span className="font-bold">{institution.total_courses}</span>
                </div>
              </CardContent>
            </Card>

            {/* Cover Image Upload */}
            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ImageIcon className="w-5 h-5 mr-2" />
                    Kapak Resmi
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
