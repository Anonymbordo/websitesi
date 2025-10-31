'use client'

import { useState, useEffect } from 'react'
import { 
  Upload, 
  Search, 
  Filter,
  Grid3X3,
  List,
  Image,
  Video,
  FileText,
  Music,
  Download,
  Trash2,
  Edit,
  MoreVertical,
  Eye,
  Copy,
  Share2,
  Calendar,
  HardDrive,
  Folder,
  Plus,
  CheckCircle,
  X
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface MediaFile {
  id: number
  name: string
  type: 'image' | 'video' | 'document' | 'audio'
  size: number
  url: string
  thumbnail?: string
  uploadedAt: string
  uploadedBy: string
  folder?: string
  alt?: string
  description?: string
  downloads: number
  isPublic: boolean
}

interface MediaFolder {
  id: number
  name: string
  itemCount: number
  createdAt: string
}

export default function MediaManagement() {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [folders, setFolders] = useState<MediaFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedFolder, setSelectedFolder] = useState('all')
  const [selectedFiles, setSelectedFiles] = useState<number[]>([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    fetchMedia()
    fetchFolders()
  }, [])

  const fetchMedia = async () => {
    try {
      setLoading(true)
      
      // Mock data
      const mockFiles: MediaFile[] = [
        {
          id: 1,
          name: 'hero-background.jpg',
          type: 'image',
          size: 2048000,
          url: '/uploads/hero-background.jpg',
          thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&h=200&fit=crop',
          uploadedAt: '2024-10-30T10:30:00Z',
          uploadedBy: 'Admin User',
          folder: 'backgrounds',
          alt: 'Ana sayfa hero görseli',
          description: 'Ana sayfa için kullanılan hero background görseli',
          downloads: 45,
          isPublic: true
        },
        {
          id: 2,
          name: 'course-intro-video.mp4',
          type: 'video',
          size: 15728640,
          url: '/uploads/course-intro-video.mp4',
          thumbnail: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=300&h=200&fit=crop',
          uploadedAt: '2024-10-29T14:15:00Z',
          uploadedBy: 'John Instructor',
          folder: 'course-videos',
          description: 'Kurs tanıtım videosu',
          downloads: 123,
          isPublic: true
        },
        {
          id: 3,
          name: 'user-manual.pdf',
          type: 'document',
          size: 1024000,
          url: '/uploads/user-manual.pdf',
          uploadedAt: '2024-10-28T16:45:00Z',
          uploadedBy: 'Content Manager',
          folder: 'documents',
          description: 'Platform kullanım kılavuzu',
          downloads: 67,
          isPublic: false
        },
        {
          id: 4,
          name: 'instructor-profile.jpg',
          type: 'image',
          size: 512000,
          url: '/uploads/instructor-profile.jpg',
          thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop&crop=face',
          uploadedAt: '2024-10-27T11:20:00Z',
          uploadedBy: 'HR Manager',
          folder: 'profiles',
          alt: 'Eğitmen profil fotoğrafı',
          description: 'Eğitmen profil fotoğrafı',
          downloads: 12,
          isPublic: true
        },
        {
          id: 5,
          name: 'background-music.mp3',
          type: 'audio',
          size: 3072000,
          url: '/uploads/background-music.mp3',
          uploadedAt: '2024-10-26T09:10:00Z',
          uploadedBy: 'Content Creator',
          folder: 'audio',
          description: 'Video arka plan müziği',
          downloads: 28,
          isPublic: false
        },
        {
          id: 6,
          name: 'course-certificate-template.png',
          type: 'image',
          size: 768000,
          url: '/uploads/course-certificate-template.png',
          thumbnail: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=300&h=200&fit=crop',
          uploadedAt: '2024-10-25T13:30:00Z',
          uploadedBy: 'Design Team',
          folder: 'templates',
          alt: 'Kurs sertifikası şablonu',
          description: 'Kurs tamamlama sertifikası şablonu',
          downloads: 89,
          isPublic: true
        }
      ]

      setFiles(mockFiles)
    } catch (error) {
      console.error('Medya dosyaları yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFolders = async () => {
    try {
      const mockFolders: MediaFolder[] = [
        { id: 1, name: 'backgrounds', itemCount: 15, createdAt: '2024-01-15' },
        { id: 2, name: 'course-videos', itemCount: 45, createdAt: '2024-01-20' },
        { id: 3, name: 'documents', itemCount: 23, createdAt: '2024-02-01' },
        { id: 4, name: 'profiles', itemCount: 67, createdAt: '2024-02-10' },
        { id: 5, name: 'audio', itemCount: 12, createdAt: '2024-03-01' },
        { id: 6, name: 'templates', itemCount: 8, createdAt: '2024-03-15' }
      ]
      
      setFolders(mockFolders)
    } catch (error) {
      console.error('Klasörler yüklenirken hata:', error)
    }
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return Image
      case 'video': return Video
      case 'document': return FileText
      case 'audio': return Music
      default: return FileText
    }
  }

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'image': return 'bg-green-100 text-green-800'
      case 'video': return 'bg-blue-100 text-blue-800'
      case 'document': return 'bg-red-100 text-red-800'
      case 'audio': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFileSelect = (fileId: number) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    )
  }

  const handleSelectAll = () => {
    setSelectedFiles(
      selectedFiles.length === filteredFiles.length 
        ? [] 
        : filteredFiles.map(file => file.id)
    )
  }

  const handleDeleteSelected = () => {
    if (confirm(`Seçilen ${selectedFiles.length} dosyayı silmek istediğinizden emin misiniz?`)) {
      setFiles(files.filter(file => !selectedFiles.includes(file.id)))
      setSelectedFiles([])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    // Handle file drop logic here
    console.log('Files dropped:', e.dataTransfer.files)
  }

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (file.description && file.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesType = selectedType === 'all' || file.type === selectedType
    const matchesFolder = selectedFolder === 'all' || file.folder === selectedFolder
    
    return matchesSearch && matchesType && matchesFolder
  })

  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  const totalDownloads = files.reduce((sum, file) => sum + file.downloads, 0)
  const publicFiles = files.filter(file => file.isPublic).length

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Medya Kütüphanesi</h1>
          <p className="text-gray-600 mt-2">Dosyalarınızı organize edin ve yönetin</p>
        </div>
        
        <div className="flex space-x-3">
          <Button variant="outline">
            <Folder className="w-4 h-4 mr-2" />
            Yeni Klasör
          </Button>
          <Button 
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            Dosya Yükle
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Dosya</p>
                <p className="text-2xl font-bold text-gray-900">{files.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Boyut</p>
                <p className="text-2xl font-bold text-gray-900">{formatFileSize(totalSize)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <HardDrive className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam İndirme</p>
                <p className="text-2xl font-bold text-gray-900">{totalDownloads}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Download className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Genel Dosyalar</p>
                <p className="text-2xl font-bold text-gray-900">{publicFiles}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Eye className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Dosya ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tüm Türler</option>
                <option value="image">Görsel</option>
                <option value="video">Video</option>
                <option value="document">Belge</option>
                <option value="audio">Ses</option>
              </select>
              
              {/* Folder Filter */}
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tüm Klasörler</option>
                {folders.map(folder => (
                  <option key={folder.id} value={folder.name}>{folder.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Selected Actions */}
              {selectedFiles.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{selectedFiles.length} seçili</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleDeleteSelected}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
              
              {/* View Mode Toggle */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <Button
                  size="sm"
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('grid')}
                  className="px-3"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('list')}
                  className="px-3"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Area */}
      {showUploadModal && (
        <Card className="border-2 border-dashed border-blue-300 bg-blue-50">
          <CardContent className="p-8">
            <div 
              className={`text-center transition-colors ${dragOver ? 'bg-blue-100' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Dosyaları buraya sürükleyin</h3>
              <p className="text-gray-600 mb-4">veya dosya seçmek için tıklayın</p>
              <div className="flex items-center justify-center space-x-4">
                <Button>
                  Dosya Seç
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowUploadModal(false)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Kapat
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Files Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Dosyalar ({filteredFiles.length})
            </CardTitle>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedFiles.length === filteredFiles.length}
                onChange={handleSelectAll}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="text-sm text-gray-700">Tümünü Seç</label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredFiles.map((file) => {
                const FileIcon = getFileIcon(file.type)
                return (
                  <div key={file.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <div className="relative">
                      {file.thumbnail ? (
                        <img 
                          src={file.thumbnail} 
                          alt={file.alt || file.name}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                          <FileIcon className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                      
                      <div className="absolute top-2 left-2">
                        <input
                          type="checkbox"
                          checked={selectedFiles.includes(file.id)}
                          onChange={() => handleFileSelect(file.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="absolute top-2 right-2">
                        <Badge className={getFileTypeColor(file.type)}>
                          {file.type}
                        </Badge>
                      </div>
                      
                      {file.isPublic && (
                        <div className="absolute bottom-2 left-2">
                          <Badge className="bg-green-100 text-green-800">
                            <Eye className="w-3 h-3 mr-1" />
                            Genel
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 truncate mb-1">{file.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{formatFileSize(file.size)}</p>
                      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{file.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <Download className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{file.downloads}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFiles.map((file) => {
                const FileIcon = getFileIcon(file.type)
                return (
                  <div key={file.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedFiles.includes(file.id)}
                      onChange={() => handleFileSelect(file.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    
                    <div className="w-12 h-12 flex-shrink-0">
                      {file.thumbnail ? (
                        <img 
                          src={file.thumbnail} 
                          alt={file.alt || file.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                          <FileIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="font-medium text-gray-900">{file.name}</h3>
                        <Badge className={getFileTypeColor(file.type)}>
                          {file.type}
                        </Badge>
                        {file.isPublic && (
                          <Badge className="bg-green-100 text-green-800">
                            <Eye className="w-3 h-3 mr-1" />
                            Genel
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{file.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{formatFileSize(file.size)}</span>
                        <span>{file.downloads} indirme</span>
                        <span>{file.uploadedBy}</span>
                        <span>{new Date(file.uploadedAt).toLocaleDateString('tr-TR')}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {filteredFiles.length === 0 && (
            <div className="text-center py-12">
              <Upload className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Dosya bulunamadı</h3>
              <p className="text-gray-600 mb-6">Arama kriterlerinizi değiştirin veya yeni dosya yükleyin.</p>
              <Button onClick={() => setShowUploadModal(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Dosya Yükle
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}