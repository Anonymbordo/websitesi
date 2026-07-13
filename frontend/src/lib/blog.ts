export const BLOG_STORAGE_KEY = 'local_blogs'

export type BlogPostStatus = 'draft' | 'published' | 'scheduled'

export interface BlogAuthor {
  full_name: string
  avatar?: string | null
}

export interface BlogPost {
  id: number
  title: string
  excerpt: string
  content: string
  slug: string
  featured_image?: string | null
  video_url?: string | null
  video_title?: string | null
  author: BlogAuthor
  category: string
  tags: string[]
  status: BlogPostStatus
  is_featured: boolean
  views: number
  created_at: string
  published_at?: string | null
  scheduled_at?: string | null
}

type BlogPostInput = Omit<Partial<BlogPost>, 'id' | 'views' | 'is_featured' | 'author' | 'tags'> & {
  id?: number | string | null
  views?: number | string | null
  is_featured?: boolean | null
  author?: Partial<BlogAuthor> | null
  tags?: string[] | string | null
}

export type BlogVideoSource =
  | { kind: 'file'; src: string }
  | { kind: 'iframe'; src: string }
  | { kind: 'external'; src: string }

const FALLBACK_CATEGORY = 'Genel'
const FALLBACK_AUTHOR = 'Site Admin'
const DIRECT_VIDEO_PATTERN = /\.(mp4|m4v|mov|webm|ogg)(\?.*)?$/i

const TURKISH_CHAR_MAP: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  i: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
}

function sanitizeString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function toBoolean(value: unknown) {
  return value === true
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function toIsoDate(value: unknown, fallback: string) {
  if (typeof value !== 'string' || !value.trim()) return fallback
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return fallback
  return parsed.toISOString()
}

function normalizeTags(tags: BlogPostInput['tags']) {
  if (Array.isArray(tags)) {
    return tags
      .map((tag: string) => sanitizeString(tag))
      .filter(Boolean)
  }

  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag: string) => tag.trim())
      .filter(Boolean)
  }

  return []
}

function isBlogStatus(value: unknown): value is BlogPostStatus {
  return value === 'draft' || value === 'published' || value === 'scheduled'
}

function getSortTimestamp(post: BlogPost) {
  return new Date(post.published_at || post.scheduled_at || post.created_at).getTime()
}

