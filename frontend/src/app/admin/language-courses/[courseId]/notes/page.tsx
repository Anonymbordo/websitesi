'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Edit, Trash2, ArrowLeft, Upload, FileText, Download } from 'lucide-react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Note {
  id: number
  title: string
  description: string
  file_url: string
  file_type: string
  file_size: number
  order_index: number
  is_downloadable: boolean
}

export default function NotesManagement() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    file_url: '',
    order_index: 0,
    is_downloadable: true
  })

  useEffect(() => {
    fetchNotes()
  }, [courseId])

  const fetchNotes = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/language-courses/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotes(response.data.notes || [])
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    const formDataUpload = new FormData()
    formDataUpload.append('file', file)

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(
        `${API_URL}/api/media/upload`,
        formDataUpload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      )
      
      setFormData(prev => ({ ...prev, file_url: response.data.file_url }))
      alert('Dosya yüklendi!')
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Dosya yüklenemedi!')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      
      if (editingNote) {
        await axios.put(
          `${API_URL}/api/language-courses/notes/${editingNote.id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      } else {
        await axios.post(
          `${API_URL}/api/language-courses/courses/${courseId}/notes`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      }
      
      setShowModal(false)
      setEditingNote(null)
      setFormData({
        title: '',
        description: '',
        file_url: '',
        order_index: 0,
        is_downloadable: true
      })
      fetchNotes()
    } catch (error) {
      console.error('Error saving note:', error)
      alert('Not kaydedilemedi!')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bu notu silmek istediğinizden emin misiniz?')) return
    
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API_URL}/api/language-courses/notes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchNotes()
    } catch (error) {
      console.error('Error deleting note:', error)
      alert('Not silinemedi!')
    }
  }

  const handleEdit = (note: Note) => {
    setEditingNote(note)
    setFormData({
      title: note.title,
      description: note.description || '',
      file_url: note.file_url || '',
      order_index: note.order_index,
      is_downloadable: note.is_downloadable
    })
    setShowModal(true)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Yükleniyor...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri Dön
        </Button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Ders Notları</h1>
            <p className="text-gray-600">PDF ders notlarını yönetin</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Not Ekle
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.sort((a, b) => a.order_index - b.order_index).map((note) => (
          <Card key={note.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-sm">#{note.order_index + 1} - {note.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">{note.description}</p>
              
              {note.file_url && (
                <a
                  href={note.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <Download className="w-4 h-4" />
                  Dosyayı Görüntüle
                </a>
              )}
              
              {note.is_downloadable && (
                <span className="inline-block text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  İndirilebilir
                </span>
              )}
              
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(note)} className="flex-1">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(note.id)} className="flex-1">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingNote ? 'Notu Düzenle' : 'Yeni Not Ekle'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Başlık *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Not başlığı"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Açıklama</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Not açıklaması"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">PDF Dosyası</label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="w-full p-2 border rounded"
                      disabled={uploadingFile}
                    />
                    {uploadingFile && <p className="text-sm text-blue-600">Yükleniyor...</p>}
                    {formData.file_url && (
                      <a
                        href={formData.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-600 hover:underline flex items-center gap-1"
                      >
                        <FileText className="w-4 h-4" />
                        Dosya yüklendi - Görüntüle
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Sıra No</label>
                  <Input
                    type="number"
                    value={formData.order_index}
                    onChange={(e) => setFormData({...formData, order_index: parseInt(e.target.value)})}
                    min="0"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_downloadable"
                    checked={formData.is_downloadable}
                    onChange={(e) => setFormData({...formData, is_downloadable: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_downloadable" className="text-sm font-medium">
                    İndirilebilir
                  </label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1" disabled={uploadingFile}>
                    {editingNote ? 'Güncelle' : 'Kaydet'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false)
                      setEditingNote(null)
                      setFormData({
                        title: '',
                        description: '',
                        file_url: '',
                        order_index: 0,
                        is_downloadable: true
                      })
                    }}
                    className="flex-1"
                  >
                    İptal
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
