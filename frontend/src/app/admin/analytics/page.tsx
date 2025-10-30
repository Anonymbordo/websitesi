'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  BookOpen, 
  DollarSign,
  Eye,
  Clock,
  Calendar,
  Download,
  Play,
  Star,
  Target,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Filter,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface AnalyticsData {
  overview: {
    totalUsers: number
    activeUsers: number
    totalCourses: number
    totalRevenue: number
    growth: {
      users: number
      revenue: number
      courses: number
      engagement: number
    }
  }
  traffic: {
    pageViews: number
    uniqueVisitors: number
    bounceRate: number
    avgSessionDuration: number
    topPages: Array<{ page: string; views: number; uniqueViews: number }>
  }
  courses: {
    topCourses: Array<{ 
      id: number
      title: string
      students: number
      rating: number
      revenue: number
      completion: number
    }>
    enrollmentTrend: Array<{ date: string; enrollments: number }>
  }
  users: {
    demographics: {
      ageGroups: Array<{ range: string; count: number }>
      locations: Array<{ country: string; count: number }>
      devices: Array<{ type: string; count: number }>
    }
    activity: {
      dailyActive: number
      weeklyActive: number
      monthlyActive: number
    }
  }
  revenue: {
    totalRevenue: number
    monthlyRevenue: Array<{ month: string; revenue: number }>
    topPayingUsers: Array<{ name: string; totalSpent: number; courses: number }>
  }
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchAnalyticsData()
  }, [timeRange])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      
      // Mock analytics data
      const mockData: AnalyticsData = {
        overview: {
          totalUsers: 2547,
          activeUsers: 1823,
          totalCourses: 47,
          totalRevenue: 125000,
          growth: {
            users: 15.2,
            revenue: 23.5,
            courses: 8.7,
            engagement: 12.4
          }
        },
        traffic: {
          pageViews: 45690,
          uniqueVisitors: 18534,
          bounceRate: 32.5,
          avgSessionDuration: 485, // seconds
          topPages: [
            { page: '/', views: 8534, uniqueViews: 6234 },
            { page: '/courses', views: 6789, uniqueViews: 4567 },
            { page: '/courses/web-development', views: 4532, uniqueViews: 3421 },
            { page: '/instructors', views: 3456, uniqueViews: 2890 },
            { page: '/about', views: 2345, uniqueViews: 1987 }
          ]
        },
        courses: {
          topCourses: [
            { id: 1, title: 'Full Stack Web Development', students: 456, rating: 4.8, revenue: 34500, completion: 78 },
            { id: 2, title: 'React ile Modern Web Uygulamaları', students: 389, rating: 4.7, revenue: 28900, completion: 82 },
            { id: 3, title: 'Node.js Backend Development', students: 312, rating: 4.6, revenue: 23400, completion: 71 },
            { id: 4, title: 'Python Data Science', students: 278, rating: 4.9, revenue: 22300, completion: 68 },
            { id: 5, title: 'Mobile App Development', students: 234, rating: 4.5, revenue: 18700, completion: 75 }
          ],
          enrollmentTrend: [
            { date: '2024-10-01', enrollments: 45 },
            { date: '2024-10-05', enrollments: 62 },
            { date: '2024-10-10', enrollments: 78 },
            { date: '2024-10-15', enrollments: 89 },
            { date: '2024-10-20', enrollments: 94 },
            { date: '2024-10-25', enrollments: 103 },
            { date: '2024-10-30', enrollments: 112 }
          ]
        },
        users: {
          demographics: {
            ageGroups: [
              { range: '18-24', count: 456 },
              { range: '25-34', count: 892 },
              { range: '35-44', count: 634 },
              { range: '45-54', count: 378 },
              { range: '55+', count: 187 }
            ],
            locations: [
              { country: 'Türkiye', count: 1534 },
              { country: 'Almanya', count: 234 },
              { country: 'ABD', count: 189 },
              { country: 'İngiltere', count: 156 },
              { country: 'Fransa', count: 98 }
            ],
            devices: [
              { type: 'Desktop', count: 1456 },
              { type: 'Mobile', count: 834 },
              { type: 'Tablet', count: 257 }
            ]
          },
          activity: {
            dailyActive: 1823,
            weeklyActive: 2134,
            monthlyActive: 2547
          }
        },
        revenue: {
          totalRevenue: 125000,
          monthlyRevenue: [
            { month: 'Ocak', revenue: 8500 },
            { month: 'Şubat', revenue: 9200 },
            { month: 'Mart', revenue: 11800 },
            { month: 'Nisan', revenue: 10600 },
            { month: 'Mayıs', revenue: 12400 },
            { month: 'Haziran', revenue: 13900 },
            { month: 'Temmuz', revenue: 15200 },
            { month: 'Ağustos', revenue: 14700 },
            { month: 'Eylül', revenue: 16300 },
            { month: 'Ekim', revenue: 18500 }
          ],
          topPayingUsers: [
            { name: 'Ahmet Yılmaz', totalSpent: 2400, courses: 12 },
            { name: 'Fatma Kaya', totalSpent: 1980, courses: 9 },
            { name: 'Mehmet Özkan', totalSpent: 1750, courses: 8 },
            { name: 'Ayşe Demir', totalSpent: 1620, courses: 7 },
            { name: 'Can Arslan', totalSpent: 1440, courses: 6 }
          ]
        }
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      setData(mockData)
    } catch (error) {
      console.error('Analitik verileri yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAnalyticsData()
    setRefreshing(false)
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'desktop': return Monitor
      case 'mobile': return Smartphone
      case 'tablet': return Tablet
      default: return Monitor
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analitik Dashboard</h1>
          <p className="text-gray-600 mt-2">Platform performansını izleyin ve analiz edin</p>
        </div>
        
        <div className="flex space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Son 7 Gün</option>
            <option value="30d">Son 30 Gün</option>
            <option value="90d">Son 90 Gün</option>
            <option value="12m">Son 12 Ay</option>
          </select>
          
          <Button 
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
          
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Rapor İndir
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Kullanıcı</p>
                <p className="text-2xl font-bold text-gray-900">{data.overview.totalUsers.toLocaleString()}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+{data.overview.growth.users}%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktif Kullanıcı</p>
                <p className="text-2xl font-bold text-gray-900">{data.overview.activeUsers.toLocaleString()}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+{data.overview.growth.engagement}%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Kurs</p>
                <p className="text-2xl font-bold text-gray-900">{data.overview.totalCourses}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+{data.overview.growth.courses}%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Gelir</p>
                <p className="text-2xl font-bold text-gray-900">₺{data.overview.totalRevenue.toLocaleString()}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+{data.overview.growth.revenue}%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Traffic Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              Trafik İstatistikleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{data.traffic.pageViews.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Sayfa Görüntüleme</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{data.traffic.uniqueVisitors.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Benzersiz Ziyaretçi</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{data.traffic.bounceRate}%</p>
                <p className="text-sm text-gray-600">Çıkma Oranı</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{formatDuration(data.traffic.avgSessionDuration)}</p>
                <p className="text-sm text-gray-600">Ort. Oturum Süresi</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">En Popüler Sayfalar</h4>
              <div className="space-y-2">
                {data.traffic.topPages.map((page, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">{page.page}</span>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600">{page.views.toLocaleString()} görüntüleme</span>
                      <span className="text-sm text-gray-500">{page.uniqueViews.toLocaleString()} benzersiz</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              Kullanıcı Demografisi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Age Groups */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Yaş Grupları</h4>
                <div className="space-y-2">
                  {data.users.demographics.ageGroups.map((group, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{group.range}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-blue-500 rounded-full"
                            style={{ width: `${(group.count / Math.max(...data.users.demographics.ageGroups.map(g => g.count))) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-12 text-right">{group.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Countries */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Ülkeler</h4>
                <div className="space-y-2">
                  {data.users.demographics.locations.slice(0, 5).map((location, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{location.country}</span>
                      <span className="text-sm font-medium text-gray-900">{location.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Devices */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Cihazlar</h4>
                <div className="space-y-2">
                  {data.users.demographics.devices.map((device, index) => {
                    const DeviceIcon = getDeviceIcon(device.type)
                    return (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <DeviceIcon className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{device.type}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{device.count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Courses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Star className="w-5 h-5 mr-2" />
            En Popüler Kurslar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.courses.topCourses.map((course, index) => (
              <div key={course.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-lg font-bold text-blue-600">#{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{course.title}</h3>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-gray-600">{course.students} öğrenci</span>
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 mr-1" />
                        <span className="text-sm text-gray-600">{course.rating}</span>
                      </div>
                      <span className="text-sm text-gray-600">%{course.completion} tamamlama</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">₺{course.revenue.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Gelir</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue and Top Paying Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Aylık Gelir Trendi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.revenue.monthlyRevenue.slice(-6).map((month, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{month.month}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-green-500 rounded-full"
                        style={{ width: `${(month.revenue / Math.max(...data.revenue.monthlyRevenue.map(m => m.revenue))) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-16 text-right">₺{month.revenue.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              En Çok Harcama Yapan Kullanıcılar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.revenue.topPayingUsers.map((user, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">{user.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.courses} kurs</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">₺{user.totalSpent.toLocaleString()}</p>
                    <Badge className="bg-green-100 text-green-800">
                      Top {index + 1}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}