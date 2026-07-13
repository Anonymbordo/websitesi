'use client'

import React, { useEffect, useState } from 'react'
import { adminAPI } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, Building, User, Calendar } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface InstitutionInstructorRequest {
  id: number
  institution: {
    id: number
    name: string
    city?: string
    district?: string
  }
  instructor: {
    id: number
    user_id: number
    full_name: string
    email?: string
    phone?: string
  }
  status: string
  created_at: string
}

export default function InstitutionInstructorRequestsPage() {
  const [pending, setPending] = useState<InstitutionInstructorRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)

  const fetchPending = async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getInstitutionInstructorRequests({ status: 'pending' })
      const data = Array.isArray(res.data) ? res.data : []
      setPending(data)
    } catch (err) {
      console.error('Failed to load institution instructor requests', err)
      toast.error('Talepler yüklenirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPending()
  }, [])

  const handleApprove = async (id: number) => {
    if (!confirm('Bu talebi onaylamak istediğinize emin misiniz?')) return
    try {
      setProcessingId(id)
      await adminAPI.approveInstitutionInstructorRequest(id)
      toast.success('Talep onaylandı.')
      setPending(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      console.error('Approve failed', err)
      toast.error('Onaylama işlemi başarısız oldu.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id: number) => {
    if (!confirm('Bu talebi reddetmek istediğinize emin misiniz?')) return
    try {
      setProcessingId(id)
      await adminAPI.rejectInstitutionInstructorRequest(id)
      toast.success('Talep reddedildi.')
      setPending(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      console.error('Reject failed', err)
      toast.error('Reddetme işlemi başarısız oldu.')
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kurum Eğitmen Talepleri</h1>
          <p className="text-muted-foreground mt-2">
            Kurumların eğitmen ekleme taleplerini buradan yönetebilirsiniz.
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-1">
          {pending.length} Bekleyen
        </Badge>
      </div>

      {pending.length === 0 ? (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Check className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Bekleyen Talep Yok</h3>
            <p className="text-muted-foreground">Şu anda onay bekleyen herhangi bir talep bulunmuyor.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {pending.map((req) => (
            <Card key={req.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="bg-muted/30 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl">
                      {req.instructor.full_name?.charAt(0).toUpperCase() || 'E'}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{req.instructor.full_name}</CardTitle>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(req.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 pt-6 space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Building className="h-4 w-4 mr-2" />
                    Kurum
                  </div>
                  <p className="font-medium text-sm">{req.institution.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {req.institution.city}{req.institution.district ? `, ${req.institution.district}` : ''}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="h-4 w-4 mr-2" />
                    İletişim
                  </div>
                  <p className="font-medium text-sm">{req.instructor.email || '-'}</p>
                  <p className="text-xs text-muted-foreground">{req.instructor.phone || '-'}</p>
                </div>
              </CardContent>

              <CardFooter className="border-t bg-muted/10 p-4 gap-3">
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleApprove(req.id)}
                  disabled={processingId === req.id}
                >
                  {processingId === req.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Onayla
                    </>
                  )}
                </Button>
                <Button 
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleReject(req.id)}
                  disabled={processingId === req.id}
                >
                  {processingId === req.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Reddet
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
