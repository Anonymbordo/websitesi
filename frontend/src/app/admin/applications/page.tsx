'use client'

import React, { useEffect, useState } from 'react'
import { adminAPI } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState<number | null>(null)

  const fetchPending = async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getInstructors({ is_approved: false })
      // axios response shape
      const data = res.data as PendingInstructor[]
      setPending(data)
    } catch (err) {
      console.error('Failed to load pending applications', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPending()
  }, [])

  const approve = async (id: number) => {
    try {
      setProcessingId(id)
      await adminAPI.approveInstructor(id)
      await fetchPending()
    } catch (err) {
      console.error('Approve failed', err)
    } finally {
      setProcessingId(null)
    }
  }

  const reject = async (id: number) => {
    try {
      setProcessingId(id)
      await adminAPI.rejectInstructor(id)
      await fetchPending()
    } catch (err) {
      console.error('Reject failed', err)
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Eğitmen Başvuruları</h1>
      <p className="text-sm text-gray-600">Bekleyen başvuruları burada görebilir ve onaylayabilirsiniz.</p>

      {loading ? (
        <div>Yükleniyor...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {pending.length === 0 && (
            <Card>
              <CardContent>
                <p>Bekleyen bir başvuru yok.</p>
              </CardContent>
            </Card>
          )}

          {pending.map((app) => (
            <Card key={app.id} className="overflow-hidden">
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium">{app.user.full_name} <span className="text-sm text-gray-500">({app.user.email})</span></CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-50 text-yellow-700">Beklemede</Badge>
                  <div className="text-sm text-gray-500">{new Date(app.created_at).toLocaleString()}</div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-sm text-gray-700 mb-2"><strong>Uzmanlık:</strong> {app.specialization || '—'}</p>
                <p className="text-sm text-gray-700 mb-2"><strong>Deneyim:</strong> {app.experience_years} yıl</p>
                <p className="text-sm text-gray-700 mb-4"><strong>Biyografi:</strong> {app.bio || '—'}</p>
                <div className="flex gap-2">
                  <Button disabled={processingId === app.id} onClick={() => approve(app.id)} className="bg-green-600 text-white">{processingId === app.id ? 'İşleniyor...' : 'Onayla'}</Button>
                  <Button disabled={processingId === app.id} variant="outline" onClick={() => reject(app.id)} className="text-red-600">{processingId === app.id ? 'İşleniyor...' : 'Reddet'}</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