export function slugifyBlogText(text: string) {
  const lowered = text
    .toLowerCase()
    .replace(/[çğıöşü]/g, (character) => TURKISH_CHAR_MAP[character] || character)

  return lowered
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function buildBlogExcerpt(content: string, maxLength = 170) {
  const text = stripHtml(content).trim()
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trimEnd()}...`
}

export function estimateBlogReadTime(content: string) {
  const words = stripHtml(content).split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 180))
}

export function formatBlogDate(dateString?: string | null) {
  if (!dateString) return ''
  const parsed = new Date(dateString)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function normalizeBlogPost(input: BlogPostInput, fallbackIndex = 0): BlogPost {
  const now = new Date().toISOString()
  const title = sanitizeString(input.title, `Blog Yazısı ${fallbackIndex + 1}`)
  const content = typeof input.content === 'string' ? input.content : ''
  const slug = sanitizeString(input.slug) || slugifyBlogText(title) || `blog-${Date.now()}-${fallbackIndex + 1}`
  const status: BlogPostStatus = isBlogStatus(input.status) ? input.status : 'draft'
  const createdAt = toIsoDate(input.created_at, now)
  const defaultPublishedAt = status === 'published' ? createdAt : null
  const defaultScheduledAt = status === 'scheduled' ? createdAt : null

  return {
    id: toNumber(input.id, Date.now() + fallbackIndex),
    title,
    excerpt: sanitizeString(input.excerpt) || buildBlogExcerpt(content),
    content,
    slug,
    featured_image: sanitizeString(input.featured_image) || null,
    video_url: sanitizeString(input.video_url) || null,
    video_title: sanitizeString(input.video_title) || null,
    author: {
      full_name: sanitizeString(input.author?.full_name, FALLBACK_AUTHOR),
      avatar: sanitizeString(input.author?.avatar) || null,
    },
    category: sanitizeString(input.category, FALLBACK_CATEGORY),
    tags: normalizeTags(input.tags),
    status,
    is_featured: toBoolean(input.is_featured),
    views: toNumber(input.views, 0),
    created_at: createdAt,
    published_at: input.published_at ? toIsoDate(input.published_at, createdAt) : defaultPublishedAt,
    scheduled_at: input.scheduled_at ? toIsoDate(input.scheduled_at, createdAt) : defaultScheduledAt,
  }
}

export function sortBlogPosts(posts: BlogPost[]) {
  return [...posts].sort((left, right) => getSortTimestamp(right) - getSortTimestamp(left))
}

export function normalizeBlogPosts(items: unknown[]) {
  if (!Array.isArray(items)) return [] as BlogPost[]
  return sortBlogPosts(items.map((item, index) => normalizeBlogPost(item as BlogPostInput, index)))
}

export function readBlogPosts() {
  if (typeof window === 'undefined') return [] as BlogPost[]

  try {
    const raw = window.localStorage.getItem(BLOG_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return normalizeBlogPosts(parsed)
  } catch (error) {
    console.error('Blog yazıları okunamadı', error)
    return []
  }
}

export function writeBlogPosts(posts: BlogPost[]) {
  if (typeof window === 'undefined') return
  const normalized = sortBlogPosts(posts.map((post, index) => normalizeBlogPost(post, index)))
  window.localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(normalized))
}

export function getPublishedBlogPosts(posts = readBlogPosts()) {
  return posts.filter((post) => post.status === 'published')
}

export function findBlogPostById(posts: BlogPost[], id: number) {
  return posts.find((post) => post.id === id) || null
}

export function findBlogPostBySlug(posts: BlogPost[], slug: string) {
  return posts.find((post) => post.slug === slug) || null
}

export function incrementBlogPostViews(postId: number) {
  const posts = readBlogPosts()
  const updated = posts.map((post) => (
    post.id === postId
      ? { ...post, views: post.views + 1 }
      : post
  ))
  writeBlogPosts(updated)
  return updated.find((post) => post.id === postId) || null
}

export function getBlogVideoSource(videoUrl?: string | null): BlogVideoSource | null {
  const url = sanitizeString(videoUrl)
  if (!url) return null

  if (DIRECT_VIDEO_PATTERN.test(url)) {
    return { kind: 'file', src: url }
  }

  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const videoId = parsed.pathname.split('/').filter(Boolean)[0]
      if (videoId) {
        return { kind: 'iframe', src: `https://www.youtube.com/embed/${videoId}` }
      }
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') {
        const videoId = parsed.searchParams.get('v')
        if (videoId) {
          return { kind: 'iframe', src: `https://www.youtube.com/embed/${videoId}` }
        }
      }

      if (parsed.pathname.startsWith('/shorts/')) {
        const videoId = parsed.pathname.split('/')[2]
        if (videoId) {
          return { kind: 'iframe', src: `https://www.youtube.com/embed/${videoId}` }
        }
      }

      if (parsed.pathname.startsWith('/embed/')) {
        return { kind: 'iframe', src: url }
      }
    }

    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const videoId = parsed.pathname.split('/').filter(Boolean).pop()
      if (videoId) {
        return { kind: 'iframe', src: `https://player.vimeo.com/video/${videoId}` }
      }
    }

    if (parsed.pathname.includes('/embed/')) {
      return { kind: 'iframe', src: url }
    }

    return { kind: 'external', src: url }
  } catch {
    return { kind: 'external', src: url }
  }
}

export function blogContentContainsHtml(content: string) {
  return /<\/?[a-z][\s\S]*>/i.test(content)
}
