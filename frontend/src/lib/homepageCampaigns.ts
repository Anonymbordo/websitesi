export const HOME_CAMPAIGNS_STORAGE_KEY = 'home_campaign_showcase_v1'
export const HOME_CAMPAIGNS_PAGE_SLUG = 'home-campaign-showcase'
export const HOME_CAMPAIGNS_PAGE_TITLE = 'Ana Sayfa Güncel Fırsatlar Ayarları'
export const HOME_CAMPAIGNS_LIMIT = 3

export type HomeCampaignTheme = 'blue' | 'violet' | 'emerald' | 'amber' | 'rose'

export type HomeCampaignItem = {
  title: string
  description: string
  image_url?: string
  badge: string
  href: string
  cta_label: string
  theme: HomeCampaignTheme
}

export const homeCampaignThemeOptions: Array<{
  value: HomeCampaignTheme
  label: string
}> = [
  { value: 'blue', label: 'Mavi' },
  { value: 'violet', label: 'Mor' },
  { value: 'emerald', label: 'Yeşil' },
  { value: 'amber', label: 'Amber' },
  { value: 'rose', label: 'Pembe' },
]

export function emptyHomeCampaignItem(
  theme: HomeCampaignTheme = 'blue'
): HomeCampaignItem {
  return {
    title: '',
    description: '',
    image_url: '',
    badge: '',
    href: '',
    cta_label: 'Detaylar',
    theme,
  }
}

const TURKISH_CHAR_MAP: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  i: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
}

const EXTERNAL_LINK_PATTERN = /^(https?:\/\/|mailto:|tel:)/i

function slugifyCampaignSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[çğıöşü]/g, (character) => TURKISH_CHAR_MAP[character] || character)
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function normalizeCampaignHref(value: unknown) {
  if (typeof value !== 'string') return ''

  const trimmed = value.trim()
  if (!trimmed) return ''

  if (EXTERNAL_LINK_PATTERN.test(trimmed) || trimmed.startsWith('#') || trimmed.startsWith('?')) {
    return trimmed
  }

  const [pathPart, suffix = ''] = trimmed.split(/(?=[?#])/, 2)
  const normalizedSegments = pathPart
    .split('/')
    .filter(Boolean)
    .map((segment) => slugifyCampaignSegment(segment))
    .filter(Boolean)

  if (normalizedSegments.length === 0) return ''

  return `/${normalizedSegments.join('/')}${suffix}`
}

export function normalizeHomeCampaignItems(parsed: any[]): HomeCampaignItem[] {
  const fallbackThemes: HomeCampaignTheme[] = ['blue', 'violet', 'emerald']

  return Array.from({ length: HOME_CAMPAIGNS_LIMIT }).map((_, index) => {
    const item = parsed[index]
    const theme = fallbackThemes[index] || 'blue'

    if (!item || typeof item !== 'object') {
      return emptyHomeCampaignItem(theme)
    }

    return {
      title: typeof item.title === 'string' ? item.title.trim() : '',
      description: typeof item.description === 'string' ? item.description.trim() : '',
      image_url: typeof item.image_url === 'string' ? item.image_url.trim() : '',
      badge: typeof item.badge === 'string' ? item.badge.trim() : '',
      href: normalizeCampaignHref(item.href),
      cta_label:
        typeof item.cta_label === 'string' && item.cta_label.trim().length > 0
          ? item.cta_label.trim()
          : 'Detaylar',
      theme: isHomeCampaignTheme(item.theme) ? item.theme : theme,
    }
  })
}

function isHomeCampaignTheme(value: unknown): value is HomeCampaignTheme {
  return (
    value === 'blue' ||
    value === 'violet' ||
    value === 'emerald' ||
    value === 'amber' ||
    value === 'rose'
  )
}
