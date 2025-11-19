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
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuthStore()
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

  // Telefon doğrulama için eklenenler
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState('')

  const handleSendOtp = async () => {
    setOtpLoading(true)
    setOtpError('')
    try {
      const response = await authAPI.sendOTP(formData.phone)
      setOtpSent(true)
      if (response.data.otp) toast('Test OTP: ' + response.data.otp)
    } catch (err) {
      setOtpError('Kod gönderilemedi')
    }
    setOtpLoading(false)
  }

  const handleVerifyOtp = async () => {
    setOtpLoading(true)
    setOtpError('')
    try {
      await authAPI.verifyOTP(formData.phone, otp)
      setOtpVerified(true)
      toast.success('Telefon doğrulandı!')
    } catch (err) {
      setOtpError('Kod yanlış veya süresi doldu')
    }
    setOtpLoading(false)
  }

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

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Lütfen formu eksiksiz doldurunuz')
      return
    }
    if (!otpVerified) {
      toast.error('Lütfen telefon numaranızı doğrulayın')
      return
    }

    setLoading(true)
    try {
      // Backend'e doğrudan kayıt
      const registerData = {
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        full_name: formData.full_name,
        city: undefined,
        district: undefined,
      }

      const response = await authAPI.register(registerData)
      const user = response.data
      
      toast.success('Hesabınız başarıyla oluşturuldu! Lütfen giriş yapın.')
      
      // Kayıt başarılı, login sayfasına yönlendir
      router.push('/auth/login')
    } catch (error: any) {
      console.error('Register error:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Kayıt başarısız. Lütfen bilgilerinizi kontrol edin.'
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
                Online Sınavlar
              </span>
              <div className="text-sm text-gray-500 font-medium">AI Powered Learning</div>
            </div>
          </Link>

          <div className="space-y-6">
            <h1 className="text-5xl font-bold text-gray-900 leading-tight">
              Öğrenme Yolculuğunuza<br />
              Başlayın! 🚀
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Binlerce kurs ve uzman eğitmenlerle kariyerinizi ileriye taşıyın.
              Ücretsiz hesap oluşturun ve hemen öğrenmeye başlayın.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            {[
              { icon: CheckCircle2, text: 'Ücretsiz hesap oluşturma' },
              { icon: CheckCircle2, text: 'Binlerce kaliteli kurs' },
              { icon: CheckCircle2, text: 'Sertifikalı eğitimler' },
              { icon: CheckCircle2, text: 'Kişiselleştirilmiş öğrenme' }
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
                  Online Sınavlar
                </span>
              </Link>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-2">
                Kayıt Ol
              </h2>
              <p className="text-gray-600">Ücretsiz hesap oluşturun ve öğrenmeye başlayın</p>
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
                    } transition-all duration-300 text-base`}
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
                    } transition-all duration-300 text-base`}
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

              {/* Phone Field + OTP */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-700 font-medium">
                  Telefon Numarası
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
                    } transition-all duration-300 text-base`}
                    disabled={loading || otpSent || otpVerified}
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
                {/* Kod Gönder Butonu */}
                {!otpSent && (
                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={!formData.phone || otpLoading || errors.phone}
                    className="w-full mt-2 bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold py-3 rounded-xl shadow-md hover:shadow-blue-500/25 transition-all duration-300"
                  >
                    {otpLoading ? 'Gönderiliyor...' : 'Kod Gönder'}
                  </Button>
                )}
                {/* Kod Doğrulama Kutusu */}
                {otpSent && !otpVerified && (
                  <div className="mt-2 flex flex-col gap-2">
                    <Input
                      type="text"
                      placeholder="SMS ile gelen kod"
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      className="py-4 px-4 rounded-xl border border-gray-200"
                    />
                    <Button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otpLoading || !otp}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold py-3 rounded-xl shadow-md"
                    >
                      {otpLoading ? 'Doğrulanıyor...' : 'Kodu Doğrula'}
                    </Button>
                    {otpError && <div className="text-red-500 text-sm">{otpError}</div>}
                  </div>
                )}
                {/* Doğrulama Başarılı Mesajı */}
                {otpVerified && (
                  <div className="text-green-600 font-semibold mt-2">Telefon doğrulandı!</div>
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
                    } transition-all duration-300 text-base`}
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
                    } transition-all duration-300 text-base`}
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
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-6 rounded-2xl shadow-lg hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-[1.02] text-base group"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Hesap Oluşturuluyor...
                  </>
                ) : (
                  <>
                    Kayıt Ol
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                  </>
                )}
              </Button>

              {/* Terms */}
              <p className="text-xs text-gray-500 text-center">
                Kayıt olarak{' '}
                <Link href="/terms" className="text-blue-600 hover:underline">
                  Kullanım Şartları
                </Link>{' '}
                ve{' '}
                <Link href="/privacy" className="text-blue-600 hover:underline">
                  Gizlilik Politikası
                </Link>
                'nı kabul etmiş olursunuz.
              </p>

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
