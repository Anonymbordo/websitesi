'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, ArrowLeft } from 'lucide-react'

export default function IngilizcePage() {
  const router = useRouter()

  const levels = [
    { id: 'a1', title: 'A-1', name: 'Başlangıç', desc: 'Temel kelime ve ifadeler', color: 'from-green-400 to-emerald-500', emoji: '🌱' },
    { id: 'a2', title: 'A-2', name: 'Temel', desc: 'Günlük konuşmalar', color: 'from-green-500 to-teal-500', emoji: '🌿' },
    { id: 'b1', title: 'B-1', name: 'Orta', desc: 'Bağımsız kullanım', color: 'from-blue-400 to-cyan-500', emoji: '🌊' },
    { id: 'b2', title: 'B-2', name: 'Orta Üstü', desc: 'Akıcı iletişim', color: 'from-blue-500 to-indigo-500', emoji: '🌌' },
    { id: 'c1', title: 'C-1', name: 'İleri', desc: 'Etkili ve esnek kullanım', color: 'from-purple-500 to-pink-500', emoji: '⭐' },
    { id: 'c2', title: 'C-2', name: 'Profesyonel', desc: 'Ana dil seviyesi', color: 'from-pink-500 to-rose-500', emoji: '👑' }
  ]

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100"></div>
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
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
          <div className="inline-flex items-center px-8 py-4 bg-white/90 backdrop-blur-md rounded-full border-2 border-blue-200/50 shadow-xl mb-8 hover:scale-105 transition-transform duration-300">
            <span className="text-5xl mr-4 drop-shadow-lg">🇬🇧</span>
            <span className="text-lg text-gray-700 font-bold tracking-wide">İNGİLİZCE</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-extrabold mb-8 relative">
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent drop-shadow-lg">
              İngilizce Seviyeler
            </span>
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-40 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
          </h1>
          
          <p className="text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed font-medium mt-8">
            CEFR standartlarına uygun seviye seçimi yaparak İngilizce öğrenmeye başlayın
          </p>
        </div>

        {/* Level Selection */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {levels.map((level, index) => (
            <Card 
              key={level.id}
              className="group relative bg-white/95 backdrop-blur-lg border-2 border-white/50 shadow-2xl hover:shadow-3xl transition-all duration-700 transform hover:scale-105 hover:-translate-y-3 cursor-pointer overflow-hidden rounded-[2rem]"
              onClick={() => router.push(`/courses/yabanci-dil/ingilizce/${level.id}`)}
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${level.color} opacity-0 group-hover:opacity-15 transition-opacity duration-700`}></div>
              
              {/* Shine Effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </div>
              
              <CardContent className="relative p-8 text-center space-y-4">
                {/* Emoji with Glow */}
                <div className="relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${level.color} rounded-2xl blur-xl opacity-0 group-hover:opacity-70 transition-opacity duration-500`}></div>
                  <div className="relative text-6xl mb-4 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 drop-shadow-2xl">
                    {level.emoji}
                  </div>
                </div>

                {/* Level Badge */}
                <div className={`inline-block px-6 py-2 bg-gradient-to-r ${level.color} text-white rounded-full font-extrabold text-2xl shadow-lg`}>
                  {level.title}
                </div>

                {/* Title */}
                <h3 className="text-xl font-extrabold text-gray-800">
                  {level.name}
                </h3>

                {/* Description */}
                <p className="text-gray-600 text-sm leading-relaxed font-medium">
                  {level.desc}
                </p>

                {/* Button */}
                <div className="pt-2">
                  <Button 
                    className={`group-hover:scale-105 transition-all duration-500 bg-gradient-to-r ${level.color} hover:shadow-2xl text-white font-bold px-6 py-4 text-sm rounded-xl shadow-xl w-full relative overflow-hidden`}
                  >
                    <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
                    <span className="relative flex items-center justify-center">
                      <span className="mr-2">Seviyeyi Seç</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform duration-300" />
                    </span>
                  </Button>
                </div>
              </CardContent>

              {/* Floating Decorative Elements */}
              <div className="absolute top-4 right-4 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-40"></div>
              <div className="absolute bottom-4 left-4 w-2 h-2 bg-indigo-400 rounded-full animate-pulse opacity-40"></div>
            </Card>
          ))}
        </div>

        {/* Info Section */}
        <div className="text-center">
          <Card className="relative bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 border-0 shadow-3xl rounded-[2.5rem] max-w-4xl mx-auto overflow-hidden">
            {/* Animated Shine */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
            </div>
            
            <CardContent className="relative p-12 text-white">
              <div className="mb-6">
                <span className="text-7xl animate-bounce inline-block">📚</span>
              </div>
              
              <h3 className="text-4xl font-extrabold mb-6 drop-shadow-lg">
                Her Seviye İçin Kapsamlı Eğitim
              </h3>
              
              <p className="text-xl leading-relaxed max-w-2xl mx-auto font-medium opacity-95">
                Her seviyede <strong className="font-extrabold text-yellow-300">video dersler, interaktif alıştırmalar, konuşma pratiği, dinleme egzersizleri ve sertifika</strong> programları bulunmaktadır.
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
