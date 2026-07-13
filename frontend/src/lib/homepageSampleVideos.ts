import { normalizeCampaignHref } from './homepageCampaigns'

export const HOME_SAMPLE_VIDEOS_STORAGE_KEY = 'home_sample_videos_v1'
export const HOME_SAMPLE_VIDEOS_PAGE_SLUG = 'home-sample-videos'
export const HOME_SAMPLE_VIDEOS_PAGE_TITLE = 'Ana Sayfa Örnek Ders Videoları Ayarları'
export const HOME_SAMPLE_VIDEOS_LIMIT = 6

export type HomeSampleVideoItem = {
  source_type: 'existing' | 'custom'
  course_id?: number | null
  title: string
  subtitle: string
  badge: string
  cover_url?: string
  video_url?: string
  detail_url?: string
  cta_label?: string
}

export function emptyHomeSampleVideoItem(): HomeSampleVideoItem {
  return {
    source_type: 'existing',
    course_id: null,
    title: '',
    subtitle: '',
    badge: '',
    cover_url: '',
    video_url: '',
    detail_url: '',
    cta_label: 'Satın Al',
  }
}

export function normalizeHomeSampleVideoItems(parsed: any[]): HomeSampleVideoItem[] {
  return Array.from({ length: HOME_SAMPLE_VIDEOS_LIMIT }).map((_, index) => {
    const item = parsed[index]

    if (!item || typeof item !== 'object') {
      return emptyHomeSampleVideoItem()
    }

    return {
      source_type: item.source_type === 'custom' ? 'custom' : 'existing',
      course_id: typeof item.course_id === 'number' ? item.course_id : null,
      title: typeof item.title === 'string' ? item.title.trim() : '',
      subtitle: typeof item.subtitle === 'string' ? item.subtitle.trim() : '',
      badge: typeof item.badge === 'string' ? item.badge.trim() : '',
      cover_url: typeof item.cover_url === 'string' ? item.cover_url.trim() : '',
      video_url: typeof item.video_url === 'string' ? item.video_url.trim() : '',
      detail_url: normalizeSampleVideoHref(item.detail_url),
      cta_label:
        typeof item.cta_label === 'string' && item.cta_label.trim().length > 0
          ? item.cta_label.trim()
          : 'Satın Al',
    }
  })
}

export function normalizeSampleVideoHref(value: unknown) {
  return normalizeCampaignHref(value)
}
