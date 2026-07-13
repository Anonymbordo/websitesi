'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Brain,
  Building,
  PlayCircle,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { blogAPI, coursesAPI, instructorsAPI, institutionsAPI, pagesAPI } from '@/lib/api'
import {
  BlogPost,
  estimateBlogReadTime,
  formatBlogDate,
  getPublishedBlogPosts,
  normalizeBlogPosts,
  readBlogPosts,
} from '@/lib/blog'
import {
  HOME_CAMPAIGNS_PAGE_SLUG,
  HOME_CAMPAIGNS_STORAGE_KEY,
  HomeCampaignItem,
  HomeCampaignTheme,
  normalizeCampaignHref,
  normalizeHomeCampaignItems,
} from '@/lib/homepageCampaigns'
import {
  HOME_SAMPLE_VIDEOS_LIMIT,
  HOME_SAMPLE_VIDEOS_PAGE_SLUG,
  HOME_SAMPLE_VIDEOS_STORAGE_KEY,
  HomeSampleVideoItem,
  normalizeHomeSampleVideoItems,
  normalizeSampleVideoHref,
} from '@/lib/homepageSampleVideos'
import { getImageUrl } from '@/lib/utils'

type InstructorCard = {
  id: number
  isPlaceholder?: boolean
  user: {
    full_name?: string
    city?: string
    district?: string
    profile_image?: string
  }
  specialization: string
  rating: number
  total_students: number
  total_courses: number
  total_ratings: number
  avatar?: string
  institution?: {
    id?: number
    name?: string
  } | null
}

type InstitutionCard = {
  id: number
  isPlaceholder?: boolean
  is_featured: boolean
  name: string
  description: string
  city: string
  district: string
  rating: number
  total_students: number
  total_courses: number
  logo?: string | null
  cover_image?: string | null
  logo_url?: string | null
  cover_image_url?: string | null
}

type CampaignItem = {
  id: string
  title: string
  description: string
  href: string
  image?: string | null
  badge: string
  ctaLabel: string
  theme: HomeCampaignTheme
}

type SampleVideoCard = {
  id: string
  title: string
  subtitle: string
  badge: string
  href: string
  ctaLabel: string
  videoUrl?: string | null
  coverUrl?: string | null
}

type SampleVideoCourseSource = {
  id: number
  title: string
  subtitle: string
  badge: string
  href: string
  videoUrl: string
  coverUrl: string
}

function firstNonEmptyString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }

  return ''
}

function resolveCoursePreviewAsset(course: any) {
  const directPreview = firstNonEmptyString(
    course?.preview_video,
    course?.previewVideo,
    course?.video_url,
    course?.videoUrl
  )
  if (directPreview) return directPreview

  const directVideoCollections = [
    ...(Array.isArray(course?.videos) ? course.videos : []),
    ...(Array.isArray(course?.materials) ? course.materials : []),
  ]

  for (const item of directVideoCollections) {
    const videoUrl = firstNonEmptyString(item?.file_url, item?.video_url, item?.url)
    if (videoUrl) return videoUrl
  }

  const sections = Array.isArray(course?.sections) ? course.sections : []
  for (const section of sections) {
    const lessons = Array.isArray(section?.lessons) ? section.lessons : []
    for (const lesson of lessons) {
      const videoUrl = firstNonEmptyString(
        lesson?.preview_video,
        lesson?.video_url,
        lesson?.videoUrl
      )
      if (videoUrl) return videoUrl
    }
  }

  return ''
}

function buildSampleVideoCourseSource(course: any, fallbackIndex = 0): SampleVideoCourseSource | null {
  const id = Number(course?.id)
  if (!Number.isFinite(id) || id <= 0) return null

  return {
    id,
    title: firstNonEmptyString(course?.title) || `Örnek Ders ${fallbackIndex + 1}`,
    subtitle:
      firstNonEmptyString(
        course?.instructor?.user?.full_name,
        course?.instructor?.name,
        course?.instructor_name,
        course?.teacher_name
      ) || 'Uzman Eğitmen',
    badge: firstNonEmptyString(course?.category, course?.level) || 'Örnek Ders',
    href: `/courses/${id}`,
    videoUrl: resolveCoursePreviewAsset(course),
    coverUrl: firstNonEmptyString(
      course?.thumbnail,
      course?.thumbnail_url,
      course?.cover_url,
      course?.cover_image,
      course?.cover_image_url
    ),
  }
}

