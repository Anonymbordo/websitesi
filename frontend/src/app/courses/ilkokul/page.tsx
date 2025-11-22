'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, GraduationCap, ArrowRight } from 'lucide-react'

export default function IlkokulPage() {
  const router = useRouter()

  const classes = [
    {
      id: 3,
      title: '3. SINIF DERSLERİ',
      description: 'Üçüncü sınıf ders içeriklerine ulaşın',
      icon: '3️⃣',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      id: 4,
      title: '4. SINIF DERSLERİ',
      description: 'Dördüncü sınıf ders içeriklerine ulaşın',
      icon: '4️⃣',
      gradient: 'from-purple-500 to-pink-500'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full border border-orange-200 shadow-lg mb-6">
            <BookOpen className="w-5 h-5 text-orange-600 mr-2" />
            <span className="text-sm text-gray-700 font-medium">İlkokul</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent mb-6">
            Temel Eğitim Dersleri
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Sınıf seviyenizi seçerek ders içeriklerine ulaşabilirsiniz
          </p>
        </div>

        {/* Class Selection */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {classes.map((classItem) => (
            <Card 
              key={classItem.id}
              className="group relative bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105 cursor-pointer overflow-hidden rounded-3xl"
              onClick={() => router.push(`/courses/ilkokul/sinif-${classItem.id}`)}
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${classItem.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
              
              <CardContent className="relative p-12 text-center space-y-6">
                {/* Icon */}
                <div className="text-8xl mb-4 group-hover:scale-110 transition-transform duration-500">
                  {classItem.icon}
                </div>

                {/* Title */}
                <h2 className="text-3xl font-bold text-gray-900 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-orange-600 group-hover:to-pink-600 group-hover:bg-clip-text transition-all duration-300">
                  {classItem.title}
                </h2>

                {/* Description */}
                <p className="text-gray-600 text-lg leading-relaxed">
                  {classItem.description}
                </p>

                {/* Button */}
                <Button 
                  className={`group-hover:scale-110 transition-all duration-300 bg-gradient-to-r ${classItem.gradient} text-white font-bold px-8 py-6 text-lg rounded-2xl shadow-lg`}
                  size="lg"
                >
                  <span className="mr-2">Derslere Git</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </Button>
              </CardContent>

              {/* Decorative Elements */}
              <div className="absolute top-4 right-4 w-3 h-3 bg-orange-400/50 rounded-full animate-pulse"></div>
              <div className="absolute bottom-4 left-4 w-2 h-2 bg-pink-400/50 rounded-full animate-pulse delay-1000"></div>
            </Card>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-16 text-center">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-3xl max-w-3xl mx-auto">
            <CardContent className="p-8">
              <GraduationCap className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Kapsamlı Eğitim İçerikleri
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Her ders için video dersler, ders notları, online sınavlar ve canlı ders imkanı sunuyoruz. 
                Uzman eğitmenlerimiz ile birebir çalışma fırsatı yakalayın.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
