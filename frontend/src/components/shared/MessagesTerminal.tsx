'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, RefreshCw, Send, Paperclip, Plus, X } from 'lucide-react'

import { messagesAPI } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ThreadSummary = {
  id: number
  other_user: {
    id: number | null
    full_name: string
    role: string | null
  }
  last_message?: string | null
  last_message_at?: string | null
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

  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [seciliThreadId, setSeciliThreadId] = useState<number | null>(null)
  const [mesajlar, setMesajlar] = useState<MessageOut[]>([])

  const [threadsYukleniyor, setThreadsYukleniyor] = useState(false)
  const [mesajlarYukleniyor, setMesajlarYukleniyor] = useState(false)
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)

  const [yeniKisiId, setYeniKisiId] = useState('')
  const [metin, setMetin] = useState('')
  const [dosyalar, setDosyalar] = useState<File[]>([])

  const terminalRef = useRef<HTMLDivElement | null>(null)

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

      if (selectFirstIfEmpty && data.length > 0) {
        setSeciliThreadId(prev => prev ?? data[0].id)
      }
    } catch (e: unknown) {
      setHata(hataDetayi(e) || 'Sohbetler alınamadı')
    } finally {
      setThreadsYukleniyor(false)
    }
  }, [])

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
    if (seciliThreadId) mesajlariYukle(seciliThreadId)
  }, [seciliThreadId, mesajlariYukle])

  const threadOlustur = async () => {
    const id = parseInt(yeniKisiId, 10)
    if (!id || Number.isNaN(id)) {
      setHata('Geçerli bir Kullanıcı ID girin')
      return
    }

    setHata(null)
    try {
      const resp = await messagesAPI.createThread({ recipient_user_id: id })
      const threadId = resp.data?.thread_id
      await threadsYukle(false)
      if (threadId) setSeciliThreadId(threadId)
      setYeniKisiId('')
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

  return (
    <div className="space-y-6">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
            {baslik}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Sohbet başlatın, mesajlaşın ve PDF/ek gönderin.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => threadsYukle(false)}
          disabled={threadsYukleniyor}
          className="bg-white"
        >
          {threadsYukleniyor ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Yenile
        </Button>
      </div>

      {hata && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {hata}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-blue-50">
            <CardTitle>Sohbetler</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
              <Label className="text-sm">Kullanıcı ID ile sohbet başlat</Label>
              <div className="flex gap-2">
                <Input
                  value={yeniKisiId}
                  onChange={(e) => setYeniKisiId(e.target.value)}
                  placeholder="Örn: 123"
                  inputMode="numeric"
                  className="bg-white"
                />
                <Button onClick={threadOlustur} disabled={!yeniKisiId.trim()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Başlat
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Admin herkesle; eğitmen/öğrenci yalnızca kayıt ilişkisi varsa sohbet açabilir.
              </p>
            </div>

            <div className="space-y-2">
              {threadsYukleniyor ? (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" /> Sohbetler yükleniyor...
                </div>
              ) : threads.length === 0 ? (
                <div className="text-sm text-gray-600">Henüz sohbet yok.</div>
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
                            ? 'border-blue-300 bg-blue-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300')
                        }
                      >
                        <div className="flex items-start gap-3">
                          <div className={
                            'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ' +
                            (aktif
                              ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white'
                              : 'bg-gray-100 text-gray-700')
                          }>
                            {initials || 'U'}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-semibold text-gray-900 truncate">{isim}</div>
                              <div className="text-[11px] text-gray-500 shrink-0">{formatTarih(t.last_message_at)}</div>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {t.other_user?.role ? (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                                  {t.other_user.role}
                                </span>
                              ) : null}
                              <div className="text-xs text-gray-600 line-clamp-1">{t.last_message || '—'}</div>
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

        <Card className="lg:col-span-2 bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-blue-50">
            <CardTitle>
              {seciliThread
                ? `Terminal — ${seciliThread.other_user?.full_name || 'Sohbet'}`
                : 'Terminal'}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            <div
              ref={terminalRef}
              className="h-[55vh] overflow-y-auto rounded-2xl border border-gray-900/20 bg-gradient-to-br from-gray-950 via-slate-950 to-gray-900 text-gray-100 font-mono text-sm p-4 shadow-inner"
            >
              {mesajlarYukleniyor ? (
                <div className="flex items-center gap-2 text-gray-300">
                  <Loader2 className="w-4 h-4 animate-spin" /> Mesajlar yükleniyor...
                </div>
              ) : !seciliThreadId ? (
                <div className="text-gray-300">Sol taraftan bir sohbet seçin.</div>
              ) : mesajlar.length === 0 ? (
                <div className="text-gray-300">Henüz mesaj yok. İlk mesajı gönderin.</div>
              ) : (
                <div className="space-y-3">
                  {mesajlar.map((m) => (
                    <div key={m.id} className="whitespace-pre-wrap">
                      <div>
                        <span className="text-gray-400">[{formatTarih(m.created_at)}]</span>{' '}
                        <span className="text-emerald-300">{m.sender?.full_name || 'Bilinmiyor'}</span>:{' '}
                        <span>{m.body || ''}</span>
                      </div>
                      {m.attachments?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {m.attachments.map((a) => (
                            <div key={a.id} className="inline-flex items-center gap-2 text-xs mr-2 mb-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-sky-200">
                              <a href={a.file_url} target="_blank" rel="noreferrer" className="underline">
                                {a.file_name || a.file_url}
                              </a>
                              {a.file_size ? (
                                <span className="text-sky-100/70">({Math.round(a.file_size / 1024)} KB)</span>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
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
                  className="bg-white"
                />
                <Button onClick={mesajGonder} disabled={!seciliThreadId || gonderiliyor} className="shadow-sm">
                  {gonderiliyor ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Gönder
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4" /> Ek dosya (PDF vb.)
                </Label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => dosyaSec(e.target.files)}
                  disabled={!seciliThreadId || gonderiliyor}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-gray-200 file:text-sm file:font-medium file:bg-white file:text-gray-700 hover:file:bg-gray-50"
                />
                {dosyalar.length > 0 && (
                  <div className="space-y-2">
                    {dosyalar.map((f, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2">
                        <div className="text-sm text-gray-700 truncate">{f.name}</div>
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
  )
}
