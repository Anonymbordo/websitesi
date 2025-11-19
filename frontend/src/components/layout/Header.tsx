'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Search, User, ShoppingCart, Bell, BookOpen, Users, Award, Settings, LogOut, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/store'
import { useHydration } from '@/hooks/useHydration'
import { pagesAPI } from '@/lib/api'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const pathname = usePathname()
  const { user, isAuthenticated, logout } = useAuthStore()
  const hydrated = useHydration()

  const navigation = [
    { name: 'Ana Sayfa', href: '/' },
    { name: 'Kurslar', href: '/courses' },
    { name: 'Eğitmenler', href: '/instructors' },
    { name: 'Hakkımızda', href: '/about' },
    { name: 'İletişim', href: '/contact' },
  ]

  const [extraPages, setExtraPages] = useState<{ title: string, slug: string }[]>([])
  const [headerError, setHeaderError] = useState<string | null>(null)

  useEffect(() => {
    if (!hydrated) return
    
    // API'den header menüsündeki sayfaları çek
    const fetchHeaderPages = async () => {
      try {
        setHeaderError(null)
        const response = await pagesAPI.getHeaderMenuPages()
        // Validate response shape before mapping to avoid runtime exceptions
        const data = response?.data
        if (!Array.isArray(data)) {
          console.warn('Header menü sayfaları beklenen formatta gelmedi:', data)
          setExtraPages([])
          setHeaderError('Menü sayfaları yüklenemedi (beklenmeyen yanıt formatı).')
          return
        }
        // Map safe fields
        const menuPages = data.map((p: any) => ({ 
          title: p?.title ?? p?.name ?? 'Sayfa', 
          slug: (p?.slug ?? p?.path ?? '').toString().replace(/^\//, '')
        }))
        setExtraPages(menuPages)
      } catch (error) {
        // Use warn (not error) to avoid Next dev overlay capturing this as a crash.
        console.warn('Header menü sayfaları yüklenemedi (network/timeout):', error)
        setExtraPages([])
        setHeaderError('Menü sayfaları yüklenemedi. Sunucuya bağlanılamıyor.')
      }
    }
    
    fetchHeaderPages()
  }, [hydrated])

  // Merge navigation: prefer local pages when slugs match default nav hrefs
  const mergedNavigation = (() => {
    if (!extraPages) return navigation

    // Build a quick lookup of local pages by normalized slug
    const slugMap: Record<string, { title: string; slug: string }> = {}
    extraPages.forEach(p => {
      const s = (p.slug || '').toString().replace(/^\//, '')
      slugMap[s] = { title: p.title, slug: s }
    })

    // Map default navigation: if a matching local page exists for the href, link directly to /<slug>
    const mapped = navigation.map((navItem) => {
      const rawHref = (navItem.href || '').toString()
      if (!rawHref || rawHref === '/') {
        // homepage: check if any local page is marked as homepage
        const homePage = extraPages.find((p: any) => p.isHomepage)
        if (homePage) return { ...navItem, href: `/${homePage.slug}` }
        return navItem
      }
      const base = rawHref.replace(/^\//, '')
      if (slugMap[base]) {
        // prefer local page; use root path (e.g. /contact) instead of /p/contact
        return { ...navItem, name: slugMap[base].title || navItem.name, href: `/${slugMap[base].slug}` }
      }
      return navItem
    })

    // Add any extraPages that weren't matched to default navigation
    const matchedSlugs = new Set(mapped.map(m => (m.href || '').toString().replace(/^\//, '')))
    const remaining = extraPages
      .map(p => ({ name: p.title, href: `/${p.slug}` }))
      .filter(p => !matchedSlugs.has(p.href.replace(/^\//, '')))

    // Insert remaining before Hakkımızda if present, otherwise append
    const idx = mapped.findIndex(n => n.name === 'Hakkımızda')
    if (remaining.length === 0) return mapped
    if (idx === -1) return [...mapped, ...remaining]
    return [...mapped.slice(0, idx), ...remaining, ...mapped.slice(idx)]
  })()

  const userMenuItems = [
    { name: 'Profilim', href: '/student/profile', icon: User },
    { name: 'Kurslarım', href: '/student/courses', icon: BookOpen },
    { name: 'Akıllı Hoca', href: '/student/ai', icon: Sparkles },
    { name: 'Öğrenci Paneli', href: '/student', icon: BookOpen },
    { name: 'Ayarlar', href: '/student/settings', icon: Settings },
  ]

  if (user?.role === 'instructor') {
    userMenuItems.splice(3, 0, { name: 'Eğitmen Paneli', href: '/instructor/dashboard', icon: Award })
  }

  if (user?.role === 'admin') {
    userMenuItems.splice(3, 0, { name: 'Admin Paneli', href: '/admin/dashboard', icon: Users })
  }

  const handleLogout = () => {
    logout()
    setIsUserMenuOpen(false)
  }

  // Hydration hatası için client-side render kontrolü  
  if (!hydrated) {
    return (
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl"></div>
            </div>
            <div className="w-32 h-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-white/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300 group-hover:scale-110">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-pulse"></div>
              </div>
              <div className="hidden sm:block">
                      <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
                        Online Sınavlar
                      </span>
                      <div className="text-xs text-gray-500 font-medium">Sınav hazırlık ve deneme sınavları</div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex space-x-1">
            {mergedNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`relative px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 group ${
                  pathname === item.href
                    ? 'text-blue-600 bg-blue-50 shadow-md'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                {item.name}
                {pathname === item.href && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></div>
                )}
              </Link>
            ))}
          </nav>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors duration-300" />
              <Input
                type="text"
                placeholder="Kurs, eğitmen veya kategori ara..."
                className="pl-12 pr-6 py-3 bg-gray-50 border-0 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 text-sm"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <kbd className="px-2 py-1 text-xs text-gray-500 bg-white rounded border">⌘K</kbd>
              </div>
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-3 text-sm text-gray-700 hover:text-gray-900 group"
                >
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                      <span className="text-white font-medium text-lg">
                        {user?.full_name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="font-medium text-gray-900">{user?.full_name}</div>
                    <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
                  </div>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl ring-1 ring-black/5 z-50 border border-white/20">
                    <div className="p-3">
                      {/* User Info */}
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                          <span className="text-white font-medium text-lg">
                            {user?.full_name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user?.full_name}</div>
                          <div className="text-sm text-gray-500">{user?.email}</div>
                          <div className="text-xs text-blue-600 capitalize font-medium">{user?.role}</div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      {userMenuItems.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-all duration-200 group"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <item.icon className="w-5 h-5 mr-3 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
                          <span className="group-hover:text-gray-900">{item.name}</span>
                        </Link>
                      ))}
                      
                      <div className="border-t border-gray-100 my-2"></div>
                      
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group"
                      >
                        <LogOut className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform duration-200" />
                        Çıkış Yap
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/auth/login">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl px-6 py-2 transition-all duration-300"
                  >
                    Giriş Yap
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button 
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105"
                  >
                    Kayıt Ol
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-all duration-300"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-white/20 shadow-2xl">
          <div className="px-4 pt-4 pb-6 space-y-3">
            {/* Mobile Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Ara..."
                  className="pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Mobile Navigation Links */}
            {mergedNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`block px-4 py-3 text-base font-medium rounded-2xl transition-all duration-300 ${
                  pathname === item.href
                    ? 'text-blue-600 bg-blue-50 shadow-md'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}

            {/* Mobile Auth Buttons */}
            {!isAuthenticated && (
              <div className="pt-6 space-y-3 border-t border-gray-100">
                <Link href="/auth/login" className="block">
                  <Button 
                    variant="outline" 
                    className="w-full py-3 rounded-2xl border-gray-200 hover:bg-gray-50" 
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Giriş Yap
                  </Button>
                </Link>
                <Link href="/auth/register" className="block">
                  <Button 
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg" 
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Kayıt Ol
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile User Menu */}
            {isAuthenticated && (
              <div className="pt-6 border-t border-gray-100">
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-2xl mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-medium text-lg">
                      {user?.full_name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{user?.full_name}</div>
                    <div className="text-sm text-gray-500 capitalize">{user?.role}</div>
                  </div>
                </div>

                {userMenuItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-all duration-200 group mb-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <item.icon className="w-5 h-5 mr-3 text-gray-400 group-hover:text-blue-500" />
                    {item.name}
                  </Link>
                ))}
                
                <button
                  onClick={() => {
                    handleLogout()
                    setIsMenuOpen(false)
                  }}
                  className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group mt-4"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Çıkış Yap
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}