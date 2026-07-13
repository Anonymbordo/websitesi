'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ExternalLink,
  ImagePlus,
  Megaphone,
  Palette,
  RotateCcw,
  Save,
  Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { mediaAPI, pagesAPI } from '@/lib/api'
import { getImageUrl } from '@/lib/utils'
import {
  emptyHomeCampaignItem,
  HOME_CAMPAIGNS_PAGE_SLUG,
  HOME_CAMPAIGNS_PAGE_TITLE,
  HOME_CAMPAIGNS_STORAGE_KEY,
  homeCampaignThemeOptions,
  HomeCampaignItem,
  HomeCampaignTheme,
  normalizeCampaignHref,
  normalizeHomeCampaignItems,
} from '@/lib/homepageCampaigns'

const campaignThemeStyles: Record<
  HomeCampaignTheme,
  {
    shell: string
    pill: string
    accent: string
    button: string
  }
> = {
  blue: {
    shell: 'from-blue-600 via-cyan-500 to-sky-400',
    pill: 'bg-blue-100 text-blue-700',
    accent: 'from-blue-600 to-cyan-400',
    button: 'from-blue-600 to-cyan-500',
  },
  violet: {
    shell: 'from-violet-600 via-fuchsia-500 to-pink-400',
    pill: 'bg-violet-100 text-violet-700',
    accent: 'from-violet-600 to-fuchsia-400',
    button: 'from-violet-600 to-fuchsia-500',
  },
  emerald: {
    shell: 'from-emerald-600 via-teal-500 to-cyan-400',
    pill: 'bg-emerald-100 text-emerald-700',
    accent: 'from-emerald-600 to-teal-400',
    button: 'from-emerald-600 to-teal-500',
  },
  amber: {
    shell: 'from-amber-500 via-orange-500 to-rose-400',
    pill: 'bg-amber-100 text-amber-700',
    accent: 'from-amber-500 to-orange-400',
    button: 'from-amber-500 to-orange-500',
  },
  rose: {
    shell: 'from-rose-600 via-pink-500 to-fuchsia-400',
    pill: 'bg-rose-100 text-rose-700',
    accent: 'from-rose-600 to-pink-400',
    button: 'from-rose-600 to-pink-500',
  },
}

const defaultItems = (): HomeCampaignItem[] => [
  emptyHomeCampaignItem('blue'),
  emptyHomeCampaignItem('violet'),
  emptyHomeCampaignItem('emerald'),
]

function useImageOrientation(imageSrc?: string) {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape')

  useEffect(() => {
    if (!imageSrc) {
      setOrientation('landscape')
      return
    }

    const image = new Image()
    image.onload = () => {
      setOrientation(image.naturalHeight > image.naturalWidth * 1.08 ? 'portrait' : 'landscape')
    }
    image.onerror = () => {
      setOrientation('landscape')
    }
    image.src = imageSrc
  }, [imageSrc])

  return orientation
}

function CampaignPreviewImage({
  imageUrl,
  title,
  shellClassName,
  portrait = false,
}: {
  imageUrl?: string
  title: string
  shellClassName: string
  portrait?: boolean
}) {
  if (!imageUrl) {
    return <div className={`absolute inset-0 bg-gradient-to-br ${shellClassName}`} />
  }

  const resolvedImage = getImageUrl(imageUrl) || imageUrl

  return (
    <>
      <img
        src={resolvedImage}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-105 object-cover blur-2xl opacity-35"
      />
      <div className="absolute inset-0 bg-slate-950/10" />
      {portrait ? (
        <div className="absolute inset-0 flex items-center justify-center p-4 md:justify-end md:pr-6">
          <img
            src={resolvedImage}
            alt={title}
            className="max-h-full w-auto max-w-[64%] object-contain drop-shadow-[0_24px_40px_rgba(15,23,42,0.22)] md:max-w-[38%]"
          />
        </div>
      ) : (
        <img
          src={resolvedImage}
          alt={title}
          className="absolute inset-0 h-full w-full object-contain p-4 drop-shadow-[0_24px_40px_rgba(15,23,42,0.22)]"
        />
      )}
    </>
  )
}

