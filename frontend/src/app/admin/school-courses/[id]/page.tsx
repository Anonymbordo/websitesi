'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface SchoolCourse {
  id: number;
  level: string;
  grade: number;
  subject: string;
  title: string;
  description: string;
  price: number;
  is_active: boolean;
}

interface Topic {
  id: number;
  title: string;
  description: string;
  content: string;
  order_index: number;
  duration_minutes: number;
  is_free: boolean;
}

interface Note {
  id: number;
  title: string;
  description: string;
  file_url: string;
  order_index: number;
  is_downloadable: boolean;
}

interface Video {
  id: number;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  duration_minutes: number;
  order_index: number;
  is_free: boolean;
}

interface Instructor {
  id: number;
  name: string;
  title: string;
  bio: string;
  photo_url: string;
  specialization: string;
  experience_years: number;
  rating: number;
}

export default function SchoolCourseDetailPage() {
  const params = useParams();
  const courseId = params?.id;

  const [course, setCourse] = useState<SchoolCourse | null>(null);
  const [activeTab, setActiveTab] = useState<'topics' | 'notes' | 'videos' | 'exams' | 'instructors'>('topics');
  const [loading, setLoading] = useState(true);

  const [topics, setTopics] = useState<Topic[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/school-courses/courses/${courseId}`,
        { headers }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setCourse(data);
      setTopics(data.topics || []);
      setNotes(data.notes || []);
      setVideos(data.videos || []);
      setInstructors(data.instructors || []);
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTopic = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/school-courses/courses/${courseId}/topics`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(formData)
        }
      );
      if (response.ok) {
        fetchCourse();
        setShowAddModal(false);
        setFormData({});
      }
    } catch (error) {
      console.error('Error adding topic:', error);
    }
  };

  const handleAddNote = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/school-courses/courses/${courseId}/notes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(formData)
        }
      );
      if (response.ok) {
        fetchCourse();
        setShowAddModal(false);
        setFormData({});
      }
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleAddVideo = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/school-courses/courses/${courseId}/videos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(formData)
        }
      );
      if (response.ok) {
        fetchCourse();
        setShowAddModal(false);
        setFormData({});
      }
    } catch (error) {
      console.error('Error adding video:', error);
    }
  };

  const handleAddInstructor = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/school-courses/courses/${courseId}/instructors`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(formData)
        }
      );
      if (response.ok) {
        fetchCourse();
        setShowAddModal(false);
        setFormData({});
      }
    } catch (error) {
      console.error('Error adding instructor:', error);
    }
  };

  const handleDelete = async (type: string, id: number) => {
    if (!confirm('Silmek istediğinizden emin misiniz?')) return;

    try {
      const endpoints: { [key: string]: string } = {
        topics: `/api/school-courses/topics/${id}`,
        notes: `/api/school-courses/notes/${id}`,
        videos: `/api/school-courses/videos/${id}`,
        instructors: `/api/school-courses/instructors/${id}`
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}${endpoints[type]}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        fetchCourse();
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Ders bulunamadı</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                {course.level === 'ilkokul' && 'İlkokul'}
                {course.level === 'ortaokul' && 'Ortaokul'}
                {course.level === 'lise' && 'Lise'} - {course.grade}. Sınıf
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
            <p className="text-gray-600">{course.description}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-blue-600">₺{course.price}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { key: 'topics', label: 'Ders Konuları', count: topics.length },
              { key: 'notes', label: 'Ders Notları', count: notes.length },
              { key: 'videos', label: 'Ders Videoları', count: videos.length },
              { key: 'exams', label: 'Online Sınav', count: 0 },
              { key: 'instructors', label: 'Eğitmenler', count: instructors.length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">
              {activeTab === 'topics' && 'Ders Konuları'}
              {activeTab === 'notes' && 'Ders Notları'}
              {activeTab === 'videos' && 'Ders Videoları'}
              {activeTab === 'exams' && 'Online Sınav'}
              {activeTab === 'instructors' && 'Eğitmenler'}
            </h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Yeni Ekle
            </button>
          </div>

          {/* Topics */}
          {activeTab === 'topics' && (
            <div className="space-y-4">
              {topics.map((topic) => (
                <div key={topic.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{topic.title}</h3>
                      <p className="text-gray-600 text-sm mb-2">{topic.description}</p>
                      <div className="flex gap-4 text-sm text-gray-500">
                        {topic.duration_minutes && (
                          <span>⏱️ {topic.duration_minutes} dakika</span>
                        )}
                        {topic.is_free && (
                          <span className="text-green-600 font-medium">🆓 Ücretsiz</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete('topics', topic.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
              {topics.length === 0 && (
                <p className="text-center text-gray-500 py-8">Henüz konu eklenmemiş</p>
              )}
            </div>
          )}

          {/* Notes */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{note.title}</h3>
                      <p className="text-gray-600 text-sm mb-2">{note.description}</p>
                      {note.file_url && (
                        <a
                          href={note.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          📄 Dosyayı İncele
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete('notes', note.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
              {notes.length === 0 && (
                <p className="text-center text-gray-500 py-8">Henüz not eklenmemiş</p>
              )}
            </div>
          )}

          {/* Videos */}
          {activeTab === 'videos' && (
            <div className="space-y-4">
              {videos.map((video) => (
                <div key={video.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{video.title}</h3>
                      <p className="text-gray-600 text-sm mb-2">{video.description}</p>
                      <div className="flex gap-4 text-sm text-gray-500">
                        {video.duration_minutes && (
                          <span>⏱️ {video.duration_minutes} dakika</span>
                        )}
                        {video.is_free && (
                          <span className="text-green-600 font-medium">🆓 Ücretsiz</span>
                        )}
                      </div>
                      {video.video_url && (
                        <a
                          href={video.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                        >
                          🎥 Videoyu İzle
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete('videos', video.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
              {videos.length === 0 && (
                <p className="text-center text-gray-500 py-8">Henüz video eklenmemiş</p>
              )}
            </div>
          )}

          {/* Instructors */}
          {activeTab === 'instructors' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {instructors.map((instructor) => (
                <div key={instructor.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300">
                  <div className="flex items-start gap-3">
                    {instructor.photo_url && (
                      <img
                        src={instructor.photo_url}
                        alt={instructor.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{instructor.name}</h3>
                      <p className="text-sm text-gray-600">{instructor.title}</p>
                      {instructor.experience_years && (
                        <p className="text-sm text-gray-500 mt-1">
                          {instructor.experience_years} yıl deneyim
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete('instructors', instructor.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
              {instructors.length === 0 && (
                <p className="text-center text-gray-500 py-8 col-span-full">
                  Henüz eğitmen eklenmemiş
                </p>
              )}
            </div>
          )}

          {/* Exams Tab */}
          {activeTab === 'exams' && (
            <div className="text-center py-8">
              <p className="text-gray-500">Sınav sistemi yakında eklenecek</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {activeTab === 'topics' && 'Yeni Konu Ekle'}
              {activeTab === 'notes' && 'Yeni Not Ekle'}
              {activeTab === 'videos' && 'Yeni Video Ekle'}
              {activeTab === 'instructors' && 'Yeni Eğitmen Ekle'}
            </h2>

            {/* Topic Form */}
            {activeTab === 'topics' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">İçerik</label>
                  <textarea
                    value={formData.content || ''}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={5}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Süre (dakika)</label>
                    <input
                      type="number"
                      value={formData.duration_minutes || ''}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_free || false}
                        onChange={(e) => setFormData({ ...formData, is_free: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Ücretsiz</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Note Form */}
            {activeTab === 'notes' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dosya URL</label>
                  <input
                    type="text"
                    value={formData.file_url || ''}
                    onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="https://example.com/file.pdf"
                  />
                </div>
              </div>
            )}

            {/* Video Form */}
            {activeTab === 'videos' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
                  <input
                    type="text"
                    value={formData.video_url || ''}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Süre (dakika)</label>
                    <input
                      type="number"
                      value={formData.duration_minutes || ''}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_free || false}
                        onChange={(e) => setFormData({ ...formData, is_free: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Ücretsiz</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Instructor Form */}
            {activeTab === 'instructors' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ünvan</label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Biyografi</label>
                  <textarea
                    value={formData.bio || ''}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fotoğraf URL</label>
                  <input
                    type="text"
                    value={formData.photo_url || ''}
                    onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Uzmanlık Alanı</label>
                  <input
                    type="text"
                    value={formData.specialization || ''}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deneyim (yıl)</label>
                  <input
                    type="number"
                    value={formData.experience_years || ''}
                    onChange={(e) => setFormData({ ...formData, experience_years: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  if (activeTab === 'topics') handleAddTopic();
                  else if (activeTab === 'notes') handleAddNote();
                  else if (activeTab === 'videos') handleAddVideo();
                  else if (activeTab === 'instructors') handleAddInstructor();
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Kaydet
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({});
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
