'use client'

import { useEffect, useState } from 'react'
import { adminAPI } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'react-hot-toast'
import { CheckCircle2, Phone, UserRound, UsersRound } from 'lucide-react'

interface StudentApplication {
  id: number
  student_full_name: string
  parent_full_name: string
  phone: string
  is_checked: boolean
  checked_at?: string | null
  created_at: string
}

export default function AdminStudentApplicationsPage() {
  const [applications, setApplications] = useState<StudentApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getStudentApplications()
      setApplications(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      console.error('Student applications fetch failed:', error)
      toast.error('Öğrenci başvuruları yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [])

  const toggleChecked = async (item: StudentApplication) => {
    try {
      setProcessingId(item.id)
      const next = !item.is_checked
      const res = await adminAPI.checkStudentApplication(item.id, next)
      const updated = res.data
      setApplications((prev) => prev.map((app) => (app.id === item.id ? updated : app)))
      toast.success(next ? 'Başvuru incelendi olarak işaretlendi.' : 'İnceleme işareti kaldırıldı.')
    } catch (error) {
      console.error('Check toggle failed:', error)
      toast.error('Güncelleme sırasında hata oluştu.')
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (value?: string | null) => {
    if (!value) return '-'
    return new Date(value).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Öğrenci Başvuruları</h1>
          <p className="text-muted-foreground mt-2">Ana sayfadaki formdan gelen başvuruları buradan takip edebilirsiniz.</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-1">
          {applications.length} Kayıt
        </Badge>
      </div>

      {applications.length === 0 ? (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <CheckCircle2 className="w-10 h-10 text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold">Henüz başvuru yok</h3>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {applications.map((item) => (
            <Card key={item.id} className="border border-slate-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">Başvuru #{item.id}</CardTitle>
                  <Badge className={item.is_checked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                    {item.is_checked ? 'İncelendi' : 'Bekliyor'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm flex items-start gap-2">
                  <UserRound className="w-4 h-4 mt-0.5 text-slate-500" />
                  <div>
                    <p className="text-slate-500">Öğrenci</p>
                    <p className="font-medium">{item.student_full_name}</p>
                  </div>
                </div>
                <div className="text-sm flex items-start gap-2">
                  <UsersRound className="w-4 h-4 mt-0.5 text-slate-500" />
                  <div>
                    <p className="text-slate-500">Veli</p>
                    <p className="font-medium">{item.parent_full_name}</p>
                  </div>
                </div>
                <div className="text-sm flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 text-slate-500" />
                  <div>
                    <p className="text-slate-500">Telefon</p>
                    <p className="font-medium">{item.phone}</p>
                  </div>
                </div>

                <div className="text-xs text-slate-500 pt-2 border-t">
                  <p>Başvuru: {formatDate(item.created_at)}</p>
                  <p>İnceleme: {formatDate(item.checked_at)}</p>
                </div>

                <Button
                  className="w-full"
                  variant={item.is_checked ? 'secondary' : 'default'}
                  disabled={processingId === item.id}
                  onClick={() => toggleChecked(item)}
                >
                  {processingId === item.id
                    ? 'Güncelleniyor...'
                    : item.is_checked
                      ? 'İncelemeyi Kaldır'
                      : 'İncelendi Olarak İşaretle'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
