'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { BookOpen, ArrowLeft, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

interface Grade {
  id: string
  name: string
  subjects: string[]
}

const schoolTypes: Record<string, { title: string; icon: string; grades: Grade[] }> = {
  'ilkokul': {
    title: 'İlkokul Dersleri',
    icon: '🎒',
    grades: [
      {
        id: '3',
        name: '3. Sınıf',
        subjects: ['Türkçe', 'Matematik', 'Hayat Bilgisi', 'İngilizce']
      },
      {
        id: '4',
        name: '4. Sınıf',
        subjects: ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce']
      }
    ]
  },
  'ortaokul': {
    title: 'Ortaokul Dersleri',
    icon: '📚',
    grades: [
      {
        id: '5',
        name: '5. Sınıf',
        subjects: ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce', 'Din Kültürü']
      },
      {
        id: '6',
        name: '6. Sınıf',
        subjects: ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce', 'Din Kültürü']
      },
      {
        id: '7',
        name: '7. Sınıf',
        subjects: ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce', 'Din Kültürü']
      },
      {
        id: '8',
        name: '8. Sınıf',
        subjects: ['Türkçe', 'Matematik', 'Fen Bilimleri', 'İnkılap Tarihi', 'İngilizce', 'Din Kültürü', 'LGS Hazırlık']
      }
    ]
  },
  'lise': {
    title: 'Lise Dersleri',
    icon: '🎓',
    grades: [
      {
        id: '9',
        name: '9. Sınıf',
        subjects: ['Türk Dili ve Edebiyatı', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'İngilizce']
      },
      {
        id: '10',
        name: '10. Sınıf',
        subjects: ['Türk Dili ve Edebiyatı', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'İngilizce']
      },
      {
        id: '11',
        name: '11. Sınıf (Sayısal)',
        subjects: ['Türk Dili ve Edebiyatı', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'İngilizce']
      },
      {
        id: '11-ea',
        name: '11. Sınıf (Eşit Ağırlık)',
        subjects: ['Türk Dili ve Edebiyatı', 'Matematik', 'Tarih', 'Coğrafya', 'İngilizce']
      },
      {
        id: '11-sozel',
        name: '11. Sınıf (Sözel)',
        subjects: ['Türk Dili ve Edebiyatı', 'Tarih', 'Coğrafya', 'Felsefe', 'İngilizce']
      },
      {
        id: '12',
        name: '12. Sınıf (Sayısal)',
        subjects: ['Türk Dili ve Edebiyatı', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'İngilizce', 'YKS Hazırlık']
      },
      {
        id: '12-ea',
        name: '12. Sınıf (Eşit Ağırlık)',
        subjects: ['Türk Dili ve Edebiyatı', 'Matematik', 'Tarih', 'Coğrafya', 'İngilizce', 'YKS Hazırlık']
      },
      {
        id: '12-sozel',
        name: '12. Sınıf (Sözel)',
        subjects: ['Türk Dili ve Edebiyatı', 'Tarih', 'Coğrafya', 'Felsefe', 'İngilizce', 'YKS Hazırlık']
      }
    ]
  }
}

export default function SchoolTypePage() {
  const params = useParams()
  const router = useRouter()
  const schoolType = params?.schoolType as string
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null)

  const schoolData = schoolTypes[schoolType]

  if (!schoolData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Sayfa Bulunamadı</h1>
          <Link href="/courses">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              Kurslar Sayfasına Dön
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <Link href="/courses">
          <Button variant="outline" className="mb-8 rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kurslar Sayfasına Dön
          </Button>
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">{schoolData.icon}</div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-4">
            {schoolData.title}
          </h1>
          <p className="text-xl text-gray-600">
            Sınıf seçin ve derslere göz atın
          </p>
        </div>

        {/* Grade Selection */}
        {!selectedGrade ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schoolData.grades.map((grade) => (
              <Card
                key={grade.id}
                className="group cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white/90 backdrop-blur-sm border-0 rounded-3xl overflow-hidden"
                onClick={() => setSelectedGrade(grade.id)}
              >
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold group-hover:scale-110 transition-transform duration-300">
                      {grade.id.replace(/[^0-9]/g, '')}
                    </div>
                    <GraduationCap className="w-8 h-8 text-gray-400 group-hover:text-blue-600 transition-colors duration-300" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors duration-300">
                    {grade.name}
                  </h3>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600 mb-2">Dersler:</p>
                    <div className="flex flex-wrap gap-2">
                      {grade.subjects.map((subject) => (
                        <span
                          key={subject}
                          className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                        >
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Subject Selection */}
            <div className="mb-8">
              <Button
                variant="outline"
                onClick={() => setSelectedGrade(null)}
                className="rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Sınıf Seçimine Dön
              </Button>
            </div>

            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                {schoolData.grades.find(g => g.id === selectedGrade)?.name}
              </h2>
              <p className="text-lg text-gray-600">Ders seçin ve kursları inceleyin</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {schoolData.grades
                .find(g => g.id === selectedGrade)
                ?.subjects.map((subject) => (
                  <Link
                    key={subject}
                    href={`/courses?category=${encodeURIComponent(schoolType === 'ilkokul' ? 'İlkokul' : schoolType === 'ortaokul' ? 'Ortaokul' : 'Lise')}&search=${encodeURIComponent(`${selectedGrade}. sınıf ${subject}`)}`}
                  >
                    <Card className="group cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white/90 backdrop-blur-sm border-0 rounded-3xl overflow-hidden">
                      <CardContent className="p-8">
                        <div className="flex items-center space-x-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <BookOpen className="w-7 h-7 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                              {subject}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">Kursları görüntüle</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
