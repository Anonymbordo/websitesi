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
  UserPlus,
  Loader2,
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
import { Textarea } from '@/components/ui/textarea'
import { adminAPI } from '@/lib/api'
import toast from 'react-hot-toast'

interface InstitutionInstructor {
  id: number
  user_id: number
  full_name: string
  email: string
  phone: string
  title?: string | null
  specialization?: string | null
  bio?: string | null
  experience_years: number
  is_approved: boolean
  status: string
}

interface Institution {
  id: number
  name: string
  description: string
  logo: string | null
  cover_image: string | null
  intro_video: string | null
  brochure_pdf: string | null
  brochure_is_image?: boolean | null
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
  instructors?: InstitutionInstructor[]
}

const isBrochureImage = (url?: string | null) =>
  Boolean(url && /\.(png|jpe?g)(?:$|[?#])/i.test(url))

export default function AdminInstitutionEditPage() {
  const params = useParams()
  const router = useRouter()
  
  const [institution, setInstitution] = useState<Institution | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [creatingInstructor, setCreatingInstructor] = useState(false)
  
  const logoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<Partial<Institution>>({})
  const [newInstructorForm, setNewInstructorForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    city: '',
    district: '',
    specialization: '',
    title: '',
    experience_years: '0',
    bio: '',
  })

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

  const handleCreateInstructor = async () => {
    if (!institution) return

    if (!newInstructorForm.full_name || !newInstructorForm.email || !newInstructorForm.phone || !newInstructorForm.password) {
      toast.error('Ad soyad, e-posta, telefon ve şifre zorunludur')
      return
    }

    try {
      setCreatingInstructor(true)

      const response = await adminAPI.createInstitutionInstructor(institution.id, {
        ...newInstructorForm,
        experience_years: Number(newInstructorForm.experience_years || 0),
      })

      const createdInstructor = response.data as InstitutionInstructor
      setInstitution((prev) => prev ? ({
        ...prev,
        instructors: [createdInstructor, ...(prev.instructors || []).filter((item) => item.id !== createdInstructor.id)],
      }) : prev)
      setNewInstructorForm({
        full_name: '',
        email: '',
        phone: '',
        password: '',
        city: '',
        district: '',
        specialization: '',
        title: '',
        experience_years: '0',
        bio: '',
      })
      toast.success('Eğitmen hesabı oluşturuldu ve kuruma bağlandı')
    } catch (error: any) {
      console.error('Error creating institution instructor:', error)
      toast.error(error?.response?.data?.detail || 'Eğitmen hesabı oluşturulamadı')
    } finally {
      setCreatingInstructor(false)
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
                        controlsList="nodownload noremoteplayback"
                        disablePictureInPicture
                        playsInline
                        preload="metadata"
                        poster={institution.cover_image || undefined}
                        onContextMenu={(e) => e.preventDefault()}
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

                {/* Brochure */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center">
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Kurum Broşürü (JPG, JPEG, PNG)
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
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload('brochure_pdf', file)
                      }}
                      className="hidden"
                    />
                  </div>
                  {institution.brochure_pdf ? (
                    (institution.brochure_is_image ?? isBrochureImage(institution.brochure_pdf)) ? (
                      <a
                        href={institution.brochure_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block overflow-hidden rounded-xl border border-gray-200 bg-white"
                      >
                        <img
                          src={institution.brochure_pdf}
                          alt={`${institution.name} broşürü`}
                          draggable={false}
                          onContextMenu={(e) => e.preventDefault()}
                          className="h-64 w-full object-contain bg-gray-50 transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                        <div className="border-t border-gray-100 px-4 py-3">
                          <p className="font-medium">Kurum Broşürü</p>
                          <p className="text-sm text-gray-600">Görseli yeni sekmede aç</p>
                        </div>
                      </a>
                    ) : (
                      <a
                        href={institution.brochure_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <FileText className="w-8 h-8 text-red-600 mr-3" />
                        <div>
                          <p className="font-medium">Kurum Broşürü</p>
                          <p className="text-sm text-gray-600">Dosyayı görüntüle</p>
                        </div>
                      </a>
                    )
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                      <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">Henüz broşür yüklenmemiş</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserPlus className="w-5 h-5 mr-2 text-blue-600" />
                  Kurumdan Eğitmen Ekle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-900">
                  Bu panelden oluşturulan eğitmen hesabı doğrudan <span className="font-semibold">{institution.name}</span> kurumuna bağlı ve onaylı açılır.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Ad Soyad *</label>
                    <Input
                      value={newInstructorForm.full_name}
                      onChange={(e) => setNewInstructorForm((prev) => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Örn. Ayşe Yılmaz"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">E-posta *</label>
                    <Input
                      type="email"
                      value={newInstructorForm.email}
                      onChange={(e) => setNewInstructorForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="egitmen@kurum.com"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Telefon *</label>
                    <Input
                      value={newInstructorForm.phone}
                      onChange={(e) => setNewInstructorForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="05..."
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Geçici Şifre *</label>
                    <Input
                      type="text"
                      value={newInstructorForm.password}
                      onChange={(e) => setNewInstructorForm((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="Kullanıcıya iletilecek şifre"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Şehir</label>
                    <Input
                      value={newInstructorForm.city}
                      onChange={(e) => setNewInstructorForm((prev) => ({ ...prev, city: e.target.value }))}
                      placeholder={institution.city || 'Şehir'}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">İlçe</label>
                    <Input
                      value={newInstructorForm.district}
                      onChange={(e) => setNewInstructorForm((prev) => ({ ...prev, district: e.target.value }))}
                      placeholder={institution.district || 'İlçe'}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Uzmanlık</label>
                    <Input
                      value={newInstructorForm.specialization}
                      onChange={(e) => setNewInstructorForm((prev) => ({ ...prev, specialization: e.target.value }))}
                      placeholder="Matematik, İngilizce, Yazılım..."
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Unvan</label>
                    <Input
                      value={newInstructorForm.title}
                      onChange={(e) => setNewInstructorForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Uzman Öğretici"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Deneyim (Yıl)</label>
                    <Input
                      type="number"
                      min={0}
                      value={newInstructorForm.experience_years}
                      onChange={(e) => setNewInstructorForm((prev) => ({ ...prev, experience_years: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Kısa Biyografi</label>
                  <Textarea
                    rows={4}
                    value={newInstructorForm.bio}
                    onChange={(e) => setNewInstructorForm((prev) => ({ ...prev, bio: e.target.value }))}
                    placeholder="Eğitmenin öne çıkan deneyimi, uzmanlık alanı ve kısa tanıtımı"
                    className="rounded-xl"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleCreateInstructor}
                    disabled={creatingInstructor}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {creatingInstructor ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Oluşturuluyor...
                      </>
                    ) : (
                      'Kurumdan Eğitmen Ekle'
                    )}
                  </Button>
                </div>

                <div className="space-y-3 border-t border-gray-100 pt-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">Bağlı Eğitmenler</p>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                      {(institution.instructors || []).length} kayıt
                    </span>
                  </div>

                  {(institution.instructors || []).length > 0 ? (
                    <div className="space-y-3">
                      {(institution.instructors || []).map((instructor) => (
                        <div
                          key={instructor.id}
                          className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-gray-900">{instructor.full_name}</p>
                              <p className="text-sm text-gray-600">{instructor.email}</p>
                              <p className="text-sm text-gray-600">{instructor.phone}</p>
                            </div>
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                              {instructor.is_approved ? 'Onaylı' : 'Beklemede'}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                            {instructor.title ? (
                              <span className="rounded-full bg-slate-100 px-3 py-1">{instructor.title}</span>
                            ) : null}
                            {instructor.specialization ? (
                              <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{instructor.specialization}</span>
                            ) : null}
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                              {instructor.experience_years || 0} yıl deneyim
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                      Bu kuruma bağlı eğitmen henüz yok.
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
