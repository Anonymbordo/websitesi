'use client'

import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BookOpen, 
  Calculator, 
  Globe, 
  Atom,
  FlaskConical,
  Dna,
  Map,
  Landmark,
  ArrowRight, 
  ArrowLeft 
} from 'lucide-react'

export default function LiseSinifPage() {
  const router = useRouter()
  const params = useParams()
  const classId = params.classId as string
  const classNumber = classId.replace('sinif-', '')

  const subjects = [
    {
      id: 'turk-dili-edebiyat',
      title: 'TÜRK DİLİ VE EDEBİYATI',
      description: 'Dil bilgisi ve edebiyat dersleri',
      icon: BookOpen,
      gradient: 'from-amber-500 to-orange-500',
      color: 'amber'
    },
    {
      id: 'matematik',
      title: 'MATEMATİK',
      description: 'Matematik dersleri ve soru çözümleri',
      icon: Calculator,
      gradient: 'from-blue-500 to-cyan-500',
      color: 'blue'
    },
    {
      id: 'fizik',
      title: 'FİZİK',
      description: 'Fizik konuları ve deney videoları',
      icon: Atom,
      gradient: 'from-purple-500 to-pink-500',
      color: 'purple'
    },
    {
      id: 'kimya',
      title: 'KİMYA',
      description: 'Kimya dersleri ve reaksiyon videoları',
      icon: FlaskConical,
      gradient: 'from-green-500 to-emerald-500',
      color: 'green'
    },
    {
      id: 'biyoloji',
      title: 'BİYOLOJİ',
      description: 'Biyoloji konuları ve görsel anlatımlar',
      icon: Dna,
      gradient: 'from-teal-500 to-cyan-500',
      color: 'teal'
    },
    {
      id: 'tarih',
      title: 'TARİH',
      description: 'Tarih dersleri ve kronoloji',
      icon: Landmark,
      gradient: 'from-rose-500 to-red-500',
      color: 'rose'
    },
    {
      id: 'cografya',
      title: 'COĞRAFYA',
      description: 'Coğrafya dersleri ve harita çalışmaları',
      icon: Map,
      gradient: 'from-indigo-500 to-purple-500',
      color: 'indigo'
    },
    {
      id: 'ingilizce',
      title: 'İNGİLİZCE',
      description: 'İngilizce dil becerilerini geliştirin',
      icon: Globe,
      gradient: 'from-sky-500 to-blue-500',
      color: 'sky'
    }
  ]

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100"></div>
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-8 bg-white/90 backdrop-blur-md hover:bg-white border-2 border-white/50 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 font-bold"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri Dön
        </Button>

        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center px-8 py-4 bg-white/90 backdrop-blur-md rounded-full border-2 border-purple-200/50 shadow-xl mb-8 hover:scale-105 transition-transform duration-300">
            <span className="text-5xl mr-4 drop-shadow-lg">{classNumber === '9' ? '9️⃣' : classNumber === '10' ? '🔟' : classNumber === '11' ? '1️⃣1️⃣' : '1️⃣2️⃣'}</span>
            <span className="text-lg text-gray-700 font-bold tracking-wide">{classNumber}. SINIF</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-extrabold mb-8 relative">
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-lg">
              {classNumber}. SINIF DERSLERİ
            </span>
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-40 h-1 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full"></div>
          </h1>
          
          <p className="text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed font-medium mt-8">
            Ders seçimi yaparak içeriklere erişebilirsiniz
          </p>
        </div>

        {/* Subject Selection */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {subjects.map((subject, index) => {
            const Icon = subject.icon
            return (
              <Card 
                key={subject.id}
                className="group relative bg-white/95 backdrop-blur-lg border-2 border-white/50 shadow-2xl hover:shadow-3xl transition-all duration-700 transform hover:scale-105 hover:-translate-y-3 cursor-pointer overflow-hidden rounded-[2rem]"
                onClick={() => router.push(`/courses/lise/sinif-${classNumber}/${subject.id}`)}
                style={{
                  animationDelay: `${index * 100}ms`
                }}
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${subject.gradient} opacity-0 group-hover:opacity-15 transition-opacity duration-700`}></div>
                
                {/* Shine Effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </div>
                
                <CardContent className="relative p-8 text-center space-y-4">
                  {/* Icon with Glow */}
                  <div className="relative">
                    <div className={`absolute inset-0 bg-gradient-to-br ${subject.gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-70 transition-opacity duration-500`}></div>
                    <div className={`relative w-20 h-20 mx-auto bg-gradient-to-br ${subject.gradient} rounded-2xl flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                      <Icon className="w-10 h-10 text-white drop-shadow-lg" />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-extrabold relative">
                    <span className={`bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent group-hover:from-${subject.color}-600 group-hover:to-${subject.color}-400 transition-all duration-500`}>
                      {subject.title}
                    </span>
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 text-sm leading-relaxed font-medium group-hover:text-gray-700 transition-colors duration-300">
                    {subject.description}
                  </p>

                  {/* Button */}
                  <div className="pt-2">
                    <Button 
                      className={`group-hover:scale-105 transition-all duration-500 bg-gradient-to-r ${subject.gradient} hover:shadow-2xl text-white font-bold px-6 py-4 text-sm rounded-xl shadow-xl w-full relative overflow-hidden`}
                    >
                      <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
                      <span className="relative flex items-center justify-center">
                        <span className="mr-2">Derse Git</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform duration-300" />
                      </span>
                    </Button>
                  </div>
                </CardContent>

                {/* Floating Decorative Elements */}
                <div className={`absolute top-4 right-4 w-2 h-2 bg-${subject.color}-400 rounded-full animate-ping opacity-40`}></div>
                <div className={`absolute bottom-4 left-4 w-2 h-2 bg-${subject.color}-400 rounded-full animate-pulse opacity-40`}></div>
              </Card>
            )
          })}
        </div>

        {/* Info Section */}
        <div className="text-center">
          <Card className="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 border-0 shadow-3xl rounded-[2.5rem] max-w-4xl mx-auto overflow-hidden">
            {/* Animated Shine */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
            </div>
            
            <CardContent className="relative p-12 text-white">
              <div className="mb-6">
                <span className="text-7xl animate-bounce inline-block">🎓</span>
              </div>
              
              <h3 className="text-4xl font-extrabold mb-6 drop-shadow-lg">
                YKS Hazırlık Paketleri
              </h3>
              
              <p className="text-xl leading-relaxed max-w-2xl mx-auto font-medium opacity-95">
                Ders içeriklerine erişmek için ödeme yapmanız gerekmektedir. 
                Tüm derslerde <strong className="font-extrabold text-yellow-300">video anlatımlar, ders notları, test çözümleri, online sınavlar ve canlı ders desteği</strong> bulunmaktadır.
              </p>

              {/* Decorative Stars */}
              <div className="flex justify-center gap-3 mt-8">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-3xl animate-pulse" style={{ animationDelay: `${i * 200}ms` }}>⭐</span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add animations */}
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
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </div>
  )
}
