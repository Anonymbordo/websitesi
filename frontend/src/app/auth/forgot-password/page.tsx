'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { firebaseSendPasswordReset } from '@/lib/firebase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await firebaseSendPasswordReset(email)
      setSuccess(true)
    } catch (err: any) {
      console.error('Password reset error:', err)
      if (err.code === 'auth/user-not-found') {
        setError('Bu e-posta adresi ile kayıtlı bir kullanıcı bulunamadı.')
      } else if (err.code === 'auth/invalid-email') {
        setError('Geçersiz bir e-posta adresi girdiniz.')
      } else {
        setError('Bir hata oluştu. Lütfen daha sonra tekrar deneyin.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <div className="flex items-center mb-2">
            <Link href="/auth/login" className="text-sm text-blue-600 hover:text-blue-800 flex items-center transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Giriş'e Dön
            </Link>
          </div>
          <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Şifremi Unuttum
          </CardTitle>
          <CardDescription className="text-center">
            E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-800">E-posta Gönderildi!</h3>
              <p className="text-gray-600 text-sm">
                Lütfen e-posta kutunuzu (ve spam klasörünü) kontrol edin. Gönderilen bağlantıya tıklayarak şifrenizi yenileyebilirsiniz.
              </p>
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => setSuccess(false)}
              >
                Tekrar Gönder
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-posta Adresi</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="ornek@email.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg transition-all duration-300"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  'Sıfırlama Bağlantısı Gönder'
                )}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="justify-center border-t pt-4">
          <p className="text-xs text-gray-500 text-center">
            E-posta gelmedi mi? Spam klasörünü kontrol etmeyi unutmayın.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
