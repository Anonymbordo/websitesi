'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Building,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { authAPI } from '@/lib/api'
import { firebaseCreateUser, firebaseUpdateProfile } from '@/lib/firebase'
import toast from 'react-hot-toast'

export default function RegisterInstitutionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<any>({})

  const validateForm = () => {
    const newErrors: any = {}

    if (!formData.full_name) {
      newErrors.full_name = 'Kurum adı gereklidir'
    } else if (formData.full_name.length < 3) {
      newErrors.full_name = 'Kurum adı en az 3 karakter olmalıdır'
    }

    if (!formData.email) {
      newErrors.email = 'E-posta adresi gereklidir'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi giriniz'
    }

    if (!formData.phone) {
      newErrors.phone = 'Telefon numarası gereklidir'
    } else if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Geçerli bir telefon numarası giriniz (10-11 rakam)'
    }

    if (!formData.password) {
      newErrors.password = 'Şifre gereklidir'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Şifre en az 6 karakter olmalıdır'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifre tekrarı gereklidir'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifreler eşleşmiyor'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Lütfen formu eksiksiz doldurunuz')
      return
    }

    setLoading(true)
    try {
      const userCredential = await firebaseCreateUser(formData.email, formData.password)
      const user = userCredential.user

      await firebaseUpdateProfile(user, formData.full_name)

      const idToken = await user.getIdToken()

      try {
        await authAPI.registerInstitutionFirebase(idToken, {
          full_name: formData.full_name,
          phone: formData.phone || undefined
        })
      } catch (backendError: any) {
        console.error('Backend register error:', backendError)
        try {
          await user.delete()
        } catch (deleteErr) {
          console.error('Failed to delete Firebase user:', deleteErr)
        }

        const errorMessage = backendError.response?.data?.detail || 'Kurum kaydı sırasında bir hata oluştu.'
        throw new Error(errorMessage)
      }

      toast.success('Kurum hesabı oluşturuldu. Lütfen giriş yapın.')
      router.push('/auth/login?next=/institutions/apply')
    } catch (error: any) {
      console.error('Register error:', error)
      toast.error(error.message || 'Kayıt başarısız.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev: any) => ({ ...prev, [name]: '' }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Building className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Kurum Kaydı</h1>
            <p className="text-gray-600 mt-2">Kurum hesabınızı oluşturun</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="full_name" className="text-sm font-medium text-gray-700">Kurum Adı</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="pl-10 h-12 rounded-xl"
                  placeholder="Örn. ABC Eğitim Kurumu"
                />
              </div>
              {errors.full_name && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.full_name}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">E-posta</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 h-12 rounded-xl"
                  placeholder="kurum@example.com"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.email}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Telefon</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="pl-10 h-12 rounded-xl"
                  placeholder="05xx xxx xx xx"
                />
              </div>
              {errors.phone && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.phone}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Şifre</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 pr-10 h-12 rounded-xl"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.password}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Şifre Tekrarı</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pl-10 pr-10 h-12 rounded-xl"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.confirmPassword}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  Kurum Kaydı Oluştur
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            <div className="text-center text-sm text-gray-600">
              Zaten hesabınız var mı?{' '}
              <Link href="/auth/login" className="text-blue-600 hover:underline font-medium">
                Giriş Yap
              </Link>
            </div>
          </form>

          <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 text-sm text-green-700">
            <CheckCircle2 className="w-5 h-5 mt-0.5" />
            Kayıt sonrası kurum başvurunuzu tamamlayabilirsiniz.
          </div>
        </div>
      </div>
    </div>
  )
}
