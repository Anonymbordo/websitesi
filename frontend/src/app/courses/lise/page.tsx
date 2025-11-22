'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, GraduationCap, ArrowRight } from 'lucide-react'

export default function LisePage() {
  const router = useRouter()

  const classes = [
    {
      id: 9,
      title: '9. SINIF DERSLERİ',
      description: 'Dokuzuncu sınıf ders içeriklerine ulaşın',
      icon: '9️⃣',
      gradient: 'from-indigo-500 to-blue-500',
      bgPattern: 'bg-indigo-50'
    },
    {
      id: 10,
      title: '10. SINIF DERSLERİ',
      description: 'Onuncu sınıf ders içeriklerine ulaşın',
      icon: '🔟',
      gradient: 'from-violet-500 to-purple-500',
      bgPattern: 'bg-violet-50'
    },
    {
      id: 11,
      title: '11. SINIF DERSLERİ',
      description: 'On birinci sınıf ders içeriklerine ulaşın',
      icon: '1️⃣1️⃣',
      gradient: 'from-fuchsia-500 to-pink-500',
      bgPattern: 'bg-fuchsia-50'
    },
    {
      id: 12,
      title: '12. SINIF DERSLERİ',
      description: 'On ikinci sınıf ders içeriklerine ulaşın - YKS Hazırlık',
      icon: '1️⃣2️⃣',
      gradient: 'from-rose-500 to-red-500',
      bgPattern: 'bg-rose-50'
    }
  ]

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100"></div>
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center px-6 py-3 bg-white/90 backdrop-blur-md rounded-full border-2 border-purple-200/50 shadow-xl mb-8 hover:scale-105 transition-transform duration-300">
            <GraduationCap className="w-5 h-5 text-purple-600 mr-2 animate-pulse" />
            <span className="text-sm text-gray-700 font-bold tracking-wide">LİSE - YKS HAZIRLIK</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-extrabold mb-8 relative">
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-lg">
              YKS Hazırlık ve Okul Dersleri
            </span>
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full"></div>
          </h1>
          
          <p className="text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed font-medium mt-8">
            Sınıf seviyenizi seçerek ders içeriklerine ve YKS hazırlık materyallerine ulaşabilirsiniz
          </p>
        </div>

        {/* Class Selection */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {classes.map((classItem, index) => (
            <Card 
              key={classItem.id}
              className="group relative bg-white/95 backdrop-blur-lg border-2 border-white/50 shadow-2xl hover:shadow-3xl transition-all duration-700 transform hover:scale-105 hover:-translate-y-2 cursor-pointer overflow-hidden rounded-[2.5rem]"
              onClick={() => router.push(`/courses/lise/sinif-${classItem.id}`)}
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              {/* Animated Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${classItem.gradient} opacity-0 group-hover:opacity-15 transition-all duration-700`}></div>
              
              {/* Shine Effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </div>
              
              <CardContent className="relative p-10 text-center space-y-6">
                {/* Decorative Circle Background */}
                <div className={`absolute top-8 right-8 w-32 h-32 ${classItem.bgPattern} rounded-full opacity-20 group-hover:scale-150 transition-transform duration-700`}></div>
                
                {/* Icon with Glow */}
                <div className="relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${classItem.gradient} rounded-3xl blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500`}></div>
                  <div className="text-7xl mb-4 relative group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 filter drop-shadow-2xl">
                    {classItem.icon}
                  </div>
                </div>

                {/* Title with Gradient */}
                <h2 className="text-2xl font-extrabold relative">
                  <span className="bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent group-hover:from-indigo-600 group-hover:to-pink-600 transition-all duration-500">
                    {classItem.title}
                  </span>
                </h2>

                {/* Description */}
                <p className="text-gray-600 text-sm leading-relaxed font-medium group-hover:text-gray-700 transition-colors duration-300">
                  {classItem.description}
                </p>

                {/* Animated Button */}
                <div className="pt-2">
                  <Button 
                    className={`group-hover:scale-110 transition-all duration-500 bg-gradient-to-r ${classItem.gradient} hover:shadow-2xl text-white font-bold px-8 py-6 text-base rounded-2xl shadow-xl relative overflow-hidden w-full`}
                  >
                    <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
                    <span className="relative flex items-center justify-center">
                      <span className="mr-2">Derslere Git</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                    </span>
                  </Button>
                </div>
              </CardContent>

              {/* Floating Decorative Elements */}
              <div className="absolute top-6 right-6 w-4 h-4 bg-purple-400 rounded-full animate-ping opacity-40"></div>
              <div className="absolute bottom-6 left-6 w-3 h-3 bg-pink-400 rounded-full animate-pulse opacity-40"></div>
              <div className="absolute top-1/2 left-6 w-2 h-2 bg-indigo-400 rounded-full animate-bounce opacity-30"></div>
            </Card>
          ))}
        </div>

        {/* Info Section */}
        <div className="text-center">
          <Card className="relative bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 backdrop-blur-lg border-2 border-white/50 shadow-2xl rounded-[2.5rem] max-w-4xl mx-auto overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-300/20 to-purple-300/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-pink-300/20 to-fuchsia-300/20 rounded-full blur-3xl"></div>
            
            <CardContent className="relative p-12">
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-3xl shadow-xl mb-6 transform hover:rotate-12 transition-transform duration-300">
                  <GraduationCap className="w-10 h-10 text-white" />
                </div>
              </div>
              
              <h3 className="text-4xl font-extrabold mb-6">
                <span className="bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">
                  YKS'ye Hazırlanın
                </span>
              </h3>
              
              <p className="text-xl text-gray-700 leading-relaxed max-w-2xl mx-auto font-medium mb-8">
                Her ders için detaylı video anlatımlar, kapsamlı ders notları, test çözümleri ve canlı ders imkanı. 
                YKS'de başarı için ihtiyacınız olan her şey burada!
              </p>

              {/* Feature Pills */}
              <div className="flex flex-wrap justify-center gap-3">
                {['📹 Video Dersler', '📝 Ders Notları', '📊 Test Çözümleri', '✅ Online Sınav', '👨‍🏫 Canlı Ders', '🎯 YKS Taktikleri'].map((feature) => (
                  <span 
                    key={feature}
                    className="px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full text-sm font-bold text-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 border-2 border-purple-200/50"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add blob animation styles */}
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
