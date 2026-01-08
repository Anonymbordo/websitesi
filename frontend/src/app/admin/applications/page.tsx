'use client'

import React, { useEffect, useState } from 'react'
import { adminAPI } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, MapPin, Briefcase, Clock, User, Calendar } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface PendingInstructor {
  id: number
  user: {
    id: number
    email: string
    full_name: string
    city?: string
    district?: string
  }
  bio?: string
  specialization?: string
  experience_years: number
  is_approved: boolean
  created_at: string
}

export default function AdminApplicationsPage() {
  const [pending, setPending] = useState<PendingInstructor[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)

  const fetchPending = async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getInstructors({ is_approved: false })
      // Ensure we handle the response data correctly
      const data = Array.isArray(res.data) ? res.data : []
      setPending(data)
    } catch (err) {
      console.error('Failed to load pending applications', err)
      toast.error('Başvurular yüklenirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPending()
  }, [])

  const handleApprove = async (id: number) => {
    if (!confirm('Bu eğitmen başvurusunu onaylamak istediğinize emin misiniz?')) return

    try {
      setProcessingId(id)
      await adminAPI.approveInstructor(id)
      toast.success('Eğitmen başvurusu onaylandı.')
      // Remove from list locally to avoid refetch flicker
      setPending(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      console.error('Approve failed', err)
      toast.error('Onaylama işlemi başarısız oldu.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id: number) => {
    if (!confirm('Bu eğitmen başvurusunu reddetmek istediğinize emin misiniz?')) return

    try {
      setProcessingId(id)
      await adminAPI.rejectInstructor(id)
      toast.success('Eğitmen başvurusu reddedildi.')
      // Remove from list locally
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
          <h1 className="text-3xl font-bold tracking-tight">Eğitmen Başvuruları</h1>
          <p className="text-muted-foreground mt-2">
            Onay bekleyen eğitmen başvurularını buradan yönetebilirsiniz.
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
            <p className="text-muted-foreground">Şu anda onay bekleyen herhangi bir eğitmen başvurusu bulunmuyor.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {pending.map((instructor) => (
            <Card key={instructor.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="bg-muted/30 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl">
                      {instructor.user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{instructor.user.full_name}</CardTitle>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(instructor.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Briefcase className="h-4 w-4 mr-2" />
                      Uzmanlık
                    </div>
                    <p className="font-medium text-sm">{instructor.specialization || '-'}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-2" />
                      Deneyim
                    </div>
                    <p className="font-medium text-sm">{instructor.experience_years} Yıl</p>
                  </div>

                  <div className="space-y-1 col-span-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      Konum
                    </div>
                    <p className="font-medium text-sm">
                      {instructor.user.city ? `${instructor.user.city}${instructor.user.district ? `, ${instructor.user.district}` : ''}` : '-'}
                    </p>
                  </div>
                </div>

                {instructor.bio && (
                  <div className="bg-muted/30 p-3 rounded-md">
                    <p className="text-sm text-muted-foreground line-clamp-3 italic">
                      "{instructor.bio}"
                    </p>
                  </div>
                )}
              </CardContent>

              <CardFooter className="border-t bg-muted/10 p-4 gap-3">
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleApprove(instructor.id)}
                  disabled={processingId === instructor.id}
                >
                  {processingId === instructor.id ? (
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
                  onClick={() => handleReject(instructor.id)}
                  disabled={processingId === instructor.id}
                >
                  {processingId === instructor.id ? (
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
