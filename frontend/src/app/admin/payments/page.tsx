'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, CreditCard, RefreshCw, Search, ShieldAlert, Undo2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { adminAPI } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

interface PaymentOperationItem {
  id: number
  operation_type: 'refund' | 'void'
  operation_status: 'pending' | 'success' | 'failed'
  amount?: number | null
  reason?: string | null
  provider_proc_return_code?: string | null
  provider_txn_result?: string | null
  provider_error_message?: string | null
  provider_trans_id?: string | null
  provider_host_ref_num?: string | null
  created_at?: string | null
  admin_user_id?: number
}

interface AdminPaymentItem {
  id: number
  transaction_id?: string | null
  amount: number
  currency: string
  payment_method: string
  payment_status: string
  payment_date?: string | null
  has_active_enrollment: boolean
  student: {
    id: number
    full_name?: string | null
    email?: string | null
    phone?: string | null
  }
  course: {
    id: number
    title: string
  }
  instructor: {
    id?: number | null
    full_name?: string | null
    email?: string | null
  }
  available_actions: {
    can_refund: boolean
    can_void: boolean
  }
  last_operation?: PaymentOperationItem | null
  operations?: PaymentOperationItem[]
}

const statusOptions = [
  { value: '', label: 'Tüm durumlar' },
  { value: 'completed', label: 'Tamamlandı' },
  { value: 'pending', label: 'Bekliyor' },
  { value: 'failed', label: 'Başarısız' },
  { value: 'refunded', label: 'İade edildi' },
  { value: 'voided', label: 'İptal edildi' },
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2,
  }).format(Number(amount || 0))
}

function getStatusLabel(statusValue: string) {
  const normalized = (statusValue || '').toLowerCase()
  if (normalized === 'completed') return 'Tamamlandı'
  if (normalized === 'pending') return 'Bekliyor'
  if (normalized === 'failed') return 'Başarısız'
  if (normalized === 'refunded') return 'İade edildi'
  if (normalized === 'voided') return 'İptal edildi'
  if (normalized === 'success') return 'Başarılı'
  return statusValue || '-'
}