export default function AdminHomepageCampaignsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [settingsPageExists, setSettingsPageExists] = useState(false)
  const [items, setItems] = useState<HomeCampaignItem[]>(defaultItems())
  const fileInputRefs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        let loaded = false

        try {
          const pageResp = await pagesAPI.getPageBySlugOptional(HOME_CAMPAIGNS_PAGE_SLUG)
          const blocks = pageResp?.status === 404 ? [] : pageResp?.data?.blocks || []
          const block =
            blocks.find((item: any) => item?.type === 'home_campaign_showcase') || blocks[0]
          const pageItems = block?.data?.items

          if (Array.isArray(pageItems) && pageResp?.status !== 404) {
            setItems(normalizeHomeCampaignItems(pageItems))
            setSettingsPageExists(true)
            loaded = true
          } else {
            setSettingsPageExists(false)
          }
        } catch (_) {
          setSettingsPageExists(false)
        }

        if (!loaded) {
          const raw = localStorage.getItem(HOME_CAMPAIGNS_STORAGE_KEY)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) {
              setItems(normalizeHomeCampaignItems(parsed))
              loaded = true
            }
          }
        }

        if (!loaded) {
          setItems(defaultItems())
        }
      } catch (error) {
        console.error(error)
        toast.error('Kampanya ayarlari yuklenemedi')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const updateItem = (index: number, patch: Partial<HomeCampaignItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const uploadAsset = async (file: File): Promise<string> => {
    try {
      const presignResp = await mediaAPI.presignUpload({
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
      })
      const uploadUrl = presignResp?.data?.upload_url
      const publicUrl = presignResp?.data?.public_url

      if (!uploadUrl || !publicUrl) {
        throw new Error('Presign bilgisi alınamadı')
      }

      const uploadResp = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      })

      if (!uploadResp.ok) {
        throw new Error(`Upload basarisiz: ${uploadResp.status}`)
      }

      return publicUrl
    } catch (error) {
      const fallbackResp = await mediaAPI.uploadFile(file)
      const fallbackUrl =
        fallbackResp?.data?.file_url ||
        fallbackResp?.data?.url ||
        fallbackResp?.data?.public_url ||
        ''

      if (!fallbackUrl) throw error
      return fallbackUrl
    }
  }

  const handleImageUpload = async (index: number, file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen bir görsel dosyası seçin')
      return
    }

    try {
      setUploadingIndex(index)
      const url = await uploadAsset(file)
      updateItem(index, { image_url: url })
      toast.success(`Kampanya ${index + 1} görseli yüklendi`)
    } catch (error) {
      console.error(error)
      toast.error('Görsel yüklenemedi')
    } finally {
      setUploadingIndex(null)
    }
  }

  const save = async () => {
    try {
      setSaving(true)
      const normalizedItems = normalizeHomeCampaignItems(items)
      setItems(normalizedItems)
      const blocks = [
        {
          id: 'home-campaign-showcase',
          type: 'home_campaign_showcase',
          data: { items: normalizedItems },
        },
      ]

      if (settingsPageExists) {
        await pagesAPI.updatePage(HOME_CAMPAIGNS_PAGE_SLUG, {
          title: HOME_CAMPAIGNS_PAGE_TITLE,
          blocks,
          status: 'published',
          show_in_header: false,
        })
      } else {
        await pagesAPI.createPage({
          slug: HOME_CAMPAIGNS_PAGE_SLUG,
          title: HOME_CAMPAIGNS_PAGE_TITLE,
          blocks,
          status: 'published',
          show_in_header: false,
        })
        setSettingsPageExists(true)
      }

      localStorage.setItem(HOME_CAMPAIGNS_STORAGE_KEY, JSON.stringify(normalizedItems))
      toast.success('Ana sayfa güncel fırsatları kaydedildi')
    } catch (error) {
      console.error(error)
      toast.error('Kampanyalar kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setItems(defaultItems())
  }

  const previews = useMemo(() => items, [items])
  const primaryPreviewImage = previews[0]?.image_url
    ? getImageUrl(previews[0].image_url) || previews[0].image_url
    : ''
  const primaryPreviewIsPortrait = useImageOrientation(primaryPreviewImage) === 'portrait'

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 p-8 text-white shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
              <Megaphone className="h-4 w-4" />
              Ana Sayfa Güncel Fırsatlar
            </div>
            <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
              Müşteri güncel fırsatlarını admin panelden yönetin
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
              Bu alandaki 3 kart anasayfadaki güncel fırsatlar bölümünü besler. Başlık,
              açıklama, detay linki, renk teması ve görseli buradan yönetebilirsiniz.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-blue-100 backdrop-blur">
            Kayıt ettiğinizde değişiklikler anasayfada hemen görünür.
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Canlı Önizleme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            {previews[0] ? (
              <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_30px_80px_-35px_rgba(37,99,235,0.45)]">
                <div className="relative min-h-[420px] overflow-hidden">
                  <CampaignPreviewImage
                    imageUrl={previews[0].image_url}
                    title={previews[0].title || 'Kampanya'}
                    shellClassName={campaignThemeStyles[previews[0].theme].shell}
                    portrait={primaryPreviewIsPortrait}
                  />
                  <div
                    className={
                      primaryPreviewIsPortrait
                        ? 'absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/18 to-transparent md:bg-gradient-to-r md:from-slate-950 md:via-slate-950/90 md:via-[52%] md:to-slate-950/12'
                        : 'absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/25 to-transparent'
                    }
                  />
                  <div className="absolute left-6 top-6 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-slate-700">
                    {previews[0].badge || 'Kampanya'}
                  </div>
                  <div
                    className={
                      primaryPreviewIsPortrait
                        ? 'absolute inset-y-0 left-0 flex w-full flex-col justify-end p-6 text-white sm:p-8 md:max-w-[58%]'
                        : 'absolute inset-x-0 bottom-0 p-6 text-white'
                    }
                  >
                    <div className={`mb-4 h-1.5 w-16 rounded-full bg-gradient-to-r ${campaignThemeStyles[previews[0].theme].accent}`} />
                    <h3 className="max-w-xl text-3xl font-bold leading-tight">
                      {previews[0].title || 'İlk kart burada öne çıkar'}
                    </h3>
                    <p className="mt-3 max-w-xl text-sm leading-7 text-slate-200">
                      {previews[0].description || 'Açıklama girdiğinizde bu alanda fırsatın kısa özeti görünür.'}
                    </p>
                    <div className={`mt-6 inline-flex items-center rounded-full bg-gradient-to-r ${campaignThemeStyles[previews[0].theme].button} px-5 py-3 text-sm font-semibold text-white shadow-lg`}>
                      {previews[0].cta_label || 'Detaylar'}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid gap-5">
              {previews.slice(1).map((item, index) => (
                <div
                  key={`campaign-preview-${index + 1}`}
                  className="overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_24px_60px_-35px_rgba(15,23,42,0.35)]"
                >
                  <div className="grid min-h-[200px] gap-0 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="relative min-h-[180px] overflow-hidden">
                      <CampaignPreviewImage
                        imageUrl={item.image_url}
                        title={item.title || `Kampanya ${index + 2}`}
                        shellClassName={campaignThemeStyles[item.theme].shell}
                      />
                    </div>
                    <div className="p-5">
                      <div className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${campaignThemeStyles[item.theme].pill}`}>
                        {item.badge || 'Kampanya'}
                      </div>
                      <h3 className="mt-3 text-xl font-bold text-slate-900">
                        {item.title || `Kampanya ${index + 2}`}
                      </h3>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                        {item.description || 'Kısa fırsat özeti burada görünür.'}
                      </p>
                      <div className="mt-5 inline-flex items-center text-sm font-semibold text-slate-900">
                        {item.cta_label || 'Detaylar'}
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="p-8 text-gray-600">Yükleniyor...</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {items.map((item, index) => (
            <Card key={`campaign-editor-${index}`} className="border-0 shadow-lg">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">Kampanya {index + 1}</CardTitle>
                  <div className={`rounded-full px-3 py-1 text-xs font-semibold ${campaignThemeStyles[item.theme].pill}`}>
                    {homeCampaignThemeOptions.find((option) => option.value === item.theme)?.label}
                  </div>
                </div>
                <div className={`h-1.5 w-16 rounded-full bg-gradient-to-r ${campaignThemeStyles[item.theme].accent}`} />
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor={`campaign-badge-${index}`}>Etiket</Label>
                  <Input
                    id={`campaign-badge-${index}`}
                    value={item.badge}
                    onChange={(event) => updateItem(index, { badge: event.target.value })}
                    placeholder="Etkinlik, Yeni Donem, Sponsor..."
                  />
                </div>

                <div>
                  <Label htmlFor={`campaign-title-${index}`}>Fırsat Başlığı</Label>
                  <Input
                    id={`campaign-title-${index}`}
                    value={item.title}
                    onChange={(event) => updateItem(index, { title: event.target.value })}
                    placeholder="Fırsat başlığı"
                  />
                </div>

                <div>
                  <Label htmlFor={`campaign-description-${index}`}>Açıklama</Label>
                  <Textarea
                    id={`campaign-description-${index}`}
                    value={item.description}
                    onChange={(event) => updateItem(index, { description: event.target.value })}
                    placeholder="Fırsatın özet metni"
                    className="min-h-[120px]"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor={`campaign-link-${index}`}>Detay Linki</Label>
                    <Input
                      id={`campaign-link-${index}`}
                      value={item.href}
                      onChange={(event) => updateItem(index, { href: event.target.value })}
                      autoComplete="off"
                      placeholder="/courses/ornek veya https://..."
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Sayfa slug&apos;ı, site içi yol veya tam URL girebilirsiniz. Kaydederken{' '}
                      <span className="font-medium text-slate-700">
                        {normalizeCampaignHref(item.href) || '/courses'}
                      </span>{' '}
                      olarak kullanılır.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor={`campaign-cta-${index}`}>Buton Metni</Label>
                    <Input
                      id={`campaign-cta-${index}`}
                      value={item.cta_label}
                      onChange={(event) => updateItem(index, { cta_label: event.target.value })}
                      autoComplete="off"
                      placeholder="Detaylar"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Boş bırakılırsa otomatik olarak <span className="font-medium text-slate-700">Detaylar</span>{' '}
                      kullanılır.
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor={`campaign-theme-${index}`}>Renk Temasi</Label>
                  <div className="relative">
                    <Palette className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <select
                      id={`campaign-theme-${index}`}
                      value={item.theme}
                      onChange={(event) =>
                        updateItem(index, { theme: event.target.value as HomeCampaignTheme })
                      }
                      className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {homeCampaignThemeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-dashed border-gray-200 bg-slate-50/80 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Kampanya Görseli</p>
                      <p className="text-xs text-slate-500">
                        Kartta kullanılacak kapak görseli
                      </p>
                    </div>
                    <input
                      ref={(element) => {
                        fileInputRefs.current[index] = element
                      }}
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleImageUpload(index, event.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRefs.current[index]?.click()}
                      disabled={uploadingIndex === index}
                    >
                      <ImagePlus className="mr-2 h-4 w-4" />
                      {uploadingIndex === index ? 'Yükleniyor...' : 'Görsel Seç'}
                    </Button>
                  </div>

                  <Input
                    value={item.image_url || ''}
                    onChange={(event) => updateItem(index, { image_url: event.target.value })}
                    placeholder="https://... veya yukleme sonrasi URL"
                  />

                  {item.image_url ? (
                    <img
                      src={getImageUrl(item.image_url) || item.image_url}
                      alt={`Kampanya ${index + 1}`}
                      className="h-40 w-full rounded-2xl object-cover"
                    />
                  ) : (
                    <div className={`flex h-40 w-full items-center justify-center rounded-2xl bg-gradient-to-br ${campaignThemeStyles[item.theme].shell} text-sm font-semibold text-white`}>
                      Kampanya onizleme alani
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={reset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Sifirla
        </Button>
        <Button type="button" onClick={save} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>
    </div>
  )
}
