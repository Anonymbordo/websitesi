'use client'

import { 
  Target, 
  Users, 
  Trophy, 
  Heart,
  BookOpen,
  Award,
  TrendingUp,
  Shield,
  Zap,
  Globe,
  Star,
  Quote,
  CheckCircle
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function AboutPage() {
  // If admin created a page with slug 'about', render it instead of the default about UI
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('local_pages')
      if (raw) {
        const pages = JSON.parse(raw)
        const found = pages.find((p: any) => ((p.slug || '').toString().replace(/^\//,'') === 'about'))
        if (found && found.content) {
          return (
            <div className="max-w-4xl mx-auto p-8 space-y-6">
              <h1 className="text-3xl font-bold">{found.title}</h1>
              <div className="prose" dangerouslySetInnerHTML={{ __html: found.content }} />
            </div>
          )
        }
      }
    } catch (e) {
      // ignore and render default
    }
  }
  const stats = [
    { icon: Users, label: 'Aktif Öğrenci', value: '50,000+', color: 'text-blue-600' },
    { icon: BookOpen, label: 'Online Kurs', value: '1,500+', color: 'text-green-600' },
    { icon: Award, label: 'Uzman Eğitmen', value: '200+', color: 'text-purple-600' },
    { icon: Trophy, label: 'Tamamlanan Proje', value: '10,000+', color: 'text-orange-600' }
  ]

  const values = [
    {
      icon: Target,
      title: 'Misyonumuz',
      description: 'Kaliteli eğitimi herkese ulaştırarak, bireysel ve mesleki gelişimi desteklemek.',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      icon: Heart,
      title: 'Vizyonumuz',
      description: 'Türkiye\'nin önde gelen online eğitim platformu olmak ve global ölçekte tanınır olmak.',
      color: 'bg-red-100 text-red-600'
    },
    {
      icon: Shield,
      title: 'Değerlerimiz',
      description: 'Kalite, güvenilirlik, yenilikçilik ve öğrenci odaklılık temel değerlerimizdir.',
      color: 'bg-green-100 text-green-600'
    }
  ]

  const features = [
    {
      icon: Zap,
      title: 'Hızlı Öğrenme',
      description: 'Modern öğretim methodları ile hızlı ve etkili öğrenme deneyimi'
    },
    {
      icon: Globe,
      title: 'Global Erişim',
      description: 'Dünyanın her yerinden 7/24 erişilebilir online platform'
    },
    {
      icon: Award,
      title: 'Sertifikalı Eğitim',
      description: 'Tamamlanan kurslar için geçerli ve tanınır sertifikalar'
    },
    {
      icon: Users,
      title: 'Topluluk',
      description: 'Güçlü öğrenci ve eğitmen topluluğu ile networking imkanı'
    }
  ]

  const testimonials = [
    {
      name: 'Ahmet Kaya',
      role: 'Software Developer',
      content: 'Bu platform sayesinde kariyerimi tamamen değiştirdim. React kursları gerçekten çok kaliteli.',
      rating: 5,
      avatar: 'AK'
    },
    {
      name: 'Zeynep Demir',
      role: 'UI/UX Designer',
      content: 'Tasarım kurslarındaki pratik örnekler ve projeler çok faydalı. Herkese tavsiye ederim.',
      rating: 5,
      avatar: 'ZD'
    },
    {
      name: 'Mehmet Özkan',
      role: 'Data Scientist',
      content: 'Veri bilimi alanında kendimi geliştirmek için aldığım kurslar beklentilerimi aştı.',
      rating: 5,
      avatar: 'MÖ'
    }
  ]

  const timeline = [
    {
      year: '2020',
      title: 'Kuruluş',
      description: 'Platform kuruldu ve ilk kurslar yayınlandı'
    },
    {
      year: '2021',
      title: 'Büyüme',
      description: '10,000 öğrenci ve 50 kursa ulaştık'
    },
    {
      year: '2022',
      title: 'Genişleme',
      description: 'Mobil uygulama lansmanı ve uluslararası açılım'
    },
    {
      year: '2023',
      title: 'İnovasyon',
      description: 'AI destekli öğrenme sistemi devreye girdi'
    },
    {
      year: '2024',
      title: 'Liderlik',
      description: 'Türkiye\'nin en büyük online eğitim platformu olduk'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-6">
            Hakkımızda
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
            Eğitimde yenilikçi çözümler sunarak, öğrencilerimizin hedeflerine ulaşmalarını sağlıyoruz.
            Modern teknoloji ile kaliteli eğitimi buluşturuyoruz.
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-white shadow-lg flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-8 h-8" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission, Vision, Values */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Kimiz ve Neler Yapıyoruz?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Eğitim alanında fark yaratmak için var olan değerlerimiz ve hedeflerimiz
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105">
                <CardContent className="p-8 text-center">
                  <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl ${value.color} flex items-center justify-center`}>
                    <value.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{value.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Neden Bizi Tercih Etmelisiniz?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Platformumuzun sunduğu benzersiz özellikler ve avantajlar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Yolculuğumuz
            </h2>
            <p className="text-xl text-gray-600">
              Kurulduğumuz günden bugüne kadar olan gelişimimiz
            </p>
          </div>

          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-600 to-purple-600"></div>
            
            <div className="space-y-12">
              {timeline.map((item, index) => (
                <div key={index} className="relative flex items-center">
                  {/* Timeline Dot */}
                  <div className="absolute left-6 w-4 h-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full border-4 border-white shadow-lg"></div>
                  
                  {/* Content */}
                  <Card className="ml-16 bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-center mb-2">
                        <span className="text-2xl font-bold text-blue-600 mr-4">{item.year}</span>
                        <h3 className="text-xl font-semibold text-gray-900">{item.title}</h3>
                      </div>
                      <p className="text-gray-600">{item.description}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Öğrencilerimiz Ne Diyor?
            </h2>
            <p className="text-xl text-gray-600">
              Başarı hikayelerinden bazıları
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-8">
                  {/* Quote Icon */}
                  <Quote className="w-8 h-8 text-blue-600 mb-4" />
                  
                  {/* Content */}
                  <p className="text-gray-700 mb-6 italic">"{testimonial.content}"</p>
                  
                  {/* Rating */}
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  
                  {/* Author */}
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-600">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Values */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Takım Değerlerimiz
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Başarımızın ardındaki ilkeler ve yaklaşımlarımız
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Kalite Odaklılık',
                description: 'Her kursiyer için en yüksek kalitede eğitim içeriği üretiyoruz',
                icon: Award
              },
              {
                title: 'Sürekli İyileştirme',
                description: 'Geri bildirimlerle platformumuzu sürekli geliştiriyoruz',
                icon: TrendingUp
              },
              {
                title: 'Öğrenci Memnuniyeti',
                description: 'Öğrenci başarısı bizim en büyük motivasyon kaynağımız',
                icon: Heart
              },
              {
                title: 'İnovasyon',
                description: 'Eğitim teknolojilerinde öncü olmaya devam ediyoruz',
                icon: Zap
              },
              {
                title: 'Şeffaflık',
                description: 'Açık ve net iletişim ile güven oluşturuyoruz',
                icon: Shield
              },
              {
                title: 'Topluluk',
                description: 'Güçlü bir öğrenme topluluğu inşa ediyoruz',
                icon: Users
              }
            ].map((value, index) => (
              <Card key={index} className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 mb-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                    <value.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{value.title}</h3>
                  <p className="text-gray-600">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Eğitim Yolculuğunuza Bugün Başlayın
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Binlerce kaliteli kurs arasından size en uygun olanını seçin ve kariyerinizi ileriye taşıyın.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/courses">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 rounded-xl px-8">
                Kursları İncele
              </Button>
            </Link>
            <Link href="/instructors/apply">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 rounded-xl px-8">
                Eğitmen Ol
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}