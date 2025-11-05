'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Settings,
  User,
  Bell,
  Lock,
  Mail,
  Shield,
  Eye,
  EyeOff,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Download
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/lib/store'
import { authAPI } from '@/lib/api'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuthStore()
  const [activeTab, setActiveTab] = useState('general')
  const [loading, setLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    courseUpdates: true,
    promotions: false,
    weeklyDigest: true
  })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?next=/student/settings')
      return
    }
  }, [isAuthenticated, router])

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Yeni şifreler eşleşmiyor')
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır')
      return
    }

    setLoading(true)
    try {
      // API call would go here
      toast.success('Şifre başarıyla değiştirildi!')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Şifre değiştirilemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
    toast.success('Bildirim ayarları güncellendi')
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm verileriniz silinecektir.'
    )
    
    if (!confirmed) return

    const doubleConfirm = window.prompt('Onaylamak için "SIL" yazın:')
    if (doubleConfirm !== 'SIL') {
      toast.error('İşlem iptal edildi')
      return
    }

    try {
      // API call would go here
      toast.success('Hesabınız silindi')
      logout()
      router.push('/')
    } catch (error) {
      toast.error('Hesap silinemedi')
    }
  }

  const tabs = [
    { id: 'general', label: 'Genel', icon: Settings },
    { id: 'security', label: 'Güvenlik', icon: Shield },
    { id: 'notifications', label: 'Bildirimler', icon: Bell },
    { id: 'privacy', label: 'Gizlilik', icon: Lock },
  ]

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-2">
            Ayarlar
          </h1>
          <p className="text-gray-600">Hesap ayarlarınızı ve tercihlerinizi yönetin</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm sticky top-8">
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <tab.icon className="w-5 h-5" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* General Settings */}
            {activeTab === 'general' && (
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-2xl">
                    <Settings className="w-6 h-6 mr-3 text-blue-600" />
                    Genel Ayarlar
                  </CardTitle>
                  <CardDescription>Temel hesap bilgilerinizi görüntüleyin</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="flex items-start space-x-3">
                        <User className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700 mb-1">Ad Soyad</p>
                          <p className="text-gray-900 font-semibold">{user.full_name}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="flex items-start space-x-3">
                        <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700 mb-1">E-posta</p>
                          <p className="text-gray-900 font-semibold">{user.email}</p>
                          <div className="flex items-center mt-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mr-1" />
                            <span className="text-xs text-green-600 font-medium">Doğrulanmış</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-900">Dil</p>
                        <p className="text-sm text-gray-500">Türkçe</p>
                      </div>
                      <Button variant="outline" size="sm">Değiştir</Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-900">Saat Dilimi</p>
                        <p className="text-sm text-gray-500">Istanbul (GMT+3)</p>
                      </div>
                      <Button variant="outline" size="sm">Değiştir</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-2xl">
                    <Shield className="w-6 h-6 mr-3 text-blue-600" />
                    Güvenlik Ayarları
                  </CardTitle>
                  <CardDescription>Şifrenizi değiştirin ve hesabınızı güvende tutun</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-6">
                    {/* Current Password */}
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="text-gray-700 font-medium">
                        Mevcut Şifre
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) =>
                            setPasswordData({ ...passwordData, currentPassword: e.target.value })
                          }
                          className="pl-10 pr-10"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-gray-700 font-medium">
                        Yeni Şifre
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          id="newPassword"
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            setPasswordData({ ...passwordData, newPassword: e.target.value })
                          }
                          className="pl-10 pr-10"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">En az 6 karakter olmalıdır</p>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">
                        Yeni Şifre (Tekrar)
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) =>
                            setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                          }
                          className="pl-10"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Kaydediliyor...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Şifreyi Güncelle
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Two-Factor Auth */}
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <h3 className="text-lg font-semibold mb-4">İki Faktörlü Doğrulama</h3>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-900">2FA Koruması</p>
                        <p className="text-sm text-gray-500">Hesabınıza ekstra güvenlik katmanı ekleyin</p>
                      </div>
                      <Button variant="outline" size="sm">Etkinleştir</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-2xl">
                    <Bell className="w-6 h-6 mr-3 text-blue-600" />
                    Bildirim Ayarları
                  </CardTitle>
                  <CardDescription>Hangi bildirimleri almak istediğinizi seçin</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    {
                      key: 'emailNotifications' as const,
                      title: 'E-posta Bildirimleri',
                      description: 'Önemli güncellemeler için e-posta alın'
                    },
                    {
                      key: 'courseUpdates' as const,
                      title: 'Kurs Güncellemeleri',
                      description: 'Kayıtlı olduğunuz kurslardan haberdar olun'
                    },
                    {
                      key: 'promotions' as const,
                      title: 'Promosyonlar',
                      description: 'İndirimler ve kampanyalar hakkında bilgi alın'
                    },
                    {
                      key: 'weeklyDigest' as const,
                      title: 'Haftalık Özet',
                      description: 'Her hafta ilerlemenizi özetleyen e-posta'
                    }
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.title}</p>
                        <p className="text-sm text-gray-500">{item.description}</p>
                      </div>
                      <button
                        onClick={() => handleNotificationToggle(item.key)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notifications[item.key] ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notifications[item.key] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Privacy Settings */}
            {activeTab === 'privacy' && (
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-2xl">
                    <Lock className="w-6 h-6 mr-3 text-blue-600" />
                    Gizlilik Ayarları
                  </CardTitle>
                  <CardDescription>Verilerinizi ve gizliliğinizi yönetin</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Data Export */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <h3 className="font-semibold text-gray-900 mb-2">Verilerinizi İndirin</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Tüm kişisel verilerinizi içeren bir dosya indirin
                    </p>
                    <Button variant="outline" className="border-blue-500 text-blue-600">
                      <Download className="w-4 h-4 mr-2" />
                      Verileri İndir
                    </Button>
                  </div>

                  {/* Account Deletion */}
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-start space-x-3 mb-4">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Hesabı Sil</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Hesabınızı kalıcı olarak silin. Bu işlem geri alınamaz ve tüm verileriniz silinecektir.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleDeleteAccount}
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Hesabı Sil
                    </Button>
                  </div>

                  {/* Privacy Policy */}
                  <div className="text-center p-6 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-600 mb-3">
                      Gizlilik politikamız ve veri kullanımımız hakkında daha fazla bilgi edinin
                    </p>
                    <Button variant="outline" size="sm">
                      Gizlilik Politikasını Görüntüle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
