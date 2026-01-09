'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  Award,
  TrendingUp,
  Clock,
  Target,
  Calendar,
  CheckCircle2,
  PlayCircle,
  BarChart3,
  Loader2,
  Star,
  ArrowRight,
  Brain,
  Trophy,
  Sparkles,
  MessageSquare
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/store'
import { coursesAPI } from '@/lib/api'
import Link from 'next/link'
import { useHydration } from '@/hooks/useHydration'

interface EnrolledCourse {
  id: number
  title: string
  progress: number
  thumbnail?: string
  instructor: string
  nextLesson?: string
  totalLessons: number
  completedLessons: number
}

export default function StudentDashboard() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const isHydrated = useHydration()
  const [loading, setLoading] = useState(true)
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    totalHours: 0,
    // ...sertifika kaldırıldı...
  })
  const [weeklyStats, setWeeklyStats] = useState({
    learningHours: 0,
    targetHours: 15,
    completedLessons: 0,
    totalLessons: 0,
    goalProgress: 0
  })

  // Learning tips rotation with associated gradient themes
  const tipsData = [
    { text: 'Her gün düzenli olarak 30 dakika çalışmak, uzun süreli bellekte bilgi kalıcılığını artırır!', from: 'from-yellow-400', to: 'to-orange-400' },
    { text: 'Pomodoro tekniğiyle 25 dakika odaklanıp 5 dakika mola vermek verimliliği yükseltir.', from: 'from-indigo-500', to: 'to-purple-500' },
    { text: 'Öğrendiklerinizi başkalarına anlatmak bilgi kalıcılığını güçlendirir.', from: 'from-green-400', to: 'to-teal-500' },
    { text: 'Kısa, hedefli tekrarlar (spaced repetition) unutmayı azaltır.', from: 'from-blue-500', to: 'to-cyan-500' },
    { text: 'Not alırken el yazısıyla kısa özetler çıkarmak öğrenmeyi derinleştirir.', from: 'from-pink-500', to: 'to-rose-500' }
  ]
  const tips = tipsData.map(t => t.text)
  const [tipIndex, setTipIndex] = useState(0)
  const [tipVisible, setTipVisible] = useState(true)

  useEffect(() => {
    // Use recursive setTimeout + refs to be more robust in StrictMode and avoid overlapping timers
    let fadeTimer: ReturnType<typeof setTimeout> | null = null
    let nextTimer: ReturnType<typeof setTimeout> | null = null

    const scheduleNext = () => {
      nextTimer = setTimeout(() => {
        // start fade out
        setTipVisible(false)
        fadeTimer = setTimeout(() => {
          setTipIndex(i => (i + 1) % tips.length)
          setTipVisible(true)
          // schedule the next rotation
          scheduleNext()
        }, 350)
      }, 8000)
    }

    scheduleNext()

    return () => {
      if (fadeTimer) clearTimeout(fadeTimer)
      if (nextTimer) clearTimeout(nextTimer)
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    if (!isAuthenticated) {
      router.push('/auth/login?next=/student')
      return
    }

    fetchDashboardData()
  }, [isAuthenticated, isHydrated, router])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setErrorMessage(null)
      const response = await coursesAPI.getMyCourses()
      const rawCourses = response.data || []
      
      // Map backend response to frontend interface
      const courses = rawCourses.map((c: any) => ({
        id: c.id,
        title: c.title,
        progress: c.enrollment?.progress_percentage || 0,
        thumbnail: c.thumbnail,
        instructor: c.instructor?.name || 'Eğitmen',
        totalLessons: 10, // Mock value as backend doesn't send it yet
        completedLessons: Math.floor(((c.enrollment?.progress_percentage || 0) / 100) * 10), // Mock based on progress
        duration_hours: c.duration_hours || 0,
        nextLesson: 'Sıradaki Ders' // Mock
      }))
      
      setEnrolledCourses(courses)
      
      // Calculate stats
      const total = courses.length
      const completed = courses.filter((c: any) => c.progress === 100).length
      const hours = courses.reduce((acc: number, c: any) => acc + (c.duration_hours || 0), 0)
      
      setStats({
        totalCourses: total,
        completedCourses: completed,
        totalHours: hours,
        // ...sertifika kaldırıldı...
      })

      // Calculate weekly stats (simulated - gerçek API'den gelecek)
      const inProgressCourses = courses.filter((c: any) => c.progress > 0 && c.progress < 100)
      const totalInProgressLessons = inProgressCourses.reduce((acc: number, c: any) => acc + (c.totalLessons || 0), 0)
      const completedInProgressLessons = inProgressCourses.reduce((acc: number, c: any) => acc + (c.completedLessons || 0), 0)
      
      // Simüle haftalık öğrenme saati (gerçek tracking eklenecek)
      const weeklyHours = Math.min(Math.floor(hours * 0.3), 15) // Son haftada toplam saatlerin ~%30'u
      const goalProgress = total > 0 ? Math.min(Math.floor((completed / total) * 100), 100) : 0

      setWeeklyStats({
        learningHours: weeklyHours,
        targetHours: 15,
        completedLessons: completedInProgressLessons,
        totalLessons: Math.max(totalInProgressLessons, 1), // 0 division önleme
        goalProgress: goalProgress
      })
    } catch (error: any) {
      // Use console.warn instead of console.error to avoid triggering Next dev overlay
      console.warn('Dashboard data fetch error:', error)
      
      // Handle specific error codes for better UX
      const status = error?.response?.status
      if (status === 422) {
        setErrorMessage('Kurslarınız yüklenirken bir sorun oluştu. Henüz kayıtlı bir kurs bulunmuyor olabilir.')
      } else if (status === 401 || status === 403) {
        setErrorMessage('Bu sayfaya erişim yetkiniz yok. Lütfen giriş yapın.')
      } else {
        setErrorMessage('Sunucuya bağlanırken hata oluştu. Lütfen daha sonra tekrar deneyin.')
      }
      
      // Set empty state safely
      setEnrolledCourses([])
      setStats({
        totalCourses: 0,
        completedCourses: 0,
        totalHours: 0,
        // ...sertifika kaldırıldı...
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading || !isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                Hoş Geldin, {user?.full_name || 'Öğrenci'}! 👋
              </h1>
              <p className="text-gray-600 mt-2">Öğrenme yolculuğuna devam et</p>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <Link href="/courses">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Kursları Keşfet
                </Button>
              </Link>
              <Link href="/student/messages">
                <Button variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Mesajlar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium mb-1">Toplam Kurslar</p>
                  <p className="text-4xl font-bold">{stats.totalCourses}</p>
                </div>
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <BookOpen className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium mb-1">Tamamlanan</p>
                  <p className="text-4xl font-bold">{stats.completedCourses}</p>
                </div>
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium mb-1">Toplam Saat</p>
                  <p className="text-4xl font-bold">{stats.totalHours}</p>
                </div>
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Clock className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  {/* Sertifika bölümü kaldırıldı */}
                </div>
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Award className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Chatbot Teaser */}
        <Link href="/student/ai">
          <Card className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 text-white border-0 shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-1">Akıllı Hoca</h3>
                    <p className="text-purple-100">Yapay zeka destekli öğrenme asistanı ile sorularını sor</p>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm">
                  <MessageSquare className="w-5 h-5" />
                  <span className="font-semibold">Sohbet Başlat</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Continue Learning */}
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-2xl">
                  <PlayCircle className="w-6 h-6 mr-3 text-blue-600" />
                  Öğrenmeye Devam Et
                </CardTitle>
              </CardHeader>
              <CardContent>
                {errorMessage && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                    <p className="text-yellow-800 text-sm font-medium">{errorMessage}</p>
                    <p className="text-yellow-600 text-xs mt-1">Backend servisinin çalıştığından emin olun.</p>
                  </div>
                )}
                {enrolledCourses.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">Henüz kayıtlı olduğunuz bir kurs yok</p>
                    <Link href="/courses">
                      <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                        Kursları Keşfet
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {enrolledCourses.slice(0, 3).map((course) => (
                      <div
                        key={course.id}
                        className="p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all duration-300 group"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1 group-hover:text-blue-600 transition-colors">
                              {course.title}
                            </h3>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium">{course.instructor}</span>
                            </p>
                          </div>
                          <Link href={`/courses/${course.id}`}>
                            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                              Devam Et
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </Link>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">İlerleme</span>
                            <span className="font-semibold text-blue-600">
                              {course.completedLessons}/{course.totalLessons} Ders
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full transition-all duration-500"
                              style={{ width: `${course.progress}%` }}
                            ></div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>%{course.progress} tamamlandı</span>
                            {course.nextLesson && (
                              <span className="font-medium">Sıradaki: {course.nextLesson}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-2xl">
                  <Trophy className="w-6 h-6 mr-3 text-yellow-500" />
                  Başarılar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { icon: BookOpen, label: 'İlk Kurs', unlocked: stats.totalCourses > 0, color: 'blue' },
                    { icon: CheckCircle2, label: 'İlk Tamamlama', unlocked: stats.completedCourses > 0, color: 'green' },
                    // ...sertifika kaldırıldı...
                    { icon: Target, label: '5 Kurs', unlocked: stats.totalCourses >= 5, color: 'orange' },
                    { icon: Brain, label: '10 Saat', unlocked: stats.totalHours >= 10, color: 'pink' },
                    { icon: Star, label: 'Süper Öğrenci', unlocked: stats.completedCourses >= 5, color: 'yellow' },
                  ].map((achievement, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border-2 text-center transition-all duration-300 ${
                        achievement.unlocked
                          ? `border-${achievement.color}-300 bg-${achievement.color}-50 shadow-md`
                          : 'border-gray-200 bg-gray-50 opacity-50'
                      }`}
                    >
                      <achievement.icon
                        className={`w-8 h-8 mx-auto mb-2 ${
                          achievement.unlocked ? `text-${achievement.color}-600` : 'text-gray-400'
                        }`}
                      />
                      <p className={`text-sm font-medium ${achievement.unlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                        {achievement.label}
                      </p>
                      {achievement.unlocked && (
                        <CheckCircle2 className="w-4 h-4 mx-auto mt-1 text-green-600" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Learning Stats */}
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                  Bu Hafta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Öğrenme Süresi</span>
                      <span className="text-sm font-semibold">{weeklyStats.learningHours}/{weeklyStats.targetHours} saat</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${Math.min((weeklyStats.learningHours / weeklyStats.targetHours) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Tamamlanan Dersler</span>
                      <span className="text-sm font-semibold">{weeklyStats.completedLessons}/{weeklyStats.totalLessons}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${Math.min((weeklyStats.completedLessons / weeklyStats.totalLessons) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Hedef İlerleme</span>
                      <span className="text-sm font-semibold">%{weeklyStats.goalProgress}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full" 
                        style={{ width: `${weeklyStats.goalProgress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              <CardHeader>
                <CardTitle>Hızlı Erişim</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/student/courses">
                  <Button variant="secondary" className="w-full justify-start">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Tüm Kurslarım
                  </Button>
                </Link>
                <Link href="/courses">
                  <Button variant="secondary" className="w-full justify-start">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Yeni Kurslar
                  </Button>
                </Link>
                <Link href="/student/settings">
                  <Button variant="secondary" className="w-full justify-start">
                    <Award className="w-4 h-4 mr-2" />
                    {/* Sertifikalarım bölümü kaldırıldı */}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="shadow-xl border-0 text-white relative overflow-hidden">
              <CardContent className="p-6 relative z-10">
                {/* dynamic gradient background layer */}
                <div
                  aria-hidden
                  className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-700 ${tipsData[tipIndex].from} ${tipsData[tipIndex].to} ${tipVisible ? 'opacity-100' : 'opacity-0'}`}
                />
                <div className="relative z-20">
                  <Brain className="w-10 h-10 mb-3" />
                  <h3 className="font-bold text-lg mb-2">💡 Öğrenme İpucu</h3>
                  <p className={`text-sm text-white/90 transition-opacity duration-300 ${tipVisible ? 'opacity-100' : 'opacity-0'}`}>
                    {tips[tipIndex]}
                  </p>
                  <div className="flex gap-2 mt-4">
                    {tips.map((_, i) => (
                      <span
                        key={i}
                        aria-hidden
                        className={`w-2 h-2 rounded-full transition-all duration-200 inline-block ${i === tipIndex ? 'bg-white' : 'bg-white/40'}`}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