function getStatusBadgeClass(statusValue: string) {
  const normalized = (statusValue || '').toLowerCase()
  if (normalized === 'completed' || normalized === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (normalized === 'pending') {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }
  if (normalized === 'refunded' || normalized === 'voided') {
    return 'border-slate-200 bg-slate-100 text-slate-700'
  }
  return 'border-rose-200 bg-rose-50 text-rose-700'
}

export default function AdminPaymentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<'refund' | 'void' | null>(null)
  const [payments, setPayments] = useState<AdminPaymentItem[]>([])
  const [selectedPayment, setSelectedPayment] = useState<AdminPaymentItem | null>(null)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [paymentStatus, setPaymentStatus] = useState(searchParams.get('payment_status') || '')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/')
      return
    }
    void fetchPayments({
      search: searchParams.get('search') || undefined,
      payment_status: searchParams.get('payment_status') || undefined,
      payment_id: searchParams.get('paymentId') ? Number(searchParams.get('paymentId')) : undefined,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user])

  const fetchPayments = async (params?: { search?: string; payment_status?: string; payment_id?: number }) => {
    try {
      setLoading(true)
      const response = await adminAPI.getPayments({
        limit: 50,
        search: params?.search ?? (search || undefined),
        payment_status: params?.payment_status ?? (paymentStatus || undefined),
        payment_id: params?.payment_id,
      })
      const items = Array.isArray(response.data) ? response.data : []
      setPayments(items)

      const targetPaymentId = params?.payment_id
      if (targetPaymentId) {
        const matched = items.find((item: AdminPaymentItem) => item.id === targetPaymentId)
        if (matched) {
          await fetchPaymentDetail(matched.id)
        }
      } else if (selectedPayment) {
        const exists = items.find((item: AdminPaymentItem) => item.id === selectedPayment.id)
        if (!exists) {
          setSelectedPayment(null)
        }
      }
    } catch (error: any) {
      console.error('Ödemeler yüklenirken hata:', error)
      toast.error(error.response?.data?.detail || 'Ödemeler yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  const fetchPaymentDetail = async (paymentId: number) => {
    try {
      setDetailLoading(true)
      const response = await adminAPI.getPaymentDetail(paymentId)
      setSelectedPayment(response.data)
    } catch (error: any) {
      console.error('Ödeme detayı alınamadı:', error)
      toast.error(error.response?.data?.detail || 'Ödeme detayı alınamadı.')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleFilterSubmit = async () => {
    await fetchPayments()
  }

  const handleOperation = async (operationType: 'refund' | 'void') => {
    if (!selectedPayment) return
    const trimmedReason = reason.trim()
    if (trimmedReason.length < 5) {
      toast.error('Lütfen en az 5 karakterlik işlem notu girin.')
      return
    }

    const operationLabel = operationType === 'refund' ? 'iade' : 'iptal'
    const confirmed = window.confirm(
      `${selectedPayment.id} numaralı ödeme için ${operationLabel} operasyonu başlatılsın mı?`
    )
    if (!confirmed) return

    try {
      setActionLoading(operationType)
      if (operationType === 'refund') {
        await adminAPI.refundPayment(selectedPayment.id, { reason: trimmedReason })
      } else {
        await adminAPI.voidPayment(selectedPayment.id, { reason: trimmedReason })
      }

      toast.success(`Ödeme ${operationType === 'refund' ? 'iade' : 'iptal'} edildi.`)
      setReason('')
      await Promise.all([fetchPayments(), fetchPaymentDetail(selectedPayment.id)])
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Operasyon başarısız.')
      await fetchPaymentDetail(selectedPayment.id)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Ödemeler ve İadeler</h1>
            <p className="text-sm text-slate-600">
              QNB işlemlerini, tam iade ve iptal operasyonlarını tek panelden yönetin.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => void fetchPayments()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Yenile
            </Button>
          </div>
        </div>

        <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Filtreler</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-[1.8fr_0.9fr_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ödeme no, işlem ID, öğrenci, eğitmen veya kurs ara"
                className="rounded-xl pl-10"
              />
            </div>
            <select
              value={paymentStatus}
              onChange={(event) => setPaymentStatus(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
            >
              {statusOptions.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button onClick={() => void handleFilterSubmit()} className="rounded-xl bg-slate-900 text-white hover:bg-slate-800">
              Filtrele
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg text-slate-900">Ödeme Listesi</CardTitle>
                <p className="mt-1 text-sm text-slate-500">{payments.length} kayıt gösteriliyor</p>
              </div>
              <CreditCard className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex min-h-[260px] items-center justify-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-slate-900" />
                </div>
              ) : payments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Filtreye uygun ödeme bulunamadı.
                </div>
              ) : (
                payments.map((payment) => {
                  const isSelected = selectedPayment?.id === payment.id
                  return (
                    <button
                      key={payment.id}
                      type="button"
                      onClick={() => void fetchPaymentDetail(payment.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                          : 'border-slate-100 bg-slate-50/70 text-slate-900 hover:border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold">{payment.course.title}</p>
                            <Badge className={isSelected ? 'border-white/20 bg-white/10 text-white' : getStatusBadgeClass(payment.payment_status)}>
                              {getStatusLabel(payment.payment_status)}
                            </Badge>
                          </div>
                          <p className={`text-sm ${isSelected ? 'text-slate-200' : 'text-slate-600'}`}>
                            Öğrenci: {payment.student.full_name || '-'}
                          </p>
                          <p className={`text-sm ${isSelected ? 'text-slate-200' : 'text-slate-600'}`}>
                            Eğitmen: {payment.instructor.full_name || 'Atanmamış'}
                          </p>
                          <p className={`text-xs ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                            İşlem ID: {payment.transaction_id || '-'}
                          </p>
                        </div>
                        <div className="space-y-2 text-right">
                          <p className="text-lg font-bold">{formatCurrency(payment.amount)}</p>
                          <p className={`text-xs ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                            {payment.payment_date ? new Date(payment.payment_date).toLocaleString('tr-TR') : '-'}
                          </p>
                          <p className={`text-xs ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                            Erişim: {payment.has_active_enrollment ? 'Açık' : 'Kapalı'}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">Operasyon Detayı</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {!selectedPayment ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Soldan bir ödeme seçin.
                </div>
              ) : detailLoading ? (
                <div className="flex min-h-[240px] items-center justify-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-slate-900" />
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-lg font-semibold text-slate-900">{selectedPayment.course.title}</h2>
                      <Badge className={getStatusBadgeClass(selectedPayment.payment_status)}>
                        {getStatusLabel(selectedPayment.payment_status)}
                      </Badge>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <p>Ödeme No: #{selectedPayment.id}</p>
                      <p>İşlem ID: {selectedPayment.transaction_id || '-'}</p>
                      <p>Öğrenci: {selectedPayment.student.full_name || '-'} ({selectedPayment.student.email || 'e-posta yok'})</p>
                      <p>Eğitmen: {selectedPayment.instructor.full_name || 'Atanmamış'}</p>
                      <p>Tutar: {formatCurrency(selectedPayment.amount)}</p>
                      <p>Erişim Durumu: {selectedPayment.has_active_enrollment ? 'Öğrenci erişimi açık' : 'Öğrenci erişimi kapalı'}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <div className="mb-2 flex items-center gap-2 font-semibold">
                      <ShieldAlert className="h-4 w-4" />
                      Güvenlik Notu
                    </div>
                    Ağ hatası yaşanırsa aynı ödeme için otomatik tekrar göndermeyin. Panel operasyonu beklemede bırakır; önce bankadan veya rapor ekranından doğrulama yapılmalıdır.
                  </div>

                  {selectedPayment.available_actions.can_refund || selectedPayment.available_actions.can_void ? (
                    <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Operasyon Notu
                      </div>
                      <Textarea
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="İade veya iptal gerekçesini yazın. Bu not audit kaydına girer."
                        className="min-h-[110px] rounded-xl"
                      />
                      <div className="flex flex-wrap gap-3">
                        <Button
                          onClick={() => void handleOperation('refund')}
                          disabled={actionLoading !== null || !selectedPayment.available_actions.can_refund}
                          className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <Undo2 className="mr-2 h-4 w-4" />
                          {actionLoading === 'refund' ? 'İade gönderiliyor...' : 'Tam İade Yap'}
                        </Button>
                        <Button
                          onClick={() => void handleOperation('void')}
                          disabled={actionLoading !== null || !selectedPayment.available_actions.can_void}
                          variant="outline"
                          className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          {actionLoading === 'void' ? 'İptal gönderiliyor...' : 'İptal Yap'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      Bu ödeme için yeni banka operasyonu açılamaz. Yalnızca `completed` durumundaki QNB ödemeleri tam iade veya iptale uygundur.
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-slate-900">Operasyon Geçmişi</h3>
                      <p className="text-xs text-slate-500">
                        {(selectedPayment.operations || []).length} kayıt
                      </p>
                    </div>
                    {!(selectedPayment.operations || []).length ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                        Henüz iade veya iptal kaydı yok.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(selectedPayment.operations || []).map((operation) => (
                          <div key={operation.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-slate-900">
                                  {operation.operation_type === 'refund' ? 'İade' : 'İptal'}
                                </p>
                                <Badge className={getStatusBadgeClass(operation.operation_status)}>
                                  {getStatusLabel(operation.operation_status)}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-500">
                                {operation.created_at ? new Date(operation.created_at).toLocaleString('tr-TR') : '-'}
                              </p>
                            </div>
                            <div className="mt-3 space-y-1 text-sm text-slate-600">
                              <p>Not: {operation.reason || '-'}</p>
                              <p>Banka Kodu: {operation.provider_proc_return_code || '-'}</p>
                              <p>Banka Sonucu: {operation.provider_txn_result || '-'}</p>
                              <p>Host Ref: {operation.provider_host_ref_num || '-'}</p>
                              <p>TransId: {operation.provider_trans_id || '-'}</p>
                              {operation.provider_error_message ? (
                                <p className="text-rose-700">Mesaj: {operation.provider_error_message}</p>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
