'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, RefreshCw, Send, Paperclip, Plus, X } from 'lucide-react'

import { messagesAPI } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/lib/store'

type ThreadSummary = {
  id: number
  other_user: {
    id: number | null
    full_name: string
    role: string | null
  }
  last_message?: string | null
  last_message_at?: string | null
  last_message_sender_id?: number | null
  last_message_sender_role?: string | null
}

type MessageOut = {
  id: number
  sender: {
    id: number | null
    full_name: string
    role: string | null
  }
  body?: string | null
  created_at: string
  attachments: Array<{
    id: number
    file_url: string
    file_name?: string | null
    content_type?: string | null
    file_size?: number | null
  }>
}

function formatTarih(iso?: string | null) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('tr-TR')
  } catch {
    return iso
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function hataDetayi(e: unknown): string | null {
  if (!isRecord(e)) return null

  const response = isRecord(e.response) ? e.response : null
  const data = response && isRecord(response.data) ? response.data : null
  const detail = data && typeof data.detail === 'string' ? data.detail : null

  if (detail) return detail
  if (typeof e.message === 'string') return e.message
  return null
}

export default function MessagesTerminal(props: { baslik?: string }) {
  const baslik = props.baslik ?? 'Mesajlar'
  const currentUserId = useAuthStore((state) => state.user?.id)
  const searchParams = useSearchParams()
  const queryThreadId = useMemo(() => {
    const raw = searchParams.get('thread')
    if (!raw) return null
    const parsed = parseInt(raw, 10)
    return Number.isNaN(parsed) ? null : parsed
  }, [searchParams])

  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [seciliThreadId, setSeciliThreadId] = useState<number | null>(null)
  const [mesajlar, setMesajlar] = useState<MessageOut[]>([])

  const [threadsYukleniyor, setThreadsYukleniyor] = useState(false)
  const [mesajlarYukleniyor, setMesajlarYukleniyor] = useState(false)
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)

  const [yeniKisiId, setYeniKisiId] = useState('')
  const [recipientResults, setRecipientResults] = useState<Array<{
    id: number
    full_name: string
    role?: string | null
    email?: string | null
    profile_image?: string | null
  }>>([])
  const [recipientLoading, setRecipientLoading] = useState(false)
  const [selectedRecipient, setSelectedRecipient] = useState<{
    id: number
    full_name: string
    role?: string | null
    email?: string | null
    profile_image?: string | null
  } | null>(null)
  const [metin, setMetin] = useState('')
  const [dosyalar, setDosyalar] = useState<File[]>([])

  const terminalRef = useRef<HTMLDivElement | null>(null)

  const notifyLastSeen = useCallback(() => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new Event('messages:last-seen'))
  }, [])

  const markAllMessagesSeen = useCallback(() => {
    if (!currentUserId) return
    try {
      localStorage.setItem(`messages_last_seen_${currentUserId}`, new Date().toISOString())
      notifyLastSeen()
    } catch {
      // ignore storage errors
    }
  }, [currentUserId, notifyLastSeen])

  const seciliThread = useMemo(
    () => (seciliThreadId ? threads.find(t => t.id === seciliThreadId) ?? null : null),
    [threads, seciliThreadId]
  )

  const threadsYukle = useCallback(async (selectFirstIfEmpty = true) => {
    setThreadsYukleniyor(true)
    setHata(null)
    try {
      const resp = await messagesAPI.listThreads()
      const data = Array.isArray(resp.data) ? resp.data : []
      setThreads(data)

      if (queryThreadId) {
        setSeciliThreadId(queryThreadId)
        return
      }

      if (selectFirstIfEmpty && data.length > 0) {
        setSeciliThreadId(prev => prev ?? data[0].id)
      }
    } catch (e: unknown) {
      setHata(hataDetayi(e) || 'Sohbetler alınamadı')
    } finally {
      setThreadsYukleniyor(false)
    }
  }, [queryThreadId])

  const mesajlariYukle = useCallback(async (threadId: number) => {
    setMesajlarYukleniyor(true)
    setHata(null)
    try {
      const resp = await messagesAPI.listMessages(threadId)
      const data = Array.isArray(resp.data) ? resp.data : []
      setMesajlar(data)
      requestAnimationFrame(() => {
        terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight })
      })
    } catch (e: unknown) {
      setHata(hataDetayi(e) || 'Mesajlar alınamadı')
    } finally {
      setMesajlarYukleniyor(false)
    }
  }, [])

  useEffect(() => {
    threadsYukle(true)
  }, [threadsYukle])

  useEffect(() => {
    markAllMessagesSeen()
  }, [markAllMessagesSeen])

  useEffect(() => {
    if (seciliThreadId) mesajlariYukle(seciliThreadId)
  }, [seciliThreadId, mesajlariYukle])

  useEffect(() => {
    if (mesajlar.length > 0) {
      markAllMessagesSeen()
    }
  }, [mesajlar, markAllMessagesSeen])

  const threadOlustur = async () => {
    let id: number | null = null

    if (selectedRecipient?.id) {
      id = selectedRecipient.id
    } else {
      const raw = yeniKisiId.trim()
      if (raw && /^\d+$/.test(raw)) {
        id = parseInt(raw, 10)
      }
    }

    if (!id || Number.isNaN(id)) {
      setHata('Kullanıcı ID veya isim seçin')
      return
    }

    setHata(null)
    try {
      const resp = await messagesAPI.createThread({ recipient_user_id: id })
      const threadId = resp.data?.thread_id
      await threadsYukle(false)
      if (threadId) setSeciliThreadId(threadId)
      setYeniKisiId('')
      setSelectedRecipient(null)
      setRecipientResults([])
    } catch (e: unknown) {
      setHata(hataDetayi(e) || 'Sohbet başlatılamadı')
    }
  }

  const dosyaSec = (files: FileList | null) => {
    if (!files) return
    setDosyalar(prev => [...prev, ...Array.from(files)])
  }

  const dosyaSil = (index: number) => {
    setDosyalar(prev => prev.filter((_, i) => i !== index))
  }

  const mesajGonder = async () => {
    if (!seciliThreadId) {
      setHata('Önce bir sohbet seçin')
      return
    }

    const temizMetin = metin.trim()
    if (!temizMetin && dosyalar.length === 0) {
      setHata('Mesaj veya dosya ekleyin')
      return
    }

    setGonderiliyor(true)
    setHata(null)
    try {
      const attachments: Array<{
        file_url: string
        file_name?: string
        content_type?: string
        file_size?: number
      }> = []

      for (const f of dosyalar) {
        const presign = await messagesAPI.presignAttachment({
          thread_id: seciliThreadId,
          filename: f.name,
          content_type: f.type || 'application/octet-stream',
        })

        const uploadUrl = presign.data?.upload_url
        const publicUrl = presign.data?.public_url

        if (!uploadUrl || !publicUrl) {
          throw new Error('Presign yanıtı eksik')
        }

        const putResp = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': f.type || 'application/octet-stream',
          },
          body: f,
        })

        if (!putResp.ok) {
          throw new Error(`Dosya yükleme başarısız (${putResp.status})`)
        }

        attachments.push({
          file_url: publicUrl,
          file_name: f.name,
          content_type: f.type || 'application/octet-stream',
          file_size: f.size,
        })
      }

      await messagesAPI.sendMessage(seciliThreadId, {
        body: temizMetin || null,
        attachments: attachments.length > 0 ? attachments : null,
      })

      setMetin('')
      setDosyalar([])
      await threadsYukle(false)
      await mesajlariYukle(seciliThreadId)
    } catch (e: unknown) {
      setHata(hataDetayi(e) || 'Mesaj gönderilemedi')
    } finally {
      setGonderiliyor(false)
    }
  }

  useEffect(() => {
    const q = yeniKisiId.trim()
    if (!q) {
      setRecipientResults([])
      setRecipientLoading(false)
      return
    }

    if (selectedRecipient && selectedRecipient.full_name.trim() === q) {
      setRecipientResults([])
      setRecipientLoading(false)
      return
    }

    const isNumeric = /^\d+$/.test(q)
    if (!isNumeric && q.length < 2) {
      setRecipientResults([])
      setRecipientLoading(false)
      return
    }

    setRecipientLoading(true)
    const timer = setTimeout(async () => {
      try {
        const resp = await messagesAPI.searchRecipients(q, 8)
        const data = Array.isArray(resp.data) ? resp.data : []
        setRecipientResults(data)
      } catch (e) {
        setRecipientResults([])
      } finally {
        setRecipientLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [yeniKisiId, selectedRecipient])

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 shadow-2xl">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white">
              <span className="bg-gradient-to-r from-emerald-300 to-sky-400 bg-clip-text text-transparent">
                {baslik}
              </span>
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Sohbet başlatın, mesajlaşın ve PDF/ek gönderin.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => threadsYukle(false)}
            disabled={threadsYukleniyor}
            className="bg-slate-900/70 text-slate-100 border-slate-700 hover:bg-slate-800"
          >
            {threadsYukleniyor ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Yenile
          </Button>
        </div>

        {hata && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {hata}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 bg-slate-950/70 backdrop-blur-sm border border-slate-800/80 shadow-xl">
          <CardHeader className="border-b border-slate-800/80 bg-slate-900/60">
            <CardTitle className="text-slate-100">Sohbetler</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-slate-100">
            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
              <Label className="text-sm text-slate-200">Kullanıcı ID veya isim ile sohbet başlat</Label>
              <div className="flex gap-2">
                <Input
                  value={yeniKisiId}
                  onChange={(e) => {
                    const next = e.target.value
                    setYeniKisiId(next)
                    if (selectedRecipient && next.trim() !== selectedRecipient.full_name) {
                      setSelectedRecipient(null)
                    }
                  }}
                  placeholder="ID veya isim yazın"
                  className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500"
                />
                <Button
                  onClick={threadOlustur}
                  disabled={!yeniKisiId.trim()}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Başlat
                </Button>
              </div>
              <p className="text-xs text-slate-400">
                Admin herkesle; eğitmen/öğrenci yalnızca kayıt ilişkisi varsa sohbet açabilir.
              </p>
            </div>

            {yeniKisiId.trim() && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-2">
                {recipientLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 px-2 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Aranıyor...
                  </div>
                ) : recipientResults.length === 0 ? (
                  <div className="text-xs text-slate-500 px-2 py-2">Sonuç bulunamadı.</div>
                ) : (
                  <div className="space-y-1">
                    {recipientResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSelectedRecipient(user)
                          setYeniKisiId(user.full_name)
                        }}
                        className={`w-full text-left rounded-xl px-3 py-2 transition-all ${
                          selectedRecipient?.id === user.id
                            ? 'bg-emerald-500/10 border border-emerald-400/40'
                            : 'hover:bg-slate-900 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-slate-100">{user.full_name}</div>
                            <div className="text-xs text-slate-400">
                              {user.role || 'kullanıcı'} • ID: {user.id}
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">{user.email || ''}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              {threadsYukleniyor ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> Sohbetler yükleniyor...
                </div>
              ) : threads.length === 0 ? (
                <div className="text-sm text-slate-400">Henüz sohbet yok.</div>
              ) : (
                <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                  {threads.map((t) => {
                    const aktif = t.id === seciliThreadId
                    const isim = (t.other_user?.full_name || 'Bilinmiyor').trim()
                    const initials = isim
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase())
                      .join('')

                    return (
                      <button
                        key={t.id}
                        onClick={() => setSeciliThreadId(t.id)}
                        className={
                          'group w-full text-left rounded-xl border px-3 py-3 transition-all ' +
                          (aktif
                            ? 'border-emerald-400/40 bg-emerald-500/10 shadow-lg'
                            : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700')
                        }
                      >
                        <div className="flex items-start gap-3">
                          <div className={
                            'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ' +
                            (aktif
                              ? 'bg-gradient-to-br from-emerald-400 to-sky-500 text-slate-950'
                              : 'bg-slate-800 text-slate-200')
                          }>
                            {initials || 'U'}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-semibold text-slate-100 truncate">{isim}</div>
                              <div className="text-[11px] text-slate-500 shrink-0">{formatTarih(t.last_message_at)}</div>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {t.other_user?.role ? (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                  {t.other_user.role}
                                </span>
                              ) : null}
                              <div className="text-xs text-slate-400 line-clamp-1">{t.last_message || '—'}</div>
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-slate-950/70 backdrop-blur-sm border border-slate-800/80 shadow-xl">
          <CardHeader className="border-b border-slate-800/80 bg-slate-900/60">
            <CardTitle className="text-slate-100">
              {seciliThread
                ? `Sohbet — ${seciliThread.other_user?.full_name || 'Sohbet'}`
                : 'Sohbet'}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-4 space-y-4 text-slate-100">
            <div
              ref={terminalRef}
              className="h-[55vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-inner"
              style={{
                backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            >
              {mesajlarYukleniyor ? (
                <div className="flex items-center gap-2 text-slate-300">
                  <Loader2 className="w-4 h-4 animate-spin" /> Mesajlar yükleniyor...
                </div>
              ) : !seciliThreadId ? (
                <div className="text-slate-400">Sol taraftan bir sohbet seçin.</div>
              ) : mesajlar.length === 0 ? (
                <div className="text-slate-400">Henüz mesaj yok. İlk mesajı gönderin.</div>
              ) : (
                <div className="space-y-3">
                  {mesajlar.map((m) => {
                    const isMine = Boolean(currentUserId && m.sender?.id === currentUserId)
                    const bubbleClass = isMine
                      ? 'bg-gradient-to-r from-emerald-500/90 to-sky-500/90 text-white shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-900/80 text-slate-100 border border-slate-800'
                    const attachmentClass = isMine
                      ? 'border-white/20 bg-white/10 text-white/90'
                      : 'border-slate-700 bg-slate-800/60 text-slate-200'

                    return (
                      <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${bubbleClass}`}>
                          {!isMine && (
                            <div className="text-xs font-semibold text-emerald-300 mb-1">
                              {m.sender?.full_name || 'Bilinmiyor'}
                            </div>
                          )}
                          {m.body ? (
                            <div className="whitespace-pre-wrap leading-relaxed">{m.body}</div>
                          ) : null}
                          {m.attachments?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {m.attachments.map((a) => (
                                <a
                                  key={a.id}
                                  href={a.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${attachmentClass}`}
                                >
                                  {a.file_name || 'Dosya'}
                                  {a.file_size ? (
                                    <span className={isMine ? 'text-white/70' : 'text-slate-400'}>
                                      ({Math.round(a.file_size / 1024)} KB)
                                    </span>
                                  ) : null}
                                </a>
                              ))}
                            </div>
                          )}
                          <div className={`mt-1 text-[11px] text-right ${isMine ? 'text-white/70' : 'text-slate-400'}`}>
                            {formatTarih(m.created_at)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={metin}
                  onChange={(e) => setMetin(e.target.value)}
                  placeholder="Mesaj yaz..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      mesajGonder()
                    }
                  }}
                  disabled={!seciliThreadId || gonderiliyor}
                  className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
                />
                <Button
                  onClick={mesajGonder}
                  disabled={!seciliThreadId || gonderiliyor}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg"
                >
                  {gonderiliyor ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Gönder
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="flex items-center gap-2 text-slate-200">
                  <Paperclip className="w-4 h-4" /> Ek dosya (PDF vb.)
                </Label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => dosyaSec(e.target.files)}
                  disabled={!seciliThreadId || gonderiliyor}
                  className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-slate-700 file:text-sm file:font-medium file:bg-slate-900 file:text-slate-200 hover:file:bg-slate-800"
                />
                {dosyalar.length > 0 && (
                  <div className="space-y-2">
                    {dosyalar.map((f, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                        <div className="text-sm text-slate-200 truncate">{f.name}</div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => dosyaSil(i)}
                          disabled={gonderiliyor}
                          aria-label="Dosyayı kaldır"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
  )
}
