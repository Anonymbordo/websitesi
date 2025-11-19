"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Users,
  BookOpen,
  TrendingUp,
  DollarSign,
  MessageSquare,
  Star,
  ArrowUp,
  ArrowDown,
  Activity,
  Globe,
  UserPlus,
  Award,
  BarChart3,
  GraduationCap,
  Target,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/lib/store"
import { adminAPI } from '@/lib/api'

// --- Quick Actions -----------------------------------------------------------
const quickActions = [
  {
    title: "Yeni Kurs Ekle",
    description: "Platformunuza yeni bir kurs ekleyin",
    href: "/admin/courses/create",
    icon: BookOpen,
    color: "bg-blue-500 hover:bg-blue-600",
  },
  {
    title: "Blog Yazısı Yaz",
    description: "Yeni bir blog yazısı oluşturun",
    href: "/admin/blog/create",
    icon: MessageSquare,
    color: "bg-green-500 hover:bg-green-600",
  },
  {
    title: "Kullanıcı Yönetimi",
    description: "Kullanıcıları görüntüleyin ve yönetin",
    href: "/admin/users",
    icon: Users,
    color: "bg-purple-500 hover:bg-purple-600",
  },
  {
    title: "Site Ayarları",
    description: "Genel site ayarlarını düzenleyin",
    href: "/admin/settings",
    icon: Globe,
    color: "bg-orange-500 hover:bg-orange-600",
  },
]

// --- Types ------------------------------------------------------------------
interface DashboardStats {
  totalUsers: number
  totalCourses: number
  monthlyRevenue: number
  activeStudents: number
  newSignups: number
  completedCourses: number
  averageRating: number
  totalReviews: number
  // Extended fields used in parts of the UI
  totalInstructors: number
  totalRevenue: number
  pendingApprovals: number
}

type ActivityType =
  | "signup"
  | "course_purchase"
  | "course_completion"
  | "review"

interface RecentActivity {
  id: number
  type: ActivityType
  user: string
  description: string
  time: string
  course?: string
}

// --- Helpers ----------------------------------------------------------------
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount)
}

const getActivityIcon = (type: ActivityType) => {
  switch (type) {
    case "signup":
      return Users
    case "course_purchase":
      return DollarSign
    case "course_completion":
      return Award
    case "review":
      return Star
    default:
      return Activity
  }
}

const getActivityColor = (type: ActivityType) => {
  switch (type) {
    case "signup":
      return "text-blue-600 bg-blue-50"
    case "course_purchase":
      return "text-emerald-600 bg-emerald-50"
    case "course_completion":
      return "text-purple-600 bg-purple-50"
    case "review":
      return "text-yellow-600 bg-yellow-50"
    default:
      return "text-gray-600 bg-gray-50"
  }
}

