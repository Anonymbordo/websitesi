'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  Image as ImageIcon,
  Loader2,
  PlayCircle,
  Sparkles,
  Tag,
  Upload,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { uploadFileToFirebaseStorage } from '@/lib/firebase'
import { mediaAPI } from '@/lib/api'
import {
  BlogPost,
  BlogPostStatus,
  buildBlogExcerpt,
  estimateBlogReadTime,
  formatBlogDate,
  slugifyBlogText,
} from '@/lib/blog'
import { BlogVideoEmbed } from '@/components/blog/BlogVideoEmbed'

export type BlogFormValues = {
  title: string
  slug: string
  excerpt: string
  content: string
  category: string
  tags: string
  featured_image: string
  video_url: string
  video_title: string
  author_name: string
  status: BlogPostStatus
  is_featured: boolean
  scheduled_at: string
}

const SERVERLESS_UPLOAD_WARNING_THRESHOLD_BYTES = 4 * 1024 * 1024

type BlogEditorFormProps = {
  initialPost?: BlogPost | null
  categories: string[]
  submitLabel: string
  isSaving?: boolean
  onSubmit: (values: BlogFormValues) => Promise<void> | void
  onCancel: () => void
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (number: number) => number.toString().padStart(2, '0')

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function buildInitialValues(initialPost?: BlogPost | null): BlogFormValues {
  return {
    title: initialPost?.title || '',
    slug: initialPost?.slug || '',
    excerpt: initialPost?.excerpt || '',
    content: initialPost?.content || '',
    category: initialPost?.category || '',
    tags: initialPost?.tags?.join(', ') || '',
    featured_image: initialPost?.featured_image || '',
    video_url: initialPost?.video_url || '',
    video_title: initialPost?.video_title || '',
    author_name: initialPost?.author?.full_name || 'Site Admin',
    status: initialPost?.status || 'draft',
    is_featured: initialPost?.is_featured || false,
    scheduled_at: toDatetimeLocal(initialPost?.scheduled_at),
  }
}

function readUploadErrorStatus(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status
}

function readUploadErrorDetail(error: unknown) {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  return typeof detail === 'string' ? detail : ''
}

export function BlogEditorForm({
  initialPost,
  categories,
  submitLabel,
  isSaving = false,
  onSubmit,
  onCancel,
}: BlogEditorFormProps) {
  const [values, setValues] = useState<BlogFormValues>(() => buildInitialValues(initialPost))
  const [slugTouched, setSlugTouched] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    setValues(buildInitialValues(initialPost))
    setSlugTouched(Boolean(initialPost?.slug && initialPost.slug !== slugifyBlogText(initialPost.title)))
  }, [initialPost])

  useEffect(() => {
    if (slugTouched) return
    const nextSlug = slugifyBlogText(values.title)
    setValues((current) => current.slug === nextSlug ? current : { ...current, slug: nextSlug })
  }, [slugTouched, values.title])

  const resolvedCategories = useMemo(() => (
    categories.length > 0 ? categories : ['Genel', 'Etkinlik', 'Basında Biz', 'Duyurular']
  ), [categories])

  const derivedExcerpt = values.excerpt.trim() || buildBlogExcerpt(values.content)
  const previewDate = values.status === 'scheduled' && values.scheduled_at
    ? formatBlogDate(new Date(values.scheduled_at).toISOString())
    : formatBlogDate(new Date().toISOString())

  const previewReadTime = estimateBlogReadTime(values.content || values.excerpt)
  const tagList = values.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

  const updateValue = <K extends keyof BlogFormValues>(key: K, nextValue: BlogFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: nextValue }))
  }

  const uploadAsset = async (file: File) => {
    try {
      const presignResp = await mediaAPI.presignUpload({
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
      })

      const uploadUrl = presignResp?.data?.upload_url
      const publicUrl = presignResp?.data?.public_url

      if (!uploadUrl || !publicUrl) {
        throw new Error('Presign bilgisi alınamadı.')
      }

      const uploadResp = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      })

      if (!uploadResp.ok) {
        throw new Error(`S3 upload başarısız (${uploadResp.status})`)
      }

      return publicUrl as string
    } catch (presignError) {
      try {
        const firebaseBasePath = file.type.startsWith('video/') ? 'blog-videos' : 'blog-media'
        const firebaseUpload = await uploadFileToFirebaseStorage(file, firebaseBasePath)
        if (firebaseUpload.downloadUrl) {
          return firebaseUpload.downloadUrl
        }
      } catch (firebaseError) {
        console.warn('Firebase direct upload başarısız, backend fallback denenecek.', firebaseError)
      }

      const fallbackResp = await mediaAPI.uploadFile(file)
      const fallbackUrl =
        fallbackResp?.data?.file_url ||
        fallbackResp?.data?.url ||
        fallbackResp?.data?.public_url ||
        ''

      if (!fallbackUrl) {
        throw presignError
      }

      return fallbackUrl as string
    }
  }

  const handleUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    target: 'featured_image' | 'video_url',
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setErrorMessage('')

    const setUploading = target === 'featured_image' ? setUploadingImage : setUploadingVideo
    setUploading(true)

    try {
      const uploadedUrl = await uploadAsset(file)

      updateValue(target, uploadedUrl)

      if (target === 'video_url' && !values.video_title.trim()) {
        updateValue('video_title', values.title || file.name)
      }
    } catch (error) {
      console.error('Blog medyası yüklenemedi', error)
      const status = readUploadErrorStatus(error)
      const detail = readUploadErrorDetail(error)
      const firebaseErrorCode = (error as { code?: string })?.code || ''
      if (status === 413) {
        setErrorMessage('Dosya sunucu limitini aştı. Büyük videolar için S3 direct upload ayarı gerekli; şimdilik video URL yapıştırabilir veya sunucu ayarını kontrol edebilirsiniz.')
      } else if (
        file.size > SERVERLESS_UPLOAD_WARNING_THRESHOLD_BYTES &&
        (/AWS|S3|Presigned URL|Missing AWS credentials/i.test(detail) || firebaseErrorCode.startsWith('storage/'))
      ) {
        setErrorMessage('Büyük dosya için direct upload devreye girmedi. Storage yapılandırmasını kontrol edin veya şimdilik video URL yapıştırarak devam edin.')
      } else if (status === 403) {
        setErrorMessage('Bu medya yükleme işlemi için yetkiniz reddedildi. Admin veya editor yetkisini kontrol edin.')
      } else {
        setErrorMessage('Dosya yüklenemedi. URL yapıştırarak devam edebilir veya tekrar deneyebilirsiniz.')
      }
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')

    if (!values.title.trim()) {
      setErrorMessage('Başlık zorunludur.')
      return
    }

    if (!values.content.trim()) {
      setErrorMessage('İçerik alanını doldurun.')
      return
    }

    if (values.status === 'scheduled' && !values.scheduled_at) {
      setErrorMessage('Planlı yayın için tarih seçin.')
      return
    }

    try {
      await onSubmit({
        ...values,
        title: values.title.trim(),
        slug: slugifyBlogText(values.slug || values.title),
        excerpt: values.excerpt.trim(),
        content: values.content,
        category: values.category || resolvedCategories[0],
        tags: values.tags,
        featured_image: values.featured_image.trim(),
        video_url: values.video_url.trim(),
        video_title: values.video_title.trim(),
        author_name: values.author_name.trim() || 'Site Admin',
      })
    } catch (error) {
      console.error('Blog kaydedilemedi', error)
      setErrorMessage('Blog kaydedilemedi. Lütfen tekrar deneyin.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.8fr)]">
      <div className="space-y-6">
        <Card className="border-0 bg-white/90 shadow-xl shadow-slate-200/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
              <Sparkles className="h-5 w-5 text-cyan-600" />
              İçerik Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Başlık</label>
                <Input
                  value={values.title}
                  onChange={(event) => updateValue('title', event.target.value)}
                  placeholder="İçeriğin vitrindeki başlığını yazın"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Slug</label>
                <Input
                  value={values.slug}
                  onChange={(event) => {
                    setSlugTouched(true)
                    updateValue('slug', slugifyBlogText(event.target.value))
                  }}
                  placeholder="ornek-blog-yazisi"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Yazar</label>
                <Input
                  value={values.author_name}
                  onChange={(event) => updateValue('author_name', event.target.value)}
                  placeholder="Site Admin"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Kategori</label>
                <select
                  value={values.category || resolvedCategories[0]}
                  onChange={(event) => updateValue('category', event.target.value)}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                >
                  {resolvedCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Yayın Durumu</label>
                <select
                  value={values.status}
                  onChange={(event) => updateValue('status', event.target.value as BlogPostStatus)}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="draft">Taslak</option>
                  <option value="published">Yayında</option>
                  <option value="scheduled">Planlı</option>
                </select>
              </div>

              {values.status === 'scheduled' && (
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Planlanan Yayın Tarihi</label>
                  <Input
                    type="datetime-local"
                    value={values.scheduled_at}
                    onChange={(event) => updateValue('scheduled_at', event.target.value)}
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Kısa Özet</label>
                <Textarea
                  value={values.excerpt}
                  onChange={(event) => updateValue('excerpt', event.target.value)}
                  rows={3}
                  placeholder="Anasayfa ve blog kartlarında görünen kısa açıklama"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Etiketler</label>
                <Input
                  value={values.tags}
                  onChange={(event) => updateValue('tags', event.target.value)}
                  placeholder="sponsorluk, etkinlik, marka işbirliği"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/70 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={values.is_featured}
                onChange={(event) => updateValue('is_featured', event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              Anasayfada ve blog listesinde öne çıkar
            </label>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/90 shadow-xl shadow-slate-200/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
              <ImageIcon className="h-5 w-5 text-amber-500" />
              Görsel ve Video
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Kapak Görseli URL</label>
                <div className="flex flex-col gap-3 md:flex-row">
                  <Input
                    value={values.featured_image}
                    onChange={(event) => updateValue('featured_image', event.target.value)}
                    placeholder="https://..."
                  />
                  <label className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                    {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Görsel Yükle
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleUpload(event, 'featured_image')}
                    />
                  </label>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Video URL</label>
                <div className="flex flex-col gap-3 md:flex-row">
                  <Input
                    value={values.video_url}
                    onChange={(event) => updateValue('video_url', event.target.value)}
                    placeholder="YouTube, Vimeo veya mp4 linki"
                  />
                  <label className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                    {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Video Yükle
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(event) => handleUpload(event, 'video_url')}
                    />
                  </label>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Büyük videolarda yükleme zorlanırsa önce medya alanına yükleyip URL yapıştırabilirsiniz.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Video Başlığı</label>
                <Input
                  value={values.video_title}
                  onChange={(event) => updateValue('video_title', event.target.value)}
                  placeholder="Örn. Sıla Konseri Sponsorluk Videosu"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/90 shadow-xl shadow-slate-200/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
              <Tag className="h-5 w-5 text-emerald-500" />
              İçerik Metni
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Yazı İçeriği</label>
              <Textarea
                value={values.content}
                onChange={(event) => updateValue('content', event.target.value)}
                rows={14}
                placeholder="Müşteri hikayesini, proje detaylarını ve video açıklamasını buraya yazın."
              />
              <p className="mt-2 text-xs text-slate-500">
                Düz metin veya basit HTML kullanabilirsiniz. Düz metin otomatik paragraf düzeniyle gösterilir.
              </p>
            </div>

            {errorMessage && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <Button type="button" variant="ghost" onClick={onCancel}>
                Vazgeç
              </Button>
              <Button
                type="submit"
                disabled={isSaving || uploadingImage || uploadingVideo}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
              >
                {isSaving ? 'Kaydediliyor...' : submitLabel}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 xl:sticky xl:top-8 xl:self-start">
        <Card className="overflow-hidden border-0 bg-slate-950 text-white shadow-2xl shadow-slate-300/40">
          <div className="relative aspect-[16/10] overflow-hidden">
            {values.featured_image ? (
              <img
                src={values.featured_image}
                alt={values.title || 'Blog kapak görseli'}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-slate-900 to-emerald-500" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-6">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">
                  {values.category || resolvedCategories[0]}
                </span>
                <span className="rounded-full bg-cyan-400/20 px-3 py-1 text-cyan-100">
                  {values.status === 'published' ? 'Yayında' : values.status === 'scheduled' ? 'Planlı' : 'Taslak'}
                </span>
                {values.video_url && (
                  <span className="rounded-full bg-amber-400/20 px-3 py-1 text-amber-100">
                    Video içeriyor
                  </span>
                )}
              </div>

              <h3 className="text-2xl font-semibold leading-tight">
                {values.title || 'Blog başlığı burada görünecek'}
              </h3>
            </div>
          </div>

          <CardContent className="space-y-5 p-6">
            <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
              <span className="inline-flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {previewDate || 'Tarih'}
              </span>
              <span className="inline-flex items-center gap-2">
                <User className="h-4 w-4" />
                {values.author_name || 'Site Admin'}
              </span>
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {previewReadTime} dk okuma
              </span>
            </div>

            <p className="text-sm leading-6 text-white/80">
              {derivedExcerpt || 'Kısa özet girdiğinizde burada görünecek.'}
            </p>

            {tagList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tagList.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {values.video_url && (
          <Card className="border-0 bg-white/90 shadow-xl shadow-slate-200/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                <PlayCircle className="h-5 w-5 text-rose-500" />
                Video Önizleme
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BlogVideoEmbed url={values.video_url} title={values.video_title || values.title} />
            </CardContent>
          </Card>
        )}
      </div>
    </form>
  )
}
