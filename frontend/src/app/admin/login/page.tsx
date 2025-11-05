"use client"

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { authAPI } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextParam = searchParams?.get('next') || null
  const { login } = useAuthStore()

  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    console.log('🔐 Admin login başlatıldı:', form.email)
    
    try {
      console.log('📡 API isteği gönderiliyor...')
      const res = await authAPI.login(form.email, form.password)
      console.log('✅ API yanıtı:', res.data)
      
      const { access_token, user } = res.data

      // Admin kontrolü
      if (!user || user.role !== 'admin') {
        console.error('❌ Admin değil:', user)
        toast.error('Bu hesap admin yetkisine sahip değil')
        setLoading(false)
        return
      }

      console.log('✅ Admin kontrolü geçti:', user)
      
      // Login işlemi
      login(user, access_token)
      toast.success('Admin olarak giriş yapıldı')
      
      console.log('🔄 Yönlendiriliyor...')
      // Redirect
      if (nextParam) {
        router.push(nextParam)
      } else {
        router.push('/admin')
      }
    } catch (err: any) {
      console.error('❌ Login hatası:', err)
      console.error('❌ Hata detayı:', err?.response?.data)
      console.error('❌ Tam hata objesi:', JSON.stringify(err, null, 2))
      const msg = err?.response?.data?.detail || 'Giriş başarısız. Bilgileri kontrol edin.'
      toast.error(msg, { duration: 10000 }) // 10 saniye göster
      alert('HATA: ' + msg + '\n\nDetay: ' + JSON.stringify(err?.response?.data || err.message))
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

            <div className="space-y-3 mt-6">
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

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
      <AdminLoginForm />
    </Suspense>
  )
}
