'use client'

import { useEffect, useState } from 'react'
import { Loader2, Mail, Phone, Target, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import MockExamRunner from '@/components/mock-exams/MockExamRunner'
import { mockExamsAPI } from '@/lib/api'
import {
  getDefaultMockExamDuration,
  MockExamContactInfo,
  MockExamGroupId,
  MockExamPublicListItem,
  MockExamPublicRecord,
  MockExamSectionId,
  getMockExamGroupConfig,
  getMockExamSectionConfig,
  mockExamGroupOrder,
  normalizeMockExamDuration,
  normalizeMockExamGroupId,
  normalizeMockExamQuestions,
  normalizeMockExamSectionId,
} from '@/lib/mockExams'
import { cn } from '@/lib/utils'

const sectionTheme = {
  verbal: 'border-sky-200 bg-sky-50 text-sky-700',
  quantitative: 'border-emerald-200 bg-emerald-50 text-emerald-700',
} as const

function sortExams(exams: MockExamPublicListItem[]) {
  return [...exams].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order
    }
    return left.title.localeCompare(right.title)
  })
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, '')
}

function isMockExamGroup(value: string | null): value is MockExamGroupId {
  return Boolean(value && mockExamGroupOrder.includes(value as MockExamGroupId))
}

function updatePageQuery(group: MockExamGroupId, slug?: string | null) {
  if (typeof window === 'undefined') {
    return
  }

  const nextUrl = new URL(window.location.href)
  nextUrl.searchParams.set('group', group)
  if (slug) {
    nextUrl.searchParams.set('section', slug)
  } else {
    nextUrl.searchParams.delete('section')
  }
  window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`)
}

function validateContactInfo(contactInfo: MockExamContactInfo) {
  const fullName = contactInfo.full_name.trim()
  const email = contactInfo.email.trim().toLowerCase()
  const phone = contactInfo.phone.trim()
  const phoneDigits = phone.replace(/\D/g, '')

  return {
    fullNameValid: fullName.length >= 2,
    emailValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    phoneValid: phoneDigits.length >= 10,
  }
}

export default function MockExamsPublicPage() {
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [initialSection, setInitialSection] = useState<string | null>(null)
  const [initialGroup, setInitialGroup] = useState<MockExamGroupId | null>(null)
  const [exams, setExams] = useState<MockExamPublicListItem[]>([])
  const [selectedGroup, setSelectedGroup] = useState<MockExamGroupId>('lgs')
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [selectedExam, setSelectedExam] = useState<MockExamPublicRecord | null>(null)
  const [contactInfo, setContactInfo] = useState<MockExamContactInfo>({
    full_name: '',
    email: '',
    phone: '',
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setInitialSection(params.get('section'))
      const group = params.get('group')
      setInitialGroup(isMockExamGroup(group) ? group : null)
    }
    void fetchExams()
  }, [])

  useEffect(() => {
    if (!exams.length) {
      setSelectedSlug(null)
      return
    }

    const initialExam = initialSection ? exams.find((exam) => exam.slug === initialSection) : null
    if (initialExam) {
      setSelectedGroup(initialExam.exam_group)
      setSelectedSlug(initialExam.slug)
      return
    }

    const fallbackGroup = initialGroup && exams.some((exam) => exam.exam_group === initialGroup)
      ? initialGroup
      : exams[0].exam_group

    setSelectedGroup(fallbackGroup)
    const groupExams = sortExams(exams.filter((exam) => exam.exam_group === fallbackGroup))
    setSelectedSlug((current) => current && groupExams.some((exam) => exam.slug === current) ? current : groupExams[0]?.slug ?? null)
  }, [exams, initialGroup, initialSection])

  useEffect(() => {
    const groupExams = sortExams(exams.filter((exam) => exam.exam_group === selectedGroup))
    if (!groupExams.length) {
      setSelectedSlug(null)
      setSelectedExam(null)
      updatePageQuery(selectedGroup, null)
      return
    }

    setSelectedSlug((current) => {
      const nextSlug = current && groupExams.some((exam) => exam.slug === current)
        ? current
        : groupExams[0].slug
      updatePageQuery(selectedGroup, nextSlug)
      return nextSlug
    })
  }, [exams, selectedGroup])

  useEffect(() => {
    if (!selectedSlug) {
      setSelectedExam(null)
      return
    }

    void fetchExamDetail(selectedSlug)
  }, [selectedSlug])

  const fetchExams = async () => {
    try {
      setLoading(true)
      const response = await mockExamsAPI.listPublished()
      const nextExams = sortExams(
        (response.data || []).map((exam: MockExamPublicListItem) => {
          const sectionType = normalizeMockExamSectionId(exam.section_type)
          return {
            ...exam,
            exam_group: normalizeMockExamGroupId(exam.exam_group),
            section_type: sectionType,
            duration_minutes: normalizeMockExamDuration(exam.duration_minutes, sectionType),
            question_count: Number.isFinite(exam.question_count) ? exam.question_count : 0,
            sort_order: Number.isFinite(exam.sort_order) ? exam.sort_order : 0,
          }
        })
      )
      setExams(nextExams)
    } catch (error) {
      console.error('Yayınlanan denemeler yüklenemedi:', error)
      setExams([])
    } finally {
      setLoading(false)
    }
  }

  const fetchExamDetail = async (slug: string) => {
    try {
      setDetailLoading(true)
      const response = await mockExamsAPI.getBySlug(slug)
      const rawExam = response.data as MockExamPublicRecord
      const sectionType = normalizeMockExamSectionId(rawExam.section_type)
      const normalizedQuestions = normalizeMockExamQuestions(sectionType, rawExam.questions, rawExam.exam_group)

      setSelectedExam({
        ...rawExam,
        exam_group: normalizeMockExamGroupId(rawExam.exam_group),
        section_type: sectionType,
        duration_minutes: normalizeMockExamDuration(rawExam.duration_minutes, sectionType),
        question_count: normalizedQuestions.length,
        sort_order: Number.isFinite(rawExam.sort_order) ? rawExam.sort_order : 0,
        questions: normalizedQuestions,
      })
    } catch (error) {
      console.error('Deneme sınavı detayları yüklenemedi:', error)
      setSelectedExam(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const contactValidation = validateContactInfo(contactInfo)
  const isContactInfoReady =
    contactValidation.fullNameValid && contactValidation.emailValid && contactValidation.phoneValid
  const startDisabledMessage = isContactInfoReady
    ? null
    : 'Teste başlamadan önce ad soyad, e-posta ve telefon alanlarını doldurmanız zorunludur.'

  const selectedGroupConfig = getMockExamGroupConfig(selectedGroup)
  const filteredExams = sortExams(exams.filter((exam) => exam.exam_group === selectedGroup))
  const publishedCategoryCount = mockExamGroupOrder.filter((group) => exams.some((exam) => exam.exam_group === group)).length
  const totalQuestionCount = filteredExams.reduce((sum, exam) => sum + exam.question_count, 0)
  const totalDurationMinutes = filteredExams.reduce((sum, exam) => sum + exam.duration_minutes, 0)
  const hasVerbalSection = filteredExams.some((exam) => exam.section_type === 'verbal')
  const hasQuantitativeSection = filteredExams.some((exam) => exam.section_type === 'quantitative')
  const verbalDurationMinutes =
    filteredExams.find((exam) => exam.section_type === 'verbal')?.duration_minutes ?? getDefaultMockExamDuration('verbal')
  const quantitativeDurationMinutes =
    filteredExams.find((exam) => exam.section_type === 'quantitative')?.duration_minutes ?? getDefaultMockExamDuration('quantitative')
  const verbalSectionConfig = getMockExamSectionConfig('verbal', selectedGroup)
  const quantitativeSectionConfig = getMockExamSectionConfig('quantitative', selectedGroup)

  const selectGroup = (group: MockExamGroupId) => {
    setSelectedGroup(group)
  }

  const selectSection = (slug: string) => {
    setSelectedSlug(slug)
    updatePageQuery(selectedGroup, slug)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            <Target className="h-4 w-4" />
            Deneme Sınavları
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
            {selectedGroupConfig.pageTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600">
            {selectedGroupConfig.description}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white py-24 shadow-sm">
            <div className="flex items-center gap-3 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Yayınlanan denemeler yükleniyor...</span>
            </div>
          </div>
        ) : exams.length === 0 ? (
          <Card className="border-0 shadow-xl">
            <CardContent className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="mb-4 rounded-3xl bg-slate-100 p-5">
                <Target className="h-8 w-8 text-slate-700" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Henüz yayınlanan deneme yok</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Admin panelinden bir deneme yayınlandığında burada sınıf veya LGS etiketi altında otomatik görünür.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-8 overflow-hidden border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <CardTitle className="text-3xl font-black tracking-tight">Deneme Kategorileri</CardTitle>
                    <CardDescription className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                      LGS, 4. sınıf, 5. sınıf ve diğer sınıf grupları için hazırlanan denemeleri tek sayfadan seçebilir, ilgili kategori altında yayınlanan sınavları açabilirsiniz.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="border-white/15 bg-white/10 text-white">
                      {publishedCategoryCount} aktif kategori
                    </Badge>
                    <Badge className="border-white/15 bg-white/10 text-white">
                      {filteredExams.length} deneme
                    </Badge>
                    <Badge className="border-white/15 bg-white/10 text-white">
                      {totalQuestionCount} soru
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-6 p-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Kategori Listesi</div>
                  <div className="mt-4 space-y-2">
                    {mockExamGroupOrder.map((group) => {
                      const groupConfig = getMockExamGroupConfig(group)
                      const isActive = selectedGroup === group
                      const groupCount = exams.filter((exam) => exam.exam_group === group).length

                      return (
                        <button
                          key={group}
                          type="button"
                          onClick={() => selectGroup(group)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all',
                            isActive
                              ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          )}
                        >
                          <span className="text-sm font-semibold">{groupConfig.menuLabel}</span>
                          <span className={cn('text-xs font-bold', isActive ? 'text-slate-300' : 'text-slate-500')}>
                            {groupCount}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Seçili Alan</div>
                      <p className="mt-3 text-base font-semibold text-slate-900">{selectedGroupConfig.pageTitle}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Bu listede yalnızca seçilen kategoriye etiketlenmiş denemeler görünür.
                      </p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Toplam Süre</div>
                      <p className="mt-3 text-base font-semibold text-slate-900">{totalDurationMinutes} dakika</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Seçili kategorideki yayınlanan tüm denemelerin toplam süresi.
                      </p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Çözüm Mantığı</div>
                      <p className="mt-3 text-base font-semibold text-slate-900">Kategori bazlı filtreleme</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Admin hangi kategoriyle yayınladıysa, deneme ilgili sınıf sayfasında burada açılır.
                      </p>
                    </div>
                  </div>

                  {selectedGroup === 'lgs' && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Sözel Kuralı</div>
                        <p className="mt-3 text-base font-semibold text-slate-900">Toplam {verbalDurationMinutes} dakika</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {verbalSectionConfig.subjects.map((subject) => subject.label).join(', ')} aynı sözel oturum içinde çözülür.
                        </p>
                      </div>
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Sayısal Kuralı</div>
                        <p className="mt-3 text-base font-semibold text-slate-900">Toplam {quantitativeDurationMinutes} dakika</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {quantitativeSectionConfig.subjects.map((subject) => subject.label).join(', ')} aynı sayısal oturum içinde çözülür.
                        </p>
                      </div>
                    </div>
                  )}

                  {filteredExams.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
                      <div className="text-lg font-bold text-slate-900">{selectedGroupConfig.pageTitle} henüz yayınlanmadı</div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        Admin panelinde bu kategoriyle deneme oluşturulduğunda burada otomatik listelenecek.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {filteredExams.map((exam) => {
                        const sectionConfig = getMockExamSectionConfig(exam.section_type as MockExamSectionId, exam.exam_group)
                        const isSelected = selectedSlug === exam.slug

                        return (
                          <button
                            key={exam.id}
                            type="button"
                            onClick={() => selectSection(exam.slug)}
                            className={cn(
                              'rounded-3xl border bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl',
                              isSelected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200'
                            )}
                          >
                            <div className="mb-4 flex flex-wrap items-center gap-2">
                              <Badge
                                className={cn(
                                  'border font-semibold',
                                  isSelected ? 'border-white/20 bg-white/10 text-white' : sectionTheme[exam.section_type as MockExamSectionId]
                                )}
                              >
                                {sectionConfig.title}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'border',
                                  isSelected ? 'border-white/20 bg-white/10 text-white' : 'border-slate-200 bg-slate-50 text-slate-500'
                                )}
                              >
                                {exam.duration_minutes} dk
                              </Badge>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'border',
                                  isSelected ? 'border-white/20 bg-white/10 text-white' : 'border-slate-200 bg-slate-50 text-slate-500'
                                )}
                              >
                                {exam.question_count} soru
                              </Badge>
                            </div>
                            <div className="text-2xl font-bold">{exam.title || sectionConfig.title}</div>
                            <p className={cn('mt-2 text-sm leading-6', isSelected ? 'text-slate-200' : 'text-slate-600')}>
                              {exam.description || sectionConfig.summary}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {sectionConfig.subjects.map((subject) => (
                                <span
                                  key={subject.id}
                                  className={cn(
                                    'rounded-full border px-3 py-1 text-xs font-semibold',
                                    isSelected
                                      ? 'border-white/20 bg-white/10 text-white'
                                      : 'border-slate-200 bg-slate-50 text-slate-600'
                                  )}
                                >
                                  {subject.label}
                                </span>
                              ))}
                            </div>
                            <div className={cn('mt-4 text-xs font-semibold uppercase tracking-[0.18em]', isSelected ? 'text-slate-300' : 'text-slate-400')}>
                              {isSelected ? 'Aktif deneme' : `${sectionConfig.shortLabel} denemesini aç`}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {selectedGroup === 'lgs' && filteredExams.length > 0 && (!hasVerbalSection || !hasQuantitativeSection) && (
                    <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium leading-6 text-amber-800">
                      LGS düzeninin tam görünmesi için sözel ve sayısal oturumların ikisinin de yayınlanmış olması gerekir. Şu anda eksik olan bölüm admin panelinden ayrıca yayınlanabilir.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {detailLoading ? (
              <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white py-24 shadow-sm">
                <div className="flex items-center gap-3 text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Seçilen deneme hazırlanıyor...</span>
                </div>
              </div>
            ) : !selectedExam ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center shadow-sm">
                <div className="text-2xl font-bold text-slate-900">{selectedGroupConfig.pageTitle} seçimi bekleniyor</div>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                  Yukarıdaki kategori listesinden veya deneme kartlarından seçim yaptığınızda sınav burada açılır.
                </p>
              </div>
            ) : (
              <MockExamRunner
                key={selectedExam.slug}
                title={selectedExam.title}
                description={selectedExam.description}
                instructions={selectedExam.instructions}
                durationMinutes={selectedExam.duration_minutes}
                questions={selectedExam.questions}
                sectionType={selectedExam.section_type}
                startDisabled={!isContactInfoReady}
                startDisabledMessage={startDisabledMessage}
                beforeStartContent={
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xl font-bold text-slate-900">İletişim Bilgileri</CardTitle>
                      <CardDescription>
                        Deneme sınavına başlamadan önce iletişim bilgilerinizi girmeniz zorunludur. Sonuç kaydı admin panelinde bu bilgilerle görünür.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <UserRound className="h-4 w-4" />
                            Ad Soyad
                          </label>
                          <Input
                            value={contactInfo.full_name}
                            onChange={(event) =>
                              setContactInfo((current) => ({
                                ...current,
                                full_name: event.target.value,
                              }))
                            }
                            placeholder="Ad soyad girin"
                          />
                        </div>
                        <div>
                          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Mail className="h-4 w-4" />
                            E-posta
                          </label>
                          <Input
                            type="email"
                            value={contactInfo.email}
                            onChange={(event) =>
                              setContactInfo((current) => ({
                                ...current,
                                email: event.target.value,
                              }))
                            }
                            placeholder="ornek@mail.com"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <Phone className="h-4 w-4" />
                          Telefon
                        </label>
                        <Input
                          value={contactInfo.phone}
                          onChange={(event) =>
                            setContactInfo((current) => ({
                              ...current,
                              phone: normalizePhone(event.target.value),
                            }))
                          }
                          placeholder="05xx xxx xx xx"
                        />
                      </div>
                      <div className={cn(
                        'rounded-2xl border px-4 py-3 text-sm font-medium',
                        isContactInfoReady
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                      )}>
                        {isContactInfoReady
                          ? 'Bilgiler tamam. Artık Teste Başla ile denemeyi açabilirsiniz.'
                          : 'Zorunlu alanlar tamamlanmadan sınav başlatılamaz.'}
                      </div>
                    </CardContent>
                  </Card>
                }
                submitAction={async (answers) => {
                  const response = await mockExamsAPI.submit(selectedExam.slug, {
                    ...contactInfo,
                    answers,
                  })
                  return response.data
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
