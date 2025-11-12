'use client'

import { useState } from 'react'
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Send,
  MessageCircle,
  HelpCircle,
  User,
  Building,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface ContactForm {
  name: string
  email: string
  phone: string
  subject: string
  category: string
  message: string
}

export default function ContactPage() {
  // If admin created a page with slug 'contact', render it instead of the default contact UI
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('local_pages')
      if (raw) {
        const pages = JSON.parse(raw)
        const found = pages.find((p: any) => ((p.slug || '').toString().replace(/^\//,'') === 'contact'))
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
  const [formData, setFormData] = useState<ContactForm>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    category: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')

  const contactInfo = [
    {
      icon: Mail,
      title: 'E-posta',
      value: 'info@egitimsitesi.com',
      description: 'Genel sorularınız için',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      icon: Phone,
      title: 'Telefon',
      value: '+90 212 XXX XX XX',
      description: 'Telefon desteği',
      color: 'bg-green-100 text-green-600'
    },
    {
      icon: MapPin,
      title: 'Adres',
      value: 'İstanbul, Türkiye',
      description: 'Merkez ofisimiz',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      icon: Clock,
      title: 'Çalışma Saatleri',
      value: '09:00 - 18:00',
      description: 'Pazartesi - Cuma',
      color: 'bg-orange-100 text-orange-600'
    }
  ]

  const categories = [
    { value: 'general', label: 'Genel Bilgi' },
    { value: 'technical', label: 'Teknik Destek' },
    { value: 'course', label: 'Kurs Hakkında' },
    { value: 'instructor', label: 'Eğitmen Başvurusu' },
    { value: 'payment', label: 'Ödeme/Fatura' },
    { value: 'partnership', label: 'İş Birliği' },
    { value: 'feedback', label: 'Geri Bildirim' },
    { value: 'other', label: 'Diğer' }
  ]

  const faqItems = [
    {
      question: 'Kurslar nasıl satın alınır?',
      answer: 'Kurs sayfasından "Satın Al" butonuna tıklayarak ödeme işlemini tamamlayabilirsiniz.'
    },
    {
      question: 'Sertifika nasıl alınır?',
      answer: 'Kursu %80 oranında tamamladığınızda otomatik olarak sertifikanız oluşturulur.'
    },
    {
      question: 'Kurs iadesi mümkün mü?',
      answer: 'Satın alma tarihinden itibaren 30 gün içinde koşulsuz iade edebilirsiniz.'
    },
    {
      question: 'Kurslara ne kadar süre erişebilirim?',
      answer: 'Satın aldığınız kurslara sınırsız süre erişiminiz bulunmaktadır.'
    }
  ]

  const handleInputChange = (field: keyof ContactForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  const validateForm = () => {
    if (!formData.name.trim()) return 'Lütfen adınızı giriniz'
    if (!formData.email.trim()) return 'Lütfen e-posta adresinizi giriniz'
    if (!formData.email.includes('@')) return 'Lütfen geçerli bir e-posta adresi giriniz'
    if (!formData.subject.trim()) return 'Lütfen konu başlığını giriniz'
    if (!formData.category) return 'Lütfen kategori seçiniz'
    if (!formData.message.trim()) return 'Lütfen mesajınızı yazınız'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate API call
      
      console.log('İletişim formu gönderildi:', formData)
      setIsSubmitted(true)
    } catch (error) {
      setError('Mesaj gönderilirken bir hata oluştu. Lütfen tekrar deneyiniz.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4">
        <Card className="max-w-2xl w-full bg-white/90 backdrop-blur-sm border-0 shadow-2xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Mesajınız Başarıyla Gönderildi!
            </h1>
            <p className="text-gray-600 text-lg mb-8">
              En kısa sürede size geri dönüş yapacağız. Teşekkür ederiz.
            </p>
            <div className="bg-blue-50 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-blue-900 mb-2">Sonraki Adımlar:</h3>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• Mesajınız ilgili departmana iletilecek</li>
                <li>• 24 saat içinde size geri dönüş yapacağız</li>
                <li>• Acil durumlar için telefon numaramızı arayabilirsiniz</li>
              </ul>
            </div>
            <Button 
              onClick={() => window.location.href = '/'}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl px-8"
            >
              Ana Sayfaya Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-6">
            İletişim
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Size nasıl yardımcı olabileceğimizi merak ediyoruz. Sorularınız için bizimle iletişime geçin.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-8">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  İletişim Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {contactInfo.map((info, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-xl ${info.color} flex items-center justify-center flex-shrink-0`}>
                      <info.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{info.title}</h3>
                      <p className="text-gray-800 font-medium">{info.value}</p>
                      <p className="text-gray-600 text-sm">{info.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Help */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
                  <HelpCircle className="w-6 h-6 mr-2 text-blue-600" />
                  Hızlı Yardım
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Sık Sorulan Sorular</h4>
                  <div className="space-y-2">
                    {faqItems.map((faq, index) => (
                      <details key={index} className="group">
                        <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 font-medium">
                          {faq.question}
                        </summary>
                        <p className="text-sm text-gray-600 mt-1 pl-4">
                          {faq.answer}
                        </p>
                      </details>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
                  <MessageCircle className="w-7 h-7 mr-3 text-blue-600" />
                  Bize Ulaşın
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                      <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
                      <span className="text-red-700">{error}</span>
                    </div>
                  )}

                  {/* Personal Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name">Ad Soyad *</Label>
                      <div className="relative mt-2">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          placeholder="Adınız ve soyadınız"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="email">E-posta *</Label>
                      <div className="relative mt-2">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="ornek@email.com"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="phone">Telefon</Label>
                      <div className="relative mt-2">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          placeholder="+90 5XX XXX XX XX"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="category">Kategori *</Label>
                      <select
                        id="category"
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-10"
                      >
                        <option value="">Kategori seçin</option>
                        {categories.map(category => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="subject">Konu *</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      placeholder="Mesajınızın konusu"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">Mesaj *</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => handleInputChange('message', e.target.value)}
                      placeholder="Detaylı mesajınızı buraya yazın..."
                      rows={6}
                      className="mt-2"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl py-3 text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Gönderiliyor...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <Send className="w-5 h-5 mr-2" />
                          Mesajı Gönder
                        </div>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Alternative Contact Methods */}
        <section className="mt-16">
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <h2 className="text-3xl font-bold text-white mb-4">
                Başka Yollarla da Ulaşabilirsiniz
              </h2>
              <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
                Sosyal medya hesaplarımızdan takip edebilir, güncel duyurularımızdan haberdar olabilirsiniz.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                  <Building className="w-8 h-8 text-white mx-auto mb-3" />
                  <h3 className="text-white font-semibold mb-2">Kurumsal Satış</h3>
                  <p className="text-blue-100 text-sm">
                    Şirketler için özel eğitim paketleri
                  </p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                  <User className="w-8 h-8 text-white mx-auto mb-3" />
                  <h3 className="text-white font-semibold mb-2">Kariyer</h3>
                  <p className="text-blue-100 text-sm">
                    Ekibimize katılmak için başvurun
                  </p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                  <MessageCircle className="w-8 h-8 text-white mx-auto mb-3" />
                  <h3 className="text-white font-semibold mb-2">Canlı Destek</h3>
                  <p className="text-blue-100 text-sm">
                    7/24 online destek hattımız
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}