// --- Component --------------------------------------------------------------
export default function AdminDashboard() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalCourses: 0,
    monthlyRevenue: 0,
    activeStudents: 0,
    newSignups: 0,
    completedCourses: 0,
    averageRating: 0,
    totalReviews: 0,
    totalInstructors: 0,
    totalRevenue: 0,
    pendingApprovals: 0,
  })

  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Authentication kontrolü
    if (!isAuthenticated) {
      router.push('/admin/login?next=/admin')
      return
    }

    // Admin kontrolü
    if (user?.role !== 'admin') {
      router.push('/admin/login?next=/admin')
      return
    }

    fetchDashboardData()
  }, [isAuthenticated, user, router])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Try to fetch real stats from the backend. Fields may vary depending
      // on your API shape, so we map common keys and provide safe fallbacks.
      try {
        const res = await adminAPI.getStats()
        const d = res?.data || {}
        const mapped: DashboardStats = {
          totalUsers: Number(d.total_users ?? d.totalUsers ?? 0),
          totalCourses: Number(d.total_courses ?? d.totalCourses ?? 0),
          monthlyRevenue: Number(d.monthly_revenue ?? d.monthlyRevenue ?? 0),
          activeStudents: Number(d.active_students ?? d.activeStudents ?? 0),
          newSignups: Number(d.new_signups ?? d.newSignups ?? 0),
          completedCourses: Number(d.completed_courses ?? d.completedCourses ?? 0),
          averageRating: Number(d.average_rating ?? d.averageRating ?? 0),
          totalReviews: Number(d.total_reviews ?? d.totalReviews ?? 0),
          totalInstructors: Number(d.total_instructors ?? d.totalInstructors ?? 0),
          totalRevenue: Number(d.total_revenue ?? d.totalRevenue ?? 0),
          pendingApprovals: Number(d.pending_approvals ?? d.pendingApprovals ?? 0),
        }
        setStats(mapped)
      } catch (err) {
        console.warn('adminAPI.getStats() failed, falling back to mock stats', err)

        // fallback mock data (previous values)
        const mockStats: DashboardStats = {
          totalUsers: 15742,
          totalCourses: 234,
          monthlyRevenue: 185_420,
          activeStudents: 12_458,
          newSignups: 1_245,
          completedCourses: 8_934,
          averageRating: 4.8,
          totalReviews: 3_456,
          totalInstructors: 178,
          totalRevenue: 3_254_890,
          pendingApprovals: 7,
        }
        setStats(mockStats)
      }

      // Pending applications: try to fetch instructors with is_approved=false
      try {
        const pendingRes = await adminAPI.getInstructors({ is_approved: false })
        const pendingData = pendingRes?.data
        // pendingData may be an array or { count }
        let pendingCount = 0
        if (Array.isArray(pendingData)) pendingCount = pendingData.length
        else if (typeof pendingData === 'number') pendingCount = pendingData
        else if (pendingData && typeof pendingData.total === 'number') pendingCount = pendingData.total
        // Update only the pendingApprovals field to avoid overwriting other stats
        setStats((s) => ({ ...s, pendingApprovals: pendingCount }))
      } catch (err) {
        // keep whatever value we have (stats.pendingApprovals may be from getStats or mock)
        console.warn('adminAPI.getInstructors(is_approved:false) failed', err)
      }

      // Recent activities - backend may not expose this endpoint. Keep mock if not available.
      // If you have an endpoint like /api/admin/activities, replace this with a real call.
      setRecentActivities([
        {
          id: 1,
          type: 'signup',
          user: 'Ahmet Yılmaz',
          description: 'Yeni üye kaydı',
          time: '5 dakika önce',
        },
        {
          id: 2,
          type: 'course_purchase',
          user: 'Zeynep Kaya',
          description: 'React kursu satın aldı',
          course: 'React ile Modern Web Geliştirme',
          time: '15 dakika önce',
        },
        {
          id: 3,
          type: 'course_completion',
          user: 'Mehmet Demir',
          description: 'Kursu tamamladı',
          course: 'Python 101',
          time: '1 saat önce',
        },
        {
          id: 4,
          type: 'review',
          user: 'Elif Şahin',
          description: '5 yıldızlı değerlendirme bıraktı',
          course: 'Makine Öğrenmesine Giriş',
          time: '2 saat önce',
        },
      ])
    } catch (err) {
      console.error("Dashboard verileri yüklenirken hata:", err)
    } finally {
      setLoading(false)
    }
  }

  // Cards config derived from stats
  const statCards = [
    {
      title: "Toplam Kullanıcı",
      value: stats.totalUsers.toLocaleString(),
      change: "+12.5%",
      changeType: "positive" as const,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      title: "Aktif Kurslar",
      value: stats.totalCourses.toString(),
      change: "+8.2%",
      changeType: "positive" as const,
      icon: BookOpen,
      color: "bg-green-500",
    },
    {
      title: "Aylık Gelir",
      value: formatCurrency(stats.monthlyRevenue),
      change: "+23.1%",
      changeType: "positive" as const,
      icon: DollarSign,
      color: "bg-purple-500",
    },
    {
      title: "Aktif Öğrenci",
      value: stats.activeStudents.toLocaleString(),
      change: "+5.4%",
      changeType: "positive" as const,
      icon: TrendingUp,
      color: "bg-orange-500",
    },
    {
      title: "Yeni Kayıtlar",
      value: stats.newSignups.toLocaleString(),
      change: "+18.7%",
      changeType: "positive" as const,
      icon: UserPlus,
      color: "bg-pink-500",
    },
    {
      title: "Tamamlanan Kurs",
      value: stats.completedCourses.toLocaleString(),
      change: "+15.3%",
      changeType: "positive" as const,
      icon: Award,
      color: "bg-indigo-500",
    },
    {
      title: "Ortalama Puan",
      value: stats.averageRating.toFixed(1),
      change: "+0.2",
      changeType: "positive" as const,
      icon: Star,
      color: "bg-yellow-500",
    },
    {
      title: "Toplam Değerlendirme",
      value: stats.totalReviews.toLocaleString(),
      change: "+9.8%",
      changeType: "positive" as const,
      icon: MessageSquare,
      color: "bg-teal-500",
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Hoş geldin, Site Admin!</h1>
            <p className="text-blue-100 text-lg">
              Yönetim paneline hoş geldiniz. Buradan istatistikleri, aktiviteleri ve hızlı
              aksiyonları görebilirsiniz.
            </p>
          </div>
          <div>
            <BarChart3 className="w-16 h-16 opacity-80" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <Card key={i} className={`${stat.color} text-white shadow-lg`}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>{stat.title}</span>
                <stat.icon className="w-5 h-5" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div
                className={`mt-2 flex items-center ${
                  stat.changeType === "positive" ? "text-green-200" : "text-red-200"
                }`}
              >
                {stat.changeType === "positive" ? (
                  <ArrowUp className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowDown className="w-4 h-4 mr-1" />
                )}
                <span>{stat.change}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Stats (optional pretty cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: "Bekleyen Onaylar",
            value: stats.pendingApprovals,
            icon: Activity,
            color: "text-yellow-600",
            bgColor: "bg-yellow-50",
            urgent: stats.pendingApprovals > 5,
          },
          {
            title: "Aktif Öğrenciler",
            value: stats.activeStudents.toLocaleString(),
            icon: Target,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
          },
          {
            title: "Onaylı Eğitmenler",
            value: stats.totalInstructors.toLocaleString(),
            icon: GraduationCap,
            color: "text-purple-600",
            bgColor: "bg-purple-50",
          },
          {
            title: "Toplam Gelir",
            value: formatCurrency(stats.totalRevenue),
            icon: DollarSign,
            color: "text-emerald-600",
            bgColor: "bg-emerald-50",
          },
        ].map((s, idx) => (
          <Card key={idx} className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div
                  className={`w-12 h-12 ${s.bgColor} rounded-xl flex items-center justify-center ${
                    (s as any).urgent ? "animate-pulse" : ""
                  }`}
                >
                  <s.icon className={`w-6 h-6 ${s.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{s.title}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activities */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Son Aktiviteler</h2>
        <div className="space-y-3">
          {recentActivities.map((activity) => {
            const Icon = getActivityIcon(activity.type)
            return (
              <div
                key={activity.id}
                className={`flex items-center p-4 rounded-xl ${getActivityColor(activity.type)}`}
              >
                <div className="mr-4">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{activity.user}</div>
                  <div className="text-sm">
                    {activity.description}
                    {activity.course ? ` - ${activity.course}` : ""}
                  </div>
                </div>
                <div className="text-xs text-gray-500 ml-4">{activity.time}</div>
              </div>
            )
          })}
        </div>
        <Button
          variant="outline"
          className="w-full mt-6 border-gray-200 hover:bg-gray-50 rounded-xl"
          onClick={fetchDashboardData}
        >
          <Activity className="w-4 h-4 mr-2" />
          Yenile
        </Button>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Hızlı Aksiyonlar</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, i) => (
            <Link
              key={i}
              href={action.href}
              className={`block p-6 rounded-xl text-white shadow-lg ${action.color}`}
            >
              <div className="flex items-center space-x-3">
                <action.icon className="w-6 h-6" />
                <span className="font-semibold text-lg">{action.title}</span>
              </div>
              <div className="mt-2 text-sm">{action.description}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
