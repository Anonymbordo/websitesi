'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  BookOpen,
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
import { firebaseCreateUser, firebaseSendVerification, firebaseUpdateProfile } from '@/lib/firebase'
import toast from 'react-hot-toast'

export default function RegisterInstructorPage() {
  const INSTRUCTOR_SERVICE_AGREEMENT_URL = '/ogretmen-hizmeti-isbirligi-sozlesmesi'
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreementAccepted, setAgreementAccepted] = useState(false)
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

    // Full Name validation
    if (!formData.full_name) {
      newErrors.full_name = 'Ad Soyad gereklidir'
    } else if (formData.full_name.length < 3) {
      newErrors.full_name = 'Ad Soyad en az 3 karakter olmalıdır'
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'E-posta adresi gereklidir'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi giriniz'
    }

    // Phone validation
    if (!formData.phone) {
      newErrors.phone = 'Telefon numarası gereklidir'
    } else if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Geçerli bir telefon numarası giriniz (10-11 rakam)'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Şifre gereklidir'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Şifre en az 6 karakter olmalıdır'
    }

    // Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifre tekrarı gereklidir'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifreler eşleşmiyor'
    }

    if (!agreementAccepted) {
      newErrors.agreementAccepted = 'Devam etmek için sözleşmeyi kabul etmelisiniz'
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
      // 1. Firebase Kullanıcısı Oluştur
      const userCredential = await firebaseCreateUser(formData.email, formData.password)
      const user = userCredential.user

      // 2. Profil Güncelle (Ad Soyad)
      await firebaseUpdateProfile(user, formData.full_name)

      // 3. Firebase ID Token al
      const idToken = await user.getIdToken()

      // 4. Backend'e kaydet (hata olursa Firebase user'ı sil)
      try {
        await authAPI.registerInstructorFirebase(idToken, {
          full_name: formData.full_name,
          phone: formData.phone || undefined,
          agreement_accepted: agreementAccepted
        })
      } catch (backendError: any) {
        console.error('Backend register error:', backendError)
        // Firebase kullanıcısını silerek tutarsızlığı önle
        try {
          await user.delete()
        } catch (deleteErr) {
          console.error('Failed to delete Firebase user:', deleteErr)
        }
        
        const errorMessage = backendError.response?.data?.detail || 'Eğitmen kaydı sırasında bir hata oluştu.'
        throw new Error(errorMessage)
      }

      // 5. Doğrulama E-postası Gönder
      await firebaseSendVerification(user)
      
      toast.success('Eğitmen hesabınız oluşturuldu! Lütfen e-posta adresinizi doğrulayın.')
      
      // 6. Login sayfasına yönlendir (başvuruya devam)
      router.push('/auth/login?next=/instructors/apply')
    } catch (error: any) {
      console.error('Register error:', error)
      let errorMessage = 'Eğitmen kaydı başarısız.'
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Bu e-posta adresi zaten kullanımda.'
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Şifre çok zayıf.'
      } else {
        errorMessage = error.message || errorMessage
      }
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev: any) => ({ ...prev, [name]: '' }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4 py-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="hidden lg:block space-y-8">
          <Link href="/" className="inline-flex items-center space-x-3 group">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl group-hover:shadow-blue-500/25 transition-all duration-300 group-hover:scale-110">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-pulse"></div>
            </div>
            <div>
              <span className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
                Mikrokurs
              </span>
              <div className="text-sm text-gray-500 font-medium">AI Powered Learning</div>
            </div>
          </Link>

          <div className="space-y-6">
            <h1 className="text-5xl font-bold text-gray-900 leading-tight">
              Eğitmen Topluluğumuza<br />
              Katılın! 🎓
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Uzmanlığınızı paylaşın, kendi kurslarınızı oluşturun ve
              binlerce öğrenciye ulaşın. Eğitmen hesabınızı oluşturun,
              başvurunuzu tamamlayın.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            {[
              { icon: CheckCircle2, text: 'Eğitmen hesabı ve profil yönetimi' },
              { icon: CheckCircle2, text: 'Kendi kurslarını oluşturma' },
              { icon: CheckCircle2, text: 'Geniş öğrenci kitlesi' },
              { icon: CheckCircle2, text: 'Admin onaylı eğitmen profili' }
            ].map((feature, index) => (
              <div key={index} className="flex items-center space-x-3 group">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-gray-700 font-medium">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-200">
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">180+</div>
              <div className="text-sm text-gray-600 mt-1">Kurs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">67+</div>
              <div className="text-sm text-gray-600 mt-1">Eğitmen</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">12K+</div>
              <div className="text-sm text-gray-600 mt-1">Öğrenci</div>
            </div>
          </div>
        </div>

        {/* Right Side - Register Form */}
        <div className="relative">
          {/* Glass Card */}
          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl border border-white/20">
            {/* Mobile Logo */}
            <div className="lg:hidden mb-8">
              <Link href="/" className="inline-flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
                  Mikrokurs
                </span>
              </Link>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-2">
                Eğitmen Kaydı
              </h2>
              <p className="text-gray-600">Eğitmen hesabınızı oluşturun ve başvurunuzu tamamlayın</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Full Name Field */}
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-gray-700 font-medium">
                  Ad Soyad
                </Label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors duration-300" />
                  <Input
                    id="full_name"
                    name="full_name"
                    type="text"
                    placeholder="Ahmet Yılmaz"
                    value={formData.full_name}
                    onChange={handleChange}
                    className={`pl-12 pr-4 py-6 bg-gray-50 border-0 rounded-2xl focus:bg-white focus:ring-2 ${
                      errors.full_name ? 'focus:ring-red-500/20 ring-2 ring-red-500/20' : 'focus:ring-blue-500/20'
                    } transition-all duration-300 text-base text-gray-900`}
                    disabled={loading}
                  />
                  {errors.full_name && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                  )}
                </div>
                {errors.full_name && (
                  <p className="text-sm text-red-600 flex items-center mt-1">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.full_name}
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">
                  E-posta Adresi
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors duration-300" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="ornek@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    className={`pl-12 pr-4 py-6 bg-gray-50 border-0 rounded-2xl focus:bg-white focus:ring-2 ${
                      errors.email ? 'focus:ring-red-500/20 ring-2 ring-red-500/20' : 'focus:ring-blue-500/20'
                    } transition-all duration-300 text-base text-gray-900`}
                    disabled={loading}
                  />
                  {errors.email && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                  )}
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600 flex items-center mt-1">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-700 font-medium">
                  Telefon Numarası *
                </Label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors duration-300" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="5551234567"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`pl-12 pr-4 py-6 bg-gray-50 border-0 rounded-2xl focus:bg-white focus:ring-2 ${
                      errors.phone ? 'focus:ring-red-500/20 ring-2 ring-red-500/20' : 'focus:ring-blue-500/20'
                    } transition-all duration-300 text-base text-gray-900`}
                    disabled={loading}
                  />
                  {errors.phone && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                  )}
                </div>
                {errors.phone && (
                  <p className="text-sm text-red-600 flex items-center mt-1">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.phone}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">
                  Şifre
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors duration-300" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className={`pl-12 pr-12 py-6 bg-gray-50 border-0 rounded-2xl focus:bg-white focus:ring-2 ${
                      errors.password ? 'focus:ring-red-500/20 ring-2 ring-red-500/20' : 'focus:ring-blue-500/20'
                    } transition-all duration-300 text-base text-gray-900`}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600 flex items-center mt-1">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">
                  Şifre Tekrar
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors duration-300" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`pl-12 pr-12 py-6 bg-gray-50 border-0 rounded-2xl focus:bg-white focus:ring-2 ${
                      errors.confirmPassword ? 'focus:ring-red-500/20 ring-2 ring-red-500/20' : 'focus:ring-blue-500/20'
                    } transition-all duration-300 text-base text-gray-900`}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600 flex items-center mt-1">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || !agreementAccepted}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-6 rounded-2xl shadow-lg hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-[1.02] text-base group"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Eğitmen hesabı oluşturuluyor...
                  </>
                ) : (
                  <>
                    Eğitmen Kaydı
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                  </>
                )}
              </Button>

              {/* Agreements */}
              <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreementAccepted}
                    onChange={(e) => {
                      setAgreementAccepted(e.target.checked)
                      if (errors.agreementAccepted) {
                        setErrors((prev: any) => ({ ...prev, agreementAccepted: '' }))
                      }
                    }}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <span className="text-sm text-gray-700 leading-6">
                    <Link
                      href={INSTRUCTOR_SERVICE_AGREEMENT_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Öğretmen Hizmeti İşbirliği Sözleşmesi
                    </Link>
                    {' '}metnini okudum, anladım ve kabul ediyorum.
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-3">
                  Ayrıca{' '}
                  <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Kullanım Şartları
                  </Link>{' '}
                  ve{' '}
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Gizlilik Politikası
                  </Link>
                  {' '}sayfalarını inceleyebilirsiniz.
                </p>
                {errors.agreementAccepted && (
                  <p className="text-sm text-red-600 flex items-center mt-2">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.agreementAccepted}
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">veya</span>
                </div>
              </div>

              {/* Login Link */}
              <div className="text-center">
                <p className="text-gray-600">
                  Zaten hesabınız var mı?{' '}
                  <Link
                    href="/auth/login"
                    className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-300"
                  >
                    Giriş Yapın
                  </Link>
                </p>
                <p className="text-gray-500 mt-2">
                  Öğrenci olarak kayıt olmak için{' '}
                  <Link
                    href="/auth/register"
                    className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-300"
                  >
                    öğrenci kayıt sayfasına
                  </Link>{' '}
                  gidin.
                </p>
              </div>
            </form>

            {/* Decorative Elements */}
            <div className="absolute -top-4 -left-4 w-8 h-8 bg-yellow-400 rounded-full animate-ping opacity-20"></div>
            <div className="absolute -bottom-4 -right-4 w-6 h-6 bg-blue-400 rounded-full animate-ping opacity-20 delay-1000"></div>
          </div>

          {/* Background Cards */}
          <div className="absolute -top-6 -left-6 w-full h-full bg-white/40 backdrop-blur-sm rounded-3xl border border-white/20 -z-10"></div>
          <div className="absolute -top-3 -left-3 w-full h-full bg-white/30 backdrop-blur-sm rounded-3xl border border-white/10 -z-20"></div>
        </div>
      </div>
    </div>
  )
}