function SampleVideoShowcaseSlider({
  items,
  activeIndex,
  onSlideChange,
  onOpenPreview,
}: {
  items: SampleVideoCard[]
  activeIndex: number
  onSlideChange: (index: number) => void
  onOpenPreview: (videoUrl: string) => void
}) {
  const totalItems = items.length
  const safeIndex =
    totalItems > 0 ? ((activeIndex % totalItems) + totalItems) % totalItems : 0
  const item = items[safeIndex] || null
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const hasVideo = typeof item?.videoUrl === 'string' && item.videoUrl.trim().length > 0

  useEffect(() => {
    setIsPreviewing(false)
  }, [safeIndex])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !hasVideo) return

    const stopPreview = () => {
      video.pause()
      video.currentTime = 0
    }

    const handleTimeUpdate = () => {
      if (video.currentTime >= 5) {
        video.pause()
      }
    }

    video.addEventListener('timeupdate', handleTimeUpdate)

    if (isPreviewing) {
      video.currentTime = 0
      const playPromise = video.play()
      if (playPromise) {
        playPromise.catch(() => {
          // ignore autoplay failures silently; cover image remains visible
        })
      }
    } else {
      stopPreview()
    }

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      stopPreview()
    }
  }, [hasVideo, isPreviewing, item?.videoUrl])

  if (!item) {
    return (
      <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 text-center text-white/80">
        Bu alanda göstermek için henüz video kartı tanımlanmadı.
      </div>
    )
  }

  const goToSlide = (nextIndex: number) => {
    if (totalItems <= 1) return
    onSlideChange(((nextIndex % totalItems) + totalItems) % totalItems)
  }

  return (
    <div className="relative mx-auto max-w-[42rem] px-3 pb-4 pt-4 sm:px-5 sm:pt-6">
      <div className="pointer-events-none absolute inset-x-10 top-5 h-[calc(100%-3.5rem)] rounded-[2rem] bg-[linear-gradient(180deg,rgba(162,184,255,0.2),rgba(255,255,255,0.04))] blur-[1px]" />
      <div className="pointer-events-none absolute inset-x-5 top-2 h-[calc(100%-1.5rem)] rounded-[2rem] border border-white/10 bg-white/[0.06] backdrop-blur-sm" />

      <article className="relative overflow-hidden rounded-[2rem] border border-white/16 bg-[radial-gradient(circle_at_top,rgba(221,231,255,0.34),rgba(141,156,228,0.18)_52%,rgba(83,97,173,0.16)_100%)] p-4 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.95)] backdrop-blur-xl sm:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_32%)]" />
        <div className="relative z-10 mb-4 flex items-start justify-between gap-4">
          <div>
            <h4 className="text-lg font-bold text-white sm:text-[1.35rem]">
              Eğitmen Tanıtım Videoları
            </h4>
            <p className="mt-1 text-[11px] uppercase tracking-[0.28em] text-cyan-100/75">
              Kaydırmalı Ön İzleme
            </p>
          </div>
          <Link
            href="/courses"
            className="shrink-0 pt-1 text-sm font-semibold text-cyan-100 transition-colors hover:text-white"
          >
            Tümünü Gör
          </Link>
        </div>

        <div className="relative z-10 rounded-[1.6rem] border border-white/12 bg-slate-950/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur sm:p-4">
          <button
            type="button"
            onClick={() => (item.videoUrl ? onOpenPreview(item.videoUrl) : undefined)}
            onMouseEnter={() => {
              if (hasVideo) setIsPreviewing(true)
            }}
            onMouseLeave={() => {
              if (hasVideo) setIsPreviewing(false)
            }}
            onFocus={() => {
              if (hasVideo) setIsPreviewing(true)
            }}
            onBlur={() => {
              if (hasVideo) setIsPreviewing(false)
            }}
            disabled={!hasVideo}
            className={`group relative block aspect-[16/9] w-full overflow-hidden rounded-[1.35rem] border border-white/10 bg-slate-950 text-left ${
              hasVideo ? 'cursor-pointer' : 'cursor-default'
            }`}
            aria-label={
              item.videoUrl
                ? `${item.title} videosunu aç`
                : `${item.title} için video henüz hazır değil`
            }
          >
            {item.coverUrl ? (
              <img
                src={item.coverUrl}
                alt={item.title}
                className={`h-full w-full object-cover transition duration-500 ${
                  hasVideo && isPreviewing ? 'scale-[1.02] opacity-0' : 'group-hover:scale-[1.03]'
                }`}
              />
            ) : (
              <div
                className={`h-full w-full bg-gradient-to-br from-slate-800 to-slate-950 transition-opacity duration-300 ${
                  hasVideo && isPreviewing ? 'opacity-0' : 'opacity-100'
                }`}
              />
            )}

            {hasVideo ? (
              <video
                ref={videoRef}
                src={item.videoUrl || undefined}
                muted
                playsInline
                preload="metadata"
                poster={item.coverUrl || undefined}
                disablePictureInPicture
                controlsList="nodownload noremoteplayback"
                onContextMenu={(event) => event.preventDefault()}
                className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                  isPreviewing ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ) : null}

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/18 to-slate-950/5" />
            <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-slate-950/55 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100 backdrop-blur">
              {item.badge}
            </div>

            {hasVideo ? (
              <>
                <div
                  className={`absolute right-4 top-4 rounded-full bg-slate-950/55 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur transition-opacity duration-300 ${
                    isPreviewing ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  İlk 5 sn ön izleme
                </div>
                <div
                  className={`absolute inset-0 flex items-center justify-center bg-black/5 transition-all duration-300 ${
                    isPreviewing ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/92 text-blue-700 shadow-[0_20px_40px_rgba(15,23,42,0.45)] transition-transform duration-300 group-hover:scale-105">
                    <PlayCircle className="h-8 w-8" />
                  </span>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="rounded-full bg-slate-950/65 px-3 py-1 text-xs font-medium text-white/80">
                  Video yakında
                </span>
              </div>
            )}

            <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-xl font-bold text-white sm:text-[1.7rem]">
                  {item.title}
                </p>
                <p className="mt-1 truncate text-sm uppercase tracking-[0.24em] text-white/76">
                  {item.subtitle}
                </p>
              </div>
              <span className="hidden text-sm font-semibold text-cyan-100 sm:block">
                Detaylı İncele
              </span>
            </div>
          </button>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100">
                {item.badge}
              </p>
              <p className="mt-2 truncate text-sm text-white/72">{item.subtitle}</p>
              <p className="mt-1 truncate text-sm text-white/52">
                {safeIndex + 1}. video / {totalItems} toplam video
              </p>
            </div>
            <Link
              href={item.href}
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-cyan-300 px-6 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            >
              {item.ctaLabel}
            </Link>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => goToSlide(safeIndex - 1)}
              disabled={totalItems <= 1}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-white/[0.04] text-white/85 transition hover:bg-white/[0.1] disabled:cursor-default disabled:opacity-40"
              aria-label="Önceki video"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex items-center justify-center gap-2">
              {items.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goToSlide(index)}
                  className={`h-3 rounded-full transition-all ${
                    index === safeIndex
                      ? 'w-10 bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.45)]'
                      : 'w-3 bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`${index + 1}. videoya git`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => goToSlide(safeIndex + 1)}
              disabled={totalItems <= 1}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-white/[0.04] text-white/85 transition hover:bg-white/[0.1] disabled:cursor-default disabled:opacity-40"
              aria-label="Sonraki video"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white/[0.05] to-transparent" />

        <div className="sr-only">
          <p className="truncate text-sm font-semibold uppercase tracking-[0.24em] text-cyan-100">
            {item.badge}
          </p>
          <p className="mt-1 truncate text-sm text-white/68">
            {safeIndex + 1}. video / {totalItems} toplam video
          </p>
        </div>
      </article>
    </div>
  )
}

const placeholderCampaigns: CampaignItem[] = [
  {
    id: 'campaign-placeholder-1',
    title: 'Erken kayıt fırsatları',
    description: 'Yeni dönem başlamadan önce açılan indirimli kayıt avantajları bu alanda gösterilecek.',
    href: '/courses',
    badge: 'Fırsat',
    ctaLabel: 'Detaylar',
    theme: 'blue',
  },
  {
    id: 'campaign-placeholder-2',
    title: 'Sınırlı süreli indirimler',
    description: 'Belirli kurslarda aktif olan kampanyalar ve avantajlı fiyatlar burada listelenecek.',
    href: '/courses',
    badge: 'İndirim',
    ctaLabel: 'Detaylar',
    theme: 'violet',
  },
  {
    id: 'campaign-placeholder-3',
    title: 'Paket ve kayıt avantajları',
    description: 'Toplu alım, deneme sınavı veya özel dönem fırsatları için bu vitrin kullanılacak.',
    href: '/courses',
    badge: 'Avantaj',
    ctaLabel: 'Detaylar',
    theme: 'emerald',
  },
]

const CAMPAIGN_ROUTE_PREFIXES = new Set([
  'about',
  'auth',
  'basinda-biz',
  'blog',
  'contact',
  'cookies',
  'courses',
  'cozum-ortaklari',
  'deneme-sinavlari',
  'iade-iptal',
  'institution',
  'institutions',
  'instructors',
  'kvkk',
  'mesafeli-satis',
  'ogrenci-basvuru',
  'p',
  'privacy',
  'purchase',
  'student',
  'terms',
])

const campaignThemeStyles: Record<
  HomeCampaignTheme,
  {
    shell: string
    badge: string
    accent: string
    button: string
    soft: string
  }
> = {
  blue: {
    shell: 'from-blue-600 via-cyan-500 to-sky-400',
    badge: 'bg-blue-100/95 text-blue-700 border-blue-200/80',
    accent: 'from-blue-600 to-cyan-400',
    button: 'from-blue-600 to-cyan-500',
    soft: 'bg-blue-50',
  },
  violet: {
    shell: 'from-violet-600 via-fuchsia-500 to-pink-400',
    badge: 'bg-violet-100/95 text-violet-700 border-violet-200/80',
    accent: 'from-violet-600 to-fuchsia-400',
    button: 'from-violet-600 to-fuchsia-500',
    soft: 'bg-violet-50',
  },
  emerald: {
    shell: 'from-emerald-600 via-teal-500 to-cyan-400',
    badge: 'bg-emerald-100/95 text-emerald-700 border-emerald-200/80',
    accent: 'from-emerald-600 to-teal-400',
    button: 'from-emerald-600 to-teal-500',
    soft: 'bg-emerald-50',
  },
  amber: {
    shell: 'from-amber-500 via-orange-500 to-rose-400',
    badge: 'bg-amber-100/95 text-amber-700 border-amber-200/80',
    accent: 'from-amber-500 to-orange-400',
    button: 'from-amber-500 to-orange-500',
    soft: 'bg-amber-50',
  },
  rose: {
    shell: 'from-rose-600 via-pink-500 to-fuchsia-400',
    badge: 'bg-rose-100/95 text-rose-700 border-rose-200/80',
    accent: 'from-rose-600 to-pink-400',
    button: 'from-rose-600 to-pink-500',
    soft: 'bg-rose-50',
  },
}

function getStoredRole() {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem('auth-storage')
    return raw ? JSON.parse(raw)?.state?.user?.role ?? null : null
  } catch {
    return null
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'MK'
}

function indexToTheme(index: number): HomeCampaignTheme {
  const themes: HomeCampaignTheme[] = ['blue', 'violet', 'emerald']
  return themes[index % themes.length] || 'blue'
}

function shuffleInstructors(list: InstructorCard[]) {
  const next = [...list]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const temp = next[index]
    next[index] = next[randomIndex]
    next[randomIndex] = temp
  }

  return next
}

function compareInstitutions(left: InstitutionCard, right: InstitutionCard) {
  if (left.is_featured !== right.is_featured) return left.is_featured ? -1 : 1
  if (left.rating !== right.rating) return right.rating - left.rating
  if (left.total_students !== right.total_students) {
    return right.total_students - left.total_students
  }
  if (left.total_courses !== right.total_courses) return right.total_courses - left.total_courses
  return left.name.localeCompare(right.name, 'tr')
}

function useImageOrientation(imageSrc?: string | null) {
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

function CampaignShowcaseImage({
  image,
  title,
  shellClassName,
  portrait = false,
}: {
  image?: string | null
  title: string
  shellClassName: string
  portrait?: boolean
}) {
  if (!image) {
    return <div className={`absolute inset-0 bg-gradient-to-br ${shellClassName}`} />
  }

  return (
    <>
      <img
        src={image}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-105 object-cover blur-2xl opacity-35 transition duration-700 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-slate-950/10" />
      {portrait ? (
        <div className="absolute inset-0 flex items-center justify-center p-4 md:justify-end md:pr-6">
          <img
            src={image}
            alt={title}
            className="max-h-full w-auto max-w-[64%] object-contain drop-shadow-[0_24px_40px_rgba(15,23,42,0.22)] transition duration-500 group-hover:scale-[1.02] md:max-w-[38%]"
          />
        </div>
      ) : (
        <img
          src={image}
          alt={title}
          className="absolute inset-0 h-full w-full object-contain p-4 drop-shadow-[0_24px_40px_rgba(15,23,42,0.22)] transition duration-500 group-hover:scale-[1.02]"
        />
      )}
    </>
  )
}

export default function HomePage() {
  const [featuredCourses, setFeaturedCourses] = useState<any[]>([])
  const [topInstructors, setTopInstructors] = useState<InstructorCard[]>([])
  const [featuredInstructors, setFeaturedInstructors] = useState<InstructorCard[]>([])
  const [institutions, setInstitutions] = useState<InstitutionCard[]>([])
  const [managedCampaignItems, setManagedCampaignItems] = useState<HomeCampaignItem[]>([])
  const [managedSampleVideoItems, setManagedSampleVideoItems] = useState<HomeSampleVideoItem[]>([])
  const [managedSampleVideoCourses, setManagedSampleVideoCourses] = useState<
    Record<number, SampleVideoCourseSource>
  >({})
  const [publishedPageSlugs, setPublishedPageSlugs] = useState<string[]>([])
  const [previewVideo, setPreviewVideo] = useState<string | null>(null)
  const [sampleVideoSlide, setSampleVideoSlide] = useState(0)
  const [featuredInstructorSlide, setFeaturedInstructorSlide] = useState(0)
  const [institutionSlide, setInstitutionSlide] = useState(0)
  const [recentPosts, setRecentPosts] = useState<BlogPost[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const router = useRouter()

  const featuredBlogPost = useMemo(
    () => recentPosts.find((post) => post.is_featured) || recentPosts[0] || null,
    [recentPosts]
  )

  const secondaryBlogPosts = useMemo(
    () =>
      featuredBlogPost
        ? recentPosts.filter((post) => post.id !== featuredBlogPost.id).slice(0, 2)
        : [],
    [featuredBlogPost, recentPosts]
  )

  const resolveInstitutionMedia = (...paths: Array<string | null | undefined>) => {
    const mediaPath = paths.find(
      (path): path is string => typeof path === 'string' && path.trim().length > 0
    )
    return mediaPath ? getImageUrl(mediaPath) : null
  }

  const findInstructorPreviewVideo = (instructorId?: number | null) => {
    if (!instructorId) return ''

    const matchedCourse = featuredCourses.find(
      (course: any) =>
        course?.instructor_id === instructorId || course?.instructor?.id === instructorId
    )

    return matchedCourse?.preview_video || ''
  }

  const findInstructorCoverImage = (instructorId?: number | null) => {
    if (!instructorId) return ''

    const matchedCourse = featuredCourses.find(
      (course: any) =>
        course?.instructor_id === instructorId || course?.instructor?.id === instructorId
    )

    return matchedCourse?.thumbnail || ''
  }

  const resolveCampaignDestination = (href: string) => {
    const normalizedHref = normalizeCampaignHref(href)

    if (!normalizedHref) return '/courses'
    if (
      normalizedHref.startsWith('#') ||
      normalizedHref.startsWith('?') ||
      /^(https?:\/\/|mailto:|tel:)/i.test(normalizedHref)
    ) {
      return normalizedHref
    }

    const path = normalizedHref.split(/[?#]/, 1)[0] || normalizedHref
    const segments = path.replace(/^\/+/, '').split('/').filter(Boolean)

    if (segments.length === 0) return '/courses'
    if (CAMPAIGN_ROUTE_PREFIXES.has(segments[0])) return normalizedHref
    if (segments.length === 1 && publishedPageSlugs.includes(segments[0])) return normalizedHref

    return '/courses'
  }

  useEffect(() => {
    let isCancelled = false

    const fetchData = async () => {
      try {
        setDataLoading(true)

        const featuredPromise = coursesAPI.getFeaturedCourses(20).catch(() => ({ data: [] }))
        const instructorsPromise = instructorsAPI
          .getInstructors({ limit: 12 })
          .catch(() => ({ data: [] }))
        const featuredInstructorsPromise = instructorsAPI
          .getFeaturedInstructors(12)
          .catch(() => ({ data: [] }))
        const institutionsPromise = institutionsAPI
          .getPublicInstitutions({ limit: 24 })
          .catch(() => ({ data: [] }))
        const blogPromise = blogAPI
          .listPosts({ status: 'published', limit: 5 })
          .catch(() => ({ data: [] }))
        const publishedPagesPromise = pagesAPI
          .getPages('published')
          .catch(() => ({ data: [] }))

        const [
          featuredResponse,
          instructorsResponse,
          featuredInstructorsResponse,
          institutionsResponse,
          blogResponse,
          publishedPagesResponse,
        ] =
          await Promise.all([
            featuredPromise,
            instructorsPromise,
            featuredInstructorsPromise,
            institutionsPromise,
            blogPromise,
            publishedPagesPromise,
          ])

        if (isCancelled) return

        setFeaturedCourses(
          Array.isArray(featuredResponse?.data) ? featuredResponse.data : []
        )

        const normalizedInstructors: InstructorCard[] = Array.isArray(instructorsResponse?.data)
          ? instructorsResponse.data.slice(0, 12).map((instructor: any, index: number) => ({
              id: instructor?.id ?? index + 1,
              user: {
                full_name: instructor?.user?.full_name || 'İsimsiz Eğitmen',
                city: instructor?.user?.city || '',
                district: instructor?.user?.district || '',
                profile_image: instructor?.user?.profile_image || '',
              },
              specialization:
                instructor?.title || instructor?.specialization || 'Uzman Eğitmen',
              rating: Number(instructor?.rating || 0),
              total_students: Number(instructor?.total_students || 0),
              total_courses: Number(instructor?.total_courses || 0),
              total_ratings: Number(instructor?.total_ratings || 0),
              avatar: instructor?.profile_image || instructor?.user?.profile_image || '',
              institution: instructor?.institution || null,
            }))
          : []
        setTopInstructors(normalizedInstructors)

        const normalizedFeaturedInstructors: InstructorCard[] = Array.isArray(
          featuredInstructorsResponse?.data
        )
          ? featuredInstructorsResponse.data.slice(0, 12).map((instructor: any, index: number) => ({
              id: instructor?.id ?? index + 1,
              user: {
                full_name: instructor?.user?.full_name || 'İsimsiz Eğitmen',
                city: instructor?.user?.city || '',
                district: instructor?.user?.district || '',
                profile_image: instructor?.user?.profile_image || '',
              },
              specialization:
                instructor?.title || instructor?.specialization || 'Uzman Eğitmen',
              rating: Number(instructor?.rating || 0),
              total_students: Number(instructor?.total_students || 0),
              total_courses: Number(instructor?.total_courses || 0),
              total_ratings: Number(instructor?.total_ratings || 0),
              avatar: instructor?.profile_image || instructor?.user?.profile_image || '',
              institution: instructor?.institution || null,
            }))
          : []
        setFeaturedInstructors(
          normalizedFeaturedInstructors.length > 0
            ? shuffleInstructors(normalizedFeaturedInstructors)
            : []
        )

        const normalizedInstitutions: InstitutionCard[] = Array.isArray(
          institutionsResponse?.data
        )
          ? institutionsResponse.data
              .map((institution: any, index: number) => ({
                id: institution?.id ?? index + 1,
                is_featured: Boolean(institution?.is_featured),
                name: institution?.name || 'Kurum Adı',
                description: institution?.description || '',
                city: institution?.city || '',
                district: institution?.district || '',
                rating: Number(institution?.rating || 0),
                total_students: Number(institution?.total_students || 0),
                total_courses: Number(institution?.total_courses || 0),
                logo: resolveInstitutionMedia(institution?.logo, institution?.logo_url),
                cover_image: resolveInstitutionMedia(
                  institution?.cover_image,
                  institution?.cover_image_url
                ),
                logo_url: institution?.logo_url || '',
                cover_image_url: institution?.cover_image_url || '',
              }))
              .sort(compareInstitutions)
              .slice(0, 12)
          : []
        setInstitutions(normalizedInstitutions)

        const normalizedBlogs = normalizeBlogPosts(blogResponse?.data || [])
        if (normalizedBlogs.length > 0) {
          setRecentPosts(normalizedBlogs)
        } else {
          const fallbackBlogs = getPublishedBlogPosts(readBlogPosts())
            .sort((left, right) => {
              if (left.is_featured === right.is_featured) return 0
              return left.is_featured ? -1 : 1
            })
            .slice(0, 5)
          setRecentPosts(fallbackBlogs)
        }

        const allPublishedPageSlugs = Array.isArray(publishedPagesResponse?.data)
          ? publishedPagesResponse.data
              .map((page: any) =>
                typeof page?.slug === 'string' ? page.slug.replace(/^\/+/, '').trim() : ''
              )
              .filter((slug: string) => slug.length > 0)
          : []

        const normalizedPageSlugs = allPublishedPageSlugs
          .filter(
            (slug: string) =>
              slug !== HOME_CAMPAIGNS_PAGE_SLUG &&
              slug !== HOME_SAMPLE_VIDEOS_PAGE_SLUG &&
              slug !== 'home-instructor-spotlights'
          )
        setPublishedPageSlugs(normalizedPageSlugs)

        const [campaignPageResponse, sampleVideoPageResponse] = await Promise.all([
          allPublishedPageSlugs.includes(HOME_CAMPAIGNS_PAGE_SLUG)
            ? pagesAPI.getPageBySlugOptional(HOME_CAMPAIGNS_PAGE_SLUG).catch(() => null)
            : Promise.resolve(null),
          allPublishedPageSlugs.includes(HOME_SAMPLE_VIDEOS_PAGE_SLUG)
            ? pagesAPI.getPageBySlugOptional(HOME_SAMPLE_VIDEOS_PAGE_SLUG).catch(() => null)
            : Promise.resolve(null),
        ])

        if (isCancelled) return

        let loadedManagedCampaigns = false
        const campaignBlocks =
          campaignPageResponse?.status === 404 ? [] : campaignPageResponse?.data?.blocks || []
        const campaignBlock =
          campaignBlocks.find((item: any) => item?.type === 'home_campaign_showcase') ||
          campaignBlocks[0]
        const pageCampaignItems = campaignBlock?.data?.items

        if (
          Array.isArray(pageCampaignItems) &&
          pageCampaignItems.some(
            (item: any) =>
              item &&
              typeof item === 'object' &&
              typeof item.title === 'string' &&
              item.title.trim().length > 0
          )
        ) {
          setManagedCampaignItems(normalizeHomeCampaignItems(pageCampaignItems))
          loadedManagedCampaigns = true
        }

        if (!loadedManagedCampaigns && typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem(HOME_CAMPAIGNS_STORAGE_KEY)
            const parsed = raw ? JSON.parse(raw) : []
            if (
              Array.isArray(parsed) &&
              parsed.some(
                (item) =>
                  item &&
                  typeof item === 'object' &&
                  typeof item.title === 'string' &&
                  item.title.trim().length > 0
              )
            ) {
              setManagedCampaignItems(normalizeHomeCampaignItems(parsed))
              loadedManagedCampaigns = true
            }
          } catch {
            // no-op
          }
        }

        if (!loadedManagedCampaigns) {
          setManagedCampaignItems([])
        }

        let loadedManagedSampleVideos = false
        const sampleVideoBlocks =
          sampleVideoPageResponse?.status === 404
            ? []
            : sampleVideoPageResponse?.data?.blocks || []
        const sampleVideoBlock =
          sampleVideoBlocks.find((item: any) => item?.type === 'home_sample_video_showcase') ||
          sampleVideoBlocks[0]
        const pageSampleVideoItems = sampleVideoBlock?.data?.items

        if (
          Array.isArray(pageSampleVideoItems) &&
          pageSampleVideoItems.some(
            (item: any) =>
              item &&
              typeof item === 'object' &&
              typeof item.title === 'string' &&
              item.title.trim().length > 0
          )
        ) {
          setManagedSampleVideoItems(normalizeHomeSampleVideoItems(pageSampleVideoItems))
          loadedManagedSampleVideos = true
        }

        if (!loadedManagedSampleVideos && typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem(HOME_SAMPLE_VIDEOS_STORAGE_KEY)
            const parsed = raw ? JSON.parse(raw) : []

            if (
              Array.isArray(parsed) &&
              parsed.some(
                (item) =>
                  item &&
                  typeof item === 'object' &&
                  typeof item.title === 'string' &&
                  item.title.trim().length > 0
              )
            ) {
              setManagedSampleVideoItems(normalizeHomeSampleVideoItems(parsed))
              loadedManagedSampleVideos = true
            }
          } catch {
            // no-op
          }
        }

        if (!loadedManagedSampleVideos) {
          setManagedSampleVideoItems([])
        }
      } catch (error) {
        console.error('Ana sayfa verileri yüklenemedi:', error)

        if (isCancelled) return

        setFeaturedCourses([])
        setTopInstructors([])
        setFeaturedInstructors([])
        setInstitutions([])
        setManagedCampaignItems([])
        setManagedSampleVideoItems([])
        setPublishedPageSlugs([])

        try {
          const fallbackBlogs = getPublishedBlogPosts(readBlogPosts())
            .sort((left, right) => {
              if (left.is_featured === right.is_featured) return 0
              return left.is_featured ? -1 : 1
            })
            .slice(0, 5)
          setRecentPosts(fallbackBlogs)
        } catch {
          setRecentPosts([])
        }
      } finally {
        if (!isCancelled) setDataLoading(false)
      }
    }

    fetchData()

    return () => {
      isCancelled = true
    }
  }, [])

  const featuredCourseSources = useMemo(() => {
    return new Map(
      featuredCourses
        .map((course: any, index: number) => buildSampleVideoCourseSource(course, index))
        .filter((item): item is SampleVideoCourseSource => Boolean(item))
        .map((item) => [item.id, item] as const)
    )
  }, [featuredCourses])

  useEffect(() => {
    let isCancelled = false

    const managedCourseIds = Array.from(
      new Set(
        managedSampleVideoItems
          .filter(
            (item) =>
              item.source_type === 'existing' &&
              typeof item.course_id === 'number' &&
              item.course_id > 0
          )
          .map((item) => item.course_id as number)
      )
    )

    if (managedCourseIds.length === 0) {
      setManagedSampleVideoCourses({})
      return
    }

    const loadManagedSampleCourses = async () => {
      const entries = await Promise.all(
        managedCourseIds.map(async (courseId) => {
          const seededCourse = featuredCourseSources.get(courseId) || null

          try {
            const response = await coursesAPI.getCourse(courseId)
            const detailedCourse = buildSampleVideoCourseSource(response?.data)
            const resolvedCourse = detailedCourse || seededCourse
            return resolvedCourse ? ([courseId, resolvedCourse] as const) : null
          } catch {
            return seededCourse ? ([courseId, seededCourse] as const) : null
          }
        })
      )

      if (isCancelled) return

      setManagedSampleVideoCourses(
        Object.fromEntries(
          entries.filter(
            (entry): entry is readonly [number, SampleVideoCourseSource] => Boolean(entry)
          )
        )
      )
    }

    loadManagedSampleCourses()

    return () => {
      isCancelled = true
    }
  }, [featuredCourseSources, managedSampleVideoItems])

  const sampleVideoItems = useMemo(() => {
    const adminManagedItems: SampleVideoCard[] = managedSampleVideoItems
      .map((item, index) => {
        const linkedCourse =
          item.source_type === 'existing' && item.course_id
            ? managedSampleVideoCourses[item.course_id] || featuredCourseSources.get(item.course_id)
            : null

        const title = item.title || linkedCourse?.title || ''
        const rawVideoUrl = item.video_url || linkedCourse?.videoUrl || ''
        const rawCoverUrl = item.cover_url || linkedCourse?.coverUrl || ''

        return {
          id: `managed-sample-video-${index + 1}`,
          title: title || `Örnek Ders ${index + 1}`,
          subtitle: item.subtitle || linkedCourse?.subtitle || 'Örnek ders videosu',
          badge: item.badge || linkedCourse?.badge || 'Örnek Ders',
          href: normalizeSampleVideoHref(item.detail_url) || linkedCourse?.href || '/courses',
          ctaLabel: item.cta_label || 'Satın Al',
          videoUrl: getImageUrl(rawVideoUrl) || rawVideoUrl || null,
          coverUrl: getImageUrl(rawCoverUrl) || rawCoverUrl || null,
        }
      })
      .filter((item) => item.title.trim().length > 0)

    const fallbackItems = featuredCourses
      .slice(0, 6)
      .reduce<SampleVideoCard[]>((items, course: any, index: number) => {
        const resolvedCourse = buildSampleVideoCourseSource(course, index)
        if (!resolvedCourse) return items

        items.push({
          id: `course-sample-video-${resolvedCourse.id}`,
          title: resolvedCourse.title,
          subtitle: resolvedCourse.subtitle,
          badge: resolvedCourse.badge,
          href: resolvedCourse.href,
          ctaLabel: 'Satın Al',
          videoUrl: getImageUrl(resolvedCourse.videoUrl) || resolvedCourse.videoUrl || null,
          coverUrl: getImageUrl(resolvedCourse.coverUrl) || resolvedCourse.coverUrl || null,
        })

        return items
      }, [])

    if (adminManagedItems.length > 0) {
      const seen = new Set(adminManagedItems.map((item) => `${item.title}-${item.href}`))
      const filled = [...adminManagedItems]

      for (const item of fallbackItems) {
        if (filled.length >= HOME_SAMPLE_VIDEOS_LIMIT) break
        const key = `${item.title}-${item.href}`
        if (seen.has(key)) continue
        filled.push(item)
      }

      return filled.slice(0, HOME_SAMPLE_VIDEOS_LIMIT)
    }

    return fallbackItems.slice(0, HOME_SAMPLE_VIDEOS_LIMIT)
  }, [featuredCourseSources, featuredCourses, managedSampleVideoCourses, managedSampleVideoItems])

  const campaignItems = useMemo(() => {
    const adminManagedCampaigns: CampaignItem[] = managedCampaignItems
      .filter((item) => item.title.trim().length > 0)
      .map((item, index) => ({
        id: `managed-campaign-${index + 1}`,
        title: item.title,
        description: item.description,
        href: resolveCampaignDestination(item.href),
        image: getImageUrl(item.image_url) || item.image_url || null,
        badge: item.badge || 'Fırsat',
        ctaLabel: item.cta_label || 'Detaylar',
        theme: item.theme,
      }))

    if (adminManagedCampaigns.length > 0) {
      const managedCombined = [...adminManagedCampaigns]
      if (managedCombined.length < 3) {
        managedCombined.push(
          ...placeholderCampaigns
            .slice(0, 3 - managedCombined.length)
            .map((item, index) => ({ ...item, id: `managed-placeholder-${index}` }))
        )
      }
      return managedCombined.slice(0, 3)
    }

    const fromCourses: CampaignItem[] = featuredCourses
      .slice(0, 3)
      .map((course: any, index: number) => {
        const hasDiscount =
          typeof course?.discount_price === 'number' &&
          typeof course?.price === 'number' &&
          course.price > 0

        const discountPercent = hasDiscount
          ? Math.round((1 - course.discount_price / course.price) * 100)
          : null

        return {
          id: `course-${course?.id || course?.title || 'campaign'}`,
          title: course?.title || 'Güncel fırsat',
          description:
            course?.short_description ||
            'Fırsat detayları için kurs sayfasını inceleyin.',
          href: course?.id ? `/courses/${course.id}` : '/courses',
          image: getImageUrl(course?.thumbnail) || null,
          badge:
            discountPercent && discountPercent > 0
              ? `%${discountPercent} indirim`
              : course?.category || 'Fırsat',
          ctaLabel: 'Detaylar',
          theme: indexToTheme(index),
        }
      })

    const combined = [...fromCourses]

    if (combined.length < 3) {
      combined.push(
        ...placeholderCampaigns
          .slice(0, 3 - combined.length)
          .map((item, index) => ({ ...item, id: `${item.id}-${index}` }))
      )
    }

    return combined
  }, [featuredCourses, managedCampaignItems, publishedPageSlugs])

  const primaryCampaign = campaignItems[0] || null
  const secondaryCampaigns = campaignItems.slice(1, 3)
  const primaryCampaignIsPortrait =
    useImageOrientation(primaryCampaign?.image || null) === 'portrait'

  const showcaseInstructors = useMemo(() => {
    const items = [...featuredInstructors]

    while (items.length < 3) {
      items.push({
        id: -(items.length + 1),
        isPlaceholder: true,
        user: { full_name: `Eğitmen ${items.length + 1}` },
        specialization: 'Tanıtım yakında',
        rating: 0,
        total_students: 0,
        total_courses: 0,
        total_ratings: 0,
        avatar: '',
        institution: null,
      })
    }

    return items
  }, [featuredInstructors])

  const visibleFeaturedInstructors = useMemo(() => {
    if (showcaseInstructors.length <= 3) return showcaseInstructors

    return Array.from({ length: 3 }).map((_, offset) => (
      showcaseInstructors[(featuredInstructorSlide + offset) % showcaseInstructors.length]
    ))
  }, [featuredInstructorSlide, showcaseInstructors])

  const showcaseInstitutions = useMemo(() => {
    const items = [...institutions]

    while (items.length < 3) {
      items.push({
        id: -(items.length + 1),
        isPlaceholder: true,
        name: 'Kurum Adı',
        description: '',
        city: '',
        district: '',
        rating: 0,
        total_students: 0,
        total_courses: 0,
        is_featured: false,
        logo: null,
        cover_image: null,
        logo_url: '',
        cover_image_url: '',
      })
    }

    return items
  }, [institutions])

  const visibleInstitutions = useMemo(() => {
    if (showcaseInstitutions.length <= 3) return showcaseInstitutions

    return Array.from({ length: 3 }).map((_, offset) => (
      showcaseInstitutions[(institutionSlide + offset) % showcaseInstitutions.length]
    ))
  }, [institutionSlide, showcaseInstitutions])

  useEffect(() => {
    setSampleVideoSlide(0)
  }, [sampleVideoItems.length])

  useEffect(() => {
    if (sampleVideoItems.length <= 1) return

    const timer = window.setInterval(() => {
      setSampleVideoSlide((prev) => (prev + 1) % sampleVideoItems.length)
    }, 4500)

    return () => window.clearInterval(timer)
  }, [sampleVideoItems.length])

  useEffect(() => {
    setFeaturedInstructorSlide(0)
  }, [showcaseInstructors.length])

  useEffect(() => {
    setInstitutionSlide(0)
  }, [showcaseInstitutions.length])

  useEffect(() => {
    if (showcaseInstructors.length <= 3) return

    const timer = window.setInterval(() => {
      setFeaturedInstructorSlide((prev) => (prev + 1) % showcaseInstructors.length)
    }, 3500)

    return () => window.clearInterval(timer)
  }, [showcaseInstructors.length])

  useEffect(() => {
    if (showcaseInstitutions.length <= 3) return

    const timer = window.setInterval(() => {
      setInstitutionSlide((prev) => (prev + 1) % showcaseInstitutions.length)
    }, 3800)

    return () => window.clearInterval(timer)
  }, [showcaseInstitutions.length])

  const handleInstructorCTA = () => {
    if (typeof window === 'undefined') return

    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/auth/register-instructor')
      return
    }

    const role = getStoredRole()
    if (role === 'instructor') {
      router.push('/instructor/dashboard')
      return
    }

    router.push('/auth/register-instructor')
  }

  const handleInstitutionCTA = () => {
    if (typeof window === 'undefined') return

    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/auth/register-institution')
      return
    }

    const role = getStoredRole()
    if (role === 'institution') {
      router.push('/institution/dashboard')
      return
    }

    if (role === 'instructor') {
      router.push('/institutions/apply')
      return
    }

    router.push('/auth/register-institution')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <section className="relative flex min-h-screen items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5Q0EzQUYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20" />
          <div className="absolute left-20 top-20 h-72 w-72 animate-pulse rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/20 blur-3xl" />
          <div className="absolute bottom-20 right-20 h-96 w-96 animate-pulse rounded-full bg-gradient-to-br from-blue-400/20 to-cyan-400/20 blur-3xl delay-1000" />
          <div className="absolute left-1/2 top-1/2 h-64 w-64 animate-pulse rounded-full bg-gradient-to-br from-indigo-400/20 to-purple-400/20 blur-3xl delay-500" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 xl:grid-cols-[0.82fr_1.18fr]">
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
                  <Brain className="mr-2 h-4 w-4 text-yellow-400" />
                  <span className="text-sm font-medium text-white/90">
                    AI Destekli Öğrenme Platformu
                  </span>
                </div>

                <h1 className="text-5xl font-bold leading-tight text-white md:text-7xl">
                  Geleceğinizi
                  <span className="block bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 bg-clip-text text-transparent md:inline">
                    {' '}
                    Şekillendirin
                  </span>
                </h1>

                <p className="max-w-2xl text-xl leading-relaxed text-white/80 md:text-2xl">
                  Yapay zeka destekli kişiselleştirilmiş öğrenme deneyimi ile
                  binlerce kurs ve uzman eğitmenlerden öğrenin.
                </p>
              </div>

              <div className="grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Link href="/courses" className="w-full">
                  <Button
                    size="lg"
                    className="h-16 w-full rounded-2xl border-0 bg-gradient-to-r from-yellow-400 to-orange-400 px-6 font-bold text-gray-900 shadow-2xl transition-all duration-300 hover:scale-105 hover:from-yellow-500 hover:to-orange-500 hover:shadow-yellow-400/25 active:scale-95"
                  >
                    <span className="mr-2 text-center text-sm leading-tight lg:text-base">
                      Derslere Göz At
                    </span>
                    <PlayCircle className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                  </Button>
                </Link>

                <Button
                  size="lg"
                  onClick={handleInstructorCTA}
                  className="h-16 w-full rounded-2xl border border-white/30 bg-white/10 px-6 font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-white/50 hover:bg-white/20 active:scale-95"
                >
                  <span className="mr-2 text-center text-sm leading-tight lg:text-base">
                    Eğitmen Ol
                  </span>
                  <TrendingUp className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                </Button>

                <Button
                  size="lg"
                  onClick={handleInstitutionCTA}
                  className="h-16 w-full rounded-2xl border border-white/30 bg-white/10 px-6 font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-white/50 hover:bg-white/20 active:scale-95"
                >
                  <span className="mr-2 text-center text-sm leading-tight lg:text-base">
                    Kurum Ol
                  </span>
                  <Building className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                </Button>

                <Link href="/ogrenci-basvuru" className="w-full">
                  <Button
                    size="lg"
                    className="min-h-16 h-auto w-full justify-center gap-1 overflow-hidden rounded-2xl border border-cyan-300/40 bg-white/10 px-3 py-2 font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-cyan-200/70 hover:bg-cyan-400/20 active:scale-95"
                  >
                    <span className="text-center text-[11px] leading-tight whitespace-normal break-words sm:text-xs md:text-sm">
                      Ücretsiz LGS
                      <br className="sm:hidden" />
                      Deneme Sınavı
                    </span>
                    <Users className="hidden h-4 w-4 shrink-0 text-cyan-200 transition-transform duration-300 group-hover:scale-110 md:block" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-lg">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 to-white/5" />

                <div className="relative">
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                        Örnek Ders Videoları
                      </div>
                    </div>
                    <Link
                      href="/courses"
                      className="text-sm text-cyan-200 transition-colors hover:text-white"
                    >
                      Tüm Dersler
                    </Link>
                  </div>

                  <SampleVideoShowcaseSlider
                    items={sampleVideoItems}
                    activeIndex={sampleVideoSlide}
                    onSlideChange={setSampleVideoSlide}
                    onOpenPreview={(videoUrl) => setPreviewVideo(videoUrl)}
                  />
                </div>
              </div>

              <div className="absolute -left-6 -top-6 -z-10 h-full w-full rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm" />
              <div className="absolute -left-3 -top-3 -z-20 h-full w-full rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm" />
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/75 to-transparent" />
        <div className="absolute left-0 top-20 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-indigo-200/35 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-cyan-100/40 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-sm font-medium text-white shadow-lg">
              Neden Bizi Seçmelisiniz?
            </div>

            <h2 className="mt-6 text-4xl font-bold leading-tight text-slate-900 md:text-6xl">
              Modern Öğrenmenin
              <span className="block text-blue-900">Geleceği Burada</span>
            </h2>

            <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              Teknoloji ve pedagojinin mükemmel birleşimi ile öğrenme deneyiminizi yeni
              boyutlara taşıyoruz.
            </p>
          </div>

          <div className="mt-16 space-y-10">
            <div className="rounded-[2.5rem] border border-white/70 bg-white/65 p-6 shadow-[0_25px_80px_-40px_rgba(37,99,235,0.35)] backdrop-blur-xl sm:p-8 lg:p-10">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                    <TrendingUp className="h-4 w-4" />
                    Güncel Fırsatlar
                  </div>
                  <h3 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">
                    Güncel fırsatlar
                  </h3>
                </div>
              </div>

              <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                {dataLoading && !primaryCampaign ? (
                  <>
                    <div className="min-h-[460px] overflow-hidden rounded-[2.25rem] border border-white/80 bg-white/90 shadow-lg animate-pulse">
                      <div className="h-full min-h-[460px] bg-slate-200" />
                    </div>
                    <div className="grid gap-6">
                      {Array.from({ length: 2 }).map((_, index) => (
                        <div
                          key={`campaign-skeleton-side-${index}`}
                          className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-lg animate-pulse"
                        >
                          <div className="aspect-[16/10] bg-slate-200" />
                          <div className="space-y-4 p-6">
                            <div className="h-5 w-2/3 rounded bg-slate-200" />
                            <div className="h-4 rounded bg-slate-100" />
                            <div className="h-4 w-5/6 rounded bg-slate-100" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    {primaryCampaign ? (
                      <Link
                        href={primaryCampaign.href}
                        className="group relative overflow-hidden rounded-[2.25rem] border border-white/80 bg-white shadow-[0_32px_90px_-40px_rgba(37,99,235,0.45)] transition duration-300 hover:-translate-y-1.5"
                      >
                        <div className="relative min-h-[460px] overflow-hidden">
                          {primaryCampaignIsPortrait ? (
                            <>
                              {primaryCampaign.image ? (
                                <>
                                  <img
                                    src={primaryCampaign.image}
                                    alt=""
                                    aria-hidden="true"
                                    className="absolute inset-0 h-full w-full scale-105 object-cover blur-2xl opacity-35 transition duration-700 group-hover:scale-110"
                                  />
                                  <div className="absolute inset-0 bg-slate-950/10" />
                                </>
                              ) : (
                                <div
                                  className={`absolute inset-0 bg-gradient-to-br ${campaignThemeStyles[primaryCampaign.theme].shell}`}
                                />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/78 to-slate-950/96 sm:bg-gradient-to-r sm:from-slate-950 sm:via-slate-950/94 sm:via-[58%] sm:to-slate-950/22" />
                              <div className="relative grid min-h-[460px] gap-4 p-6 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center sm:gap-6 sm:p-8 lg:grid-cols-[minmax(0,1.05fr)_300px] lg:p-10">
                                <div className="flex flex-col justify-center">
                                  <div className="inline-flex w-fit rounded-full border border-white/70 bg-white/90 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
                                    {primaryCampaign.badge}
                                  </div>
                                  <div
                                    className={`mt-6 h-1.5 w-20 rounded-full bg-gradient-to-r ${campaignThemeStyles[primaryCampaign.theme].accent}`}
                                  />
                                  <h4 className="mt-4 max-w-[14ch] text-3xl font-bold leading-tight text-white sm:text-4xl">
                                    {primaryCampaign.title}
                                  </h4>
                                  <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200 sm:text-base">
                                    {primaryCampaign.description}
                                  </p>
                                  <div
                                    className={`mt-6 inline-flex w-fit items-center rounded-full bg-gradient-to-r ${campaignThemeStyles[primaryCampaign.theme].button} px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20`}
                                  >
                                    {primaryCampaign.ctaLabel}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                  </div>
                                </div>

                                <div className="relative flex min-h-[240px] items-center justify-center sm:min-h-0 sm:justify-end">
                                  {primaryCampaign.image ? (
                                    <img
                                      src={primaryCampaign.image}
                                      alt={primaryCampaign.title}
                                      className="h-auto max-h-[320px] w-auto max-w-full object-contain drop-shadow-[0_24px_40px_rgba(15,23,42,0.22)] transition duration-500 group-hover:scale-[1.02] lg:max-h-[390px]"
                                    />
                                  ) : (
                                    <div
                                      className={`h-full min-h-[240px] w-full rounded-[1.75rem] bg-gradient-to-br ${campaignThemeStyles[primaryCampaign.theme].shell}`}
                                    />
                                  )}
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <CampaignShowcaseImage
                                image={primaryCampaign.image}
                                title={primaryCampaign.title}
                                shellClassName={campaignThemeStyles[primaryCampaign.theme].shell}
                                portrait={primaryCampaignIsPortrait}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                              <div className="absolute left-6 top-6 rounded-full border border-white/70 bg-white/90 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
                                {primaryCampaign.badge}
                              </div>
                              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                                <div
                                  className={`mb-4 h-1.5 w-20 rounded-full bg-gradient-to-r ${campaignThemeStyles[primaryCampaign.theme].accent}`}
                                />
                                <h4 className="max-w-2xl text-3xl font-bold leading-tight text-white sm:text-4xl">
                                  {primaryCampaign.title}
                                </h4>
                                <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200 sm:text-base">
                                  {primaryCampaign.description}
                                </p>
                                <div
                                  className={`mt-6 inline-flex items-center rounded-full bg-gradient-to-r ${campaignThemeStyles[primaryCampaign.theme].button} px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20`}
                                >
                                  {primaryCampaign.ctaLabel}
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </Link>
                    ) : null}

                    <div className="grid gap-6">
                      {secondaryCampaigns.map((item) => (
                        <Link
                          key={item.id}
                          href={item.href}
                          className="group overflow-hidden rounded-[2rem] border border-white/80 bg-white/95 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_80px_-40px_rgba(37,99,235,0.28)]"
                        >
                          <div className="grid min-h-[220px] gap-0 md:grid-cols-[0.9fr_1.1fr]">
                            <div className="relative min-h-[220px] overflow-hidden">
                              <CampaignShowcaseImage
                                image={item.image}
                                title={item.title}
                                shellClassName={campaignThemeStyles[item.theme].shell}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 to-transparent" />
                            </div>

                            <div className={`flex flex-col justify-between p-6 ${campaignThemeStyles[item.theme].soft}`}>
                              <div>
                                <div
                                  className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${campaignThemeStyles[item.theme].badge}`}
                                >
                                  {item.badge}
                                </div>
                                <h4 className="mt-4 text-2xl font-bold leading-tight text-slate-900">
                                  {item.title}
                                </h4>
                                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                                  {item.description}
                                </p>
                              </div>

                              <div className="mt-6 flex items-center justify-between text-sm font-semibold text-slate-900">
                                <span>{item.ctaLabel}</span>
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-[2.5rem] border border-white/70 bg-white/65 p-6 shadow-[0_25px_80px_-40px_rgba(37,99,235,0.35)] backdrop-blur-xl sm:p-8 lg:p-10">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">
                    <Users className="h-4 w-4" />
                    Mikro Eğitmenler
                  </div>
                  <h3 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">
                    Mikro Eğitmenlerimiz
                  </h3>
                </div>
                <div className="flex items-center gap-2 self-start lg:self-auto">
                  <button
                    type="button"
                    onClick={() =>
                      setFeaturedInstructorSlide((prev) =>
                        showcaseInstructors.length <= 3
                          ? 0
                          : (prev - 1 + showcaseInstructors.length) % showcaseInstructors.length
                      )
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-violet-300 hover:text-violet-700"
                    aria-label="Önceki eğitmenler"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFeaturedInstructorSlide((prev) =>
                        showcaseInstructors.length <= 3
                          ? 0
                          : (prev + 1) % showcaseInstructors.length
                      )
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-violet-300 hover:text-violet-700"
                    aria-label="Sonraki eğitmenler"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {dataLoading && featuredInstructors.length === 0
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={`instructor-skeleton-${index}`}
                        className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-lg animate-pulse"
                      >
                        <div className="aspect-[4/3] bg-slate-200" />
                        <div className="space-y-4 p-6">
                          <div className="h-5 w-1/2 rounded bg-slate-200" />
                          <div className="h-4 w-2/3 rounded bg-slate-100" />
                          <div className="h-11 rounded-xl bg-slate-200" />
                        </div>
                      </div>
                    ))
                  : visibleFeaturedInstructors.map((instructor) => {
                      const videoUrl = findInstructorPreviewVideo(instructor.id)
                      const coverImage =
                        getImageUrl(findInstructorCoverImage(instructor.id)) ||
                        getImageUrl(instructor.avatar)
                      const instructorName =
                        instructor.user?.full_name || 'İsimsiz Eğitmen'

                      return (
                        <article
                          key={instructor.id}
                          className="group overflow-hidden rounded-[2rem] border border-white/80 bg-white/95 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_32px_80px_-35px_rgba(76,29,149,0.35)]"
                        >
                          <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                            {coverImage ? (
                              <img
                                src={coverImage}
                                alt={instructorName}
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 text-4xl font-bold text-white">
                                {getInitials(instructorName)}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/15 to-transparent" />
                            <div className="absolute left-5 top-5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
                              {instructor.isPlaceholder ? 'Yakında' : 'Uzman Kadro'}
                            </div>
                            <div className="absolute inset-x-0 bottom-0 p-5">
                              <p className="text-lg font-bold text-white">
                                {instructorName}
                              </p>
                              <p className="text-sm text-slate-200">
                                {instructor.specialization}
                              </p>
                            </div>
                          </div>

                          <div className="p-6">
                            <div className="mb-5 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                              <span>
                                {instructor.institution?.name ||
                                  instructor.user?.city ||
                                  'Mikrokurs Eğitmeni'}
                              </span>
                              <span>
                                {instructor.isPlaceholder
                                  ? 'Yakında'
                                  : instructor.rating > 0
                                  ? `${instructor.rating.toFixed(1)} puan`
                                  : `${instructor.total_courses} kurs`}
                              </span>
                            </div>

                            {!instructor.isPlaceholder && videoUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewVideo(videoUrl)}
                                className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-700 hover:to-violet-700"
                              >
                                Tanıtım Videosu İzle
                              </button>
                            ) : instructor.isPlaceholder ? (
                              <div className="flex w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                                İçerik hazırlanıyor
                              </div>
                            ) : (
                              <Link
                                href={`/instructors/${instructor.id}`}
                                className="flex w-full items-center justify-center rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-900 hover:text-white"
                              >
                                Profili Gör
                              </Link>
                            )}
                          </div>
                        </article>
                      )
                    })}
              </div>

              {showcaseInstructors.length > 3 ? (
                <div className="mt-6 flex items-center justify-center gap-2">
                  {showcaseInstructors.map((_, index) => (
                    <button
                      key={`featured-instructor-dot-${index}`}
                      type="button"
                      onClick={() => setFeaturedInstructorSlide(index)}
                      className={`h-2.5 rounded-full transition-all ${
                        index === featuredInstructorSlide
                          ? 'w-8 bg-violet-600'
                          : 'w-2.5 bg-violet-200 hover:bg-violet-300'
                      }`}
                      aria-label={`Eğitmen grubu ${index + 1}`}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-[2.5rem] border border-white/70 bg-white/65 p-6 shadow-[0_25px_80px_-40px_rgba(37,99,235,0.35)] backdrop-blur-xl sm:p-8 lg:p-10">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    <Building className="h-4 w-4" />
                    Aramıza Katılan Kurumlar
                  </div>
                  <h3 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">
                    İş birliklerimizi daha güçlü bir vitrine taşıyoruz
                  </h3>
                </div>
                <div className="flex items-center gap-2 self-start lg:self-auto">
                  <button
                    type="button"
                    onClick={() =>
                      setInstitutionSlide((prev) =>
                        showcaseInstitutions.length <= 3
                          ? 0
                          : (prev - 1 + showcaseInstitutions.length) %
                            showcaseInstitutions.length
                      )
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                    aria-label="Önceki kurumlar"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setInstitutionSlide((prev) =>
                        showcaseInstitutions.length <= 3
                          ? 0
                          : (prev + 1) % showcaseInstitutions.length
                      )
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                    aria-label="Sonraki kurumlar"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {dataLoading && institutions.length === 0
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={`institution-skeleton-${index}`}
                        className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-lg animate-pulse"
                      >
                        <div className="aspect-[4/3] bg-slate-200" />
                        <div className="space-y-4 p-6">
                          <div className="h-5 w-2/3 rounded bg-slate-200" />
                          <div className="h-4 w-1/2 rounded bg-slate-100" />
                        </div>
                      </div>
                    ))
                  : visibleInstitutions.map((institution) => {
                      const coverImage =
                        institution.cover_image || institution.logo || institution.logo_url

                      const content = (
                        <>
                          <div className="relative aspect-[4/3] overflow-hidden border-b border-slate-200 bg-slate-100">
                            {coverImage ? (
                              <img
                                src={coverImage}
                                alt={institution.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-blue-100 px-10 text-center text-lg font-semibold text-slate-500">
                                {institution.name}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-4 p-6">
                            <div>
                              <h3 className="text-lg font-bold text-slate-900">
                                {institution.name}
                              </h3>
                              <p className="mt-1 text-sm text-slate-600">
                                {institution.isPlaceholder
                                  ? 'Detaylar yakında yayınlanacak'
                                  : [institution.city, institution.district]
                                      .filter(Boolean)
                                      .join(' / ') || 'Detaylar için sayfayı açın'}
                              </p>
                            </div>
                            {!institution.isPlaceholder && (
                              <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700" />
                            )}
                          </div>
                        </>
                      )

                      return institution.isPlaceholder ? (
                        <div
                          key={institution.id}
                          className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/95 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)]"
                        >
                          {content}
                        </div>
                      ) : (
                        <Link
                          key={institution.id}
                          href={`/institutions/${institution.id}`}
                          className="group overflow-hidden rounded-[2rem] border border-white/80 bg-white/95 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_32px_80px_-35px_rgba(5,150,105,0.28)]"
                        >
                          {content}
                        </Link>
                      )
                    })}
              </div>

              {showcaseInstitutions.length > 3 ? (
                <div className="mt-6 flex items-center justify-center gap-2">
                  {showcaseInstitutions.map((_, index) => (
                    <button
                      key={`institution-dot-${index}`}
                      type="button"
                      onClick={() => setInstitutionSlide(index)}
                      className={`h-2.5 rounded-full transition-all ${
                        index === institutionSlide
                          ? 'w-8 bg-emerald-600'
                          : 'w-2.5 bg-emerald-200 hover:bg-emerald-300'
                      }`}
                      aria-label={`Kurum grubu ${index + 1}`}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-16 sm:py-20 lg:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_24%)]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col gap-4 sm:mb-12 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-cyan-200 backdrop-blur-sm">
                Blog Alanı
              </div>
              <h2 className="mt-4 text-3xl font-bold leading-tight text-white sm:mt-5 sm:text-4xl md:text-5xl">
                Blog alanı
                <span className="block bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                  başarılarımızı sizinle paylaşmak için burada
                </span>
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                Burada başarılarımızı, yaptığımız reklam çalışmalarını, sponsorluklarımızı ve öne çıkan projelerimizi sizinle paylaşmak istedik.
              </p>
            </div>

            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-medium text-cyan-200 transition hover:text-white"
            >
              Tüm blogları gör
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {featuredBlogPost ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
              <Link
                href={`/blog/${featuredBlogPost.slug}`}
                className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-slate-950/30 backdrop-blur"
              >
                <div className="relative aspect-[4/3] overflow-hidden sm:aspect-[16/10]">
                  {featuredBlogPost.featured_image ? (
                    <img
                      src={featuredBlogPost.featured_image}
                      alt={featuredBlogPost.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-slate-900 to-emerald-500" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent sm:via-slate-950/20" />

                  <div className="absolute left-4 right-4 top-4 flex flex-wrap gap-2 sm:left-6 sm:right-auto sm:top-6">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-900">
                      {featuredBlogPost.category}
                    </span>
                    {featuredBlogPost.video_url && (
                      <span className="rounded-full bg-rose-500/90 px-3 py-1 text-xs font-medium text-white">
                        Video içerik
                      </span>
                    )}
                    {featuredBlogPost.is_featured && (
                      <span className="rounded-full bg-cyan-500/90 px-3 py-1 text-xs font-medium text-white">
                        Öne çıkan
                      </span>
                    )}
                  </div>

                  <div className="absolute inset-x-0 bottom-0 hidden p-6 md:block md:p-8">
                    <h3 className="max-w-3xl text-3xl font-semibold leading-tight text-white md:text-4xl">
                      {featuredBlogPost.title}
                    </h3>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
                      {featuredBlogPost.excerpt}
                    </p>
                    <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-slate-200">
                      <span>
                        {formatBlogDate(
                          featuredBlogPost.published_at || featuredBlogPost.created_at
                        )}
                      </span>
                      <span>{estimateBlogReadTime(featuredBlogPost.content)} dk okuma</span>
                    </div>
                  </div>
                </div>

                <div className="block p-5 md:hidden">
                  <h3 className="text-2xl font-semibold leading-tight text-white">
                    {featuredBlogPost.title}
                  </h3>
                  <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-200">
                    {featuredBlogPost.excerpt}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                    <span>
                      {formatBlogDate(
                        featuredBlogPost.published_at || featuredBlogPost.created_at
                      )}
                    </span>
                    <span>{estimateBlogReadTime(featuredBlogPost.content)} dk okuma</span>
                  </div>
                </div>
              </Link>

              <div className="grid gap-6">
                {secondaryBlogPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="group rounded-[2rem] border border-white/10 bg-white/5 p-5 text-white shadow-xl shadow-slate-950/20 backdrop-blur transition hover:-translate-y-1"
                  >
                    <div className="mb-4 overflow-hidden rounded-[1.5rem]">
                      {post.featured_image ? (
                        <img
                          src={post.featured_image}
                          alt={post.title}
                          className="h-44 w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-44 items-center justify-center bg-gradient-to-br from-slate-800 to-cyan-800">
                          <PlayCircle className="h-10 w-10 text-cyan-200" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-cyan-200">
                      <span>{post.category}</span>
                      {post.video_url && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-white/90">
                          <PlayCircle className="h-3 w-3" />
                          Video
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 text-xl font-semibold leading-tight">{post.title}</h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-300">
                      {post.excerpt}
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-cyan-200">
                      Yazıyı aç
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-[2rem] border border-white/10 bg-white/5 px-6 py-16 text-center text-slate-300 backdrop-blur">
              Henüz anasayfada gösterecek blog yazısı yok.
            </div>
          )}
        </div>
      </section>

      {previewVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewVideo(null)}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-xl bg-black shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setPreviewVideo(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="aspect-video w-full bg-black">
              {getImageUrl(previewVideo) ? (
                <video
                  src={getImageUrl(previewVideo) || ''}
                  controls
                  controlsList="nodownload noremoteplayback"
                  autoPlay
                  playsInline
                  disablePictureInPicture
                  onContextMenu={(event) => event.preventDefault()}
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white">
                  <p>Video yüklenemiyor</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
