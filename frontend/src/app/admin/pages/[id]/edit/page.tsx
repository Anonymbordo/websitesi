"use client"

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
  in_menu?: boolean
  page_type?: string
}

const STORAGE_KEY = 'local_pages'

function normalizeSlug(s: any) { return (s || '').toString().replace(/^\//, '') }

// Basic client-side sanitizer: strips <script> tags, on* attributes and javascript: URLs.
function sanitizeHtml(input: string) {
  if (!input) return ''
  let s = input
  s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
  s = s.replace(/\s(on[a-z]+)\s*=\s*("[^"]*"|'[^']*'|[^>\s]+)/gi, '')
  s = s.replace(/(href|src)\s*=\s*("|')?\s*javascript:[^\s"'>]*/gi, '$1=$2#')
  return s
}

export default function EditPage() {
  const router = useRouter()
  const params = useParams() as { id?: string }
  const idParam = params?.id || ''
  const id = parseInt(idParam, 10)

  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState<LocalPage | null>(null)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [status, setStatus] = useState<'published' | 'draft' | 'private'>('draft')
  const [content, setContent] = useState('')
  const [isHomepage, setIsHomepage] = useState(false)
  const [inMenu, setInMenu] = useState(true)
  const [pageType, setPageType] = useState<string>('none')
  // blocks can include an optional `style` object (bgColor, textColor, padding, alignment)
  const [blocks, setBlocks] = useState<Array<{ id: string; type: string; data: any; style?: any }>>([])
  const [useBlocks, setUseBlocks] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      toast.error('Geçersiz sayfa id')
      router.push('/admin/pages')
      return
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const pages = raw ? JSON.parse(raw) as LocalPage[] : []
      const found = pages.find(p => Number(p.id) === id)
      if (!found) {
        toast.error('Sayfa bulunamadı')
        router.push('/admin/pages')
        return
      }
      setPage(found)
      setTitle(found.title || '')
      setSlug(normalizeSlug(found.slug))
      setStatus(found.status || 'draft')
      setContent(found.content || '')
  setBlocks((found as any).blocks || [])
      setIsHomepage(!!found.isHomepage)
      setInMenu(!!found.in_menu)
  setPageType(found.page_type || 'none')
    } catch (e) {
      console.error(e)
      toast.error('Sayfa yüklenirken hata')
      router.push('/admin/pages')
    } finally {
      setLoading(false)
    }
  }, [id])

  const readPages = (): LocalPage[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      return JSON.parse(raw) as LocalPage[]
    } catch (e) {
      return []
    }
  }

  const writePages = (pages: LocalPage[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pages))
  }

  // block helpers (same logic as create page)
  function makeId() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}` }
  const addBlock = (type: string) => {
    const id = makeId()
    const base: any = { id, type, data: {}, style: { bgColor: 'bg-white', textColor: 'text-gray-900', padding: 'py-12', alignment: 'left' } }
    if (type === 'hero') base.data = { heading: title || 'Başlık', sub: 'Kısa açıklama', bgImage: '' }
    if (type === 'text') base.data = { html: '<p>Yeni metin bloğu</p>' }
    if (type === 'two-column') base.data = { left: '<p>Sol</p>', right: '<p>Sağ</p>' }
    if (type === 'image') base.data = { src: '', alt: '', caption: '' }
    if (type === 'cta') base.data = { text: 'Hemen Başla', href: '#', buttonStyle: 'primary' }
    if (type === 'contact-form') base.data = { title: 'İletişim', showPhone: true, showEmail: true }
    if (type === 'features') base.data = { title: 'Özellikler', items: [{ icon: '✓', title: 'Özellik 1', desc: 'Açıklama' }] }
    if (type === 'testimonials') base.data = { title: 'Kullanıcı Yorumları', items: [{ name: 'Ahmet Y.', text: 'Harika!', rating: 5 }] }
    if (type === 'pricing') base.data = { title: 'Fiyatlandırma', plans: [{ name: 'Temel', price: '99₺', features: ['Özellik 1'], highlight: false }] }
    if (type === 'faq') base.data = { title: 'SSS', items: [{ q: 'Soru?', a: 'Cevap' }] }
    if (type === 'stats') base.data = { items: [{ number: '1000+', label: 'Kullanıcı' }] }
    if (type === 'gallery') base.data = { title: 'Galeri', images: [{ src: '', alt: '' }] }
    setBlocks(prev => [...prev, base])
  }

  const updateBlock = (id: string, patch: any) => {
    setBlocks(prev => prev.map((b:any) => b.id === id ? { ...b, data: { ...b.data, ...patch } } : b))
  }

  const updateBlockStyle = (id: string, stylePatch: any) => {
    setBlocks(prev => prev.map((b:any) => b.id === id ? { ...b, style: { ...b.style, ...stylePatch } } : b))
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

  function escapeHtml(s: string) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  }
  function escapeAttr(s: string) { return escapeHtml(s).replace(/"/g,'&quot;') }

  const generateHtmlFromBlocks = (blocksArr: any[]) => {
    return blocksArr.map(b => {
      const bgClass = b.style?.bgColor || 'bg-white'
      const textClass = b.style?.textColor || 'text-gray-900'
      const paddingClass = b.style?.padding || 'py-12'
      const alignClass = b.style?.alignment === 'center' ? 'text-center' : b.style?.alignment === 'right' ? 'text-right' : 'text-left'
      
      if (b.type === 'hero') {
        const bgImage = b.data.bgImage ? `style="background-image: url('${escapeAttr(b.data.bgImage)}'); background-size: cover; background-position: center;"` : ''
        return `<section class="relative ${paddingClass} ${bgClass} ${textClass}" ${bgImage}><div class="container mx-auto px-4 ${alignClass}"><h1 class="text-5xl font-bold mb-4">${escapeHtml(b.data.heading || '')}</h1><p class="text-xl opacity-90">${escapeHtml(b.data.sub || '')}</p></div></section>`
      }
      if (b.type === 'text') return `<section class="container mx-auto px-4 ${paddingClass} ${bgClass}"><div class="prose max-w-none ${textClass} ${alignClass}">${b.data.html || ''}</div></section>`
      if (b.type === 'two-column') return `<section class="container mx-auto px-4 ${paddingClass} ${bgClass}"><div class="grid md:grid-cols-2 gap-8 items-start ${textClass}"><div>${b.data.left || ''}</div><div>${b.data.right || ''}</div></div></section>`
      if (b.type === 'image') {
        const caption = b.data.caption ? `<p class="text-sm text-gray-600 mt-2 ${alignClass}">${escapeHtml(b.data.caption)}</p>` : ''
        return `<section class="container mx-auto px-4 ${paddingClass} ${bgClass} ${alignClass}"><img src="${escapeAttr(b.data.src||'')}" alt="${escapeAttr(b.data.alt||'')}" class="w-full rounded shadow-lg"/>${caption}</section>`
      }
      if (b.type === 'cta') {
        const btnClass = b.data.buttonStyle === 'secondary' ? 'bg-gray-800' : 'bg-blue-600'
        return `<section class="container mx-auto px-4 ${paddingClass} ${bgClass} ${alignClass}"><a href="${escapeAttr(b.data.href||'#')}" class="inline-block ${btnClass} text-white px-8 py-4 rounded-lg text-lg font-semibold hover:opacity-90 transition">${escapeHtml(b.data.text||'CTA')}</a></section>`
      }
      if (b.type === 'contact-form') return `<section class="container mx-auto px-4 ${paddingClass} ${bgClass}"><h2 class="text-3xl font-bold mb-6 ${textClass} ${alignClass}">${escapeHtml(b.data.title||'İletişim')}</h2><form class="grid gap-4 max-w-xl ${alignClass === 'text-center' ? 'mx-auto' : ''}"><input placeholder="İsim" class="border px-4 py-3 rounded-lg" /><input placeholder="E-posta" class="border px-4 py-3 rounded-lg" /><textarea placeholder="Mesaj" class="border px-4 py-3 rounded-lg h-32"></textarea><button type="submit" class="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold">Gönder</button></form></section>`
      if (b.type === 'features') {
        const items = (b.data.items || []).map((item: any) => `<div class="text-center p-6 border rounded-lg"><div class="text-4xl mb-4">${escapeHtml(item.icon||'')}</div><h3 class="text-xl font-semibold mb-2">${escapeHtml(item.title||'')}</h3><p class="text-gray-600">${escapeHtml(item.desc||'')}</p></div>`).join('')
        return `<section class="container mx-auto px-4 ${paddingClass} ${bgClass}"><h2 class="text-3xl font-bold mb-8 ${textClass} ${alignClass}">${escapeHtml(b.data.title||'Özellikler')}</h2><div class="grid md:grid-cols-3 gap-6">${items}</div></section>`
      }
      if (b.type === 'testimonials') {
        const items = (b.data.items || []).map((item: any) => {
          const stars = '★'.repeat(item.rating || 5)
          return `<div class="bg-white p-6 rounded-lg shadow"><p class="text-gray-700 mb-4">"${escapeHtml(item.text||'')}"</p><div class="flex items-center justify-between"><span class="font-semibold">${escapeHtml(item.name||'')}</span><span class="text-yellow-500">${stars}</span></div></div>`
        }).join('')
        return `<section class="container mx-auto px-4 ${paddingClass} ${bgClass}"><h2 class="text-3xl font-bold mb-8 ${textClass} ${alignClass}">${escapeHtml(b.data.title||'Yorumlar')}</h2><div class="grid md:grid-cols-2 gap-6">${items}</div></section>`
      }
      if (b.type === 'pricing') {
        const plans = (b.data.plans || []).map((plan: any) => {
          const highlightClass = plan.highlight ? 'border-blue-600 border-2 shadow-xl scale-105' : 'border-gray-200'
          const features = (plan.features || []).map((f: string) => `<li class="flex items-center gap-2"><span class="text-green-600">✓</span>${escapeHtml(f)}</li>`).join('')
          return `<div class="border ${highlightClass} rounded-lg p-6 bg-white"><h3 class="text-2xl font-bold mb-2">${escapeHtml(plan.name||'')}</h3><div class="text-3xl font-bold text-blue-600 mb-4">${escapeHtml(plan.price||'')}</div><ul class="space-y-2 mb-6">${features}</ul><button class="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold">Başla</button></div>`
        }).join('')
        return `<section class="container mx-auto px-4 ${paddingClass} ${bgClass}"><h2 class="text-3xl font-bold mb-8 ${textClass} ${alignClass}">${escapeHtml(b.data.title||'Fiyatlandırma')}</h2><div class="grid md:grid-cols-3 gap-6">${plans}</div></section>`
      }
      if (b.type === 'faq') {
        const items = (b.data.items || []).map((item: any) => `<details class="border-b py-4"><summary class="font-semibold cursor-pointer">${escapeHtml(item.q||'')}</summary><p class="mt-2 text-gray-600">${escapeHtml(item.a||'')}</p></details>`).join('')
        return `<section class="container mx-auto px-4 ${paddingClass} ${bgClass}"><h2 class="text-3xl font-bold mb-8 ${textClass} ${alignClass}">${escapeHtml(b.data.title||'SSS')}</h2><div class="max-w-3xl mx-auto">${items}</div></section>`
      }
      if (b.type === 'stats') {
        const items = (b.data.items || []).map((item: any) => `<div class="text-center"><div class="text-4xl font-bold ${textClass}">${escapeHtml(item.number||'')}</div><div class="text-gray-600 mt-2">${escapeHtml(item.label||'')}</div></div>`).join('')
        return `<section class="container mx-auto px-4 ${paddingClass} ${bgClass}"><div class="grid grid-cols-2 md:grid-cols-4 gap-8">${items}</div></section>`
      }
      if (b.type === 'gallery') {
        const images = (b.data.images || []).map((img: any) => `<img src="${escapeAttr(img.src||'')}" alt="${escapeAttr(img.alt||'')}" class="w-full h-64 object-cover rounded-lg"/>`).join('')
        return `<section class="container mx-auto px-4 ${paddingClass} ${bgClass}"><h2 class="text-3xl font-bold mb-8 ${textClass} ${alignClass}">${escapeHtml(b.data.title||'Galeri')}</h2><div class="grid md:grid-cols-3 gap-4">${images}</div></section>`
      }
      return ''
    }).join('\n')
  }

  const handleSave = () => {
    if (!page) return
    if (!title.trim()) return toast.error('Başlık gerekli')
    const finalSlug = normalizeSlug(slug || title)
    if (!finalSlug) return toast.error('Geçerli slug girin')

    const pages = readPages()
    // check duplicate slug on other pages
    const dup = pages.find(p => String(p.slug).replace(/^\//,'') === finalSlug && p.id !== page.id)
    if (dup) return toast.error('Bu slug başka bir sayfa tarafından kullanılıyor')

    setSaving(true)
    try {
      const now = new Date().toISOString()
      // if blocks present, generate HTML
      const generated = blocks && blocks.length ? generateHtmlFromBlocks(blocks as any) : content
      const updated: LocalPage & { blocks?: any[] } = {
        ...page,
        title: title.trim(),
        slug: finalSlug,
        status,
        content: generated,
        updatedAt: now,
        isHomepage,
        in_menu: inMenu,
        page_type: pageType === 'none' ? undefined : pageType
      }
      if (blocks && blocks.length) (updated as any).blocks = blocks
      const next = pages.map(p => p.id === page.id ? updated : p)
      writePages(next)
      toast.success('Sayfa güncellendi')
      router.push('/admin/pages')
    } catch (e) {
      console.error(e)
      toast.error('Güncelleme sırasında hata')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6">Yükleniyor...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sayfa Düzenle</h1>
          <p className="text-sm text-gray-600">Sayfa içeriğini ve menü görünürlüğünü düzenleyin.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/pages">
            <Button variant="outline">Geri</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sayfa: {page?.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Başlık</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Slug (URL)</Label>
              <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="ornek-sayfa" />
              <p className="text-xs text-gray-500">Slug başında / olmadan kaydedilir. Ör: <code>hakkimizda</code></p>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Blok Editörü</Label>
                  <p className="text-xs text-gray-500">Kod yazmadan bloklarla sayfayı düzenleyin.</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm">Blok editörü kullan</label>
                  <input type="checkbox" checked={useBlocks} onChange={e => setUseBlocks(e.target.checked)} />
                </div>
              </div>

              {useBlocks ? (
                <div className="mt-3 space-y-3">
                  <div className="flex gap-2">
                    <select onChange={e => { if(e.target.value) addBlock(e.target.value as any); e.target.value = '' }} className="px-3 py-2 border rounded">
                      <option value="">Blok ekle...</option>
                      <optgroup label="Temel">
                        <option value="hero">Hero (Kapak)</option>
                        <option value="text">Metin</option>
                        <option value="two-column">İki Sütun</option>
                        <option value="image">Resim</option>
                        <option value="cta">CTA Butonu</option>
                      </optgroup>
                      <optgroup label="İçerik">
                        <option value="features">Özellikler Grid</option>
                        <option value="testimonials">Kullanıcı Yorumları</option>
                        <option value="pricing">Fiyatlandırma</option>
                        <option value="faq">SSS</option>
                        <option value="stats">İstatistikler</option>
                        <option value="gallery">Galeri</option>
                      </optgroup>
                      <optgroup label="Form">
                        <option value="contact-form">İletişim Formu</option>
                      </optgroup>
                    </select>
                  </div>

                  <div className="space-y-2">
                    {blocks.length === 0 && <p className="text-sm text-gray-500">Henüz blok yok — yukarıdan ekleyin.</p>}
                    {blocks.map((b, idx) => (
                      <div key={b.id} className="border rounded p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <strong className="text-lg">{b.type.toUpperCase()}</strong>
                          <div className="flex items-center gap-2">
                            <button onClick={() => moveBlock(idx, -1)} disabled={idx===0} className="px-2 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50">↑</button>
                            <button onClick={() => moveBlock(idx, +1)} disabled={idx===blocks.length-1} className="px-2 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50">↓</button>
                            <button onClick={() => removeBlock(b.id)} className="px-2 py-1 border rounded bg-red-50 text-red-600 hover:bg-red-100">Sil</button>
                          </div>
                        </div>

                        {/* Style Controls */}
                        <details className="mb-3 text-sm">
                          <summary className="cursor-pointer font-semibold text-gray-700">Stil Ayarları</summary>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div>
                              <label className="text-xs text-gray-600">Arkaplan</label>
                              <select value={b.style?.bgColor || 'bg-white'} onChange={e => updateBlockStyle(b.id, { bgColor: e.target.value })} className="w-full px-2 py-1 border rounded text-xs">
                                <option value="bg-white">Beyaz</option>
                                <option value="bg-gray-50">Açık Gri</option>
                                <option value="bg-gray-900">Koyu</option>
                                <option value="bg-blue-600">Mavi</option>
                                <option value="bg-gradient-to-r from-blue-600 to-purple-600">Gradient</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-gray-600">Yazı Rengi</label>
                              <select value={b.style?.textColor || 'text-gray-900'} onChange={e => updateBlockStyle(b.id, { textColor: e.target.value })} className="w-full px-2 py-1 border rounded text-xs">
                                <option value="text-gray-900">Koyu</option>
                                <option value="text-white">Beyaz</option>
                                <option value="text-blue-600">Mavi</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-gray-600">Boşluk</label>
                              <select value={b.style?.padding || 'py-12'} onChange={e => updateBlockStyle(b.id, { padding: e.target.value })} className="w-full px-2 py-1 border rounded text-xs">
                                <option value="py-6">Küçük</option>
                                <option value="py-12">Orta</option>
                                <option value="py-20">Büyük</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-gray-600">Hizalama</label>
                              <select value={b.style?.alignment || 'left'} onChange={e => updateBlockStyle(b.id, { alignment: e.target.value })} className="w-full px-2 py-1 border rounded text-xs">
                                <option value="left">Sol</option>
                                <option value="center">Orta</option>
                                <option value="right">Sağ</option>
                              </select>
                            </div>
                          </div>
                        </details>

                        {/* Block-specific editors (same as create page) */}
                        <div className="space-y-2">
                          {b.type === 'hero' && (
                            <div className="space-y-2">
                              <Input value={b.data.heading || ''} onChange={e => updateBlock(b.id, { heading: e.target.value })} placeholder="Başlık" />
                              <Input value={b.data.sub || ''} onChange={e => updateBlock(b.id, { sub: e.target.value })} placeholder="Alt başlık" />
                              <Input value={b.data.bgImage || ''} onChange={e => updateBlock(b.id, { bgImage: e.target.value })} placeholder="Arkaplan resim URL (opsiyonel)" />
                            </div>
                          )}
                          {b.type === 'text' && (
                            <Textarea className="h-32 font-mono text-sm" value={b.data.html || ''} onChange={e => updateBlock(b.id, { html: e.target.value })} placeholder="HTML veya metin" />
                          )}
                          {b.type === 'two-column' && (
                            <div className="grid md:grid-cols-2 gap-2">
                              <Textarea value={b.data.left || ''} onChange={e => updateBlock(b.id, { left: e.target.value })} placeholder="Sol sütun" />
                              <Textarea value={b.data.right || ''} onChange={e => updateBlock(b.id, { right: e.target.value })} placeholder="Sağ sütun" />
                            </div>
                          )}
                          {b.type === 'image' && (
                            <div className="space-y-2">
                              <Input value={b.data.src || ''} onChange={e => updateBlock(b.id, { src: e.target.value })} placeholder="Resim URL" />
                              <Input value={b.data.alt || ''} onChange={e => updateBlock(b.id, { alt: e.target.value })} placeholder="Alt metin" />
                              <Input value={b.data.caption || ''} onChange={e => updateBlock(b.id, { caption: e.target.value })} placeholder="Açıklama (opsiyonel)" />
                            </div>
                          )}
                          {b.type === 'cta' && (
                            <div className="space-y-2">
                              <Input value={b.data.text || ''} onChange={e => updateBlock(b.id, { text: e.target.value })} placeholder="Buton metni" />
                              <Input value={b.data.href || ''} onChange={e => updateBlock(b.id, { href: e.target.value })} placeholder="Hedef URL" />
                              <select value={b.data.buttonStyle || 'primary'} onChange={e => updateBlock(b.id, { buttonStyle: e.target.value })} className="w-full px-3 py-2 border rounded">
                                <option value="primary">Mavi</option>
                                <option value="secondary">Gri</option>
                              </select>
                            </div>
                          )}
                          {b.type === 'contact-form' && (
                            <Input value={b.data.title || ''} onChange={e => updateBlock(b.id, { title: e.target.value })} placeholder="Form başlığı" />
                          )}
                          {b.type === 'features' && (
                            <div className="space-y-2">
                              <Input value={b.data.title || ''} onChange={e => updateBlock(b.id, { title: e.target.value })} placeholder="Bölüm başlığı" />
                              <div className="text-xs text-gray-600">Özellikler (JSON): <code>[{`{icon:"✓", title:"...", desc:"..."}`}]</code></div>
                              <Textarea className="font-mono text-xs h-24" value={JSON.stringify(b.data.items || [], null, 2)} onChange={e => { try { updateBlock(b.id, { items: JSON.parse(e.target.value) }) } catch {} }} />
                            </div>
                          )}
                          {b.type === 'testimonials' && (
                            <div className="space-y-2">
                              <Input value={b.data.title || ''} onChange={e => updateBlock(b.id, { title: e.target.value })} placeholder="Bölüm başlığı" />
                              <div className="text-xs text-gray-600">Yorumlar (JSON): <code>[{`{name:"...", text:"...", rating:5}`}]</code></div>
                              <Textarea className="font-mono text-xs h-24" value={JSON.stringify(b.data.items || [], null, 2)} onChange={e => { try { updateBlock(b.id, { items: JSON.parse(e.target.value) }) } catch {} }} />
                            </div>
                          )}
                          {b.type === 'pricing' && (
                            <div className="space-y-2">
                              <Input value={b.data.title || ''} onChange={e => updateBlock(b.id, { title: e.target.value })} placeholder="Bölüm başlığı" />
                              <div className="text-xs text-gray-600">Planlar (JSON): <code>[{`{name:"...", price:"...", features:[], highlight:false}`}]</code></div>
                              <Textarea className="font-mono text-xs h-32" value={JSON.stringify(b.data.plans || [], null, 2)} onChange={e => { try { updateBlock(b.id, { plans: JSON.parse(e.target.value) }) } catch {} }} />
                            </div>
                          )}
                          {b.type === 'faq' && (
                            <div className="space-y-2">
                              <Input value={b.data.title || ''} onChange={e => updateBlock(b.id, { title: e.target.value })} placeholder="Bölüm başlığı" />
                              <div className="text-xs text-gray-600">Sorular (JSON): <code>[{`{q:"...", a:"..."}`}]</code></div>
                              <Textarea className="font-mono text-xs h-24" value={JSON.stringify(b.data.items || [], null, 2)} onChange={e => { try { updateBlock(b.id, { items: JSON.parse(e.target.value) }) } catch {} }} />
                            </div>
                          )}
                          {b.type === 'stats' && (
                            <div className="space-y-2">
                              <div className="text-xs text-gray-600">İstatistikler (JSON): <code>[{`{number:"1000+", label:"..."}`}]</code></div>
                              <Textarea className="font-mono text-xs h-20" value={JSON.stringify(b.data.items || [], null, 2)} onChange={e => { try { updateBlock(b.id, { items: JSON.parse(e.target.value) }) } catch {} }} />
                            </div>
                          )}
                          {b.type === 'gallery' && (
                            <div className="space-y-2">
                              <Input value={b.data.title || ''} onChange={e => updateBlock(b.id, { title: e.target.value })} placeholder="Bölüm başlığı" />
                              <div className="text-xs text-gray-600">Resimler (JSON): <code>[{`{src:"...", alt:"..."}`}]</code></div>
                              <Textarea className="font-mono text-xs h-20" value={JSON.stringify(b.data.images || [], null, 2)} onChange={e => { try { updateBlock(b.id, { images: JSON.parse(e.target.value) }) } catch {} }} />
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
                  <Textarea value={content} onChange={e => setContent(e.target.value)} className="h-48 font-mono" />
                </div>
              )}

              <div className="mt-4">
                <Label>Canlı Önizleme</Label>
                <div className="border rounded p-4 bg-white text-black">
                  <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(useBlocks && blocks.length ? generateHtmlFromBlocks(blocks as any) : content) }} />
                </div>
                <p className="text-xs text-yellow-700 mt-2">Not: Önizleme basit bir temizleyici ile script'leri ve inline eventleri filtreler ancak üretim için sunucu tarafı sanitizasyonu önerilir.</p>
              </div>
            </div>

            <div>
              <Label>Durum</Label>
              <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full px-3 py-2 border rounded">
                <option value="draft">Taslak</option>
                <option value="published">Yayında</option>
                <option value="private">Özel</option>
              </select>
            </div>

            <div>
              <Label>Sayfa Tipi</Label>
              <select value={pageType} onChange={e => setPageType(e.target.value)} className="w-full px-3 py-2 border rounded">
                <option value="none">Varsayılan</option>
                <option value="contact">İletişim</option>
                <option value="about">Hakkımızda</option>
                <option value="faq">SSS</option>
                <option value="terms">Kullanım Şartları</option>
                <option value="privacy">Gizlilik Politikası</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input id="in_menu" type="checkbox" checked={inMenu} onChange={e => setInMenu(e.target.checked)} />
              <label htmlFor="in_menu" className="text-sm">Ana menüde göster</label>
            </div>

            <div className="flex items-center gap-3">
              <input id="homepage" type="checkbox" checked={isHomepage} onChange={e => setIsHomepage(e.target.checked)} />
              <label htmlFor="homepage" className="text-sm">Ana sayfa olarak işaretle</label>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</Button>
            <Link href="/admin/pages">
              <Button variant="ghost">İptal</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
