'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Building, ArrowLeft, Save, Upload, Image as ImageIcon, Video as VideoIcon, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { adminAPI } from '@/lib/api'
import toast from 'react-hot-toast'

export default function CreateInstitution() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  
  const logoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const brochureInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    city: '',
    district: '',
    address: '',
    latitude: null as number | null,
    longitude: null as number | null,
    phone: '',
    email: '',
    website: '',
    logo: '',
    cover_image: '',
    intro_video: '',
    image_color: 'from-blue-500 to-purple-600',
    total_students: 0,
    total_courses: 0,
    rating: 0,
    total_ratings: 0,
    is_active: true,
    is_featured: false,
  })

  const [uploadedFiles, setUploadedFiles] = useState({
    logo: null as File | null,
    cover_image: null as File | null,
    intro_video: null as File | null,
    brochure_pdf: null as File | null,
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

  const handleFileSelect = (kind: 'logo' | 'cover_image' | 'intro_video' | 'brochure_pdf', file: File | null) => {
    if (file) {
      setUploadedFiles(prev => ({ ...prev, [kind]: file }))
    }
  }

  const uploadFileToS3 = async (institutionId: number, kind: 'logo' | 'cover_image' | 'intro_video' | 'brochure_pdf', file: File) => {
    try {
      setUploading(kind)
      
      // Get presigned URL
      const presignResp = await adminAPI.presignInstitutionUpload(institutionId, {
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
        await adminAPI.setInstitutionLogo(institutionId, public_url)
      } else if (kind === 'cover_image') {
        await adminAPI.setInstitutionCover(institutionId, public_url)
      } else if (kind === 'intro_video') {
        await adminAPI.setInstitutionVideo(institutionId, public_url)
      } else if (kind === 'brochure_pdf') {
        await adminAPI.setInstitutionBrochure(institutionId, public_url)
      }
      
      const fileNames: Record<string, string> = {
        logo: 'Logo',
        cover_image: 'Kapak resmi',
        intro_video: 'Video',
        brochure_pdf: 'Broşür'
      }
      toast.success(`${fileNames[kind]} yüklendi`)
    } catch (error) {
      console.error(`Error uploading ${kind}:`, error)
      const fileNames: Record<string, string> = {
        logo: 'Logo',
        cover_image: 'Kapak resmi',
        intro_video: 'Video',
        brochure_pdf: 'Broşür'
      }
      toast.error(`${fileNames[kind]} yüklenemedi`)
    } finally {
      setUploading(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.description || !formData.city) {
      toast.error('Lütfen zorunlu alanları doldurun')
      return
    }

    setLoading(true)
    try {
      // Create institution first
      const response = await adminAPI.createInstitution(formData)
      const institutionId = response.data.id

      // Upload files if selected
      if (uploadedFiles.logo) {
        await uploadFileToS3(institutionId, 'logo', uploadedFiles.logo)
      }
      if (uploadedFiles.cover_image) {
        await uploadFileToS3(institutionId, 'cover_image', uploadedFiles.cover_image)
      }
      if (uploadedFiles.intro_video) {
        await uploadFileToS3(institutionId, 'intro_video', uploadedFiles.intro_video)
      }
      if (uploadedFiles.brochure_pdf) {
        await uploadFileToS3(institutionId, 'brochure_pdf', uploadedFiles.brochure_pdf)
      }

      toast.success('Kurum başarıyla oluşturuldu!')
      router.push('/admin/institutions')
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.response?.data?.detail || 'Kurum oluşturulamadı')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => router.back()} className="rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                Yeni Kurum Ekle
              </h1>
              <p className="text-xl text-gray-600">Anlaşmalı eğitim kurumu oluşturun</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg mb-6">
            <CardHeader>
              <CardTitle className="flex items-center text-xl font-bold">
                <Building className="w-5 h-5 mr-2 text-blue-600" />
                Kurum Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kurum Adı *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Örn: Boğaziçi Eğitim Kurumları"
                    className="rounded-xl"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Kurum hakkında kısa açıklama"
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Şehir *</label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20"
                    required
                  >
                    <option value="">Şehir seçin</option>
                    {cities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">İlçe</label>
                  <Input
                    value={formData.district}
                    onChange={(e) => setFormData({...formData, district: e.target.value})}
                    placeholder="İlçe adı"
                    className="rounded-xl"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adres</label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Tam adres"
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="0212 XXX XX XX"
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">E-posta</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="info@kurum.com"
                    className="rounded-xl"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                  <Input
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    placeholder="https://www.kurum.com"
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect('logo', e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <ImageIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-2">Logo yükleyin (PNG, JPG)</p>
                    <Button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      variant="outline"
                      size="sm"
                      disabled={uploading === 'logo'}
                      className="rounded-lg"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading === 'logo' ? 'Yükleniyor...' : 'Dosya Seç'}
                    </Button>
                    {uploadedFiles.logo && (
                      <p className="text-green-600 text-sm mt-2">✓ {uploadedFiles.logo.name}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kapak Resmi</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect('cover_image', e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <ImageIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-2">Kapak resmi yükleyin (1920x600 önerilen)</p>
                    <Button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      variant="outline"
                      size="sm"
                      disabled={uploading === 'cover_image'}
                      className="rounded-lg"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading === 'cover_image' ? 'Yükleniyor...' : 'Dosya Seç'}
                    </Button>
                    {uploadedFiles.cover_image && (
                      <p className="text-green-600 text-sm mt-2">✓ {uploadedFiles.cover_image.name}</p>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tanıtım Videosu</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleFileSelect('intro_video', e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <VideoIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-2">Tanıtım videosu yükleyin (MP4, MOV)</p>
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        videoInputRef.current?.click()
                      }}
                      variant="outline"
                      size="sm"
                      disabled={uploading === 'intro_video'}
                      className="rounded-lg"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading === 'intro_video' ? 'Yükleniyor...' : 'Dosya Seç'}
                    </Button>
                    {uploadedFiles.intro_video && (
                      <p className="text-green-600 text-sm mt-2">✓ {uploadedFiles.intro_video.name}</p>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kurum Broşürü (JPG, JPEG, PNG)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      ref={brochureInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                      onChange={(e) => handleFileSelect('brochure_pdf', e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-2">Kurum broşürü yükleyin (JPG, JPEG, PNG)</p>
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        brochureInputRef.current?.click()
                      }}
                      variant="outline"
                      size="sm"
                      disabled={uploading === 'brochure_pdf'}
                      className="rounded-lg"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading === 'brochure_pdf' ? 'Yükleniyor...' : 'Görsel Seç'}
                    </Button>
                    {uploadedFiles.brochure_pdf && (
                      <p className="text-green-600 text-sm mt-2">✓ {uploadedFiles.brochure_pdf.name}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Renk Teması</label>
                  <select
                    value={formData.image_color}
                    onChange={(e) => setFormData({...formData, image_color: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20"
                  >
                    {colors.map(color => (
                      <option key={color.value} value={color.value}>{color.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Öğrenci Sayısı</label>
                    <Input
                      type="number"
                      value={formData.total_students}
                      onChange={(e) => setFormData({...formData, total_students: parseInt(e.target.value) || 0})}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kurs Sayısı</label>
                    <Input
                      type="number"
                      value={formData.total_courses}
                      onChange={(e) => setFormData({...formData, total_courses: parseInt(e.target.value) || 0})}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <div className="font-medium text-gray-900">Aktif</div>
                      <div className="text-sm text-gray-600">Kurumu yayınla</div>
                    </div>
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

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <div className="font-medium text-gray-900">Öne Çıkan</div>
                      <div className="text-sm text-gray-600">Ana sayfada göster</div>
                    </div>
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
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="rounded-xl"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Kurumu Oluştur
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
