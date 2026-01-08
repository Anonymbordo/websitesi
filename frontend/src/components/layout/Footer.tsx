import Link from 'next/link'
import { useEffect, useState } from 'react'
import { coursesAPI, api } from '@/lib/api'
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin, BookOpen } from 'lucide-react'

export default function Footer() {
  const quickLinks = [
    { name: 'Hakkımızda', href: '/about' },
    { name: 'Kurslar', href: '/courses' },
    { name: 'Eğitmenler', href: '/instructors' },
    { name: 'Basında Biz', href: '/basinda-biz' },
    { name: 'Çözüm Ortaklarımız', href: '/cozum-ortaklari' },
    { name: 'İletişim', href: '/contact' },
    { name: 'SSS', href: '/faq' },
    { name: 'Blog', href: '/blog' },
  ]

  const [courseTitles, setCourseTitles] = useState<string[]>([])
  const [boxTitles, setBoxTitles] = useState<{title: string, route: string}[]>([])

  useEffect(() => {
    coursesAPI.getCourses()
      .then(res => {
        if (Array.isArray(res.data)) {
          const titles = Array.from(new Set(res.data.map((course: any) => course.title)))
          setCourseTitles(titles)
        }
      })
      .catch(() => {
        setCourseTitles([
          'React ile Modern Web Geliştirme',
          'Python ile Veri Bilimi',
          'JavaScript Temelleri',
          'UI/UX Tasarım Prensipleri',
          'Node.js ve Express',
          'Digital Marketing Stratejileri'
        ])
      })
    // Ana kategori başlıkları - hardcoded çünkü bunlar sabit kategoriler
    setBoxTitles([
      { title: 'İLKOKUL DERSLERİ', route: '/courses/ilkokul' },
      { title: 'ORTAOKUL DERSLERİ', route: '/courses/ortaokul' },
      { title: 'LİSE DERSLERİ', route: '/courses/lise' },
      { title: 'YABANCI DİL DERSLERİ', route: '/courses/yabanci-dil' },
      { title: 'KİŞİSEL GELİŞİM', route: '/courses/kisisel-gelisim' },
      { title: 'YAZILIM EĞİTİMLERİ', route: '/courses' }
    ])
  }, [])

  const legalLinks = [
    { name: 'Kullanım Şartları', href: '/terms' },
    { name: 'Gizlilik Politikası', href: '/privacy' },
    { name: 'Çerez Politikası', href: '/cookies' },
    { name: 'KVKK', href: '/kvkk' },
    { name: 'İade / İptal', href: '/iade-iptal' },
    { name: 'Mesafeli Satış', href: '/mesafeli-satis' },
  ]

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo ve Açıklama */}
          <div className="col-span-1 lg:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Mikrokurs</span>
            </Link>
            <p className="text-gray-300 mb-6 max-w-md">
              Türkiye'nin en kapsamlı online eğitim platformu. Uzman eğitmenlerden binlerce kurs, 
              yapay zeka destekli kişiselleştirilmiş öğrenme deneyimi ile 
              kariyerinizi ileriye taşıyın.
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-3 text-gray-300">
                <Mail className="w-4 h-4" />
                <span>info@mikrokurs.com</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <Phone className="w-4 h-4" />
                <span>0216-766 26 25 / 0532-429 58 25</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <MapPin className="w-4 h-4" />
                <span>Bağlarbaşı Mahallesi Bağdat Caddesi No: 350/42 (Ercan İş Merkezi), Maltepe/İstanbul</span>
              </div>
            </div>
          </div>

          {/* Hızlı Linkler */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Hızlı Linkler</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Kurs ve Box Başlıkları */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Kurs & Kategori Başlıkları</h3>
            <ul className="space-y-2">
              {boxTitles.map((item) => (
                <li key={item.title}>
                  <Link 
                    href={item.route}
                    className="text-blue-300 hover:text-white transition-colors font-bold"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sosyal Medya ve Alt Bilgiler */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex space-x-6 mb-4 md:mb-0">
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-end space-x-6 text-sm text-gray-400">
              {legalLinks.map((link) => (
                <Link 
                  key={link.name}
                  href={link.href}
                  className="hover:text-white transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
          
          <div className="text-center text-gray-400 text-sm mt-4">
            <p>&copy; 2025 Mikrokurs. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}