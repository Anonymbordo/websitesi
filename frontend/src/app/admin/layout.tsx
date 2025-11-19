"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  FileText,
  Settings,
  Image,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Plus,
  BarChart3,
  Globe,
  Shield,
  Database,
  Bell,
  LogOut,
  UserCheck,
  UserPlus,
  GraduationCap,
  Trophy,
  Tag,
  Video,
  Upload,
  Palette
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['content'])

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    )
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      current: pathname === '/admin'
    },
    {
      id: 'content',
      name: 'İçerik Yönetimi',
      icon: FileText,
      children: [
  { name: 'Kurslar', href: '/admin/courses', icon: BookOpen },
  { name: 'Blog - Liste', href: '/admin/blog', icon: MessageSquare },
  { name: 'Blog Oluştur', href: '/admin/blog/create', icon: Plus },
  { name: 'Sayfalar', href: '/admin/pages', icon: Globe },
  { name: 'Kategoriler', href: '/admin/categories', icon: Tag },
      ]
    },
    {
      id: 'users',
      name: 'Kullanıcı Yönetimi',
      icon: Users,
      children: [
        { name: 'Tüm Kullanıcılar', href: '/admin/users', icon: Users },
        { name: 'Eğitmenler', href: '/admin/instructors', icon: GraduationCap },
        { name: 'Başvurular', href: '/admin/applications', icon: UserPlus },
        { name: 'Roller & İzinler', href: '/admin/roles', icon: Shield },
      ]
    },
    {
      id: 'media',
      name: 'Medya',
      icon: Image,
      children: [
        { name: 'Medya Kütüphanesi', href: '/admin/media', icon: Image },
        { name: 'Video Yönetimi', href: '/admin/videos', icon: Video },
        { name: 'Dosya Yükleme', href: '/admin/uploads', icon: Upload },
      ]
    },
    {
      id: 'analytics',
      name: 'Analitik & Raporlar',
      icon: BarChart3,
      children: [
        { name: 'Genel İstatistikler', href: '/admin/analytics', icon: BarChart3 },
        { name: 'Kurs Performansı', href: '/admin/analytics/courses', icon: Trophy },
        { name: 'Kullanıcı Analizi', href: '/admin/analytics/users', icon: UserCheck },
      ]
    },
    {
      id: 'system',
      name: 'Sistem',
      icon: Settings,
      children: [
        { name: 'Genel Ayarlar', href: '/admin/settings', icon: Settings },
        { name: 'Tema & Tasarım', href: '/admin/settings/theme', icon: Palette },
        { name: 'Veritabanı', href: '/admin/settings/database', icon: Database },
        { name: 'Bildirimler', href: '/admin/settings/notifications', icon: Bell },
      ]
    }
  ]

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin'
    }
    return pathname.startsWith(href)
  }

  // Redirect to admin login if user is not authenticated or not admin
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    try {
      if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
        if (!isAuthenticated || (user && user.role !== 'admin')) {
          router.push('/admin/login')
        }
      }
    } catch (e) {
      // swallow errors during first render
    }
  }, [pathname, isAuthenticated, user, router])

  // Determine whether visitor is authorized for admin UI
  const isAdminArea = pathname.startsWith('/admin')
  const isAuthorized = isAuthenticated && user && user.role === 'admin'

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div className="ml-3">
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-500">Site Yönetimi</p>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          if (!item.children) {
            return (
              <Link
                key={item.name}
                href={item.href!}
                className={cn(
                  'flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors',
                  isActive(item.href!)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            )
          }

          const isExpanded = expandedMenus.includes(item.id!)
          const hasActiveChild = item.children.some(child => isActive(child.href))

          return (
            <div key={item.id}>
              <button
                onClick={() => toggleMenu(item.id!)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-3 text-sm font-medium rounded-lg transition-colors',
                  hasActiveChild
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                <div className="flex items-center">
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              
              {isExpanded && (
                <div className="ml-6 mt-2 space-y-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.name}
                      href={child.href}
                      className={cn(
                        'flex items-center px-3 py-2 text-sm rounded-lg transition-colors',
                        isActive(child.href)
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      )}
                    >
                      <child.icon className="w-4 h-4 mr-3" />
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white font-medium">SA</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">Site Admin</p>
            <p className="text-xs text-gray-500">admin@site.com</p>
          </div>
        </div>
        <button className="w-full flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
          <LogOut className="w-4 h-4 mr-3" />
          Çıkış Yap
        </button>
      </div>
    </div>
  )

  // If this is the admin area but user is NOT authorized, render a minimal
  // container (no sidebar/topbar) so anonymous visitors only see the login page.
  if (isAdminArea && !isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <main className="w-full max-w-2xl">{children}</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="lg:pl-80">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h2 className="ml-4 lg:ml-0 text-2xl font-bold text-gray-900">
                {pathname === '/admin'
                  ? 'Dashboard'
                  : (() => {
                      const lastSegment = pathname.split('/').pop()
                      return lastSegment ? lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1) : 'Admin'
                    })()}
              </h2>
            </div>

            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                <Bell className="w-6 h-6" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <Link
                href="/"
                target="_blank"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Siteyi Görüntüle
              </Link>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}