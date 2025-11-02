"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type LocalPage = {
  id: number
  title: string
  slug: string
  status: 'published' | 'draft' | 'private'
  content: string
  author: string
  createdAt: string
  updatedAt: string
  views: number
  isHomepage?: boolean
}

type Block = {
  id: string
  type: 'hero' | 'text' | 'two-column' | 'image' | 'cta' | 'contact-form' | 'features' | 'testimonials' | 'pricing' | 'faq' | 'stats' | 'gallery'
  data: Record<string, any>
  style?: {
    bgColor?: string
    textColor?: string
    padding?: string
    alignment?: string
  }
}

const STORAGE_KEY = 'local_pages'

function slugify(raw: string) {
  if (!raw) return ''
  let s = raw.trim().toLowerCase()
  s = s.replace(/[^a-z0-9\- ]+/g, '') // allow - and spaces
  s = s.replace(/\s+/g, '-')
  // store slugs without leading slash for simpler routing (e.g. 'hakkimizda')
  return s
}

// Basic client-side sanitizer: strips <script> tags, on* attributes and javascript: URLs.
// Not a replacement for server-side sanitization, but helpful for previewing admin HTML safely.
function sanitizeHtml(input: string) {
  if (!input) return ''
  let s = input
  // remove script tags
  s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
  // remove on* attributes like onclick, onerror
  s = s.replace(/\s(on[a-z]+)\s*=\s*("[^"]*"|'[^']*'|[^>\s]+)/gi, '')
  // neutralize javascript: in href/src
  s = s.replace(/(href|src)\s*=\s*("|')?\s*javascript:[^\s"'>]*/gi, '$1=$2#')
  return s
}

export default function CreatePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [status, setStatus] = useState<'published' | 'draft' | 'private'>('draft')
  const [content, setContent] = useState('')
  const [isHomepage, setIsHomepage] = useState(false)
  const [inMenu, setInMenu] = useState(true)
  const [pageType, setPageType] = useState<string>('none')
  const [template, setTemplate] = useState<string>('none')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [useBlocks, setUseBlocks] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // keep slug synced when user types title and slug is empty
    if (!slug) setSlug(slugify(title))
  }, [title])

  const readPages = (): LocalPage[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      return JSON.parse(raw) as LocalPage[]
    } catch (e) {
      console.error('local_pages read error', e)
      return []
    }
  }

  const writePages = (pages: LocalPage[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pages))
  }

  const handleSave = () => {
    const finalSlug = slugify(slug || title)
    if (!title.trim()) return toast.error('Başlık gerekli')
    if (!finalSlug || finalSlug === '/') return toast.error('Geçerli bir slug girin')

    const pages = readPages()
    // check duplicate
    const exists = pages.find(p => p.slug === finalSlug)
    if (exists) return toast.error('Bu slug zaten kullanılıyor')

    setSaving(true)
    try {
      const now = new Date().toISOString()
      const nextId = pages.length ? Math.max(...pages.map(p => p.id)) + 1 : 1
      // if using blocks, generate HTML from blocks and store blocks array
      const generatedHtml = blocks && blocks.length ? generateHtmlFromBlocks(blocks) : content

      const newPage: LocalPage & { in_menu?: boolean; page_type?: string; blocks?: Block[] } = {
        id: nextId,
        title: title.trim(),
        slug: finalSlug.replace(/^\//, ''),
        status,
        content: generatedHtml,
        page_type: pageType === 'none' ? undefined : pageType,
        author: 'Site Admin',
        createdAt: now,
        updatedAt: now,
        views: 0,
        isHomepage,
        in_menu: !!inMenu
      }
      if (blocks && blocks.length) newPage.blocks = blocks
      const next = [newPage, ...pages]
      writePages(next)
      toast.success('Sayfa oluşturuldu')
      router.push('/admin/pages')
    } catch (err) {
      console.error(err)
      toast.error('Kaydetme sırasında hata')
    } finally {
      setSaving(false)
    }
  }

  // block helpers
  function makeId() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}` }
  const addBlock = (type: Block['type']) => {
    const id = makeId()
    // Site tasarımına daha uygun varsayılan stiller
    const base: Block = { id, type, data: {}, style: { bgColor: 'bg-white', textColor: 'text-gray-900', padding: 'py-12', alignment: 'center' } }
    if (type === 'hero') {
      base.data = { heading: title || 'Başlık', sub: 'Kısa açıklama', bgImage: '' }
      base.style = { bgColor: 'bg-gradient-to-r from-blue-600 to-purple-600', textColor: 'text-white', padding: 'py-20', alignment: 'center' }
    }
    if (type === 'text') base.data = { html: '<p>Yeni metin bloğu</p>' }
    if (type === 'two-column') base.data = { left: '<p>Sol</p>', right: '<p>Sağ</p>' }
    if (type === 'image') base.data = { src: '', alt: '', caption: '' }
    if (type === 'cta') {
      base.data = { text: 'Hemen Başla', href: '#', buttonStyle: 'primary' }
      base.style = { bgColor: 'bg-gradient-to-r from-blue-600 to-purple-600', textColor: 'text-white', padding: 'py-16', alignment: 'center' }
    }
    if (type === 'contact-form') {
      base.data = { title: 'İletişim', showPhone: true, showEmail: true }
      base.style = { bgColor: 'bg-gray-50', textColor: 'text-gray-900', padding: 'py-12', alignment: 'center' }
    }
    if (type === 'features') {
      base.data = { title: 'Özellikler', items: [{ icon: '✓', title: 'Özellik 1', desc: 'Açıklama' }, { icon: '✓', title: 'Özellik 2', desc: 'Açıklama' }, { icon: '✓', title: 'Özellik 3', desc: 'Açıklama' }] }
      base.style = { bgColor: 'bg-white', textColor: 'text-gray-900', padding: 'py-16', alignment: 'center' }
    }
    if (type === 'testimonials') {
      base.data = { title: 'Kullanıcı Yorumları', items: [{ name: 'Ahmet Y.', text: 'Harika bir deneyim!', rating: 5 }] }
      base.style = { bgColor: 'bg-gray-50', textColor: 'text-gray-900', padding: 'py-16', alignment: 'center' }
    }
    if (type === 'pricing') {
      base.data = { title: 'Fiyatlandırma', plans: [{ name: 'Temel', price: '99₺', features: ['Özellik 1', 'Özellik 2'], highlight: false }] }
      base.style = { bgColor: 'bg-white', textColor: 'text-gray-900', padding: 'py-16', alignment: 'center' }
    }
    if (type === 'faq') {
      base.data = { title: 'Sıkça Sorulan Sorular', items: [{ q: 'Soru?', a: 'Cevap' }] }
      base.style = { bgColor: 'bg-gray-50', textColor: 'text-gray-900', padding: 'py-12', alignment: 'center' }
    }
    if (type === 'stats') {
      base.data = { items: [{ number: '1000+', label: 'Kullanıcı' }, { number: '50+', label: 'Kurs' }] }
      base.style = { bgColor: 'bg-gradient-to-r from-blue-600 to-purple-600', textColor: 'text-white', padding: 'py-12', alignment: 'center' }
    }
    if (type === 'gallery') {
      base.data = { title: 'Galeri', images: [{ src: '', alt: '' }] }
      base.style = { bgColor: 'bg-white', textColor: 'text-gray-900', padding: 'py-12', alignment: 'center' }
    }
    setBlocks(prev => [...prev, base])
  }

  const updateBlock = (id: string, patch: Partial<Block['data']>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, data: { ...b.data, ...patch } } : b))
  }

  const updateBlockStyle = (id: string, stylePatch: Partial<Block['style']>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, style: { ...b.style, ...stylePatch } } : b))
  }

  const moveBlock = (index: number, dir: number) => {
    setBlocks(prev => {
      const copy = [...prev]
      const [item] = copy.splice(index, 1)
      copy.splice(index + dir, 0, item)
      return copy
    })
  }

  const removeBlock = (id: string) => setBlocks(prev => prev.filter(b => b.id !== id))

  const generateHtmlFromBlocks = (blocks: Block[]) => {
    return blocks.map(b => {
      const bgClass = b.style?.bgColor || 'bg-white'
      const textClass = b.style?.textColor || 'text-gray-900'
      const paddingClass = b.style?.padding || 'py-12'
      const alignClass = b.style?.alignment === 'center' ? 'text-center' : b.style?.alignment === 'right' ? 'text-right' : 'text-left'
      
      if (b.type === 'hero') {
        const bgImage = b.data.bgImage ? `style="background-image: url('${escapeAttr(b.data.bgImage)}'); background-size: cover; background-position: center;"` : ''
        return `
          <section class="relative min-h-[500px] flex items-center overflow-hidden ${bgClass}" ${bgImage}>
            <div class="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-blue-900/20 to-indigo-900/20"></div>
            <div class="relative z-10 container mx-auto px-4 ${alignClass}">
              <h1 class="text-5xl md:text-7xl font-bold mb-6 ${textClass}">${escapeHtml(b.data.heading || '')}</h1>
              <p class="text-xl md:text-2xl opacity-90 ${textClass} max-w-3xl ${alignClass === 'text-center' ? 'mx-auto' : ''}">${escapeHtml(b.data.sub || '')}</p>
            </div>
          </section>`
      }
      
      if (b.type === 'text') {
        return `<section class="container mx-auto px-4 ${paddingClass} ${bgClass}"><div class="prose prose-lg max-w-none ${textClass} ${alignClass}">${b.data.html || ''}</div></section>`
      }
      
      if (b.type === 'two-column') {
        return `
          <section class="container mx-auto px-4 ${paddingClass} ${bgClass}">
            <div class="grid md:grid-cols-2 gap-12 items-start ${textClass}">
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300">${b.data.left || ''}</div>
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300">${b.data.right || ''}</div>
            </div>
          </section>`
      }
      
      if (b.type === 'image') {
        const caption = b.data.caption ? `<p class="text-sm text-gray-600 mt-4 ${alignClass}">${escapeHtml(b.data.caption)}</p>` : ''
        return `
          <section class="container mx-auto px-4 ${paddingClass} ${bgClass} ${alignClass}">
            <div class="rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105">
              <img src="${escapeAttr(b.data.src||'')}" alt="${escapeAttr(b.data.alt||'')}" class="w-full"/>
            </div>
            ${caption}
          </section>`
      }
      
      if (b.type === 'cta') {
        const btnClass = b.data.buttonStyle === 'secondary' ? 'bg-gray-800 hover:bg-gray-900' : 'bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-gray-900'
        return `
          <section class="container mx-auto px-4 ${paddingClass} ${bgClass} ${alignClass}">
            <a href="${escapeAttr(b.data.href||'#')}" class="inline-flex items-center ${btnClass} text-white px-8 py-4 rounded-2xl text-lg font-semibold shadow-2xl hover:shadow-yellow-400/25 transition-all duration-300 transform hover:scale-105">
              ${escapeHtml(b.data.text||'CTA')}
            </a>
          </section>`
      }
      
      if (b.type === 'contact-form') {
        return `
          <section class="container mx-auto px-4 ${paddingClass} ${bgClass}">
            <div class="max-w-2xl ${alignClass === 'text-center' ? 'mx-auto' : ''}">
              <h2 class="text-4xl font-bold mb-8 ${textClass} ${alignClass}">${escapeHtml(b.data.title||'İletişim')}</h2>
              <form class="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl space-y-4">
                <input placeholder="İsim" class="w-full border border-gray-200 px-4 py-3 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" />
                <input placeholder="E-posta" type="email" class="w-full border border-gray-200 px-4 py-3 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" />
                <textarea placeholder="Mesaj" class="w-full border border-gray-200 px-4 py-3 rounded-xl h-32 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"></textarea>
                <button type="submit" class="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105">Gönder</button>
              </form>
            </div>
          </section>`
      }
      
      if (b.type === 'features') {
        const items = (b.data.items || []).map((item: any) => `
          <div class="group relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 cursor-pointer">
            <div class="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div class="relative z-10">
              <div class="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">${escapeHtml(item.icon||'')}</div>
              <h3 class="text-2xl font-bold mb-3 group-hover:text-gray-900 transition-colors">${escapeHtml(item.title||'')}</h3>
              <p class="text-gray-600 group-hover:text-gray-700 leading-relaxed transition-colors">${escapeHtml(item.desc||'')}</p>
            </div>
          </div>
        `).join('')
        return `
          <section class="container mx-auto px-4 ${paddingClass} ${bgClass}">
            <h2 class="text-4xl md:text-6xl font-bold mb-12 ${textClass} ${alignClass}">${escapeHtml(b.data.title||'Özellikler')}</h2>
            <div class="grid md:grid-cols-3 gap-8">${items}</div>
          </section>`
      }
      
      if (b.type === 'testimonials') {
        const items = (b.data.items || []).map((item: any) => {
          const stars = '⭐'.repeat(item.rating || 5)
          return `
            <div class="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <p class="text-gray-700 text-lg mb-6 italic">"${escapeHtml(item.text||'')}"</p>
              <div class="flex items-center justify-between border-t pt-4">
                <span class="font-semibold text-gray-900">${escapeHtml(item.name||'')}</span>
                <span class="text-xl">${stars}</span>
              </div>
            </div>
          `
        }).join('')
        return `
          <section class="container mx-auto px-4 ${paddingClass} ${bgClass}">
            <h2 class="text-4xl font-bold mb-12 ${textClass} ${alignClass}">${escapeHtml(b.data.title||'Yorumlar')}</h2>
            <div class="grid md:grid-cols-2 gap-8">${items}</div>
          </section>`
      }
      
      if (b.type === 'pricing') {
        const plans = (b.data.plans || []).map((plan: any) => {
          const highlightClass = plan.highlight ? 'border-blue-600 border-2 shadow-2xl scale-105 bg-gradient-to-br from-blue-50 to-purple-50' : 'border-gray-200 bg-white/80'
          const features = (plan.features || []).map((f: string) => `<li class="flex items-center gap-3 text-gray-700"><span class="text-green-600 text-xl">✓</span>${escapeHtml(f)}</li>`).join('')
          return `
            <div class="border ${highlightClass} backdrop-blur-sm rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <h3 class="text-2xl font-bold mb-2 text-gray-900">${escapeHtml(plan.name||'')}</h3>
              <div class="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">${escapeHtml(plan.price||'')}</div>
              <ul class="space-y-3 mb-8">${features}</ul>
              <button class="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105">Başla</button>
            </div>
          `
        }).join('')
        return `
          <section class="container mx-auto px-4 ${paddingClass} ${bgClass}">
            <h2 class="text-4xl font-bold mb-12 ${textClass} ${alignClass}">${escapeHtml(b.data.title||'Fiyatlandırma')}</h2>
            <div class="grid md:grid-cols-3 gap-8">${plans}</div>
          </section>`
      }
      
      if (b.type === 'faq') {
        const items = (b.data.items || []).map((item: any) => `
          <details class="bg-white/80 backdrop-blur-sm rounded-xl p-6 mb-4 shadow-lg hover:shadow-xl transition-all duration-300">
            <summary class="font-semibold text-lg cursor-pointer text-gray-900 hover:text-blue-600 transition-colors">${escapeHtml(item.q||'')}</summary>
            <p class="mt-4 text-gray-600 leading-relaxed">${escapeHtml(item.a||'')}</p>
          </details>
        `).join('')
        return `
          <section class="container mx-auto px-4 ${paddingClass} ${bgClass}">
            <h2 class="text-4xl font-bold mb-12 ${textClass} ${alignClass}">${escapeHtml(b.data.title||'Sık Sorulan Sorular')}</h2>
            <div class="max-w-3xl mx-auto">${items}</div>
          </section>`
      }
      
      if (b.type === 'stats') {
        const items = (b.data.items || []).map((item: any, idx: number) => {
          const gradients = [
            'from-yellow-400 to-orange-400',
            'from-blue-400 to-cyan-400',
            'from-purple-400 to-pink-400',
            'from-green-400 to-emerald-400'
          ]
          const gradient = gradients[idx % gradients.length]
          return `
            <div class="group text-center cursor-pointer">
              <div class="text-5xl font-bold ${textClass} mb-3 group-hover:scale-110 transition-transform duration-300">${escapeHtml(item.number||'')}</div>
              <div class="text-gray-600 font-medium mb-2">${escapeHtml(item.label||'')}</div>
              <div class="w-12 h-0.5 bg-gradient-to-r ${gradient} mx-auto rounded-full"></div>
            </div>
          `
        }).join('')
        return `
          <section class="container mx-auto px-4 ${paddingClass} ${bgClass}">
            <div class="bg-white/80 backdrop-blur-lg rounded-3xl p-12 border border-white/20 shadow-2xl">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-12">${items}</div>
            </div>
          </section>`
      }
      
      if (b.type === 'gallery') {
        const images = (b.data.images || []).map((img: any) => `
          <div class="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer">
            <img src="${escapeAttr(img.src||'')}" alt="${escapeAttr(img.alt||'')}" class="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"/>
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
        `).join('')
        return `
          <section class="container mx-auto px-4 ${paddingClass} ${bgClass}">
            <h2 class="text-4xl font-bold mb-12 ${textClass} ${alignClass}">${escapeHtml(b.data.title||'Galeri')}</h2>
            <div class="grid md:grid-cols-3 gap-6">${images}</div>
          </section>`
      }
      
      return ''
    }).join('\n')
  }

  function escapeHtml(s: string) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  }
  function escapeAttr(s: string) { return escapeHtml(s).replace(/"/g,'&quot;') }

  const applyTemplate = (tmpl: string) => {
    if (tmpl === 'none') return
    // Site tasarımına uyumlu şablonlar - gradient arka plan, kartlar, modern UI
    const now = new Date().toISOString()
    
    if (tmpl === 'hero') {
      setBlocks([{
        id: makeId(),
        type: 'hero',
        data: { heading: title || 'Başlık', sub: 'Kısa açıklama', bgImage: '' },
        style: { bgColor: 'bg-gradient-to-r from-blue-600 to-purple-600', textColor: 'text-white', padding: 'py-20', alignment: 'center' }
      }])
    } else if (tmpl === 'kurslar-sayfa') {
      // Kurslar sayfası şablonu - ana sitedeki kurs listesi gibi
      setBlocks([
        {
          id: makeId(),
          type: 'hero',
          data: { heading: 'Kurslarımız', sub: 'Uzman eğitmenlerden binlerce kurs ve öğrenme deneyimi' },
          style: { bgColor: 'bg-gradient-to-r from-blue-600 to-purple-600', textColor: 'text-white', padding: 'py-20', alignment: 'center' }
        },
        {
          id: makeId(),
          type: 'stats',
          data: { items: [
            { number: '180+', label: 'Online Kurs' },
            { number: '67+', label: 'Uzman Eğitmen' },
            { number: '12500+', label: 'Aktif Öğrenci' },
            { number: '4.7', label: 'Ortalama Puan' }
          ]},
          style: { bgColor: 'bg-white', textColor: 'text-gray-900', padding: 'py-12', alignment: 'center' }
        },
        {
          id: makeId(),
          type: 'text',
          data: { html: '<h2 class="text-3xl font-bold mb-6">Popüler Kurslar</h2><p class="text-gray-600">En çok tercih edilen kurslarımıza göz atın</p>' },
          style: { bgColor: 'bg-gray-50', textColor: 'text-gray-900', padding: 'py-12', alignment: 'center' }
        }
      ])
    } else if (tmpl === 'egitmenler-sayfa') {
      // Eğitmenler sayfası şablonu
      setBlocks([
        {
          id: makeId(),
          type: 'hero',
          data: { heading: 'Eğitmenlerimiz', sub: 'Alanında uzman eğitmenlerden öğrenin' },
          style: { bgColor: 'bg-gradient-to-r from-purple-600 to-pink-600', textColor: 'text-white', padding: 'py-20', alignment: 'center' }
        },
        {
          id: makeId(),
          type: 'features',
          data: {
            title: 'Neden Bizim Eğitmenler?',
            items: [
              { icon: '🎓', title: 'Uzman Kadro', desc: 'Sektörde 10+ yıl deneyimli eğitmenler' },
              { icon: '⭐', title: 'Yüksek Puan', desc: '4.8+ ortalama öğrenci puanı' },
              { icon: '🤝', title: 'Destek', desc: '7/24 öğrenci desteği' }
            ]
          },
          style: { bgColor: 'bg-white', textColor: 'text-gray-900', padding: 'py-12', alignment: 'center' }
        },
        {
          id: makeId(),
          type: 'text',
          data: { html: '<h2 class="text-3xl font-bold mb-6">Tüm Eğitmenler</h2>' },
          style: { bgColor: 'bg-gray-50', textColor: 'text-gray-900', padding: 'py-12', alignment: 'center' }
        }
      ])
    } else if (tmpl === 'hakkimizda-sayfa') {
      // Hakkımızda sayfası şablonu
      setBlocks([
        {
          id: makeId(),
          type: 'hero',
          data: { heading: 'Hakkımızda', sub: 'Türkiye\'nin en kapsamlı online eğitim platformu' },
          style: { bgColor: 'bg-gradient-to-r from-blue-600 to-purple-600', textColor: 'text-white', padding: 'py-20', alignment: 'center' }
        },
        {
          id: makeId(),
          type: 'two-column',
          data: {
            left: '<h3 class="text-2xl font-bold mb-4">Misyonumuz</h3><p class="text-gray-700">Yapay zeka destekli kişiselleştirilmiş öğrenme deneyimi ile binlerce kurs ve uzman eğitmenlerden öğrenin.</p>',
            right: '<h3 class="text-2xl font-bold mb-4">Vizyonumuz</h3><p class="text-gray-700">Herkesin kaliteli eğitime erişebileceği bir dünya yaratmak.</p>'
          },
          style: { bgColor: 'bg-white', textColor: 'text-gray-900', padding: 'py-12', alignment: 'left' }
        },
        {
          id: makeId(),
          type: 'stats',
          data: { items: [
            { number: '180+', label: 'Kurs' },
            { number: '67+', label: 'Eğitmen' },
            { number: '12500+', label: 'Öğrenci' },
            { number: '4.7', label: 'Puan' }
          ]},
          style: { bgColor: 'bg-gradient-to-r from-blue-600 to-purple-600', textColor: 'text-white', padding: 'py-12', alignment: 'center' }
        }
      ])
    } else if (tmpl === 'iletisim-sayfa') {
      // İletişim sayfası şablonu
      setBlocks([
        {
          id: makeId(),
          type: 'hero',
          data: { heading: 'İletişim', sub: 'Sorularınız için bize ulaşın' },
          style: { bgColor: 'bg-gradient-to-r from-blue-600 to-purple-600', textColor: 'text-white', padding: 'py-20', alignment: 'center' }
        },
        {
          id: makeId(),
          type: 'two-column',
          data: {
            left: '<h3 class="text-2xl font-bold mb-4">İletişim Bilgileri</h3><p class="mb-2"><strong>E-posta:</strong> info@egitimplatformu.com</p><p class="mb-2"><strong>Telefon:</strong> +90 (212) 123 45 67</p><p><strong>Adres:</strong> İstanbul, Türkiye</p>',
            right: '<div class="border rounded-lg p-6"><h4 class="font-semibold mb-4">Bize Yazın</h4></div>'
          },
          style: { bgColor: 'bg-white', textColor: 'text-gray-900', padding: 'py-12', alignment: 'left' }
        },
        {
          id: makeId(),
          type: 'contact-form',
          data: { title: 'Hızlı İletişim Formu' },
          style: { bgColor: 'bg-gray-50', textColor: 'text-gray-900', padding: 'py-12', alignment: 'center' }
        }
      ])
    } else {
      // Eski basit şablonlar (geriye dönük uyum)
      if (tmpl === 'two-column') {
        setContent(`<section class="container mx-auto px-4 py-12">
  <div class="grid md:grid-cols-2 gap-8 items-start">
    <div>
      <h2 class="text-2xl font-semibold">${title || 'Başlık'}</h2>
      <p class="text-gray-600">Sol sütun metni burada.</p>
    </div>
    <div>
      <div class="prose">Sağ sütun içeriği burada.</div>
    </div>
  </div>
