'use client'

import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Calculator, Globe, ArrowRight, ArrowLeft } from 'lucide-react'

export default function SinifPage() {
  const router = useRouter()
  const params = useParams()
  const classId = params.classId as string
  const classNumber = classId.replace('sinif-', '')

  const subjects = [
    {
      id: 'ingilizce',
      title: 'İNGİLİZCE DERSLERİ',
      description: 'İngilizce dil becerilerinizi geliştirin',
      icon: Globe,
      gradient: 'from-blue-500 to-cyan-500',
      color: 'blue'
    },
    {
      id: 'matematik',
      title: 'MATEMATİK DERSLERİ',
      description: 'Matematik yeteneklerinizi güçlendirin',
      icon: Calculator,
      gradient: 'from-purple-500 to-pink-500',
      color: 'purple'
    },
    {
      id: 'turkce',
      title: 'TÜRKÇE DERSLERİ',
      description: 'Türkçe dil bilgisi ve okuma yazma',
      icon: BookOpen,
      gradient: 'from-green-500 to-teal-500',
      color: 'green'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-8 bg-white/80 backdrop-blur-sm hover:bg-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri Dön
        </Button>

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full border border-orange-200 shadow-lg mb-6">
            <span className="text-4xl mr-3">{classNumber}️⃣</span>
            <span className="text-sm text-gray-700 font-medium">{classNumber}. Sınıf</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent mb-6">
            {classNumber}. SINIF DERSLERİ
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Ders seçimi yaparak içeriklere erişebilirsiniz
          </p>
        </div>

        {/* Subject Selection */}
        <div className="grid md:grid-cols-3 gap-8">
          {subjects.map((subject) => {
            const Icon = subject.icon
            return (
              <Card 
                key={subject.id}
                className="group relative bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105 cursor-pointer overflow-hidden rounded-3xl"
                onClick={() => router.push(`/courses/ilkokul/sinif-${classNumber}/${subject.id}`)}
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${subject.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                
                <CardContent className="relative p-10 text-center space-y-6">
                  {/* Icon */}
                  <div className={`w-20 h-20 mx-auto bg-gradient-to-br ${subject.gradient} rounded-3xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                    <Icon className="w-10 h-10 text-white" />
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl font-bold text-gray-900 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text" style={{
                    backgroundImage: subject.gradient.includes('blue') ? 'linear-gradient(to right, rgb(59, 130, 246), rgb(6, 182, 212))' :
                                    subject.gradient.includes('purple') ? 'linear-gradient(to right, rgb(168, 85, 247), rgb(236, 72, 153))' :
                                    'linear-gradient(to right, rgb(34, 197, 94), rgb(20, 184, 166))'
                  }}>
                    {subject.title}
                  </h2>

                  {/* Description */}
                  <p className="text-gray-600 leading-relaxed">
                    {subject.description}
                  </p>

                  {/* Button */}
                  <Button 
                    className={`group-hover:scale-110 transition-all duration-300 bg-gradient-to-r ${subject.gradient} text-white font-bold px-6 py-3 rounded-2xl shadow-lg w-full`}
                  >
                    <span className="mr-2">Derse Git</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                  </Button>
                </CardContent>

                {/* Decorative Elements */}
                <div className={`absolute top-4 right-4 w-3 h-3 bg-${subject.color}-400/50 rounded-full animate-pulse`}></div>
                <div className={`absolute bottom-4 left-4 w-2 h-2 bg-${subject.color}-400/50 rounded-full animate-pulse delay-1000`}></div>
              </Card>
            )
          })}
        </div>

        {/* Info Section */}
        <div className="mt-16 text-center">
          <Card className="bg-gradient-to-r from-orange-500 to-pink-500 border-0 shadow-2xl rounded-3xl max-w-3xl mx-auto overflow-hidden">
            <CardContent className="p-8 text-white">
              <h3 className="text-3xl font-bold mb-4">
                🎓 Önemli Not
              </h3>
              <p className="text-lg leading-relaxed">
                Ders içeriklerine erişmek için ödeme yapmanız gerekmektedir. 
                Tüm derslerde <strong>video anlatımlar, ders notları, online sınavlar ve canlı ders desteği</strong> bulunmaktadır.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
