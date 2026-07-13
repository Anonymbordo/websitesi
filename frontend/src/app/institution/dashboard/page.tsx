'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building,
  Users,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Upload,
  BookOpen,
  Star,
  UserPlus,
  GraduationCap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/lib/store'
import { coursesAPI, institutionsAPI } from '@/lib/api'
import { getImageUrl } from '@/lib/utils'

type InstitutionInstructor = {
  id: number
  user_id: number
  full_name: string
  email: string
  phone: string
  title?: string | null
  specialization?: string | null
  is_approved: boolean
  status: 'approved' | 'pending' | 'pending_admin' | string
}

type InstructorCourse = {
  id: number
  title: string
  category?: string | null
  level?: string | null
  price: number
  discount_price?: number | null
  enrollment_count: number
  rating: number
  thumbnail?: string | null
}

type InstructorCoursesGroup = {
  instructor_id: number
  user_id: number
  full_name: string
  email: string
  phone: string
  title?: string | null
  specialization?: string | null
  total_students: number
  published_course_count: number
  courses: InstructorCourse[]
}

type InstitutionManagedCourse = {
  id: number
  instructor_id: number
  instructor_name: string
  instructor_email: string
  title: string
  description: string
  short_description?: string | null
  price: number
  discount_price?: number | null
  duration_hours: number
  level: string
  category: string
  subcategory?: string | null
  language: string
  location?: string | null
  latitude?: number | null
  longitude?: number | null
  is_online: boolean
  is_published: boolean
  what_you_will_learn?: string[] | null
  requirements?: string[] | null
  enrollment_count: number
  rating: number
  created_at: string
  updated_at: string
}

const FALLBACK_CATEGORIES = [
  'İlkokul Dersleri',
  'Ortaokul Dersleri',
  'Lise Dersleri',
  'Türkçe',
  'Matematik',
  'İngilizce',
  'Fen Bilimleri',
  'Sosyal Bilgiler',
  'Fizik',
  'Kimya',
  'Biyoloji',
  'Tarih',
  'Coğrafya',
  'Almanca',
  'Fransızca',
  'İspanyolca',
  'Rusça',
  'Yazılım Dersleri',
  'Kişisel Gelişim Dersleri',
]