</section>`)
      } else if (tmpl === 'contact-form') {
        setContent(`<section class="container mx-auto px-4 py-12">
  <h2 class="text-2xl font-semibold mb-4">İletişim</h2>
  <form class="grid gap-4 max-w-xl">
    <input placeholder="İsim" class="border px-3 py-2 rounded" />
    <input placeholder="E-posta" class="border px-3 py-2 rounded" />
    <textarea placeholder="Mesaj" class="border px-3 py-2 rounded h-32"></textarea>
    <button class="bg-blue-600 text-white px-4 py-2 rounded">Gönder</button>
  </form>
</section>`)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-2">
              Yeni Sayfa Oluştur
            </h1>
            <p className="text-gray-600 text-lg">Blok editörü ile profesyonel sayfalar tasarlayın</p>
          </div>
          <Link href="/admin/pages">
            <Button className="group bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-700 hover:bg-white hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-xl px-6 py-3 font-medium">
              ← Geri
            </Button>
          </Link>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-6">
            <CardTitle className="text-2xl flex items-center gap-2">
              <span>📄</span> Sayfa Detayları
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Başlık</Label>
              <Input 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholder="Ör: Hakkımızda" 
                className="px-4 py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
              />
            </div>

            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Slug (URL)</Label>
              <Input 
                value={slug} 
                onChange={e => setSlug(e.target.value)} 
                placeholder="ornek-sayfa" 
                className="px-4 py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
              />
              <p className="text-xs text-gray-500 mt-2">Slug otomatik olarak düzenlenir. Ör: <code className="bg-gray-100 px-2 py-1 rounded">hakkimizda</code></p>
            </div>

            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Sayfa Tipi</Label>
              <select 
                value={pageType} 
                onChange={e => setPageType(e.target.value)} 
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
              >
                <option value="none">Varsayılan</option>
                <option value="contact">İletişim</option>
                <option value="about">Hakkımızda</option>
                <option value="faq">SSS</option>
                <option value="terms">Kullanım Şartları</option>
                <option value="privacy">Gizlilik Politikası</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <Label className="text-gray-700 font-medium mb-2 block">İçerik (Opsiyonel - Blok editörü kullanıyorsanız gerekmez)</Label>
              <Textarea 
                value={content} 
                onChange={e => setContent(e.target.value)} 
                className="h-48 font-mono px-4 py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200" 
                placeholder="HTML veya düz metin yazabilirsiniz..." 
              />
            </div>

            <div>
              <Label>Şablonlar</Label>
              <select value={template} onChange={e => { setTemplate(e.target.value); applyTemplate(e.target.value) }} className="w-full px-3 py-2 border rounded">
                <option value="none">Şablon seçme</option>
                <option value="hero">Hero (başlık + özet)</option>
                <option value="two-column">İki Sütun</option>
                <option value="contact-form">İletişim Formu</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Bir şablon seçerek hızlıca ana tasarıma uygun bir başlangıç oluşturabilirsiniz.</p>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Label className="text-gray-700 font-medium text-lg">🎨 Blok Editörü</Label>
                  <p className="text-sm text-gray-500 mt-1">Blok ekleyerek kod yazmadan profesyonel sayfalar tasarlayın</p>
                </div>
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
                  <label className="text-sm font-medium text-gray-700">Blok editörü kullan</label>
                  <input 
                    type="checkbox" 
                    checked={useBlocks} 
                    onChange={e => setUseBlocks(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer"
                  />
                </div>
              </div>

              {useBlocks ? (
                <div className="mt-4 space-y-4">
                  <div className="flex gap-3">
                    <select 
                      value={template} 
                      onChange={e => { setTemplate(e.target.value); applyTemplate(e.target.value) }} 
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 font-medium"
                    >
                      <option value="none">✨ Hazır Şablon Seç</option>
                      <optgroup label="Tam Sayfa Şablonları">
                        <option value="kurslar-sayfa">📚 Kurslar Sayfası</option>
                        <option value="egitmenler-sayfa">👨‍🏫 Eğitmenler Sayfası</option>
                        <option value="hakkimizda-sayfa">ℹ️ Hakkımızda Sayfası</option>
                        <option value="iletisim-sayfa">📞 İletişim Sayfası</option>
                      </optgroup>
                      <optgroup label="Basit Şablonlar">
                        <option value="hero">Hero (başlık + özet)</option>
                        <option value="two-column">İki Sütun</option>
                        <option value="contact-form">İletişim Formu</option>
                      </optgroup>
                    </select>
                    <select 
                      onChange={e => { if(e.target.value) addBlock(e.target.value as any); e.target.value = '' }} 
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border-blue-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 font-medium cursor-pointer"
                    >
                      <option value="">➕ Blok ekle...</option>
                      <optgroup label="Temel">
                        <option value="hero">🎯 Hero (Kapak)</option>
                        <option value="text">📝 Metin</option>
                        <option value="two-column">📊 İki Sütun</option>
                        <option value="image">🖼️ Resim</option>
                        <option value="cta">🎯 CTA Butonu</option>
                      </optgroup>
                      <optgroup label="İçerik">
                        <option value="features">✨ Özellikler Grid</option>
                        <option value="testimonials">💬 Kullanıcı Yorumları</option>
                        <option value="pricing">💳 Fiyatlandırma</option>
                        <option value="faq">❓ SSS</option>
                        <option value="stats">📊 İstatistikler</option>
                        <option value="gallery">🖼️ Galeri</option>
                      </optgroup>
                      <optgroup label="Form">
                        <option value="contact-form">İletişim Formu</option>
                      </optgroup>
                    </select>
                  </div>

                  <div className="space-y-2">
                    {blocks.length === 0 && <p className="text-sm text-gray-500">Henüz blok yok — yukarıdan ekleyin veya bir şablon seçin.</p>}
                    {blocks.map((b, idx) => (
                      <div key={b.id} className="group relative overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl p-6">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                        
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                              {idx + 1}
                            </div>
                            <strong className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                              {b.type.charAt(0).toUpperCase() + b.type.slice(1)}
                            </strong>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => moveBlock(idx, -1)} 
                              disabled={idx===0} 
                              className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg bg-white hover:bg-blue-50 hover:border-blue-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                            >
                              ↑
                            </button>
                            <button 
                              onClick={() => moveBlock(idx, +1)} 
                              disabled={idx===blocks.length-1} 
                              className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg bg-white hover:bg-blue-50 hover:border-blue-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                            >
                              ↓
                            </button>
                            <button 
                              onClick={() => removeBlock(b.id)} 
                              className="w-9 h-9 flex items-center justify-center border border-red-200 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-400 hover:scale-110 transition-all duration-200"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* Style Controls */}
                        <details className="mb-4">
                          <summary className="cursor-pointer font-semibold text-gray-700 bg-gradient-to-r from-gray-50 to-blue-50 px-4 py-3 rounded-xl hover:from-gray-100 hover:to-blue-100 transition-all duration-200">
                            🎨 Stil Ayarları
                          </summary>
                          <div className="grid grid-cols-2 gap-3 mt-4 p-4 bg-gray-50 rounded-xl">
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-2 block">Arkaplan Rengi</label>
                              <select 
                                value={b.style?.bgColor || 'bg-white'} 
                                onChange={e => updateBlockStyle(b.id, { bgColor: e.target.value })} 
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all"
                              >
                                <option value="bg-white">⚪ Beyaz</option>
                                <option value="bg-gray-50">🔘 Açık Gri</option>
                                <option value="bg-gray-900">⚫ Koyu</option>
                                <option value="bg-blue-600">🔵 Mavi</option>
                                <option value="bg-gradient-to-r from-blue-600 to-purple-600">🌈 Gradient (Mavi-Mor)</option>
                                <option value="bg-gradient-to-r from-yellow-400 to-orange-400">🌈 Gradient (Sarı-Turuncu)</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-2 block">Yazı Rengi</label>
                              <select 
                                value={b.style?.textColor || 'text-gray-900'} 
                                onChange={e => updateBlockStyle(b.id, { textColor: e.target.value })} 
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all"
                              >
                                <option value="text-gray-900">⚫ Koyu</option>
                                <option value="text-white">⚪ Beyaz</option>
                                <option value="text-blue-600">🔵 Mavi</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-2 block">Dikey Boşluk</label>
                              <select 
                                value={b.style?.padding || 'py-12'} 
                                onChange={e => updateBlockStyle(b.id, { padding: e.target.value })} 
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all"
                              >
                                <option value="py-6">📏 Küçük</option>
                                <option value="py-12">📏 Orta</option>
                                <option value="py-20">📏 Büyük</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-2 block">Metin Hizalama</label>
                              <select 
                                value={b.style?.alignment || 'left'} 
                                onChange={e => updateBlockStyle(b.id, { alignment: e.target.value })} 
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all"
                              >
                                <option value="left">◀️ Sol</option>
                                <option value="center">🎯 Orta</option>
                                <option value="right">▶️ Sağ</option>
                              </select>
                            </div>
                          </div>
                        </details>

                        {/* Block-specific editors */}
                        <div className="space-y-3">
                          {b.type === 'hero' && (
                            <div className="space-y-3 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">🎯 Başlık</label>
                                <Input 
                                  value={b.data.heading || ''} 
                                  onChange={e => updateBlock(b.id, { heading: e.target.value })} 
                                  placeholder="Geleceğinizi Şekillendirin" 
                                  className="px-4 py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">📝 Alt Başlık</label>
                                <Input 
                                  value={b.data.sub || ''} 
                                  onChange={e => updateBlock(b.id, { sub: e.target.value })} 
                                  placeholder="Profesyonel eğitimlerle kariyerinizi geliştirin" 
                                  className="px-4 py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">🖼️ Arkaplan Resim URL (Opsiyonel)</label>
                                <Input 
                                  value={b.data.bgImage || ''} 
                                  onChange={e => updateBlock(b.id, { bgImage: e.target.value })} 
                                  placeholder="https://..." 
                                  className="px-4 py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                                />
                              </div>
                            </div>
                          )}
                          {b.type === 'text' && (
                            <div className="p-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl">
                              <label className="text-sm font-medium text-gray-700 mb-3 block">📝 Metin Editörü</label>
                              
                              {/* Rich Text Toolbar */}
                              <div className="bg-white rounded-t-xl border border-gray-200 p-2 flex flex-wrap gap-2 mb-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const textarea = document.getElementById(`text-editor-${b.id}`) as HTMLTextAreaElement
                                    if (textarea) {
                                      const start = textarea.selectionStart
                                      const end = textarea.selectionEnd
                                      const text = textarea.value
                                      const selected = text.substring(start, end)
                                      const newText = text.substring(0, start) + `<h2>${selected || 'Başlık'}</h2>` + text.substring(end)
                                      updateBlock(b.id, { html: newText })
                                      setTimeout(() => textarea.focus(), 10)
                                    }
                                  }}
                                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold transition-all"
                                  title="Başlık 2"
                                >
                                  H2
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const textarea = document.getElementById(`text-editor-${b.id}`) as HTMLTextAreaElement
                                    if (textarea) {
                                      const start = textarea.selectionStart
                                      const end = textarea.selectionEnd
                                      const text = textarea.value
                                      const selected = text.substring(start, end)
                                      const newText = text.substring(0, start) + `<h3>${selected || 'Alt Başlık'}</h3>` + text.substring(end)
                                      updateBlock(b.id, { html: newText })
                                      setTimeout(() => textarea.focus(), 10)
                                    }
                                  }}
                                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold transition-all"
                                  title="Başlık 3"
                                >
                                  H3
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const textarea = document.getElementById(`text-editor-${b.id}`) as HTMLTextAreaElement
                                    if (textarea) {
                                      const start = textarea.selectionStart
                                      const end = textarea.selectionEnd
                                      const text = textarea.value
                                      const selected = text.substring(start, end)
                                      const newText = text.substring(0, start) + `<p>${selected || 'Paragraf metni...'}</p>` + text.substring(end)
                                      updateBlock(b.id, { html: newText })
                                      setTimeout(() => textarea.focus(), 10)
                                    }
                                  }}
                                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-all"
                                  title="Paragraf"
                                >
                                  ¶
                                </button>
                                <div className="w-px bg-gray-300"></div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const textarea = document.getElementById(`text-editor-${b.id}`) as HTMLTextAreaElement
                                    if (textarea) {
                                      const start = textarea.selectionStart
                                      const end = textarea.selectionEnd
                                      const text = textarea.value
                                      const selected = text.substring(start, end)
                                      if (selected) {
                                        const newText = text.substring(0, start) + `<strong>${selected}</strong>` + text.substring(end)
                                        updateBlock(b.id, { html: newText })
                                        setTimeout(() => textarea.focus(), 10)
                                      }
                                    }
                                  }}
                                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold transition-all"
                                  title="Kalın"
                                >
                                  B
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const textarea = document.getElementById(`text-editor-${b.id}`) as HTMLTextAreaElement
                                    if (textarea) {
                                      const start = textarea.selectionStart
                                      const end = textarea.selectionEnd
                                      const text = textarea.value
                                      const selected = text.substring(start, end)
                                      if (selected) {
                                        const newText = text.substring(0, start) + `<em>${selected}</em>` + text.substring(end)
                                        updateBlock(b.id, { html: newText })
                                        setTimeout(() => textarea.focus(), 10)
                                      }
                                    }
                                  }}
                                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm italic transition-all"
                                  title="İtalik"
                                >
                                  I
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const textarea = document.getElementById(`text-editor-${b.id}`) as HTMLTextAreaElement
                                    if (textarea) {
                                      const start = textarea.selectionStart
                                      const end = textarea.selectionEnd
                                      const text = textarea.value
                                      const selected = text.substring(start, end)
                                      if (selected) {
                                        const newText = text.substring(0, start) + `<u>${selected}</u>` + text.substring(end)
                                        updateBlock(b.id, { html: newText })
                                        setTimeout(() => textarea.focus(), 10)
                                      }
                                    }
                                  }}
                                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm underline transition-all"
                                  title="Altı Çizili"
                                >
                                  U
                                </button>
                                <div className="w-px bg-gray-300"></div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const textarea = document.getElementById(`text-editor-${b.id}`) as HTMLTextAreaElement
                                    if (textarea) {
                                      const start = textarea.selectionStart
                                      const text = textarea.value
                                      const newText = text.substring(0, start) + `<ul>\n  <li>Madde 1</li>\n  <li>Madde 2</li>\n  <li>Madde 3</li>\n</ul>\n` + text.substring(start)
                                      updateBlock(b.id, { html: newText })
                                      setTimeout(() => textarea.focus(), 10)
                                    }
                                  }}
                                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-all"
                                  title="Madde İşaretli Liste"
                                >
                                  • Liste
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const textarea = document.getElementById(`text-editor-${b.id}`) as HTMLTextAreaElement
                                    if (textarea) {
                                      const start = textarea.selectionStart
                                      const text = textarea.value
                                      const newText = text.substring(0, start) + `<ol>\n  <li>Birinci</li>\n  <li>İkinci</li>\n  <li>Üçüncü</li>\n</ol>\n` + text.substring(start)
                                      updateBlock(b.id, { html: newText })
                                      setTimeout(() => textarea.focus(), 10)
                                    }
                                  }}
                                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-all"
                                  title="Numaralı Liste"
                                >
                                  1. Liste
                                </button>
                                <div className="w-px bg-gray-300"></div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const url = prompt('Link URL:')
                                    if (url) {
                                      const textarea = document.getElementById(`text-editor-${b.id}`) as HTMLTextAreaElement
                                      if (textarea) {
                                        const start = textarea.selectionStart
                                        const end = textarea.selectionEnd
                                        const text = textarea.value
                                        const selected = text.substring(start, end)
                                        const newText = text.substring(0, start) + `<a href="${url}" class="text-blue-600 hover:underline">${selected || 'Link metni'}</a>` + text.substring(end)
                                        updateBlock(b.id, { html: newText })
                                        setTimeout(() => textarea.focus(), 10)
                                      }
                                    }
                                  }}
                                  className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm transition-all"
                                  title="Link Ekle"
                                >
                                  🔗 Link
                                </button>
                              </div>
                              
                              <Textarea 
                                id={`text-editor-${b.id}`}
                                className="h-64 font-mono text-sm px-4 py-3 rounded-b-xl border border-t-0 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white" 
                                value={b.data.html || ''} 
                                onChange={e => updateBlock(b.id, { html: e.target.value })} 
                                placeholder="HTML kodları otomatik eklenecek, sadece metni seçip butonlara tıklayın veya doğrudan HTML yazın..." 
                              />
                              <p className="text-xs text-gray-500 mt-2">💡 İpucu: Metni seçip <strong>B</strong>, <strong>I</strong>, <strong>U</strong> butonlarına basın. Yeni başlık/paragraf için imleci istediğiniz yere koyun.</p>
                            </div>
                          )}
                          {b.type === 'two-column' && (
                            <div className="space-y-3 p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl">
                              <div className="text-sm font-semibold text-gray-700 mb-2">📊 İki Sütunlu Düzen</div>
                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-gray-700 mb-2 block">◀️ Sol Sütun</label>
                                  <Textarea 
                                    value={b.data.left || ''} 
                                    onChange={e => updateBlock(b.id, { left: e.target.value })} 
                                    placeholder="Sol taraf içeriği (HTML yazabilirsiniz)" 
                                    className="h-32 px-4 py-2 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-700 mb-2 block">▶️ Sağ Sütun</label>
                                  <Textarea 
                                    value={b.data.right || ''} 
                                    onChange={e => updateBlock(b.id, { right: e.target.value })} 
                                    placeholder="Sağ taraf içeriği (HTML yazabilirsiniz)" 
                                    className="h-32 px-4 py-2 rounded-lg"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          {b.type === 'image' && (
                            <div className="space-y-3 p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl">
                              <div className="text-sm font-semibold text-gray-700 mb-2">🖼️ Resim Ayarları</div>
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Resim URL'si</label>
                                <Input 
                                  value={b.data.src || ''} 
                                  onChange={e => updateBlock(b.id, { src: e.target.value })} 
                                  placeholder="https://example.com/resim.jpg" 
                                  className="px-4 py-3 rounded-xl"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Alternatif Metin (SEO için)</label>
                                <Input 
                                  value={b.data.alt || ''} 
                                  onChange={e => updateBlock(b.id, { alt: e.target.value })} 
                                  placeholder="Resim açıklaması" 
                                  className="px-4 py-3 rounded-xl"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Resim Altı Yazı (Opsiyonel)</label>
                                <Input 
                                  value={b.data.caption || ''} 
                                  onChange={e => updateBlock(b.id, { caption: e.target.value })} 
                                  placeholder="Açıklama metni..." 
                                  className="px-4 py-3 rounded-xl"
                                />
                              </div>
                            </div>
                          )}
                          {b.type === 'cta' && (
                            <div className="space-y-3 p-4 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl">
                              <div className="text-sm font-semibold text-gray-700 mb-2">🎯 Aksiyon Butonu</div>
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Buton Metni</label>
                                <Input 
                                  value={b.data.text || ''} 
                                  onChange={e => updateBlock(b.id, { text: e.target.value })} 
                                  placeholder="Hemen Başla" 
                                  className="px-4 py-3 rounded-xl"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Gideceği Link</label>
                                <Input 
                                  value={b.data.href || ''} 
                                  onChange={e => updateBlock(b.id, { href: e.target.value })} 
                                  placeholder="/kayit veya https://..." 
                                  className="px-4 py-3 rounded-xl"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Buton Rengi</label>
                                <select 
                                  value={b.data.buttonStyle || 'primary'} 
                                  onChange={e => updateBlock(b.id, { buttonStyle: e.target.value })} 
                                  className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                                >
                                  <option value="primary">🟦 Mavi (Birincil)</option>
                                  <option value="secondary">⬜ Gri (İkincil)</option>
                                </select>
                              </div>
                            </div>
                          )}
                          {b.type === 'contact-form' && (
                            <div className="space-y-3 p-4 bg-gradient-to-br from-teal-50 to-green-50 rounded-xl">
                              <div className="text-sm font-semibold text-gray-700 mb-2">📧 İletişim Formu</div>
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Form Başlığı</label>
                                <Input 
                                  value={b.data.title || ''} 
                                  onChange={e => updateBlock(b.id, { title: e.target.value })} 
                                  placeholder="Bize Ulaşın" 
                                  className="px-4 py-3 rounded-xl"
                                />
                                <p className="text-xs text-gray-500 mt-2">💡 Form otomatik olarak İsim, E-posta ve Mesaj alanlarını içerir</p>
                              </div>
                            </div>
                          )}
                          {b.type === 'features' && (
                            <div className="space-y-4 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl">
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">📌 Bölüm Başlığı</label>
                                <Input 
                                  value={b.data.title || ''} 
                                  onChange={e => updateBlock(b.id, { title: e.target.value })} 
                                  placeholder="Neden Bizi Seçmelisiniz?" 
                                  className="px-4 py-3 rounded-xl"
                                />
                              </div>
                              <div className="text-sm font-semibold text-gray-700 mb-2">✨ Özellikler (3 tane)</div>
                              {[0, 1, 2].map(idx => {
                                const items = b.data.items || []
                                const item = items[idx] || {}
                                return (
                                  <div key={idx} className="bg-white rounded-xl p-4 space-y-2">
                                    <div className="font-medium text-gray-600 mb-2">Özellik {idx + 1}</div>
                                    <Input
                                      value={item.icon || ''}
                                      onChange={e => {
                                        const newItems = [...(b.data.items || [])]
                                        newItems[idx] = { ...newItems[idx], icon: e.target.value }
                                        updateBlock(b.id, { items: newItems })
                                      }}
                                      placeholder="Emoji (ör: 🎓)"
                                      className="px-4 py-2 rounded-lg"
                                    />
                                    <Input
                                      value={item.title || ''}
                                      onChange={e => {
                                        const newItems = [...(b.data.items || [])]
                                        newItems[idx] = { ...newItems[idx], title: e.target.value }
                                        updateBlock(b.id, { items: newItems })
                                      }}
                                      placeholder="Başlık (ör: Uzman Kadro)"
                                      className="px-4 py-2 rounded-lg"
                                    />
                                    <Input
                                      value={item.desc || ''}
                                      onChange={e => {
                                        const newItems = [...(b.data.items || [])]
                                        newItems[idx] = { ...newItems[idx], desc: e.target.value }
                                        updateBlock(b.id, { items: newItems })
                                      }}
                                      placeholder="Açıklama"
                                      className="px-4 py-2 rounded-lg"
                                    />
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          {b.type === 'testimonials' && (
                            <div className="space-y-4 p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl">
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">📌 Bölüm Başlığı</label>
                                <Input 
                                  value={b.data.title || ''} 
                                  onChange={e => updateBlock(b.id, { title: e.target.value })} 
                                  placeholder="Öğrenci Yorumları" 
                                  className="px-4 py-3 rounded-xl"
                                />
                              </div>
                              <div className="text-sm font-semibold text-gray-700 mb-2">💬 Yorumlar (2 tane)</div>
                              {[0, 1].map(idx => {
                                const items = b.data.items || []
                                const item = items[idx] || {}
                                return (
                                  <div key={idx} className="bg-white rounded-xl p-4 space-y-2">
                                    <div className="font-medium text-gray-600 mb-2">Yorum {idx + 1}</div>
                                    <Input
                                      value={item.name || ''}
                                      onChange={e => {
                                        const newItems = [...(b.data.items || [])]
                                        newItems[idx] = { ...newItems[idx], name: e.target.value }
                                        updateBlock(b.id, { items: newItems })
                                      }}
                                      placeholder="İsim (ör: Ahmet Yılmaz)"
                                      className="px-4 py-2 rounded-lg"
                                    />
                                    <Textarea
                                      value={item.text || ''}
                                      onChange={e => {
                                        const newItems = [...(b.data.items || [])]
                                        newItems[idx] = { ...newItems[idx], text: e.target.value }
                                        updateBlock(b.id, { items: newItems })
                                      }}
                                      placeholder="Yorum metni..."
                                      className="px-4 py-2 rounded-lg h-20"
                                    />
                                    <select
                                      value={item.rating || 5}
                                      onChange={e => {
                                        const newItems = [...(b.data.items || [])]
                                        newItems[idx] = { ...newItems[idx], rating: parseInt(e.target.value) }
                                        updateBlock(b.id, { items: newItems })
                                      }}
                                      className="w-full px-4 py-2 border rounded-lg"
                                    >
                                      <option value="5">⭐⭐⭐⭐⭐ (5 yıldız)</option>
                                      <option value="4">⭐⭐⭐⭐ (4 yıldız)</option>
                                      <option value="3">⭐⭐⭐ (3 yıldız)</option>
                                    </select>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          {b.type === 'pricing' && (
                            <div className="space-y-4 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl">
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">📌 Bölüm Başlığı</label>
                                <Input 
                                  value={b.data.title || ''} 
                                  onChange={e => updateBlock(b.id, { title: e.target.value })} 
                                  placeholder="Fiyatlandırma Planları" 
                                  className="px-4 py-3 rounded-xl"
                                />
                              </div>
                              <div className="text-sm font-semibold text-gray-700 mb-2">💳 Planlar (3 tane)</div>
                              {[0, 1, 2].map(idx => {
                                const plans = b.data.plans || []
                                const plan = plans[idx] || {}
                                return (
                                  <div key={idx} className="bg-white rounded-xl p-4 space-y-3">
                                    <div className="font-medium text-gray-600 mb-2">Plan {idx + 1}</div>
                                    <Input
                                      value={plan.name || ''}
                                      onChange={e => {
                                        const newPlans = [...(b.data.plans || [])]
                                        newPlans[idx] = { ...newPlans[idx], name: e.target.value }
                                        updateBlock(b.id, { plans: newPlans })
                                      }}
                                      placeholder="Plan Adı (ör: Temel)"
                                      className="px-4 py-2 rounded-lg"
                                    />
                                    <Input
                                      value={plan.price || ''}
                                      onChange={e => {
                                        const newPlans = [...(b.data.plans || [])]
                                        newPlans[idx] = { ...newPlans[idx], price: e.target.value }
                                        updateBlock(b.id, { plans: newPlans })
                                      }}
                                      placeholder="Fiyat (ör: ₺299/ay)"
                                      className="px-4 py-2 rounded-lg"
                                    />
                                    <Textarea
                                      value={(plan.features || []).join('\n')}
                                      onChange={e => {
                                        const newPlans = [...(b.data.plans || [])]
                                        newPlans[idx] = { ...newPlans[idx], features: e.target.value.split('\n').filter(f => f.trim()) }
                                        updateBlock(b.id, { plans: newPlans })
                                      }}
                                      placeholder="Özellikler (her satıra bir özellik)&#10;Özellik 1&#10;Özellik 2&#10;Özellik 3"
                                      className="px-4 py-2 rounded-lg h-24"
                                    />
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={plan.highlight || false}
                                        onChange={e => {
                                          const newPlans = [...(b.data.plans || [])]
                                          newPlans[idx] = { ...newPlans[idx], highlight: e.target.checked }
                                          updateBlock(b.id, { plans: newPlans })
                                        }}
                                        className="w-4 h-4 rounded"
                                      />
                                      <span className="text-sm text-gray-700">⭐ Öne çıkan plan (vurgulanır)</span>
                                    </label>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          {b.type === 'faq' && (
                            <div className="space-y-4 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">📌 Bölüm Başlığı</label>
                                <Input 
                                  value={b.data.title || ''} 
                                  onChange={e => updateBlock(b.id, { title: e.target.value })} 
                                  placeholder="Sık Sorulan Sorular" 
                                  className="px-4 py-3 rounded-xl"
                                />
                              </div>
                              <div className="text-sm font-semibold text-gray-700 mb-2">❓ Sorular (3 tane)</div>
                              {[0, 1, 2].map(idx => {
                                const items = b.data.items || []
                                const item = items[idx] || {}
                                return (
                                  <div key={idx} className="bg-white rounded-xl p-4 space-y-2">
                                    <div className="font-medium text-gray-600 mb-2">Soru {idx + 1}</div>
                                    <Input
                                      value={item.q || ''}
                                      onChange={e => {
                                        const newItems = [...(b.data.items || [])]
                                        newItems[idx] = { ...newItems[idx], q: e.target.value }
                                        updateBlock(b.id, { items: newItems })
                                      }}
                                      placeholder="Soru (ör: Nasıl kayıt olurum?)"
                                      className="px-4 py-2 rounded-lg"
                                    />
                                    <Textarea
                                      value={item.a || ''}
                                      onChange={e => {
                                        const newItems = [...(b.data.items || [])]
                                        newItems[idx] = { ...newItems[idx], a: e.target.value }
                                        updateBlock(b.id, { items: newItems })
                                      }}
                                      placeholder="Cevap..."
                                      className="px-4 py-2 rounded-lg h-20"
                                    />
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          {b.type === 'stats' && (
                            <div className="space-y-4 p-4 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl">
                              <div className="text-sm font-semibold text-gray-700 mb-2">📊 İstatistikler (4 tane)</div>
                              {[0, 1, 2, 3].map(idx => {
                                const items = b.data.items || []
                                const item = items[idx] || {}
                                return (
                                  <div key={idx} className="bg-white rounded-xl p-4 space-y-2">
                                    <div className="font-medium text-gray-600 mb-2">İstatistik {idx + 1}</div>
                                    <Input
                                      value={item.number || ''}
                                      onChange={e => {
                                        const newItems = [...(b.data.items || [])]
                                        newItems[idx] = { ...newItems[idx], number: e.target.value }
                                        updateBlock(b.id, { items: newItems })
                                      }}
                                      placeholder="Sayı (ör: 180+)"
                                      className="px-4 py-2 rounded-lg"
                                    />
                                    <Input
                                      value={item.label || ''}
                                      onChange={e => {
                                        const newItems = [...(b.data.items || [])]
                                        newItems[idx] = { ...newItems[idx], label: e.target.value }
                                        updateBlock(b.id, { items: newItems })
                                      }}
                                      placeholder="Etiket (ör: Online Kurs)"
                                      className="px-4 py-2 rounded-lg"
                                    />
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          {b.type === 'gallery' && (
                            <div className="space-y-4 p-4 bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-xl">
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">📌 Bölüm Başlığı</label>
                                <Input 
                                  value={b.data.title || ''} 
                                  onChange={e => updateBlock(b.id, { title: e.target.value })} 
                                  placeholder="Galeri" 
                                  className="px-4 py-3 rounded-xl"
                                />
                              </div>
                              <div className="text-sm font-semibold text-gray-700 mb-2">🖼️ Resimler (3 tane)</div>
                              {[0, 1, 2].map(idx => {
                                const images = b.data.images || []
                                const image = images[idx] || {}
                                return (
                                  <div key={idx} className="bg-white rounded-xl p-4 space-y-2">
                                    <div className="font-medium text-gray-600 mb-2">Resim {idx + 1}</div>
                                    <Input
                                      value={image.src || ''}
                                      onChange={e => {
                                        const newImages = [...(b.data.images || [])]
                                        newImages[idx] = { ...newImages[idx], src: e.target.value }
                                        updateBlock(b.id, { images: newImages })
                                      }}
                                      placeholder="Resim URL'si"
                                      className="px-4 py-2 rounded-lg"
                                    />
                                    <Input
                                      value={image.alt || ''}
                                      onChange={e => {
                                        const newImages = [...(b.data.images || [])]
                                        newImages[idx] = { ...newImages[idx], alt: e.target.value }
                                        updateBlock(b.id, { images: newImages })
                                      }}
                                      placeholder="Resim açıklaması"
                                      className="px-4 py-2 rounded-lg"
                                    />
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <Label>İçerik (HTML)</Label>
                  <Textarea value={content} onChange={e => setContent(e.target.value)} className="h-48 font-mono" placeholder="Sayfa içeriği (HTML veya metin) — HTML yazabilirsiniz." />
                </div>
              )}

              <div className="mt-6 p-6 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                    👁️
                  </div>
                  <Label className="text-lg font-bold text-gray-900">Canlı Önizleme</Label>
                </div>
                <div className="border-0 rounded-xl p-6 bg-white shadow-xl overflow-auto max-h-96">
                  <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(useBlocks && blocks.length ? generateHtmlFromBlocks(blocks) : content) }} />
                </div>
                <p className="text-xs text-yellow-700 mt-3 flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-lg">
                  <span>⚠️</span>
                  Not: Önizleme basit bir temizleyici ile güvenliği sağlar. Üretim ortamı için sunucu tarafı sanitizasyonu önerilir.
                </p>
              </div>
            </div>

            <div>
              <Label className="text-gray-700 font-medium mb-2 block">📋 Sayfa Durumu</Label>
              <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value as any)} 
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
              >
                <option value="draft">📝 Taslak</option>
                <option value="published">✅ Yayında</option>
                <option value="private">🔒 Özel</option>
              </select>
            </div>

            <div className="flex items-center gap-3 bg-white px-5 py-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-all duration-200">
              <input 
                id="in_menu" 
                type="checkbox" 
                checked={inMenu} 
                onChange={e => setInMenu(e.target.checked)} 
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer"
              />
              <label htmlFor="in_menu" className="text-sm font-medium text-gray-700 cursor-pointer">🔗 Ana menüde göster</label>
            </div>

            <div className="flex items-center gap-3 bg-white px-5 py-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-all duration-200">
              <input 
                id="homepage" 
                type="checkbox" 
                checked={isHomepage} 
                onChange={e => setIsHomepage(e.target.checked)} 
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer"
              />
              <label htmlFor="homepage" className="text-sm font-medium text-gray-700 cursor-pointer">🏠 Ana sayfa olarak işaretle</label>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="group bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-gray-900 font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-yellow-400/25 transition-all duration-300 transform hover:scale-105 border-0"
            >
              {saving ? '💾 Kaydediliyor...' : '✨ Sayfayı Oluştur'}
            </Button>
            <Link href="/admin/pages">
              <Button className="bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md transition-all duration-300 rounded-xl px-6 py-3 font-medium">
                İptal
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
