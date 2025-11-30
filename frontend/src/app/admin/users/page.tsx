'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  UserCheck, 
  UserX, 
  Mail, 
  Calendar,
  Shield,
  Eye,
  Edit,
  Trash2,
  Plus,
  Download
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/store'
import { adminAPI } from '@/lib/api'

interface User {
  id: number
  full_name: string
  email: string
  phone: string
  role: 'student' | 'instructor' | 'admin'
  is_active: boolean
  created_at: string
  last_login?: string
  total_courses?: number
  total_students?: number
}

export default function AdminUsers() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/')
      return
    }

    fetchUsers()
  }, [isAuthenticated, user, router, currentPage, searchTerm, filterRole, filterStatus])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      
      const params = {
        skip: (currentPage - 1) * 20,
        limit: 20,
        search: searchTerm || undefined,
        role: filterRole !== 'all' ? filterRole : undefined,
      }

      const response = await adminAPI.getUsers(params)
      
      // Use API data
      if (response.data && Array.isArray(response.data)) {
        setUsers(response.data)
        setTotalPages(Math.ceil(response.data.length / 20) || 1)
      } else {
        setUsers([])
        setTotalPages(1)
      }
      
      // Mock data (REMOVED - using real data now)
      const mockUsers_OLD: User[] = [
        {
          id: 1,
          full_name: 'Ahmet Yılmaz',
          email: 'ahmet@example.com',
          phone: '+90 555 123 4567',
          role: 'student',
          is_active: true,
          created_at: '2024-01-15T10:30:00Z',
          last_login: '2024-01-20T14:22:00Z',
          total_courses: 5
        },
        {
          id: 2,
          full_name: 'Ayşe Kaya',
          email: 'ayse@example.com',
          phone: '+90 555 234 5678',
          role: 'instructor',
          is_active: true,
          created_at: '2024-01-10T08:15:00Z',
          last_login: '2024-01-20T16:45:00Z',
          total_students: 156,
          total_courses: 8
        },
        {
          id: 3,
          full_name: 'Mehmet Demir',
          email: 'mehmet@example.com',
          phone: '+90 555 345 6789',
          role: 'student',
          is_active: false,
          created_at: '2024-01-12T12:00:00Z',
          total_courses: 2
        },
        {
          id: 4,
          full_name: 'Fatma Şahin',
          email: 'fatma@example.com',
          phone: '+90 555 456 7890',
          role: 'instructor',
          is_active: true,
          created_at: '2024-01-08T14:30:00Z',
          last_login: '2024-01-19T11:20:00Z',
          total_students: 89,
          total_courses: 4
        },
        {
          id: 5,
          full_name: 'Ali Özkan',
          email: 'ali@example.com',
          phone: '+90 555 567 8901',
          role: 'admin',
          is_active: true,
          created_at: '2024-01-01T09:00:00Z',
          last_login: '2024-01-20T17:00:00Z'
        }
      ]

      setUsers(response.data || [])
      setTotalPages(1)
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleUserAction = async (userId: number, action: 'activate' | 'deactivate') => {
    try {
      if (action === 'activate') {
        await adminAPI.activateUser(userId)
      } else {
        await adminAPI.deactivateUser(userId)
      }
      
      // Kullanıcı listesini yenile
      fetchUsers()
    } catch (error) {
      console.error('Kullanıcı işlemi sırasında hata:', error)
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'student': return 'Öğrenci'
      case 'instructor': return 'Eğitmen'
      case 'admin': return 'Admin'
      default: return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'student': return 'bg-blue-100 text-blue-800'
      case 'instructor': return 'bg-purple-100 text-purple-800'
      case 'admin': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-2">
                Kullanıcı Yönetimi
              </h1>
              <p className="text-xl text-gray-600">
                Platform kullanıcılarını görüntüleyin ve yönetin
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl"
              >
                <Download className="w-4 h-4 mr-2" />
                Dışa Aktar
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Yeni Kullanıcı
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Kullanıcı ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Role Filter */}
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="all">Tüm Roller</option>
                <option value="student">Öğrenci</option>
                <option value="instructor">Eğitmen</option>
                <option value="admin">Admin</option>
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
              </select>

              {/* Reset Button */}
              <Button 
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setFilterRole('all')
                  setFilterStatus('all')
                }}
                className="rounded-xl border-gray-200 hover:bg-gray-50"
              >
                <Filter className="w-4 h-4 mr-2" />
                Temizle
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
              <Users className="w-6 h-6 mr-3 text-blue-600" />
              Kullanıcılar ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-4 px-4 font-semibold text-gray-900">Kullanıcı</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-900">İletişim</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-900">Rol</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-900">Durum</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-900">Kayıt Tarihi</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-900">İstatistikler</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-900">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                              <span className="text-white font-medium">
                                {user.full_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{user.full_name}</div>
                              <div className="text-sm text-gray-500">ID: {user.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <div className="flex items-center text-sm text-gray-900">
                              <Mail className="w-4 h-4 mr-2 text-gray-400" />
                              {user.email}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">{user.phone}</div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}>
                            <Shield className="w-3 h-3 mr-1" />
                            {getRoleText(user.role)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            user.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? (
                              <>
                                <UserCheck className="w-3 h-3 mr-1" />
                                Aktif
                              </>
                            ) : (
                              <>
                                <UserX className="w-3 h-3 mr-1" />
                                Pasif
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <div className="flex items-center text-sm text-gray-900">
                              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                              {formatDate(user.created_at)}
                            </div>
                            {user.last_login && (
                              <div className="text-sm text-gray-500 mt-1">
                                Son giriş: {formatDate(user.last_login)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm">
                            {user.role === 'instructor' ? (
                              <>
                                <div className="text-gray-900">{user.total_students || 0} öğrenci</div>
                                <div className="text-gray-500">{user.total_courses || 0} kurs</div>
                              </>
                            ) : user.role === 'student' ? (
                              <div className="text-gray-900">{user.total_courses || 0} kurs</div>
                            ) : (
                              <div className="text-gray-500">-</div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            <Button size="sm" variant="outline" className="rounded-lg">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="rounded-lg">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className={`rounded-lg ${user.is_active ? 'hover:bg-red-50 hover:border-red-200' : 'hover:bg-green-50 hover:border-green-200'}`}
                              onClick={() => handleUserAction(user.id, user.is_active ? 'deactivate' : 'activate')}
                            >
                              {user.is_active ? (
                                <UserX className="w-4 h-4 text-red-600" />
                              ) : (
                                <UserCheck className="w-4 h-4 text-green-600" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-8">
                <div className="text-sm text-gray-600">
                  Sayfa {currentPage} / {totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="rounded-lg"
                  >
                    Önceki
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="rounded-lg"
                  >
                    Sonraki
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}