export default function InstitutionDashboard() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [institution, setInstitution] = useState<any | null>(null)
  const [instructors, setInstructors] = useState<InstitutionInstructor[]>([])
  const [instructorCourses, setInstructorCourses] = useState<InstructorCoursesGroup[]>([])
  const [institutionCourses, setInstitutionCourses] = useState<InstitutionManagedCourse[]>([])
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES)

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [linkEmail, setLinkEmail] = useState('')
  const [linking, setLinking] = useState(false)
  const [saving, setSaving] = useState(false)

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  const [creatingInstructorAccount, setCreatingInstructorAccount] = useState(false)
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

  const [creatingCourse, setCreatingCourse] = useState(false)
  const [courseActionId, setCourseActionId] = useState<number | null>(null)
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null)
  const [courseForm, setCourseForm] = useState({
    instructor_id: '',
    title: '',
    description: '',
    category: '',
    level: 'beginner',
    price: '',
    discount_price: '',
    duration_hours: '',
    is_published: false,
    what_you_will_learn: '',
    requirements: '',
  })

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    city: '',
    district: '',
    address: '',
    phone: '',
    email: '',
    website: '',
  })

  const formatPrice = (value?: number | null) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(Number(value ?? 0))
  }

  const parseListField = (value: string) => {
    return value
      .split(/\n|,/g)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  const assignableInstructors = useMemo(
    () => instructors.filter((inst) => inst.status !== 'pending'),
    [instructors]
  )

  const approvedInstructorCount = instructors.filter((inst) => inst.is_approved).length
  const pendingInstructorCount = instructors.filter(
    (inst) => inst.status === 'pending' || inst.status === 'pending_admin'
  ).length
  const totalPublishedCourses = institutionCourses.filter((course) => course.is_published).length
  const totalCourseEnrollments = institutionCourses.reduce(
    (sum, course) => sum + (course.enrollment_count || 0),
    0
  )

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?next=/institution/dashboard')
      return
    }
    if (user?.role !== 'institution' && user?.role !== 'instructor') {
      router.push('/auth/register-institution')
      return
    }
    fetchData()
  }, [isAuthenticated, user, router])

  useEffect(() => {
    if (!courseForm.instructor_id && assignableInstructors.length === 1) {
      setCourseForm((prev) => ({ ...prev, instructor_id: String(assignableInstructors[0].id) }))
    }
  }, [assignableInstructors, courseForm.instructor_id])

  const fetchCategories = async () => {
    try {
      const response = await coursesAPI.getCategories()
      if (Array.isArray(response.data) && response.data.length > 0) {
        setCategories(response.data)
      } else {
        setCategories(FALLBACK_CATEGORIES)
      }
    } catch {
      setCategories(FALLBACK_CATEGORIES)
    }
  }

  const fetchInstructorCourses = async () => {
    try {
      const response = await institutionsAPI.getMyInstitutionInstructorCourses()
      setInstructorCourses(Array.isArray(response.data) ? response.data : [])
    } catch {
      setInstructorCourses([])
    }
  }

  const fetchInstitutionCourses = async () => {
    try {
      const response = await institutionsAPI.getMyInstitutionCourses()
      setInstitutionCourses(Array.isArray(response.data) ? response.data : [])
    } catch {
      setInstitutionCourses([])
    }
  }

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [institutionRes, instructorsRes] = await Promise.all([
        institutionsAPI.getMyInstitution(),
        institutionsAPI.getMyInstitutionInstructors(),
      ])

      setInstitution(institutionRes.data)
      setInstructors(Array.isArray(instructorsRes.data) ? instructorsRes.data : [])

      const inst = institutionRes.data
      setFormData({
        name: inst?.name || '',
        description: inst?.description || '',
        city: inst?.city || '',
        district: inst?.district || '',
        address: inst?.address || '',
        phone: inst?.phone || '',
        email: inst?.email || '',
        website: inst?.website || '',
      })

      setLogoPreview(getImageUrl(inst?.logo) || null)
      setCoverPreview(getImageUrl(inst?.cover_image) || null)

      await Promise.all([fetchInstructorCourses(), fetchInstitutionCourses(), fetchCategories()])
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setInstitution(null)
        setInstructorCourses([])
        setInstitutionCourses([])
      } else {
        setError(err?.response?.data?.detail || 'Veriler yüklenemedi')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await institutionsAPI.updateMyInstitution(formData)
      setInstitution(res.data)
      setSuccess('Kurum bilgileri güncellendi')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Güncelleme başarısız')
    } finally {
      setSaving(false)
    }
  }

  const uploadInstitutionAsset = async (kind: 'logo' | 'cover_image', file: File) => {
    if (!file) return
    const contentType = file.type || 'application/octet-stream'
    const presign = await institutionsAPI.presignMyInstitutionUpload({
      kind,
      filename: file.name,
      content_type: contentType,
    })

    await fetch(presign.data.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    })

    const updatePayload = kind === 'logo' ? { logo: presign.data.public_url } : { cover_image: presign.data.public_url }

    const res = await institutionsAPI.updateMyInstitution(updatePayload)
    setInstitution(res.data)
    if (kind === 'logo') {
      setLogoPreview(getImageUrl(res.data?.logo) || null)
    } else {
      setCoverPreview(getImageUrl(res.data?.cover_image) || null)
    }
  }

  const handleUploadLogo = async () => {
    if (!logoFile) return
    setUploadingLogo(true)
    setError(null)
    setSuccess(null)
    try {
      await uploadInstitutionAsset('logo', logoFile)
      setSuccess('Logo güncellendi')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Logo yüklenemedi')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleUploadCover = async () => {
    if (!coverFile) return
    setUploadingCover(true)
    setError(null)
    setSuccess(null)
    try {
      await uploadInstitutionAsset('cover_image', coverFile)
      setSuccess('Kapak görseli güncellendi')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Kapak görseli yüklenemedi')
    } finally {
      setUploadingCover(false)
    }
  }

  const handleLinkInstructor = async () => {
    if (!linkEmail.trim()) return
    setLinking(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await institutionsAPI.linkInstructor({ email: linkEmail.trim() })
      setInstructors((prev) => [res.data, ...prev.filter((i) => i.id !== res.data.id)])
      setLinkEmail('')
      if (res.data?.status === 'pending') {
        setSuccess('Eğitmen talebi kurum eşleştirme onayına gönderildi')
      } else {
        setSuccess('Eğitmen kuruma eklendi')
      }
      await Promise.all([fetchInstructorCourses(), fetchInstitutionCourses()])
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Eğitmen eklenemedi')
    } finally {
      setLinking(false)
    }
  }

  const handleCreateInstructorAccount = async () => {
    if (!newInstructorForm.full_name || !newInstructorForm.email || !newInstructorForm.phone || !newInstructorForm.password) {
      setError('Yeni eğitmen için ad, e-posta, telefon ve şifre zorunludur')
      return
    }

    setCreatingInstructorAccount(true)
    setError(null)
    setSuccess(null)

    try {
      const payload = {
        ...newInstructorForm,
        experience_years: Number(newInstructorForm.experience_years || 0),
      }

      const res = await institutionsAPI.createInstitutionInstructor(payload)
      setInstructors((prev) => [res.data, ...prev.filter((i) => i.id !== res.data.id)])
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
      setSuccess('Eğitmen hesabı oluşturuldu. Admin onayı bekleniyor.')
      await Promise.all([fetchInstructorCourses(), fetchInstitutionCourses()])
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Eğitmen hesabı oluşturulamadı')
    } finally {
      setCreatingInstructorAccount(false)
    }
  }

  const handleCreateCourse = async () => {
    if (!courseForm.title || !courseForm.description || !courseForm.category || !courseForm.price || !courseForm.duration_hours) {
      setError('Ders başlığı, açıklama, kategori, fiyat ve süre zorunludur')
      return
    }

    if (!courseForm.instructor_id) {
      setError('Dersi oluşturmak için bir eğitmen seçmelisiniz')
      return
    }

    setCreatingCourse(true)
    setError(null)
    setSuccess(null)

    try {
      const payload: any = {
        instructor_id: Number(courseForm.instructor_id),
        title: courseForm.title,
        description: courseForm.description,
        category: courseForm.category,
        level: courseForm.level,
        price: Number(courseForm.price),
        discount_price: courseForm.discount_price ? Number(courseForm.discount_price) : undefined,
        duration_hours: Number(courseForm.duration_hours),
        is_published: courseForm.is_published,
        what_you_will_learn: parseListField(courseForm.what_you_will_learn),
        requirements: parseListField(courseForm.requirements),
      }

      if (editingCourseId) {
        await institutionsAPI.updateMyInstitutionCourse(editingCourseId, payload)
      } else {
        await institutionsAPI.createMyInstitutionCourse(payload)
      }
      setCourseForm((prev) => ({
        ...prev,
        title: '',
        description: '',
        category: '',
        price: '',
        discount_price: '',
        duration_hours: '',
        what_you_will_learn: '',
        requirements: '',
        is_published: false,
      }))
      setEditingCourseId(null)
      setSuccess(editingCourseId ? 'Ders güncellendi' : 'Ders oluşturuldu')
      await Promise.all([fetchInstitutionCourses(), fetchInstructorCourses()])
    } catch (err: any) {
      setError(err?.response?.data?.detail || (editingCourseId ? 'Ders güncellenemedi' : 'Ders oluşturulamadı'))
    } finally {
      setCreatingCourse(false)
    }
  }

  const handleStartEditCourse = (course: InstitutionManagedCourse) => {
    setEditingCourseId(course.id)
    setCourseForm({
      instructor_id: String(course.instructor_id),
      title: course.title || '',
      description: course.description || '',
      category: course.category || '',
      level: course.level || 'beginner',
      price: String(course.price ?? ''),
      discount_price: course.discount_price == null ? '' : String(course.discount_price),
      duration_hours: String(course.duration_hours ?? ''),
      is_published: Boolean(course.is_published),
      what_you_will_learn: Array.isArray(course.what_you_will_learn) ? course.what_you_will_learn.join('\n') : '',
      requirements: Array.isArray(course.requirements) ? course.requirements.join('\n') : '',
    })
    setError(null)
    setSuccess(null)
  }

  const handleCancelEditCourse = () => {
    setEditingCourseId(null)
    setCourseForm((prev) => ({
      ...prev,
      instructor_id: assignableInstructors.length === 1 ? String(assignableInstructors[0].id) : '',
      title: '',
      description: '',
      category: '',
      level: 'beginner',
      price: '',
      discount_price: '',
      duration_hours: '',
      is_published: false,
      what_you_will_learn: '',
      requirements: '',
    }))
    setError(null)
    setSuccess(null)
  }

  const handleTogglePublishCourse = async (course: InstitutionManagedCourse) => {
    setCourseActionId(course.id)
    setError(null)
    setSuccess(null)

    try {
      await institutionsAPI.updateMyInstitutionCourse(course.id, { is_published: !course.is_published })
      setSuccess(course.is_published ? 'Ders yayından kaldırıldı' : 'Ders yayına alındı')
      await Promise.all([fetchInstitutionCourses(), fetchInstructorCourses()])
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Ders durumu güncellenemedi')
    } finally {
      setCourseActionId(null)
    }
  }

  const handleDeleteCourse = async (courseId: number) => {
    if (!confirm('Bu dersi silmek istediğinize emin misiniz?')) return

    setCourseActionId(courseId)
    setError(null)
    setSuccess(null)

    try {
      await institutionsAPI.deleteMyInstitutionCourse(courseId)
      setSuccess('Ders silindi')
      await Promise.all([fetchInstitutionCourses(), fetchInstructorCourses()])
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Ders silinemedi')
    } finally {
      setCourseActionId(null)
    }
  }

  const handleUnlink = async (instructorId: number, status: string) => {
    const question = status === 'pending' ? 'Eğitmen eşleştirme talebini iptal etmek istiyor musunuz?' : 'Eğitmeni kurumdan ayırmak istiyor musunuz?'
    if (!confirm(question)) return

    try {
      await institutionsAPI.unlinkInstructor(instructorId)
      setInstructors((prev) => prev.filter((i) => i.id !== instructorId))
      await Promise.all([fetchInstructorCourses(), fetchInstitutionCourses()])
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Eğitmen çıkarılamadı')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!institution) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Kurum Bulunamadı</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Önce kurum başvurunuzu tamamlayın.</p>
            <Button onClick={() => router.push('/institutions/apply')} className="w-full">
              Kurum Başvurusu
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-center shadow-lg">
              <Building className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{institution.name}</h1>
              <p className="text-sm text-gray-500">Durum: {institution.is_active ? 'Aktif' : 'Onay Bekliyor'}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        {success && (
          <div className="mb-4 text-sm text-green-600 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Kurum Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                  <Label>Logo</Label>
                  <div className="w-24 h-24 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Building className="w-8 h-8 text-gray-300" />
                    )}
                  </div>
                  <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                  <Button size="sm" variant="outline" onClick={handleUploadLogo} disabled={uploadingLogo || !logoFile}>
                    {uploadingLogo ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Yükleniyor...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Logo Yükle
                      </>
                    )}
                  </Button>
                </div>

                <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                  <Label>Kapak Görseli</Label>
                  <div className="w-full h-24 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                    {coverPreview ? (
                      <img src={coverPreview} alt="Kapak" className="w-full h-full object-cover" />
                    ) : (
                      <Building className="w-8 h-8 text-gray-300" />
                    )}
                  </div>
                  <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
                  <Button size="sm" variant="outline" onClick={handleUploadCover} disabled={uploadingCover || !coverFile}>
                    {uploadingCover ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Yükleniyor...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Kapak Yükle
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="name">Kurum Adı</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="description">Açıklama</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} rows={4} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Şehir</Label>
                  <Input id="city" value={formData.city} onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="district">İlçe</Label>
                  <Input id="district" value={formData.district} onChange={(e) => setFormData((prev) => ({ ...prev, district: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Adres</Label>
                <Input id="address" value={formData.address} onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" value={formData.phone} onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="email">E-posta</Label>
                  <Input id="email" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label htmlFor="website">Web Sitesi</Label>
                <Input id="website" value={formData.website} onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))} />
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  'Kaydet'
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" /> Kurum Eğitmenleri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label htmlFor="linkEmail">Mevcut Eğitmeni Kuruma Bağla</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="linkEmail"
                    value={linkEmail}
                    onChange={(e) => setLinkEmail(e.target.value)}
                    placeholder="egitmen@example.com"
                  />
                  <Button onClick={handleLinkInstructor} disabled={linking}>
                    {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Sadece sistemde kayıtlı eğitmenler eklenebilir.</p>
              </div>

              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Yeni Eğitmen Hesabı Oluştur
                </p>
                <div className="grid grid-cols-1 gap-3">
                  <Input
                    placeholder="Ad Soyad"
                    value={newInstructorForm.full_name}
                    onChange={(e) => setNewInstructorForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  />
                  <Input
                    placeholder="E-posta"
                    value={newInstructorForm.email}
                    onChange={(e) => setNewInstructorForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                  <Input
                    placeholder="Telefon"
                    value={newInstructorForm.phone}
                    onChange={(e) => setNewInstructorForm((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                  <Input
                    placeholder="Geçici Şifre"
                    type="password"
                    value={newInstructorForm.password}
                    onChange={(e) => setNewInstructorForm((prev) => ({ ...prev, password: e.target.value }))}
                  />
                  <Input
                    placeholder="Uzmanlık"
                    value={newInstructorForm.specialization}
                    onChange={(e) => setNewInstructorForm((prev) => ({ ...prev, specialization: e.target.value }))}
                  />
                  <Input
                    placeholder="Unvan"
                    value={newInstructorForm.title}
                    onChange={(e) => setNewInstructorForm((prev) => ({ ...prev, title: e.target.value }))}
                  />
                  <Input
                    placeholder="Deneyim (yıl)"
                    type="number"
                    min={0}
                    value={newInstructorForm.experience_years}
                    onChange={(e) => setNewInstructorForm((prev) => ({ ...prev, experience_years: e.target.value }))}
                  />
                  <Textarea
                    placeholder="Kısa biyografi"
                    rows={3}
                    value={newInstructorForm.bio}
                    onChange={(e) => setNewInstructorForm((prev) => ({ ...prev, bio: e.target.value }))}
                  />
                  <Button onClick={handleCreateInstructorAccount} disabled={creatingInstructorAccount}>
                    {creatingInstructorAccount ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Oluşturuluyor...
                      </>
                    ) : (
                      'Eğitmen Hesabı Oluştur'
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {instructors.length === 0 && <p className="text-sm text-gray-500">Henüz eğitmen yok.</p>}
                {instructors.map((inst) => (
                  <div key={inst.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{inst.full_name}</p>
                      <p className="text-xs text-gray-500">{inst.email}</p>
                      {inst.status === 'pending' && (
                        <p className="text-xs text-amber-600 mt-1">Kurum eşleştirme onayı bekliyor</p>
                      )}
                      {inst.status === 'pending_admin' && (
                        <p className="text-xs text-amber-600 mt-1">Admin eğitmen onayı bekliyor</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleUnlink(inst.id, inst.status)}
                      className="text-red-500 hover:text-red-600"
                      title={inst.status === 'pending' ? 'Talebi iptal et' : 'Kurumdan çıkar'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">Onaylı Eğitmen</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{approvedInstructorCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">Yayınlanan Ders</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalPublishedCourses}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">Toplam Kayıtlı Öğrenci</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalCourseEnrollments}</p>
              {pendingInstructorCount > 0 && (
                <p className="text-xs text-amber-600 mt-2">{pendingInstructorCount} eğitmen talebi/onayı bekliyor</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" /> Kurum Ders Yönetimi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border border-gray-100 rounded-xl p-4 space-y-4">
              <p className="font-semibold text-gray-900">
                {editingCourseId ? 'Dersi Düzenle' : 'Yeni Ders Oluştur'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="course_instructor">Eğitmen</Label>
                  <select
                    id="course_instructor"
                    value={courseForm.instructor_id}
                    onChange={(e) => setCourseForm((prev) => ({ ...prev, instructor_id: e.target.value }))}
                    className="w-full h-11 px-3 border border-gray-200 rounded-lg"
                  >
                    <option value="">Eğitmen seçin</option>
                    {assignableInstructors.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.full_name} {inst.status === 'pending_admin' ? '(Admin Onayı Bekliyor)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="course_category">Kategori</Label>
                  <select
                    id="course_category"
                    value={courseForm.category}
                    onChange={(e) => setCourseForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full h-11 px-3 border border-gray-200 rounded-lg"
                  >
                    <option value="">Kategori seçin</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="course_title">Ders Başlığı</Label>
                <Input
                  id="course_title"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="course_description">Ders Açıklaması</Label>
                <Textarea
                  id="course_description"
                  rows={4}
                  value={courseForm.description}
                  onChange={(e) => setCourseForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="course_level">Seviye</Label>
                  <select
                    id="course_level"
                    value={courseForm.level}
                    onChange={(e) => setCourseForm((prev) => ({ ...prev, level: e.target.value }))}
                    className="w-full h-11 px-3 border border-gray-200 rounded-lg"
                  >
                    <option value="beginner">Başlangıç</option>
                    <option value="intermediate">Orta</option>
                    <option value="advanced">İleri</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="course_price">Fiyat</Label>
                  <Input
                    id="course_price"
                    type="number"
                    min={0}
                    value={courseForm.price}
                    onChange={(e) => setCourseForm((prev) => ({ ...prev, price: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="course_discount_price">İndirimli Fiyat</Label>
                  <Input
                    id="course_discount_price"
                    type="number"
                    min={0}
                    value={courseForm.discount_price}
                    onChange={(e) => setCourseForm((prev) => ({ ...prev, discount_price: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="course_duration">Süre (Saat)</Label>
                  <Input
                    id="course_duration"
                    type="number"
                    min={1}
                    value={courseForm.duration_hours}
                    onChange={(e) => setCourseForm((prev) => ({ ...prev, duration_hours: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="what_you_will_learn">Öğrenilecekler (satır satır)</Label>
                  <Textarea
                    id="what_you_will_learn"
                    rows={4}
                    value={courseForm.what_you_will_learn}
                    onChange={(e) => setCourseForm((prev) => ({ ...prev, what_you_will_learn: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="requirements">Gereksinimler (satır satır)</Label>
                  <Textarea
                    id="requirements"
                    rows={4}
                    value={courseForm.requirements}
                    onChange={(e) => setCourseForm((prev) => ({ ...prev, requirements: e.target.value }))}
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={courseForm.is_published}
                  onChange={(e) => setCourseForm((prev) => ({ ...prev, is_published: e.target.checked }))}
                />
                Oluştururken yayına al
              </label>

              <div>
                <Button onClick={handleCreateCourse} disabled={creatingCourse}>
                  {creatingCourse ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingCourseId ? 'Güncelleniyor...' : 'Oluşturuluyor...'}
                    </>
                  ) : (
                    editingCourseId ? 'Dersi Güncelle' : 'Ders Oluştur'
                  )}
                </Button>
                {editingCourseId && (
                  <Button variant="ghost" onClick={handleCancelEditCourse} className="ml-2">
                    İptal
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="font-semibold text-gray-900">Kurum Dersleri</p>
              {institutionCourses.length === 0 && (
                <p className="text-sm text-gray-500">Henüz kurum adına oluşturulmuş ders yok.</p>
              )}

              {institutionCourses.map((course) => (
                <div key={course.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <Link href={`/courses/${course.id}`} className="font-semibold text-gray-900 hover:text-blue-700">
                        {course.title}
                      </Link>
                      <p className="text-xs text-gray-500 mt-1">
                        {course.instructor_name} ({course.instructor_email})
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {course.category} • {course.level} • {course.duration_hours} saat
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatPrice(course.discount_price ?? course.price)}</p>
                      {course.discount_price && (
                        <p className="text-xs text-gray-400 line-through">{formatPrice(course.price)}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {course.enrollment_count} öğrenci • {course.rating.toFixed(1)} puan
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        course.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {course.is_published ? 'Yayında' : 'Taslak'}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartEditCourse(course)}
                      disabled={courseActionId === course.id}
                    >
                      <Pencil className="w-4 h-4 mr-1" /> Düzenle
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTogglePublishCourse(course)}
                      disabled={courseActionId === course.id}
                    >
                      {courseActionId === course.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : course.is_published ? (
                        'Yayından Kaldır'
                      ) : (
                        'Yayına Al'
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteCourse(course.id)}
                      disabled={courseActionId === course.id}
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Sil
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Eğitmenlerin Yayınladığı Dersler
            </CardTitle>
          </CardHeader>
          <CardContent>
            {instructorCourses.length === 0 ? (
              <p className="text-sm text-gray-500">Kurumunuza bağlı eğitmenlerin henüz yayınlanmış dersi bulunmuyor.</p>
            ) : (
              <div className="space-y-4">
                {instructorCourses.map((instructor) => (
                  <div key={instructor.instructor_id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{instructor.full_name}</p>
                        <p className="text-xs text-gray-500">{instructor.email}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                          <BookOpen className="w-3.5 h-3.5 mr-1" />
                          {instructor.published_course_count} yayın
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                          <Users className="w-3.5 h-3.5 mr-1" />
                          {instructor.total_students || 0} öğrenci
                        </span>
                      </div>
                    </div>

                    {instructor.courses.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
                        {instructor.courses.map((course) => (
                          <Link
                            key={course.id}
                            href={`/courses/${course.id}`}
                            className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                          >
                            <p className="font-medium text-sm text-gray-900 line-clamp-2">{course.title}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {course.category || 'Kategori yok'} • {course.level || 'Seviye yok'}
                            </p>

                            <div className="flex items-center justify-between mt-3 text-xs text-gray-600">
                              <span>{course.enrollment_count || 0} öğrenci</span>
                              <span className="inline-flex items-center">
                                <Star className="w-3.5 h-3.5 mr-1 text-amber-500" />
                                {(course.rating || 0).toFixed(1)}
                              </span>
                            </div>

                            <div className="mt-3 flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">{formatPrice(course.discount_price ?? course.price)}</span>
                              {course.discount_price && (
                                <span className="text-xs text-gray-400 line-through">{formatPrice(course.price)}</span>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 mt-3">Henüz yayınlanan ders yok.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
