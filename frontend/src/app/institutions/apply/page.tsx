'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/lib/store'
import { institutionsAPI } from '@/lib/api'
import citiesData from '@/data/cities.json'

type Institution = {
  id: number
  name: string
  city: string
  district?: string
}

export default function InstitutionApplyPage() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [applyMode, setApplyMode] = useState<'existing' | 'new'>('existing')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    institution_id: '',
    name: '',
    description: '',
    city: '',
    district: '',
    address: '',
    phone: '',
    email: '',
    website: '',
  })

  const cities = citiesData.cities
  const districts = useMemo(() => {
    const selected = cities.find(c => c.name === formData.city)
    return selected?.districts || []
  }, [cities, formData.city])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?next=/institutions/apply')
      return
    }
    if (user?.role !== 'institution' && user?.role !== 'instructor') {
      router.push('/auth/register-institution')
      return
    }
  }, [isAuthenticated, user, router])

  useEffect(() => {
    institutionsAPI.getPublicInstitutions()
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : []
        setInstitutions(data)
      })
      .catch(() => setInstitutions([]))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)
    try {
      const payload: any = {
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        website: formData.website || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        district: formData.district || undefined,
      }

      if (applyMode === 'existing') {
        if (!formData.institution_id) {
          setError('Lütfen bir kurum seçin')
          setLoading(false)
          return
        }
        payload.institution_id = Number(formData.institution_id)
      } else {
        if (!formData.name || !formData.description || !formData.city) {
          setError('Kurum adı, açıklama ve şehir zorunludur')
          setLoading(false)
          return
        }
        payload.name = formData.name
        payload.description = formData.description
      }

      await institutionsAPI.applyInstitution(payload)
      setSuccess(true)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Başvuru gönderilemedi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-10">
      <div className="max-w-3xl mx-auto px-4">
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-center">
                <Building className="w-5 h-5" />
              </span>
              Kurum Başvurusu
            </CardTitle>
            <p className="text-gray-600 text-sm">
              Mevcut kurumunuzu seçebilir veya yeni kurum başvurusu oluşturabilirsiniz.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setApplyMode('existing')}
                  className={`px-4 py-2 rounded-full text-sm font-medium border ${
                    applyMode === 'existing'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  Mevcut Kurum
                </button>
                <button
                  type="button"
                  onClick={() => setApplyMode('new')}
                  className={`px-4 py-2 rounded-full text-sm font-medium border ${
                    applyMode === 'new'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  Yeni Kurum
                </button>
              </div>

              {applyMode === 'existing' && (
                <div>
                  <Label htmlFor="institution_id">Kurum Seçin</Label>
                  <select
                    id="institution_id"
                    name="institution_id"
                    value={formData.institution_id}
                    onChange={handleChange}
                    className="w-full h-12 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Kurum seçin</option>
                    {institutions.map(inst => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.city}{inst.district ? ` / ${inst.district}` : ''})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {applyMode === 'new' && (
                <>
                  <div>
                    <Label htmlFor="name">Kurum Adı</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} />
                  </div>
                  <div>
                    <Label htmlFor="description">Kurum Açıklaması</Label>
                    <Textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={4} />
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Şehir</Label>
                  <select
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={(e) => {
                      handleChange(e)
                      setFormData(prev => ({ ...prev, district: '' }))
                    }}
                    className="w-full h-12 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Şehir seçin</option>
                    {cities.map(city => (
                      <option key={city.id} value={city.name}>{city.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="district">İlçe</Label>
                  <select
                    id="district"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    className="w-full h-12 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    disabled={!formData.city}
                  >
                    <option value="">İlçe seçin</option>
                    {districts.map((d: string, idx: number) => (
                      <option key={idx} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="address">Adres</Label>
                <Input id="address" name="address" value={formData.address} onChange={handleChange} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
                </div>
                <div>
                  <Label htmlFor="email">E-posta</Label>
                  <Input id="email" name="email" value={formData.email} onChange={handleChange} />
                </div>
              </div>

              <div>
                <Label htmlFor="website">Web Sitesi</Label>
                <Input id="website" name="website" value={formData.website} onChange={handleChange} />
              </div>

              {error && (
                <div className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}
              {success && (
                <div className="text-sm text-green-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Başvurunuz alındı. Yönetici onayı bekleniyor.
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full h-12">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  'Başvuruyu Gönder'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
