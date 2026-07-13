'use client'

import React, { useEffect, useState } from 'react'
import { adminAPI } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, Building, Calendar, Mail, Phone } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface InstitutionApplication {
  id: number
  name: string
  description: string
  city: string
  district?: string
  phone?: string
  email?: string
  website?: string
  is_active: boolean
  created_at: string
  owner_user?: {
    id?: number
    full_name?: string
    email?: string
    phone?: string
  }
}

export default function InstitutionApplicationsPage() {
  const [pending, setPending] = useState<InstitutionApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)

  const fetchPending = async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getInstitutionApplications()
      const data = Array.isArray(res.data) ? res.data : []
      setPending(data)
    } catch (err) {
      console.error('Failed to load institution applications', err)
      toast.error('Kurum başvuruları yüklenirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPending()
  }, [])

  const handleApprove = async (id: number) => {
    if (!confirm('Bu kurum başvurusunu onaylamak istediğinize emin misiniz?')) return
    try {
      setProcessingId(id)
      await adminAPI.approveInstitution(id)
      toast.success('Kurum başvurusu onaylandı.')
      setPending(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      console.error('Approve failed', err)
      toast.error('Onaylama işlemi başarısız oldu.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id: number) => {
    if (!confirm('Bu kurum başvurusunu reddetmek istediğinize emin misiniz?')) return
    try {
      setProcessingId(id)
      await adminAPI.rejectInstitution(id)
      toast.success('Kurum başvurusu reddedildi.')
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
          <h1 className="text-3xl font-bold tracking-tight">Kurum Başvuruları</h1>
          <p className="text-muted-foreground mt-2">
            Onay bekleyen kurum başvurularını buradan yönetebilirsiniz.
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
            <h3 className="text-lg font-semibold">Bekleyen Başvuru Yok</h3>
            <p className="text-muted-foreground">Şu anda onay bekleyen herhangi bir kurum başvurusu bulunmuyor.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {pending.map((inst) => (
            <Card key={inst.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="bg-muted/30 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl">
                      <Building className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{inst.name}</CardTitle>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(inst.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 pt-6 space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">{inst.city}{inst.district ? `, ${inst.district}` : ''}</p>
                  <p className="text-xs text-muted-foreground line-clamp-3">{inst.description}</p>
                </div>

                {inst.owner_user && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Başvuran</p>
                    <p className="text-sm font-medium">{inst.owner_user.full_name || '-'}</p>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Mail className="w-3 h-3" />
                      {inst.owner_user.email || '-'}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      {inst.owner_user.phone || '-'}
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="border-t bg-muted/10 p-4 gap-3">
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleApprove(inst.id)}
                  disabled={processingId === inst.id}
                >
                  {processingId === inst.id ? (
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
                  onClick={() => handleReject(inst.id)}
                  disabled={processingId === inst.id}
                >
                  {processingId === inst.id ? (
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
