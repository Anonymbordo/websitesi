'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, RotateCcw, Save } from 'lucide-react'
import toast from 'react-hot-toast'

import { adminAPI, mediaAPI, pagesAPI } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getImageUrl } from '@/lib/utils'
import {
  emptyHomeSampleVideoItem,
  HOME_SAMPLE_VIDEOS_LIMIT,
  HOME_SAMPLE_VIDEOS_PAGE_SLUG,
  HOME_SAMPLE_VIDEOS_PAGE_TITLE,
  HOME_SAMPLE_VIDEOS_STORAGE_KEY,
  HomeSampleVideoItem,
  normalizeHomeSampleVideoItems,
  normalizeSampleVideoHref,
} from '@/lib/homepageSampleVideos'

type CourseOption = {
  id: number
  title: string
  instructorName: string
  category: string
  price: number
  discountPrice?: number | null
  thumbnail?: string
  previewVideo?: string
  href: string
}

function courseToItem(course?: CourseOption | null): HomeSampleVideoItem {
  if (!course) return emptyHomeSampleVideoItem()

  return {
    source_type: 'existing',
    course_id: course.id,
    title: course.title,
    subtitle: course.instructorName,
    badge: course.category || 'Ders',
    cover_url: course.thumbnail || '',
    video_url: course.previewVideo || '',
    detail_url: course.href,
    cta_label: 'Satın Al',
  }
}

function defaultItems(courses: CourseOption[]): HomeSampleVideoItem[] {
  return Array.from({ length: HOME_SAMPLE_VIDEOS_LIMIT }).map((_, index) =>
    courseToItem(courses[index] || null)
  )
}

function hydrateItemWithCourse(
  item: HomeSampleVideoItem,
  courseMap: Map<number, CourseOption>
): HomeSampleVideoItem {
  if (item.source_type !== 'existing' || !item.course_id) return item

  const course = courseMap.get(item.course_id)
  if (!course) return item

  return {
    ...item,
    title: item.title || course.title,
    subtitle: item.subtitle || course.instructorName,
    badge: item.badge || course.category || 'Ders',
    cover_url: item.cover_url || course.thumbnail || '',
    video_url: item.video_url || course.previewVideo || '',
    detail_url: normalizeSampleVideoHref(item.detail_url) || course.href,
    cta_label: item.cta_label || 'Satın Al',
  }
}

