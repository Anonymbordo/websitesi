'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { authAPI } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function StudentApplicationPage() {
  const [studentFullName, setStudentFullName] = useState('')
  const [parentFullName, setParentFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    try {
      setSubmitting(true)
      await authAPI.submitStudentApplication({
        student_full_name: studentFullName.trim(),
        parent_full_name: parentFullName.trim(),
        phone: phone.trim(),
      })
      setSubmitted(true)
      setStudentFullName('')
      setParentFullName('')
      setPhone('')
      toast.success('Başvurunuz alındı.')
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Başvuru gönderilirken bir hata oluştu.'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-100 py-14 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Ana sayfaya dön
        </Link>

        <Card className="border-0 shadow-2xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
          <CardHeader className="pb-4">
            <CardTitle className="text-3xl font-bold text-slate-900">Öğrenci Ön Başvuru Formu</CardTitle>
            <CardDescription className="text-base text-slate-600">
              Bilgilerinizi gönderin, kayıt ve sınav süreçleri için sizinle iletişime geçelim.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {submitted && (
              <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 mt-0.5" />
                <p>Başvurunuz başarıyla kaydedildi. En kısa sürede sizinle iletişime geçeceğiz.</p>
              </div>
            )}

            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="studentFullName">Öğrenci Adı-Soyadı</Label>
                <Input
                  id="studentFullName"
                  value={studentFullName}
                  onChange={(e) => setStudentFullName(e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parentFullName">Veli Adı-Soyadı</Label>
                <Input
                  id="parentFullName"
                  value={parentFullName}
                  onChange={(e) => setParentFullName(e.target.value)}
                  placeholder="Örn: Ayşe Yılmaz"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05xx xxx xx xx"
                  required
                />
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Telefon numarası kayıt sonucu ve sınav sonucu için gereklidir.
                </p>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
              >
                {submitting ? 'Gönderiliyor...' : 'Başvuruyu Gönder'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
