'use client';

import { useState, useEffect } from 'react';

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

export default function SchoolCoursesPage() {
  const [courses, setCourses] = useState<SchoolCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const levels = [
    { value: 'ilkokul', label: 'İlkokul', grades: [3, 4] },
    { value: 'ortaokul', label: 'Ortaokul', grades: [5, 6, 7, 8] },
    { value: 'lise', label: 'Lise', grades: [9, 10, 11, 12] }
  ];

  const subjects: { [key: string]: { value: string; label: string }[] } = {
    ilkokul: [
      { value: 'turkce', label: 'Türkçe' },
      { value: 'matematik', label: 'Matematik' },
      { value: 'ingilizce', label: 'İngilizce' }
    ],
    ortaokul: [
      { value: 'turkce', label: 'Türkçe' },
      { value: 'matematik', label: 'Matematik' },
      { value: 'fen-bilimleri', label: 'Fen Bilimleri' },
      { value: 'sosyal-bilgiler', label: 'Sosyal Bilgiler' },
      { value: 'ingilizce', label: 'İngilizce' },
      { value: 'din-kulturu', label: 'Din Kültürü' },
      { value: 'gorsel-sanatlar', label: 'Görsel Sanatlar' },
      { value: 'muzik', label: 'Müzik' },
      { value: 'beden-egitimi', label: 'Beden Eğitimi' }
    ],
    lise: [
      { value: 'turk-dili-edebiyat', label: 'Türk Dili ve Edebiyatı' },
      { value: 'matematik', label: 'Matematik' },
      { value: 'fizik', label: 'Fizik' },
      { value: 'kimya', label: 'Kimya' },
      { value: 'biyoloji', label: 'Biyoloji' },
      { value: 'tarih', label: 'Tarih' },
      { value: 'cografya', label: 'Coğrafya' },
      { value: 'ingilizce', label: 'İngilizce' }
    ]
  };

  useEffect(() => {
    fetchCourses();
  }, [selectedLevel, selectedGrade, selectedSubject]);

  const fetchCourses = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedLevel) params.append('level', selectedLevel);
      if (selectedGrade) params.append('grade', selectedGrade);
      if (selectedSubject) params.append('subject', selectedSubject);

      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(
        `${apiUrl}/api/school-courses/courses?${params}`,
        { headers }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseClick = (course: SchoolCourse) => {
    window.location.href = `/admin/school-courses/${course.id}`;
  };

  const getGradesForLevel = () => {
    const level = levels.find(l => l.value === selectedLevel);
    return level ? level.grades : [];
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Okul Dersleri Yönetimi</h1>
        <p className="text-gray-600">
          İlkokul, Ortaokul ve Lise derslerini yönetin
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seviye
            </label>
            <select
              value={selectedLevel}
              onChange={(e) => {
                setSelectedLevel(e.target.value);
                setSelectedGrade('');
                setSelectedSubject('');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tüm Seviyeler</option>
              {levels.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sınıf
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                setSelectedSubject('');
              }}
              disabled={!selectedLevel}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Tüm Sınıflar</option>
              {getGradesForLevel().map(grade => (
                <option key={grade} value={grade}>
                  {grade}. Sınıf
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ders
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={!selectedLevel}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Tüm Dersler</option>
              {selectedLevel && subjects[selectedLevel]?.map(subject => (
                <option key={subject.value} value={subject.value}>
                  {subject.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 text-lg">Ders bulunamadı</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {courses.map(course => (
            <div
              key={course.id}
              onClick={() => handleCourseClick(course)}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                    {course.level === 'ilkokul' && 'İlkokul'}
                    {course.level === 'ortaokul' && 'Ortaokul'}
                    {course.level === 'lise' && 'Lise'}
                  </span>
                  {!course.is_active && (
                    <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                      Pasif
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {course.title}
                </h3>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {course.description}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className="text-2xl font-bold text-blue-600">
                    ₺{course.price}
                  </span>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                    İçerik Yönet
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