export default function AdminHomepageInstructorsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [coverUploadingIndex, setCoverUploadingIndex] = useState<number | null>(null)
  const [settingsPageExists, setSettingsPageExists] = useState(false)
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [items, setItems] = useState<HomeSampleVideoItem[]>(
    Array.from({ length: HOME_SAMPLE_VIDEOS_LIMIT }, emptyHomeSampleVideoItem)
  )
  const videoInputRefs = useRef<Array<HTMLInputElement | null>>([])
  const coverInputRefs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)

        const coursesResp = await adminAPI.getCourses({ limit: 100 })
        const list = Array.isArray(coursesResp?.data) ? coursesResp.data : []

        const normalizedCourses: CourseOption[] = list
          .map((course: any) => ({
            id: Number(course?.id),
            title: course?.title || `Ders #${course?.id}`,
            instructorName: course?.instructor_name || 'Uzman Eğitmen',
            category: course?.category || 'Ders',
            price: Number(course?.price || 0),
            discountPrice:
              typeof course?.discount_price === 'number' ? Number(course.discount_price) : null,
            thumbnail: course?.thumbnail || '',
            previewVideo: course?.preview_video || '',
            href: course?.id ? `/courses/${course.id}` : '/courses',
          }))
          .sort((left, right) => {
            const leftScore = left.previewVideo ? 1 : 0
            const rightScore = right.previewVideo ? 1 : 0
            return rightScore - leftScore
          })

        setCourses(normalizedCourses)
        const normalizedCourseMap = new Map(normalizedCourses.map((course) => [course.id, course]))

        let loaded = false

        try {
          const pageResp = await pagesAPI.getPageBySlugOptional(HOME_SAMPLE_VIDEOS_PAGE_SLUG)
          const blocks = pageResp?.status === 404 ? [] : pageResp?.data?.blocks || []
          const block =
            blocks.find((entry: any) => entry?.type === 'home_sample_video_showcase') || blocks[0]
          const pageItems = block?.data?.items

          if (Array.isArray(pageItems) && pageResp?.status !== 404) {
            setItems(
              normalizeHomeSampleVideoItems(pageItems).map((item) =>
                hydrateItemWithCourse(item, normalizedCourseMap)
              )
            )
            setSettingsPageExists(true)
            loaded = true
          } else {
            setSettingsPageExists(false)
          }
        } catch {
          setSettingsPageExists(false)
        }

        if (!loaded) {
          const raw = localStorage.getItem(HOME_SAMPLE_VIDEOS_STORAGE_KEY)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) {
              setItems(
                normalizeHomeSampleVideoItems(parsed).map((item) =>
                  hydrateItemWithCourse(item, normalizedCourseMap)
                )
              )
              loaded = true
            }
          }
        }

        if (!loaded) {
          setItems(defaultItems(normalizedCourses))
        }
      } catch (error) {
        console.error(error)
        toast.error('Örnek ders videoları yüklenemedi')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const courseMap = useMemo(
    () => new Map(courses.map((course) => [course.id, course])),
    [courses]
  )

  const updateItem = (index: number, patch: Partial<HomeSampleVideoItem>) => {
    setItems((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)))
  }

  const applyCourse = (index: number, courseId: number) => {
    const selectedCourse = courseMap.get(courseId)
    updateItem(index, courseToItem(selectedCourse))
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
        throw new Error(`S3 upload başarısız: ${uploadResp.status}`)
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

  const createCoverFromVideo = async (file: File): Promise<File | null> => {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video')
        const objectUrl = URL.createObjectURL(file)
        video.src = objectUrl
        video.muted = true
        video.playsInline = true
        video.preload = 'metadata'

        const cleanup = () => {
          URL.revokeObjectURL(objectUrl)
        }

        video.onloadeddata = () => {
          const canvas = document.createElement('canvas')
          canvas.width = video.videoWidth || 1280
          canvas.height = video.videoHeight || 720
          const ctx = canvas.getContext('2d')

          if (!ctx) {
            cleanup()
            resolve(null)
            return
          }

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          canvas.toBlob((blob) => {
            cleanup()
            if (!blob) {
              resolve(null)
              return
            }
            resolve(new File([blob], `cover-${Date.now()}.jpg`, { type: 'image/jpeg' }))
          }, 'image/jpeg', 0.86)
        }

        video.onerror = () => {
          cleanup()
          resolve(null)
        }
      } catch {
        resolve(null)
      }
    })
  }

  const handleVideoUpload = async (index: number, file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('video/')) {
      toast.error('Lütfen video dosyası seçin')
      return
    }

    try {
      setUploadingIndex(index)
      const uploadedUrl = await uploadAsset(file)

      updateItem(index, { video_url: uploadedUrl })

      const generatedCover = await createCoverFromVideo(file)
      if (generatedCover) {
        try {
          const coverUrl = await uploadAsset(generatedCover)
          updateItem(index, { cover_url: coverUrl })
          toast.success(`Kart ${index + 1} video ve kapakla güncellendi`)
          return
        } catch (error) {
          console.error('Auto cover upload error:', error)
        }
      }

      toast.success(`Kart ${index + 1} videosu yüklendi`)
    } catch (error) {
      console.error(error)
      toast.error('Video yüklenemedi')
    } finally {
      setUploadingIndex(null)
    }
  }

  const handleCoverUpload = async (index: number, file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen görsel dosyası seçin')
      return
    }

    try {
      setCoverUploadingIndex(index)
      const coverUrl = await uploadAsset(file)
      updateItem(index, { cover_url: coverUrl })
      toast.success(`Kart ${index + 1} kapağı yüklendi`)
    } catch (error) {
      console.error(error)
      toast.error('Kapak yüklenemedi')
    } finally {
      setCoverUploadingIndex(null)
    }
  }

  const reset = () => {
    setItems(defaultItems(courses))
  }

  const save = async () => {
    try {
      setSaving(true)

      const normalizedItems = normalizeHomeSampleVideoItems(items)
      const blocks = [
        {
          id: 'home-sample-video-showcase',
          type: 'home_sample_video_showcase',
          data: { items: normalizedItems },
        },
      ]

      if (settingsPageExists) {
        await pagesAPI.updatePage(HOME_SAMPLE_VIDEOS_PAGE_SLUG, {
          title: HOME_SAMPLE_VIDEOS_PAGE_TITLE,
          blocks,
          status: 'published',
          show_in_header: false,
        })
      } else {
        await pagesAPI.createPage({
          slug: HOME_SAMPLE_VIDEOS_PAGE_SLUG,
          title: HOME_SAMPLE_VIDEOS_PAGE_TITLE,
          blocks,
          status: 'published',
          show_in_header: false,
        })
        setSettingsPageExists(true)
      }

      localStorage.setItem(HOME_SAMPLE_VIDEOS_STORAGE_KEY, JSON.stringify(normalizedItems))
      setItems(normalizedItems)
      toast.success('Örnek ders videoları kaydedildi')
    } catch (error) {
      console.error(error)
      toast.error('Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900">Ana Sayfa Örnek Ders Videoları</h1>
        <p className="max-w-3xl text-sm text-gray-600">
          Ana sayfa kahraman alanındaki 6 video kartını buradan yönetin. İsterseniz mevcut bir
          dersi seçip bilgileri otomatik doldurun, isterseniz manuel video vitrini oluşturun.
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-8 text-gray-600">Yükleniyor...</CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {items.map((item, index) => {
            const selectedCourse = item.course_id ? courseMap.get(item.course_id) : null
            const resolvedCover = getImageUrl(item.cover_url || '') || item.cover_url || ''

            return (
              <Card key={`sample-video-${index}`} className="border-0 shadow-lg">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-lg font-bold">Kart {index + 1}</CardTitle>
                    {item.detail_url ? (
                      <a
                        href={normalizeSampleVideoHref(item.detail_url) || item.detail_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Linki Aç
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>

                  <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-3">
                    <div className="relative aspect-video overflow-hidden rounded-[1.15rem] bg-slate-900">
                      {resolvedCover ? (
                        <img
                          src={resolvedCover}
                          alt={item.title || `Kart ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-sm text-slate-300">
                          Kapak görseli yok
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
                      <div className="absolute left-3 top-3 rounded-full bg-white/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-100 backdrop-blur">
                        {item.badge || 'Örnek Ders'}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {item.title || 'Başlık girin'}
                          </p>
                          <p className="truncate text-xs text-white/70">
                            {item.subtitle || 'Alt başlık girin'}
                          </p>
                        </div>
                        <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900">
                          {item.video_url ? 'Video Hazır' : 'Yalnızca Kart'}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Kaynak</label>
                    <select
                      value={item.source_type}
                      onChange={(event) =>
                        updateItem(index, { source_type: event.target.value as 'existing' | 'custom' })
                      }
                      className="w-full rounded-xl border border-gray-200 px-3 py-2"
                    >
                      <option value="existing">Mevcut Ders</option>
                      <option value="custom">Manuel Kart</option>
                    </select>
                  </div>

                  {item.source_type === 'existing' ? (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Ders Seçin</label>
                      <select
                        value={item.course_id ?? ''}
                        onChange={(event) => {
                          const value = Number(event.target.value)
                          if (Number.isFinite(value) && value > 0) {
                            applyCourse(index, value)
                          } else {
                            updateItem(index, { course_id: null })
                          }
                        }}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2"
                      >
                        <option value="">Ders seçin</option>
                        {courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.title} - {course.instructorName}
                          </option>
                        ))}
                      </select>
                      {selectedCourse ? (
                        <p className="mt-2 text-xs text-gray-500">
                          Secilen ders: {selectedCourse.title} / {selectedCourse.instructorName}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Başlık</label>
                      <Input
                        value={item.title}
                        onChange={(event) => updateItem(index, { title: event.target.value })}
                        placeholder="Örnek ders başlığı"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Alt Başlık</label>
                      <Input
                        value={item.subtitle}
                        onChange={(event) => updateItem(index, { subtitle: event.target.value })}
                        placeholder="Eğitmen adı veya açıklama"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Rozet</label>
                      <Input
                        value={item.badge}
                        onChange={(event) => updateItem(index, { badge: event.target.value })}
                        placeholder="Matematik"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Buton Metni</label>
                      <Input
                        value={item.cta_label || ''}
                        onChange={(event) => updateItem(index, { cta_label: event.target.value })}
                        placeholder="Satın Al"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Yönlendirme</label>
                      <Input
                        value={item.detail_url || ''}
                        onChange={(event) => updateItem(index, { detail_url: event.target.value })}
                        placeholder="/courses/12"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Video</label>
                    <input
                      ref={(element) => {
                        videoInputRefs.current[index] = element
                      }}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/*"
                      onChange={(event) => handleVideoUpload(index, event.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => videoInputRefs.current[index]?.click()}
                        disabled={uploadingIndex === index}
                      >
                        {uploadingIndex === index ? 'Yükleniyor...' : 'Video Dosyası Seç'}
                      </Button>
                      {item.video_url ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => updateItem(index, { video_url: '' })}
                        >
                          Videoyu Kaldir
                        </Button>
                      ) : null}
                    </div>
                    <Input
                      value={item.video_url || ''}
                      onChange={(event) => updateItem(index, { video_url: event.target.value })}
                      placeholder="https://... video URL"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Kapak Gorseli</label>
                    <input
                      ref={(element) => {
                        coverInputRefs.current[index] = element
                      }}
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleCoverUpload(index, event.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => coverInputRefs.current[index]?.click()}
                        disabled={coverUploadingIndex === index}
                      >
                        {coverUploadingIndex === index ? 'Yükleniyor...' : 'Kapak Görseli Seç'}
                      </Button>
                      {item.cover_url ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => updateItem(index, { cover_url: '' })}
                        >
                          Kapagi Kaldir
                        </Button>
                      ) : null}
                    </div>
                    <Input
                      value={item.cover_url || ''}
                      onChange={(event) => updateItem(index, { cover_url: event.target.value })}
                      placeholder="https://... kapak URL"
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={reset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Varsayilanlari Yukle
        </Button>
        <Button type="button" onClick={save} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>
    </div>
  )
}
