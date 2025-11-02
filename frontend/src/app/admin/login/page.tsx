"use client"

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { authAPI } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

export default function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextParam = searchParams?.get('next') || null
  const { login } = useAuthStore()

  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [remember, setRemember] = useState(true)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [awaiting2FA, setAwaiting2FA] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Send login payload; include 2FA code if present
      const payload: any = { email: form.email, password: form.password }
      if (twoFactorCode) payload.otp_code = twoFactorCode

      const res = await authAPI.login(form.email, form.password)
      const { access_token, user, two_factor_required } = res.data

      if (two_factor_required) {
        // Backend requests 2FA verification (UI fallback)
        setAwaiting2FA(true)
        toast('İki faktör doğrulaması bekleniyor. Lütfen kodu girin.')
        setLoading(false)
        return
      }

      if (!user || user.role !== 'admin') {
        toast.error('Bu hesap admin yetkisine sahip değil')
        setLoading(false)
        return
      }

      // Use remember flag when storing token
      login(user, access_token, remember)
      toast.success('Admin olarak giriş yapıldı')
      // Redirect to next or admin dashboard
      if (nextParam) router.push(nextParam)
      else router.push('/admin')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Giriş başarısız. Bilgileri kontrol edin.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto w-14 h-14 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center shadow-md">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
              <path d="M3 13h4v7H3zM9 3h4v17H9zM15 8h6v12h-6z" fill="white" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mt-4">Admin Girişi</h2>
          <p className="text-sm text-gray-600">Lütfen admin kullanıcı bilgilerinizle giriş yapın.</p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
              <Input name="email" type="email" value={form.email} onChange={handleChange} required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
              <Input name="password" type="password" value={form.password} onChange={handleChange} required />
            </div>

            {/* İki faktör kodu (opsiyonel) */}
            {awaiting2FA && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">İki Faktör Kodu</label>
                <Input name="otp" type="text" value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value)} placeholder="000000" />
                <p className="text-xs text-gray-500 mt-1">Telefonunuza veya authenticator uygulamanıza gönderilen kodu girin.</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <input id="remember" type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4" />
              <label htmlFor="remember" className="text-sm text-gray-700">Beni hatırla</label>
            </div>

            <div className="space-y-3">
              <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white" disabled={loading}>
                {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push('/') }>
                Ana Sayfa
              </Button>
            </div>
          </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
