'use client'

import { useState } from 'react'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  BookOpen, 
  Award, 
  Upload,
  FileText,
  Link as LinkIcon,
  Check,
  AlertCircle,
  Camera,
  Calendar,
  Briefcase
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

interface ApplicationData {
  personalInfo: {
    firstName: string
    lastName: string
    email: string
    phone: string
    location: string
    profileImage?: File | null
  }
  professionalInfo: {
    title: string
    experience: string
    company: string
    bio: string
    specialties: string[]
    portfolio?: string
    linkedin?: string
    github?: string
    website?: string
  }
  teachingInfo: {
    previousTeaching: string
    courseTopics: string[]
    teachingMotivation: string
    cv?: File | null
    certificates?: File[]
  }
}

export default function InstructorApplicationPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [applicationData, setApplicationData] = useState<ApplicationData>({
    personalInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      location: '',
      profileImage: null
    },
    professionalInfo: {
      title: '',
      experience: '',
      company: '',
      bio: '',
      specialties: [],
      portfolio: '',
      linkedin: '',
      github: '',
      website: ''
    },
    teachingInfo: {
      previousTeaching: '',
      courseTopics: [],
      teachingMotivation: '',
      cv: null,
      certificates: []
    }
  })

  const availableSpecialties = [
    'Web Geliştirme', 'Mobil Geliştirme', 'Veri Bilimi', 'Yapay Zeka',
    'Machine Learning', 'DevOps', 'Cloud Computing', 'Siber Güvenlik',
    'Blockchain', 'UI/UX Tasarım', 'Product Management', 'Digital Marketing',
    'E-ticaret', 'İş Geliştirme', 'Girişimcilik', 'Kişisel Gelişim',
    'Liderlik', 'Proje Yönetimi', 'Agile/Scrum', 'Yazılım Mimarisi'
  ]

  const steps = [
    { number: 1, title: 'Kişisel Bilgiler', icon: User },
    { number: 2, title: 'Profesyonel Bilgiler', icon: Briefcase },
    { number: 3, title: 'Eğitmenlik Bilgileri', icon: BookOpen },
    { number: 4, title: 'İnceleme', icon: Check }
  ]

  const updatePersonalInfo = (field: string, value: string | number | string[] | File | File[] | null) => {
    setApplicationData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value }
    }))
  }

  const updateProfessionalInfo = (field: string, value: string | number | string[] | File | File[] | null) => {
    setApplicationData(prev => ({
      ...prev,
      professionalInfo: { ...prev.professionalInfo, [field]: value }
    }))
  }

  const updateTeachingInfo = (field: string, value: string | number | string[] | File | File[] | null) => {
    setApplicationData(prev => ({
      ...prev,
      teachingInfo: { ...prev.teachingInfo, [field]: value }
    }))
  }

  const addSpecialty = (specialty: string) => {
    if (!applicationData.professionalInfo.specialties.includes(specialty)) {
      updateProfessionalInfo('specialties', [...applicationData.professionalInfo.specialties, specialty])
    }
  }

  const removeSpecialty = (specialty: string) => {
    updateProfessionalInfo('specialties', 
      applicationData.professionalInfo.specialties.filter(s => s !== specialty)
    )
  }

  const addCourseTopic = (topic: string) => {
    if (topic.trim() && !applicationData.teachingInfo.courseTopics.includes(topic.trim())) {
      updateTeachingInfo('courseTopics', [...applicationData.teachingInfo.courseTopics, topic.trim()])
    }
  }

  const removeCourseTopic = (topic: string) => {
    updateTeachingInfo('courseTopics',
      applicationData.teachingInfo.courseTopics.filter(t => t !== topic)
    )
  }

  const handleFileUpload = (field: string, file: File | null, section: 'personalInfo' | 'teachingInfo') => {
    if (section === 'personalInfo') {
      updatePersonalInfo(field, file)
    } else {
      updateTeachingInfo(field, file)
    }
  }

  const handleSubmit = async () => {
    try {
      // API call would go here
      console.log('Başvuru gönderiliyor:', applicationData)
      setIsSubmitted(true)
    } catch (error) {
      console.error('Başvuru gönderilirken hata:', error)
    }
  }

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return applicationData.personalInfo.firstName && 
               applicationData.personalInfo.lastName && 
               applicationData.personalInfo.email &&
               applicationData.personalInfo.phone
      case 2:
        return applicationData.professionalInfo.title && 
               applicationData.professionalInfo.experience && 
               applicationData.professionalInfo.bio &&
               applicationData.professionalInfo.specialties.length > 0
      case 3:
        return applicationData.teachingInfo.teachingMotivation &&
               applicationData.teachingInfo.courseTopics.length > 0
      default:
        return true
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4">
        <Card className="max-w-2xl w-full bg-white/90 backdrop-blur-sm border-0 shadow-2xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Başvurunuz Başarıyla Gönderildi!
            </h1>
            <p className="text-gray-600 text-lg mb-8">
              Başvurunuzu inceleyeceğiz ve 3-5 iş günü içinde size geri dönüş yapacağız.
            </p>
            <div className="bg-blue-50 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-blue-900 mb-2">Sonraki Adımlar:</h3>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• Başvurunuz inceleme sürecine alınacak</li>
                <li>• Uygun bulunmanız durumunda mülakat için iletişime geçeceğiz</li>
                <li>• Onay süreciniz tamamlandıktan sonra eğitmen paneline erişim sağlayacaksınız</li>
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-4">
            Eğitmen Başvurusu
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Binlerce öğrenciye ulaşarak bilginizi paylaşın ve eğitmen ekibimize katılın
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-12">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                currentStep >= step.number 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                <step.icon className="w-6 h-6" />
              </div>
              <div className="ml-4 flex-1">
                <p className={`font-medium ${
                  currentStep >= step.number ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  Adım {step.number}
                </p>
                <p className="text-sm text-gray-500">{step.title}</p>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-full h-1 mx-4 ${
                  currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'
                }`}></div>
              )}
            </div>
          ))}
        </div>

        {/* Form Steps */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {steps[currentStep - 1].title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="firstName">Ad *</Label>
                    <Input
                      id="firstName"
                      value={applicationData.personalInfo.firstName}
                      onChange={(e) => updatePersonalInfo('firstName', e.target.value)}
                      placeholder="Adınız"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Soyad *</Label>
                    <Input
                      id="lastName"
                      value={applicationData.personalInfo.lastName}
                      onChange={(e) => updatePersonalInfo('lastName', e.target.value)}
                      placeholder="Soyadınız"
                      className="mt-2"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="email">E-posta *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={applicationData.personalInfo.email}
                      onChange={(e) => updatePersonalInfo('email', e.target.value)}
                      placeholder="ornek@email.com"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefon *</Label>
                    <Input
                      id="phone"
                      value={applicationData.personalInfo.phone}
                      onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                      placeholder="+90 5XX XXX XX XX"
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="location">Konum</Label>
                  <Input
                    id="location"
                    value={applicationData.personalInfo.location}
                    onChange={(e) => updatePersonalInfo('location', e.target.value)}
                    placeholder="Şehir, Ülke"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Profil Fotoğrafı</Label>
                  <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Profil fotoğrafınızı yükleyin</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload('profileImage', e.target.files?.[0] || null, 'personalInfo')}
                      className="hidden"
                      id="profileImage"
                    />
                    <label htmlFor="profileImage">
                      <Button type="button" variant="outline" className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        Dosya Seç
                      </Button>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Professional Information */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="title">Unvan/Pozisyon *</Label>
                    <Input
                      id="title"
                      value={applicationData.professionalInfo.title}
                      onChange={(e) => updateProfessionalInfo('title', e.target.value)}
                      placeholder="Örn: Senior Full Stack Developer"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="experience">Deneyim Süresi *</Label>
                    <select
                      id="experience"
                      value={applicationData.professionalInfo.experience}
                      onChange={(e) => updateProfessionalInfo('experience', e.target.value)}
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seçin</option>
                      <option value="1-2">1-2 yıl</option>
                      <option value="3-5">3-5 yıl</option>
                      <option value="6-10">6-10 yıl</option>
                      <option value="10+">10+ yıl</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="company">Şirket/Kurum</Label>
                  <Input
                    id="company"
                    value={applicationData.professionalInfo.company}
                    onChange={(e) => updateProfessionalInfo('company', e.target.value)}
                    placeholder="Çalıştığınız şirket veya serbest meslek"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="bio">Kısa Biyografi *</Label>
                  <Textarea
                    id="bio"
                    value={applicationData.professionalInfo.bio}
                    onChange={(e) => updateProfessionalInfo('bio', e.target.value)}
                    placeholder="Kendinizi, deneyimlerinizi ve uzmanlık alanlarınızı kısaca tanıtın..."
                    rows={4}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Uzmanlık Alanları *</Label>
                  <p className="text-sm text-gray-600 mb-3">En az 1 alan seçin</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                    {availableSpecialties.map(specialty => (
                      <button
                        key={specialty}
                        type="button"
                        onClick={() => addSpecialty(specialty)}
                        disabled={applicationData.professionalInfo.specialties.includes(specialty)}
                        className={`p-2 text-sm rounded-lg border transition-colors ${
                          applicationData.professionalInfo.specialties.includes(specialty)
                            ? 'bg-blue-100 border-blue-300 text-blue-800 cursor-not-allowed'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300'
                        }`}
                      >
                        {specialty}
                      </button>
                    ))}
                  </div>
                  {applicationData.professionalInfo.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {applicationData.professionalInfo.specialties.map(specialty => (
                        <Badge
                          key={specialty}
                          className="bg-blue-100 text-blue-800 cursor-pointer"
                          onClick={() => removeSpecialty(specialty)}
                        >
                          {specialty} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Social Links */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      value={applicationData.professionalInfo.linkedin}
                      onChange={(e) => updateProfessionalInfo('linkedin', e.target.value)}
                      placeholder="https://linkedin.com/in/kullaniciadi"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="github">GitHub</Label>
                    <Input
                      id="github"
                      value={applicationData.professionalInfo.github}
                      onChange={(e) => updateProfessionalInfo('github', e.target.value)}
                      placeholder="https://github.com/kullaniciadi"
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="website">Kişisel Website</Label>
                    <Input
                      id="website"
                      value={applicationData.professionalInfo.website}
                      onChange={(e) => updateProfessionalInfo('website', e.target.value)}
                      placeholder="https://websitesi.com"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="portfolio">Portfolio</Label>
                    <Input
                      id="portfolio"
                      value={applicationData.professionalInfo.portfolio}
                      onChange={(e) => updateProfessionalInfo('portfolio', e.target.value)}
                      placeholder="Portfolio linki"
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Teaching Information */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="previousTeaching">Önceki Eğitmenlik Deneyimi</Label>
                  <Textarea
                    id="previousTeaching"
                    value={applicationData.teachingInfo.previousTeaching}
                    onChange={(e) => updateTeachingInfo('previousTeaching', e.target.value)}
                    placeholder="Daha önce eğitmenlik yaptıysanız deneyimlerinizi paylaşın..."
                    rows={3}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Öğretmek İstediğiniz Konular *</Label>
                  <p className="text-sm text-gray-600 mb-3">Hangi konularda kurs vermek istiyorsunuz?</p>
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="Konu başlığı yazın ve Enter'a basın"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addCourseTopic((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = ''
                        }
                      }}
                    />
                  </div>
                  {applicationData.teachingInfo.courseTopics.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {applicationData.teachingInfo.courseTopics.map(topic => (
                        <Badge
                          key={topic}
                          className="bg-green-100 text-green-800 cursor-pointer"
                          onClick={() => removeCourseTopic(topic)}
                        >
                          {topic} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="teachingMotivation">Eğitmenlik Motivasyonunuz *</Label>
                  <Textarea
                    id="teachingMotivation"
                    value={applicationData.teachingInfo.teachingMotivation}
                    onChange={(e) => updateTeachingInfo('teachingMotivation', e.target.value)}
                    placeholder="Neden eğitmen olmak istiyorsunuz? Öğrencilerinize nasıl katkı sağlamak istiyorsunuz?"
                    rows={4}
                    className="mt-2"
                  />
                </div>

                {/* File Uploads */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>CV/Özgeçmiş</Label>
                    <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-2">CV&apos;nizi yükleyin (PDF)</p>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileUpload('cv', e.target.files?.[0] || null, 'teachingInfo')}
                        className="hidden"
                        id="cv"
                      />
                      <label htmlFor="cv">
                        <Button type="button" variant="outline" size="sm" className="cursor-pointer">
                          <Upload className="w-4 h-4 mr-2" />
                          Dosya Seç
                        </Button>
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label>Sertifikalar</Label>
                    <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <Award className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-2">Sertifikalarınızı yükleyin</p>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.png"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || [])
                          updateTeachingInfo('certificates', files)
                        }}
                        className="hidden"
                        id="certificates"
                      />
                      <label htmlFor="certificates">
                        <Button type="button" variant="outline" size="sm" className="cursor-pointer">
                          <Upload className="w-4 h-4 mr-2" />
                          Dosya Seç
                        </Button>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-8">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-yellow-800">Başvurunuzu İnceleme</h3>
                      <p className="text-yellow-700 text-sm mt-1">
                        Lütfen bilgilerinizi kontrol edin. Başvurunuz gönderildikten sonra değişiklik yapamazsınız.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Personal Info Review */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Kişisel Bilgiler</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p><span className="font-medium">Ad Soyad:</span> {applicationData.personalInfo.firstName} {applicationData.personalInfo.lastName}</p>
                    <p><span className="font-medium">E-posta:</span> {applicationData.personalInfo.email}</p>
                    <p><span className="font-medium">Telefon:</span> {applicationData.personalInfo.phone}</p>
                    {applicationData.personalInfo.location && (
                      <p><span className="font-medium">Konum:</span> {applicationData.personalInfo.location}</p>
                    )}
                  </div>
                </div>

                {/* Professional Info Review */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Profesyonel Bilgiler</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p><span className="font-medium">Unvan:</span> {applicationData.professionalInfo.title}</p>
                    <p><span className="font-medium">Deneyim:</span> {applicationData.professionalInfo.experience}</p>
                    {applicationData.professionalInfo.company && (
                      <p><span className="font-medium">Şirket:</span> {applicationData.professionalInfo.company}</p>
                    )}
                    <p><span className="font-medium">Uzmanlık Alanları:</span></p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {applicationData.professionalInfo.specialties.map(specialty => (
                        <Badge key={specialty} variant="secondary">{specialty}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Teaching Info Review */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Eğitmenlik Bilgileri</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p><span className="font-medium">Öğretmek İstediğiniz Konular:</span></p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {applicationData.teachingInfo.courseTopics.map(topic => (
                        <Badge key={topic} className="bg-green-100 text-green-800">{topic}</Badge>
                      ))}
                    </div>
                    <p className="mt-3"><span className="font-medium">Motivasyon:</span></p>
                    <p className="text-gray-700">{applicationData.teachingInfo.teachingMotivation}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
                className="rounded-xl"
              >
                Önceki
              </Button>
              
              {currentStep < 4 ? (
                <Button
                  onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
                  disabled={!canProceedToNext()}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl"
                >
                  Sonraki
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  className="bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl px-8"
                >
                  Başvuruyu Gönder
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}