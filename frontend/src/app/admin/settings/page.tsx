'use client'

import { useState, useEffect } from 'react'
import { 
  Settings, 
  Save, 
  RefreshCw,
  Palette,
  Database,
  Bell,
  Shield,
  Server,
  CheckCircle,
  AlertTriangle,
  Info,
  HardDrive,
  Cpu,
  Activity,
  Clock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface SystemSettings {
  general: {
    siteName: string
    siteDescription: string
    siteUrl: string
    adminEmail: string
    timezone: string
    language: string
    maintenanceMode: boolean
  }
  theme: {
    primaryColor: string
    secondaryColor: string
    logoUrl: string
    faviconUrl: string
    customCSS: string
    darkMode: boolean
  }
  database: {
    host: string
    port: number
    name: string
    username: string
    backupEnabled: boolean
    lastBackup: string
    autoBackupInterval: string
  }
  notifications: {
    emailNotifications: boolean
    pushNotifications: boolean
    smsNotifications: boolean
    newUserWelcome: boolean
    courseCompletion: boolean
    systemAlerts: boolean
  }
  security: {
    twoFactorAuth: boolean
    sessionTimeout: number
    passwordPolicy: {
      minLength: number
      requireSpecialChars: boolean
      requireNumbers: boolean
      requireUppercase: boolean
    }
    rateLimiting: boolean
    ipWhitelist: string[]
  }
  performance: {
    cacheEnabled: boolean
    cdnEnabled: boolean
    compressionEnabled: boolean
    cacheTimeout: number
    maxUploadSize: number
    sessionStore: string
  }
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical'
  uptime: number
  cpu: number
  memory: number
  disk: number
  database: 'connected' | 'disconnected'
  cache: 'working' | 'error'
  lastCheck: string
}

export default function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [changes, setChanges] = useState<Partial<SystemSettings>>({})

  useEffect(() => {
    fetchSettings()
    fetchSystemHealth()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      
      // Mock settings data
      const mockSettings: SystemSettings = {
        general: {
          siteName: 'EduPlatform',
          siteDescription: 'Modern online eğitim platformu',
          siteUrl: 'https://eduplatform.com',
          adminEmail: 'admin@eduplatform.com',
          timezone: 'Europe/Istanbul',
          language: 'tr',
          maintenanceMode: false
        },
        theme: {
          primaryColor: '#3B82F6',
          secondaryColor: '#10B981',
          logoUrl: '/logo.png',
          faviconUrl: '/favicon.ico',
          customCSS: '',
          darkMode: false
        },
        database: {
          host: 'localhost',
          port: 5432,
          name: 'eduplatform_db',
          username: 'postgres',
          backupEnabled: true,
          lastBackup: '2024-10-30T02:00:00Z',
          autoBackupInterval: 'daily'
        },
        notifications: {
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false,
          newUserWelcome: true,
          courseCompletion: true,
          systemAlerts: true
        },
        security: {
          twoFactorAuth: true,
          sessionTimeout: 24,
          passwordPolicy: {
            minLength: 8,
            requireSpecialChars: true,
            requireNumbers: true,
            requireUppercase: true
          },
          rateLimiting: true,
          ipWhitelist: ['192.168.1.0/24', '10.0.0.0/8']
        },
        performance: {
          cacheEnabled: true,
          cdnEnabled: false,
          compressionEnabled: true,
          cacheTimeout: 3600,
          maxUploadSize: 50,
          sessionStore: 'redis'
        }
      }

      setSettings(mockSettings)
    } catch (error) {
      console.error('Ayarlar yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSystemHealth = async () => {
    try {
      const mockHealth: SystemHealth = {
        status: 'healthy',
        uptime: 2592000, // 30 days in seconds
        cpu: 45,
        memory: 62,
        disk: 78,
        database: 'connected',
        cache: 'working',
        lastCheck: new Date().toISOString()
      }

      setHealth(mockHealth)
    } catch (error) {
      console.error('Sistem durumu kontrol edilirken hata:', error)
    }
  }

  const handleSettingChange = (section: keyof SystemSettings, key: string, value: any) => {
    if (!settings) return

    const updatedSettings = {
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value
      }
    }

    setSettings(updatedSettings)
    setChanges({
      ...changes,
      [section]: {
        ...changes[section],
        [key]: value
      }
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setChanges({})
      console.log('Ayarlar kaydedildi:', changes)
    } catch (error) {
      console.error('Ayarlar kaydedilirken hata:', error)
    } finally {
      setSaving(false)
    }
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    return `${days} gün, ${hours} saat`
  }

  const getHealthStatus = (status: string) => {
    switch (status) {
      case 'healthy':
        return { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle, text: 'Sağlıklı' }
      case 'warning':
        return { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertTriangle, text: 'Uyarı' }
      case 'critical':
        return { color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle, text: 'Kritik' }
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-100', icon: Info, text: 'Bilinmiyor' }
    }
  }

  const tabs = [
    { id: 'general', label: 'Genel', icon: Settings },
    { id: 'theme', label: 'Tema', icon: Palette },
    { id: 'database', label: 'Veritabanı', icon: Database },
    { id: 'notifications', label: 'Bildirimler', icon: Bell },
    { id: 'security', label: 'Güvenlik', icon: Shield },
    { id: 'performance', label: 'Performans', icon: Activity },
    { id: 'health', label: 'Sistem Durumu', icon: Server }
  ]

  if (loading || !settings || !health) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  const healthStatus = getHealthStatus(health.status)
  const StatusIcon = healthStatus.icon

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sistem Ayarları</h1>
          <p className="text-gray-600 mt-2">Platform ayarlarını yönetin ve sistemi izleyin</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className={`flex items-center px-3 py-2 rounded-lg ${healthStatus.bg}`}>
            <StatusIcon className={`w-4 h-4 mr-2 ${healthStatus.color}`} />
            <span className={`text-sm font-medium ${healthStatus.color}`}>
              {healthStatus.text}
            </span>
          </div>
          
          {Object.keys(changes).length > 0 && (
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const TabIcon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TabIcon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'general' && (
          <Card>
            <CardHeader>
              <CardTitle>Genel Ayarlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Site Adı
                  </label>
                  <Input
                    value={settings.general.siteName}
                    onChange={(e) => handleSettingChange('general', 'siteName', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin E-posta
                  </label>
                  <Input
                    type="email"
                    value={settings.general.adminEmail}
                    onChange={(e) => handleSettingChange('general', 'adminEmail', e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site Açıklaması
                </label>
                <textarea
                  value={settings.general.siteDescription}
                  onChange={(e) => handleSettingChange('general', 'siteDescription', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Site URL
                  </label>
                  <Input
                    value={settings.general.siteUrl}
                    onChange={(e) => handleSettingChange('general', 'siteUrl', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zaman Dilimi
                  </label>
                  <select
                    value={settings.general.timezone}
                    onChange={(e) => handleSettingChange('general', 'timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Europe/Istanbul">Europe/Istanbul</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dil
                  </label>
                  <select
                    value={settings.general.language}
                    onChange={(e) => handleSettingChange('general', 'language', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="tr">Türkçe</option>
                    <option value="en">English</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="maintenanceMode"
                  checked={settings.general.maintenanceMode}
                  onChange={(e) => handleSettingChange('general', 'maintenanceMode', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="maintenanceMode" className="text-sm font-medium text-gray-700">
                  Bakım Modu (Site geçici olarak kapatılır)
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'theme' && (
          <Card>
            <CardHeader>
              <CardTitle>Tema Ayarları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ana Renk
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={settings.theme.primaryColor}
                      onChange={(e) => handleSettingChange('theme', 'primaryColor', e.target.value)}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <Input
                      value={settings.theme.primaryColor}
                      onChange={(e) => handleSettingChange('theme', 'primaryColor', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    İkincil Renk
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={settings.theme.secondaryColor}
                      onChange={(e) => handleSettingChange('theme', 'secondaryColor', e.target.value)}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <Input
                      value={settings.theme.secondaryColor}
                      onChange={(e) => handleSettingChange('theme', 'secondaryColor', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo URL
                  </label>
                  <Input
                    value={settings.theme.logoUrl}
                    onChange={(e) => handleSettingChange('theme', 'logoUrl', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Favicon URL
                  </label>
                  <Input
                    value={settings.theme.faviconUrl}
                    onChange={(e) => handleSettingChange('theme', 'faviconUrl', e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Özel CSS
                </label>
                <textarea
                  value={settings.theme.customCSS}
                  onChange={(e) => handleSettingChange('theme', 'customCSS', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={8}
                  placeholder="/* Özel CSS kodlarınızı buraya yazın */"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="darkMode"
                  checked={settings.theme.darkMode}
                  onChange={(e) => handleSettingChange('theme', 'darkMode', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="darkMode" className="text-sm font-medium text-gray-700">
                  Karanlık Mod
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'health' && (
          <div className="space-y-6">
            {/* System Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Sistem Genel Bakış
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Çalışma Süresi</p>
                    <p className="text-lg font-bold text-gray-900">{formatUptime(health.uptime)}</p>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Cpu className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">CPU Kullanımı</p>
                    <p className="text-lg font-bold text-gray-900">{health.cpu}%</p>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Activity className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">RAM Kullanımı</p>
                    <p className="text-lg font-bold text-gray-900">{health.memory}%</p>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <HardDrive className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Disk Kullanımı</p>
                    <p className="text-lg font-bold text-gray-900">{health.disk}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Services Status */}
            <Card>
              <CardHeader>
                <CardTitle>Servis Durumu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Database className="w-6 h-6 text-blue-600" />
                      <div>
                        <h3 className="font-medium text-gray-900">Veritabanı</h3>
                        <p className="text-sm text-gray-600">PostgreSQL Bağlantısı</p>
                      </div>
                    </div>
                    <Badge className={health.database === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {health.database === 'connected' ? 'Bağlı' : 'Bağlantı Yok'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Server className="w-6 h-6 text-green-600" />
                      <div>
                        <h3 className="font-medium text-gray-900">Cache Sistemi</h3>
                        <p className="text-sm text-gray-600">Redis Cache</p>
                      </div>
                    </div>
                    <Badge className={health.cache === 'working' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {health.cache === 'working' ? 'Çalışıyor' : 'Hata'}
                    </Badge>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Son kontrol: {new Date(health.lastCheck).toLocaleString('tr-TR')}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={fetchSystemHealth}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Yenile
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Other tabs would go here... */}
      </div>
    </div>
  )
}
