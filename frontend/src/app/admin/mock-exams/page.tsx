'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  ExternalLink,
  FileText,
  Globe,
  ImagePlus,
  Loader2,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Target,
  Trash2,
  UploadCloud,
  UserRound,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import MockExamRunner from '@/components/mock-exams/MockExamRunner'
import { useHydration } from '@/hooks/useHydration'
import {
  createMockExamDraftTitle,
  createMockExamSlug,
  createDefaultMockExamPayloads,
  createSectionDraftQuestions,
  createEmptyQuestion,
  getDefaultMockExamGroup,
  MockExamAttemptRecord,
  MockExamAttemptOverviewRecord,
  MockExamGroupId,
  MockExamPayload,
  MockExamQuestion,
  MockExamRecord,
  MockExamSectionId,
  MockExamSubjectId,
  getDefaultMockExamDuration,
  getMockExamGroupConfig,
  getMockExamGroupLabel,
  getMockExamQuestionCountsBySubject,
  getMockExamSectionConfig,
  getMockExamSectionSubjects,
  getMockExamSubjectLabel,
  mockExamGroupOrder,
  normalizeMockExamDuration,
  normalizeMockExamGroupId,
  normalizeMockExamSectionId,
  normalizeMockExamQuestions,
} from '@/lib/mockExams'
import { adminAPI, mediaAPI } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/store'

const sectionTheme = {
  verbal: {
    pill: 'border-sky-200 bg-sky-50 text-sky-700',
    button: 'from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700',
  },
  quantitative: {
    pill: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    button: 'from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700',
  },
} as const

function sortExams(exams: MockExamRecord[]) {
  return [...exams].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order
    }
    return (left.created_at ?? '').localeCompare(right.created_at ?? '')
  })
}

function formatAttemptDate(value?: string | null) {
  if (!value) {
    return 'Henüz çözülmedi'
  }

  return new Date(value).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getApiErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.detail || error?.message || fallback
}

function enforceExamStructure(
  exam: MockExamRecord,
  sectionType: MockExamSectionId = exam.section_type,
  questions: MockExamQuestion[] = exam.questions,
  replaceCopy = false,
): MockExamRecord {
  const safeSectionType = normalizeMockExamSectionId(sectionType)
  const safeExamGroup = normalizeMockExamGroupId(exam.exam_group || getDefaultMockExamGroup())
  const config = getMockExamSectionConfig(safeSectionType, safeExamGroup)
  const normalizedQuestions = normalizeMockExamQuestions(safeSectionType, questions, safeExamGroup)

  return {
    ...exam,
    exam_group: safeExamGroup,
    section_type: safeSectionType,
    duration_minutes: normalizeMockExamDuration(exam.duration_minutes, safeSectionType),
    description: replaceCopy ? config.description : exam.description,
    instructions: replaceCopy ? config.instructions : exam.instructions,
    questions: normalizedQuestions,
    question_count: normalizedQuestions.length,
  }
}

export default function AdminMockExamsPage() {
  const router = useRouter()
  const hydrated = useHydration()
  const { isAuthenticated, user } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [creatingDefaults, setCreatingDefaults] = useState(false)
  const [working, setWorking] = useState<string | null>(null)
  const [exams, setExams] = useState<MockExamRecord[]>([])
  const [selectedGroup, setSelectedGroup] = useState<MockExamGroupId>(getDefaultMockExamGroup())
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null)
  const [attempts, setAttempts] = useState<MockExamAttemptRecord[]>([])
  const [allAttempts, setAllAttempts] = useState<MockExamAttemptOverviewRecord[]>([])
  const [attemptsLoading, setAttemptsLoading] = useState(false)
  const [allAttemptsLoading, setAllAttemptsLoading] = useState(false)
  const [uploadingQuestionId, setUploadingQuestionId] = useState<number | null>(null)
  const [uploadingOptionKey, setUploadingOptionKey] = useState<string | null>(null)
  const editorPanelRef = useRef<HTMLDivElement | null>(null)
  const pendingScrollExamIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!hydrated) {
      return
    }

    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/admin/login?next=/admin/mock-exams')
      return
    }

    void Promise.all([fetchExams(), fetchAllAttempts()])
  }, [hydrated, isAuthenticated, router, user])

  useEffect(() => {
    const groupedExams = sortExams(exams.filter((exam) => exam.exam_group === selectedGroup))
    setSelectedExamId((current) => {
      if (!groupedExams.length) {
        return null
      }
      if (current && groupedExams.some((exam) => exam.id === current)) {
        return current
      }
      return groupedExams[0].id
    })
  }, [exams, selectedGroup])

  useEffect(() => {
    if (!selectedExamId) {
      setAttempts([])
      return
    }

    void fetchAttempts(selectedExamId)
  }, [selectedExamId])

  const scrollToEditorPanel = () => {
    window.requestAnimationFrame(() => {
      editorPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  useEffect(() => {
    if (!selectedExamId || pendingScrollExamIdRef.current !== selectedExamId || !editorPanelRef.current) {
      return
    }

    pendingScrollExamIdRef.current = null
    scrollToEditorPanel()
  }, [selectedExamId])

  const fetchExams = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getMockExams()
      const nextExams = sortExams((response.data || []).map((exam: MockExamRecord) => enforceExamStructure(exam)))
      setExams(nextExams)
      if (!nextExams.some((exam) => exam.exam_group === selectedGroup) && nextExams[0]?.exam_group) {
        setSelectedGroup(nextExams[0].exam_group)
      }
    } catch (error) {
      console.error('Deneme sınavları yüklenemedi:', error)
      setExams([])
      setSelectedExamId(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchAttempts = async (examId: number) => {
    try {
      setAttemptsLoading(true)
      const response = await adminAPI.getMockExamAttempts(examId)
      const nextAttempts = response.data || []
      setAttempts(nextAttempts)
      setExams((prev) =>
        prev.map((exam) =>
          exam.id === examId
            ? {
                ...exam,
                attempt_count: nextAttempts.length,
                last_attempt_at: nextAttempts[0]?.submitted_at ?? exam.last_attempt_at ?? null,
              }
            : exam
        )
      )
    } catch (error) {
      console.error('Deneme çözümleri yüklenemedi:', error)
      setAttempts([])
    } finally {
      setAttemptsLoading(false)
    }
  }

  const fetchAllAttempts = async () => {
    try {
      setAllAttemptsLoading(true)
      const response = await adminAPI.getAllMockExamAttempts(500)
      setAllAttempts(response.data || [])
    } catch (error) {
      console.error('Toplu çözüm kayıtları yüklenemedi:', error)
      setAllAttempts([])
    } finally {
      setAllAttemptsLoading(false)
    }
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Deneme sınavı yönetimi yükleniyor...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return null
  }

  const selectedExam = exams.find((exam) => exam.id === selectedExamId) ?? null
  const filteredExams = sortExams(exams.filter((exam) => exam.exam_group === selectedGroup))
  const selectedGroupConfig = getMockExamGroupConfig(selectedGroup)
  const uniqueParticipantCount = new Set(
    allAttempts.map((attempt) => `${(attempt.email ?? '').trim().toLowerCase()}-${(attempt.phone ?? '').trim()}`)
  ).size
  const totalCorrectAnswers = allAttempts.reduce((sum, attempt) => sum + attempt.correct_count, 0)
  const totalWrongAnswers = allAttempts.reduce((sum, attempt) => sum + attempt.wrong_count, 0)
  const selectedExamSubjectStats = selectedExam
    ? getMockExamQuestionCountsBySubject(selectedExam.section_type, selectedExam.questions, selectedExam.exam_group)
    : []

  const updateSelectedExam = (updater: (exam: MockExamRecord) => MockExamRecord) => {
    setExams((prev) =>
      sortExams(
        prev.map((exam) => (exam.id === selectedExamId ? updater(exam) : exam))
      )
    )
  }

  const createExam = async (payload: MockExamPayload) => {
    const response = await adminAPI.createMockExam(payload)
    const createdExam = enforceExamStructure(response.data as MockExamRecord)
    setExams((prev) => sortExams([...prev, createdExam]))
    setSelectedGroup(createdExam.exam_group)
    setSelectedExamId(createdExam.id)
    return createdExam
  }

  const createSectionDraft = (sectionType: MockExamSectionId, examGroup: MockExamGroupId = selectedGroup): MockExamPayload => ({
    slug: createMockExamSlug(sectionType, examGroup),
    title: createMockExamDraftTitle(sectionType, examGroup),
    exam_group: examGroup,
    section_type: sectionType,
    description: getMockExamSectionConfig(sectionType, examGroup).description,
    instructions: getMockExamSectionConfig(sectionType, examGroup).instructions,
    duration_minutes: getDefaultMockExamDuration(sectionType),
    questions: createSectionDraftQuestions(sectionType, examGroup),
    sort_order: sectionType === 'verbal' ? 1 : 2,
    is_published: false,
  })

  const handleCreateSection = async (sectionType: MockExamSectionId) => {
    try {
      setWorking(`create-${sectionType}`)
      await createExam(createSectionDraft(sectionType))
    } catch (error) {
      console.error('Deneme sınavı oluşturulamadı:', error)
    } finally {
      setWorking(null)
    }
  }

  const handleCreateDefaults = async () => {
    try {
      setCreatingDefaults(true)
      for (const payload of createDefaultMockExamPayloads(selectedGroup)) {
        await createExam(payload)
      }
    } catch (error) {
      console.error('Varsayılan denemeler oluşturulamadı:', error)
      await fetchExams()
    } finally {
      setCreatingDefaults(false)
    }
  }

  const saveExam = async (exam: MockExamRecord, options?: { showSuccess?: boolean }) => {
    try {
      setWorking(`save-${exam.id}`)
      const normalizedExam = enforceExamStructure(exam)
      const response = await adminAPI.updateMockExam(exam.id, {
        slug: normalizedExam.slug,
        title: normalizedExam.title,
        exam_group: normalizedExam.exam_group,
        section_type: normalizedExam.section_type,
        description: normalizedExam.description ?? '',
        instructions: normalizedExam.instructions ?? '',
        duration_minutes: normalizedExam.duration_minutes,
        questions: normalizedExam.questions,
        sort_order: normalizedExam.sort_order,
        is_published: normalizedExam.is_published,
      })
      const savedExam = enforceExamStructure(response.data as MockExamRecord)
      setExams((prev) => sortExams(prev.map((current) => (current.id === savedExam.id ? savedExam : current))))
      if (selectedExamId === savedExam.id) {
        setSelectedExamId(savedExam.id)
      }
      if (options?.showSuccess !== false) {
        toast.success('Deneme kaydedildi.')
      }
      return savedExam
    } catch (error) {
      console.error('Deneme sınavı kaydedilemedi:', error)
      toast.error(getApiErrorMessage(error, 'Deneme kaydedilemedi.'))
      return null
    } finally {
      setWorking(null)
    }
  }

  const saveSelectedExam = async () => {
    if (!selectedExam) {
      return null
    }

    return saveExam(selectedExam)
  }

  const handlePublishToggle = async () => {
    if (!selectedExam) {
      return
    }

    const targetExam = await saveExam(selectedExam, { showSuccess: false })
    if (!targetExam) {
      toast.error('Kayıt başarısız olduğu için yayınlama iptal edildi.')
      return
    }

    try {
      setWorking(`publish-${targetExam.id}`)
      const response = targetExam.is_published
        ? await adminAPI.unpublishMockExam(targetExam.id)
        : await adminAPI.publishMockExam(targetExam.id)
      const nextExam = enforceExamStructure(response.data as MockExamRecord)
      setExams((prev) => sortExams(prev.map((exam) => (exam.id === nextExam.id ? nextExam : exam))))
      setSelectedExamId(nextExam.id)
      toast.success(nextExam.is_published ? 'Deneme yayınlandı.' : 'Deneme yayından kaldırıldı.')
    } catch (error: any) {
      console.error('Yayın durumu güncellenemedi:', error?.response?.data ?? error)
      toast.error(getApiErrorMessage(error, 'Yayın durumu güncellenemedi.'))
    } finally {
      setWorking(null)
    }
  }

  const handlePublishToggleForExam = async (examId: number) => {
    const targetExam = exams.find((exam) => exam.id === examId)
    if (!targetExam) {
      return
    }

    const savedExam = await saveExam(targetExam, { showSuccess: false })
    if (!savedExam) {
      toast.error('Kayıt başarısız olduğu için yayınlama iptal edildi.')
      return
    }

    try {
      setWorking(`publish-${savedExam.id}`)
      const response = savedExam.is_published
        ? await adminAPI.unpublishMockExam(savedExam.id)
        : await adminAPI.publishMockExam(savedExam.id)
      const nextExam = enforceExamStructure(response.data as MockExamRecord)
      setExams((prev) => sortExams(prev.map((exam) => (exam.id === nextExam.id ? nextExam : exam))))
      setSelectedExamId(nextExam.id)
      toast.success(nextExam.is_published ? 'Deneme yayınlandı.' : 'Deneme yayından kaldırıldı.')
    } catch (error: any) {
      console.error('Yayın durumu güncellenemedi:', error?.response?.data ?? error)
      toast.error(getApiErrorMessage(error, 'Yayın durumu güncellenemedi.'))
    } finally {
      setWorking(null)
    }
  }

  const handleDeleteSelectedExam = async () => {
    if (!selectedExam || !window.confirm(`${selectedExam.title} silinsin mi?`)) {
      return
    }

    try {
      setWorking(`delete-${selectedExam.id}`)
      await adminAPI.deleteMockExam(selectedExam.id)
      const remaining = exams.filter((exam) => exam.id !== selectedExam.id)
      setExams(remaining)
      setAllAttempts((prev) => prev.filter((attempt) => attempt.exam_id !== selectedExam.id))
      setSelectedExamId(remaining[0]?.id ?? null)
    } catch (error) {
      console.error('Deneme sınavı silinemedi:', error)
    } finally {
      setWorking(null)
    }
  }

  const handleDeleteExam = async (examId: number) => {
    const targetExam = exams.find((exam) => exam.id === examId)
    if (!targetExam || !window.confirm(`${targetExam.title} silinsin mi?`)) {
      return
    }

    try {
      setWorking(`delete-${targetExam.id}`)
      await adminAPI.deleteMockExam(targetExam.id)
      const remaining = exams.filter((exam) => exam.id !== targetExam.id)
      setExams(remaining)
      setAllAttempts((prev) => prev.filter((attempt) => attempt.exam_id !== targetExam.id))
      setSelectedExamId((current) => {
        if (current !== targetExam.id) {
          return current
        }
        return remaining[0]?.id ?? null
      })
    } catch (error) {
      console.error('Deneme sınavı silinemedi:', error)
    } finally {
      setWorking(null)
    }
  }

  const openExamFromAttempt = (examId: number, examGroup: MockExamGroupId) => {
    const targetExam = exams.find((exam) => exam.id === examId)
    const safeExamGroup = normalizeMockExamGroupId(targetExam?.exam_group || examGroup)

    if (selectedExamId === examId && selectedGroup === safeExamGroup) {
      pendingScrollExamIdRef.current = null
      scrollToEditorPanel()
      return
    }

    pendingScrollExamIdRef.current = examId
    setSelectedGroup(safeExamGroup)
    setSelectedExamId(examId)
  }

  const updateQuestion = (questionId: number, updater: (question: MockExamQuestion) => MockExamQuestion) => {
    if (!selectedExam) {
      return
    }

    updateSelectedExam((exam) =>
      enforceExamStructure(
        exam,
        exam.section_type,
        exam.questions.map((question) => (question.id === questionId ? updater(question) : question))
      )
    )
  }

  const updateOption = (
    questionId: number,
    optionId: string,
    updater: (option: MockExamQuestion['options'][number]) => MockExamQuestion['options'][number]
  ) => {
    updateQuestion(questionId, (current) => ({
      ...current,
      options: current.options.map((currentOption) =>
        currentOption.id === optionId ? updater(currentOption) : currentOption
      ),
    }))
  }

  const addQuestion = (subject?: MockExamSubjectId) => {
    if (!selectedExam) {
      return
    }

    const nextQuestionId = (selectedExam.questions.at(-1)?.id ?? 0) + 1
    updateSelectedExam((exam) =>
      enforceExamStructure(
        exam,
        exam.section_type,
        [...exam.questions, createEmptyQuestion(nextQuestionId, exam.section_type, subject, exam.exam_group)]
      )
    )
  }

  const removeQuestion = (questionId: number) => {
    if (!selectedExam || selectedExam.questions.length <= 1) {
      return
    }

    updateSelectedExam((exam) =>
      enforceExamStructure(
        exam,
        exam.section_type,
        exam.questions.filter((question) => question.id !== questionId)
      )
    )
  }

  const handleQuestionImageUpload = async (questionId: number, file?: File) => {
    if (!file) {
      return
    }

    try {
      setUploadingQuestionId(questionId)
      const response = await mediaAPI.uploadFile(file)
      const imageUrl = response.data?.file_url
      if (!imageUrl) {
        throw new Error('Yüklenen görsel için dosya adresi dönmedi.')
      }

      updateQuestion(questionId, (current) => ({
        ...current,
        imageUrl,
      }))
    } catch (error) {
      console.error('Soru görseli yüklenemedi:', error)
    } finally {
      setUploadingQuestionId(null)
    }
  }

  const handleOptionImageUpload = async (questionId: number, optionId: string, file?: File) => {
    if (!file) {
      return
    }

    const uploadKey = `${questionId}-${optionId}`

    try {
      setUploadingOptionKey(uploadKey)
      const response = await mediaAPI.uploadFile(file)
      const imageUrl = response.data?.file_url
      if (!imageUrl) {
        throw new Error('Yüklenen şık görseli için dosya adresi dönmedi.')
      }

      updateOption(questionId, optionId, (current) => ({
        ...current,
        imageUrl,
      }))
    } catch (error) {
      console.error('Şık görseli yüklenemedi:', error)
    } finally {
      setUploadingOptionKey(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              <FileText className="h-3.5 w-3.5" />
              Deneme Sınavları
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">Deneme Sınavı İçerik Yönetimi</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              Admin buradan soru girer, denemeye LGS veya sınıf etiketi verir, doğru kategori altında yayınlayarak canlı sayfada açar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => void Promise.all([fetchExams(), fetchAllAttempts()])}
              className="rounded-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Yenile
            </Button>
            <Button onClick={() => void handleCreateSection('verbal')} className="rounded-full bg-slate-900 text-white hover:bg-slate-800">
              <Plus className="mr-2 h-4 w-4" />
              {selectedGroupConfig.shortLabel} Sözel
            </Button>
            <Button onClick={() => void handleCreateSection('quantitative')} className="rounded-full bg-slate-900 text-white hover:bg-slate-800">
              <Plus className="mr-2 h-4 w-4" />
              {selectedGroupConfig.shortLabel} Sayısal
            </Button>
          </div>
        </div>

        <Card className="mb-6 border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-900">Deneme Kategorileri</CardTitle>
            <CardDescription>
              Hangi deneme sayfasına içerik ekleyeceğini buradan seç. Yeni kayıtlar seçili kategori altında açılır.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {mockExamGroupOrder.map((group) => {
              const isActive = selectedGroup === group
              const groupConfig = getMockExamGroupConfig(group)
              const examCount = exams.filter((exam) => exam.exam_group === group).length
              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => setSelectedGroup(group)}
                  className={cn(
                    'rounded-2xl border px-4 py-3 text-left transition-all',
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  )}
                >
                  <div className="text-sm font-bold">{groupConfig.menuLabel}</div>
                  <div className={cn('mt-1 text-xs', isActive ? 'text-slate-300' : 'text-slate-500')}>
                    {examCount} deneme
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white py-24 shadow-sm">
            <div className="flex items-center gap-3 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Deneme sınavları yükleniyor...</span>
            </div>
          </div>
        ) : filteredExams.length === 0 ? (
          <Card className="border-0 shadow-xl">
            <CardContent className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="mb-4 rounded-3xl bg-slate-100 p-5">
                <Target className="h-8 w-8 text-slate-700" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{selectedGroupConfig.pageTitle} için içerik yok</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Bu kategori için henüz deneme oluşturulmamış. İstersen varsayılan set üret, istersen sıfırdan yeni sınav aç.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={() => void handleCreateDefaults()}
                  disabled={creatingDefaults}
                  className="rounded-full bg-slate-900 text-white hover:bg-slate-800"
                >
                  {creatingDefaults ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="mr-2 h-4 w-4" />
                  )}
                  {selectedGroupConfig.shortLabel} Varsayılanlarını Oluştur
                </Button>
                <Button variant="outline" onClick={() => void handleCreateSection('verbal')} className="rounded-full">
                  Yeni Sözel Bölüm
                </Button>
                <Button variant="outline" onClick={() => void handleCreateSection('quantitative')} className="rounded-full">
                  Yeni Sayısal Bölüm
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-900">Sınava Girenler</CardTitle>
                <CardDescription>
                  İletişim bilgilerini doldurup deneme çözen herkes burada görünür. Hangi denemeyi çözdüğünü ve doğru yanlış dağılımını tek ekranda izleyebilirsin.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Toplam çözüm</div>
                    <div className="mt-2 text-3xl font-black text-slate-900">{allAttempts.length}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Tekil kişi</div>
                    <div className="mt-2 text-3xl font-black text-slate-900">{uniqueParticipantCount}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Toplam doğru</div>
                    <div className="mt-2 text-3xl font-black text-emerald-600">{totalCorrectAnswers}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Toplam yanlış</div>
                    <div className="mt-2 text-3xl font-black text-rose-600">{totalWrongAnswers}</div>
                  </div>
                </div>

                {allAttemptsLoading ? (
                  <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 py-12 text-slate-600">
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Katılımcı kayıtları yükleniyor...
                  </div>
                ) : allAttempts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm leading-6 text-slate-500">
                    Henüz iletişim bilgisi doldurulmuş bir deneme kaydı yok.
                  </div>
                ) : (
                  <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
                    {allAttempts.map((attempt) => (
                      <div key={attempt.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-lg font-bold text-slate-900">{attempt.full_name}</p>
                              <Badge variant="outline" className={cn('capitalize', sectionTheme[attempt.exam_section_type].pill)}>
                                {attempt.exam_section_type === 'verbal' ? 'Sözel' : 'Sayısal'}
                              </Badge>
                            </div>
                            <div className="mt-1 text-sm font-medium text-slate-700">{attempt.exam_title}</div>
                            <div className="mt-2 space-y-1 text-sm text-slate-600">
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                {attempt.email}
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                {attempt.phone}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                              {formatAttemptDate(attempt.submitted_at)}
                            </Badge>
                            <button
                              type="button"
                              onClick={() => openExamFromAttempt(attempt.exam_id, attempt.exam_group)}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                            >
                              Bu denemeyi aç
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-4">
                          <div className="rounded-2xl bg-white p-3 shadow-sm">
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Doğru</div>
                            <div className="mt-2 text-2xl font-black text-emerald-600">{attempt.correct_count}</div>
                          </div>
                          <div className="rounded-2xl bg-white p-3 shadow-sm">
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Yanlış</div>
                            <div className="mt-2 text-2xl font-black text-rose-600">{attempt.wrong_count}</div>
                          </div>
                          <div className="rounded-2xl bg-white p-3 shadow-sm">
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Boş</div>
                            <div className="mt-2 text-2xl font-black text-amber-500">{attempt.blank_count}</div>
                          </div>
                          <div className="rounded-2xl bg-white p-3 shadow-sm">
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Başarı</div>
                            <div className="mt-2 text-2xl font-black text-slate-900">%{attempt.score_percentage}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 2xl:grid-cols-[300px_minmax(0,1fr)]">
              <div ref={editorPanelRef} className="space-y-6">
                <Card className="border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-slate-900">Sınav Bölümleri</CardTitle>
                    <CardDescription>Yayın durumu ve sıra bilgisi buradan takip edilir.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {filteredExams.map((exam) => {
                      const isSelected = exam.id === selectedExamId
                      const theme = sectionTheme[exam.section_type]
                      return (
                        <div
                          key={exam.id}
                          className={cn(
                            'rounded-3xl border p-4 transition-all',
                            isSelected ? 'border-slate-900 bg-slate-900 text-white shadow-xl' : 'border-slate-200 bg-white hover:border-slate-300'
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedExamId(exam.id)}
                            className="w-full text-left"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'border text-xs',
                                      isSelected ? 'border-white/20 bg-white/10 text-white' : 'border-slate-200 bg-slate-50 text-slate-600'
                                    )}
                                  >
                                    {getMockExamGroupLabel(exam.exam_group)}
                                  </Badge>
                                  <Badge className={cn('border font-semibold', isSelected ? 'border-white/20 bg-white/10 text-white' : theme.pill)}>
                                    {exam.section_type === 'verbal' ? 'Sözel' : 'Sayısal'}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'border text-xs',
                                      isSelected
                                        ? 'border-white/20 bg-white/10 text-white'
                                        : exam.is_published
                                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                          : 'border-slate-200 bg-slate-50 text-slate-500'
                                    )}
                                  >
                                    {exam.is_published ? 'Yayında' : 'Taslak'}
                                  </Badge>
                                </div>
                                <div className="text-lg font-bold break-words">{exam.title}</div>
                                <div className={cn('mt-2 text-sm', isSelected ? 'text-slate-200' : 'text-slate-500')}>
                                  {exam.question_count} soru • {exam.duration_minutes} dk • {exam.attempt_count} çözüm • Sıra {exam.sort_order}
                                </div>
                              </div>
                            </div>
                          </button>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void handlePublishToggleForExam(exam.id)}
                              disabled={working === `publish-${exam.id}`}
                              className={cn(
                                'rounded-full',
                                isSelected
                                  ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                                  : exam.is_published
                                    ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              )}
                            >
                              {working === `publish-${exam.id}`
                                ? 'İşleniyor...'
                                : exam.is_published
                                  ? 'Yayından Kaldır'
                                  : 'Tekrar Yayınla'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void handleDeleteExam(exam.id)}
                              disabled={working === `delete-${exam.id}`}
                              className={cn(
                                'rounded-full border-red-200 text-red-600 hover:bg-red-50',
                                isSelected && 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                              )}
                            >
                              {working === `delete-${exam.id}` ? 'Siliniyor...' : 'Sil'}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              </div>

            {selectedExam && (
              <div className="space-y-6">
                <Card className="border-0 shadow-xl">
                  <CardHeader>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                            {getMockExamGroupLabel(selectedExam.exam_group)}
                          </Badge>
                          <Badge className={cn('border font-semibold', sectionTheme[selectedExam.section_type].pill)}>
                            {selectedExam.section_type === 'verbal' ? 'Sözel Oturum' : 'Sayısal Oturum'}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={selectedExam.is_published ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}
                          >
                            {selectedExam.is_published ? 'Yayında' : 'Taslak'}
                          </Badge>
                        </div>
                        <CardTitle className="break-words text-2xl font-black text-slate-900">{selectedExam.title}</CardTitle>
                        <CardDescription className="mt-2">
                          Soruları, seçenekleri ve doğru cevapları düzenle. Kaydettikten sonra yayınla.
                        </CardDescription>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {selectedExam.is_published && (
                          <Link href={`/deneme-sinavlari?group=${selectedExam.exam_group}&section=${selectedExam.slug}`} target="_blank" className="inline-flex">
                            <Button variant="outline" className="rounded-full">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Canlı Sayfayı Aç
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => void handleDeleteSelectedExam()}
                          className="rounded-full border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Sil
                        </Button>
                        <Button
                          onClick={() => void saveSelectedExam()}
                          disabled={working === `save-${selectedExam.id}`}
                          className="rounded-full bg-slate-900 text-white hover:bg-slate-800"
                        >
                          {working === `save-${selectedExam.id}` ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          Kaydet
                        </Button>
                        <Button
                          onClick={() => void handlePublishToggle()}
                          disabled={working === `publish-${selectedExam.id}` || working === `save-${selectedExam.id}`}
                          className="rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700"
                        >
                          {working === `publish-${selectedExam.id}` ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Globe className="mr-2 h-4 w-4" />
                          )}
                          {selectedExam.is_published ? 'Yayından Kaldır' : 'Yayınla'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-6 xl:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Başlık</label>
                        <Input
                          value={selectedExam.title}
                          onChange={(event) => updateSelectedExam((exam) => ({ ...exam, title: event.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Slug</label>
                        <Input
                          value={selectedExam.slug}
                          onChange={(event) => updateSelectedExam((exam) => ({ ...exam, slug: event.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Açıklama</label>
                        <Textarea
                          value={selectedExam.description ?? ''}
                          onChange={(event) => updateSelectedExam((exam) => ({ ...exam, description: event.target.value }))}
                          className="min-h-[110px]"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Talimat metni</label>
                        <Textarea
                          value={selectedExam.instructions ?? ''}
                          onChange={(event) => updateSelectedExam((exam) => ({ ...exam, instructions: event.target.value }))}
                          className="min-h-[110px]"
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">Süre</label>
                          <Input
                            type="number"
                            min={1}
                            max={300}
                            value={selectedExam.duration_minutes}
                            onChange={(event) =>
                              updateSelectedExam((exam) => ({
                                ...exam,
                                duration_minutes: normalizeMockExamDuration(event.target.value, exam.section_type),
                              }))
                            }
                          />
                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            {selectedExam.section_type === 'verbal'
                              ? `Önerilen başlangıç süresi ${getDefaultMockExamDuration('verbal')} dakikadır. Bu alanı 1-300 dakika arasında değiştirebilirsin.`
                              : `Önerilen başlangıç süresi ${getDefaultMockExamDuration('quantitative')} dakikadır. Bu alanı 1-300 dakika arasında değiştirebilirsin.`}
                          </p>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">Sıra</label>
                          <Input
                            type="number"
                            value={selectedExam.sort_order}
                            onChange={(event) =>
                              updateSelectedExam((exam) => ({
                                ...exam,
                                sort_order: Number(event.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">Kategori etiketi</label>
                          <select
                            value={selectedExam.exam_group}
                            onChange={(event) => {
                              const nextGroup = event.target.value as MockExamGroupId
                              setSelectedGroup(nextGroup)
                              updateSelectedExam((exam) => ({
                                ...exam,
                                exam_group: nextGroup,
                                title: exam.title === createMockExamDraftTitle(exam.section_type, exam.exam_group)
                                  ? createMockExamDraftTitle(exam.section_type, nextGroup)
                                  : exam.title,
                              }))
                            }}
                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            {mockExamGroupOrder.map((group) => (
                              <option key={group} value={group}>
                                {getMockExamGroupConfig(group).menuLabel}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">Bölüm tipi</label>
                          <select
                            value={selectedExam.section_type}
                            onChange={(event) =>
                              updateSelectedExam((exam) => {
                                const nextSectionType = event.target.value as MockExamSectionId
                                const previousDefaultTitle = createMockExamDraftTitle(exam.section_type, exam.exam_group)
                                const nextExam = enforceExamStructure(
                                  exam,
                                  nextSectionType,
                                  exam.questions,
                                  true
                                )
                                return {
                                  ...nextExam,
                                  title: exam.title === previousDefaultTitle
                                    ? createMockExamDraftTitle(nextSectionType, exam.exam_group)
                                    : nextExam.title,
                                  duration_minutes:
                                    normalizeMockExamDuration(exam.duration_minutes, exam.section_type) === getDefaultMockExamDuration(exam.section_type)
                                      ? getDefaultMockExamDuration(nextSectionType)
                                      : normalizeMockExamDuration(exam.duration_minutes, nextSectionType),
                                }
                              })
                            }
                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            <option value="verbal">Sözel</option>
                            <option value="quantitative">Sayısal</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6 min-[1800px]:grid-cols-[minmax(0,1fr)_360px]">
                  <Card className="border-0 shadow-xl">
                    <CardHeader>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <CardTitle className="text-xl font-bold text-slate-900">Soru ve Cevap Editörü</CardTitle>
                          <CardDescription>Admin burada soruları ders blokları içinde sıralı biçimde düzenler.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {getMockExamSectionSubjects(selectedExam.section_type, selectedExam.exam_group).map((subjectItem) => {
                        const subjectQuestions = selectedExam.questions.filter((question) => question.subject === subjectItem.id)

                        return (
                          <div key={subjectItem.id} className="rounded-[2rem] border border-slate-200 bg-slate-50/80 p-5">
                            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <div className="text-lg font-bold text-slate-900">{subjectItem.label}</div>
                                <div className="mt-1 text-sm text-slate-500">
                                  {subjectQuestions.length} soru bu ders bloğunda sıralanır.
                                </div>
                              </div>
                              <Button
                                onClick={() => addQuestion(subjectItem.id)}
                                className="rounded-full bg-slate-900 text-white hover:bg-slate-800"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                {subjectItem.label} Sorusu Ekle
                              </Button>
                            </div>

                            {subjectQuestions.length === 0 ? (
                              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                                Bu ders için henüz soru eklenmemiş.
                              </div>
                            ) : (
                              <div className="space-y-5">
                                {subjectQuestions.map((question) => (
                                  <div key={question.id} className="rounded-3xl border border-slate-200 bg-white p-5">
                                    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                      <div className="flex flex-wrap items-center gap-3">
                                        <div className="text-lg font-bold text-slate-900">Soru {question.id}</div>
                                        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                                          {getMockExamSubjectLabel(question.subject)}
                                        </Badge>
                                      </div>
                                      <Button
                                        variant="outline"
                                        onClick={() => removeQuestion(question.id)}
                                        disabled={selectedExam.questions.length <= 1}
                                        className="rounded-full border-red-200 text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Sil
                                      </Button>
                                    </div>

                                    <div className="mb-4 grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)]">
                                      <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">Ders</label>
                                        <select
                                          value={question.subject}
                                          onChange={(event) =>
                                            updateQuestion(question.id, (current) => ({
                                              ...current,
                                              subject: event.target.value as MockExamSubjectId,
                                            }))
                                          }
                                          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                        >
                                          {getMockExamSectionSubjects(selectedExam.section_type, selectedExam.exam_group).map((option) => (
                                            <option key={option.id} value={option.id}>
                                              {option.label}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      <div className="min-w-0">
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">Soru kökü</label>
                                        <Textarea
                                          value={question.prompt}
                                          onChange={(event) =>
                                            updateQuestion(question.id, (current) => ({
                                              ...current,
                                              prompt: event.target.value,
                                            }))
                                          }
                                          className="min-h-[100px] w-full bg-white"
                                        />
                                      </div>
                                    </div>

                                    <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                        <div className="text-sm font-semibold text-slate-700">Soru görseli</div>
                                        {question.imageUrl && (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                              updateQuestion(question.id, (current) => ({
                                                ...current,
                                                imageUrl: null,
                                              }))
                                            }
                                            className="rounded-full"
                                          >
                                            Görseli kaldır
                                          </Button>
                                        )}
                                      </div>

                                      <div className="flex flex-col gap-3 xl:flex-row">
                                        <Input
                                          value={question.imageUrl ?? ''}
                                          onChange={(event) =>
                                            updateQuestion(question.id, (current) => ({
                                              ...current,
                                              imageUrl: event.target.value,
                                            }))
                                          }
                                          placeholder="https://... veya görsel yükleyin"
                                          className="bg-white"
                                        />
                                        <label
                                          className={cn(
                                            'inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50',
                                            uploadingQuestionId === question.id && 'pointer-events-none opacity-60'
                                          )}
                                        >
                                          {uploadingQuestionId === question.id ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          ) : (
                                            <ImagePlus className="mr-2 h-4 w-4" />
                                          )}
                                          Görsel Yükle
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(event) => {
                                              const file = event.target.files?.[0]
                                              void handleQuestionImageUpload(question.id, file)
                                              event.target.value = ''
                                            }}
                                          />
                                        </label>
                                      </div>

                                      {question.imageUrl && (
                                        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                          <img
                                            src={question.imageUrl}
                                            alt={`Soru ${question.id} görseli`}
                                            className="max-h-[340px] w-full object-contain"
                                          />
                                        </div>
                                      )}
                                    </div>

                                    <div className="grid gap-3 2xl:grid-cols-2">
                                      {question.options.map((option) => (
                                        <div key={`${question.id}-${option.id}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                          <div className="mb-3 flex items-center justify-between gap-3">
                                            <div className="text-sm font-semibold text-slate-700">Seçenek {option.id}</div>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                updateQuestion(question.id, (current) => ({
                                                  ...current,
                                                  correctOptionId: option.id,
                                                }))
                                              }
                                              className={cn(
                                                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                                                question.correctOptionId === option.id
                                                  ? 'bg-emerald-100 text-emerald-700'
                                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                              )}
                                            >
                                              {question.correctOptionId === option.id ? 'Doğru cevap' : 'Doğru yap'}
                                            </button>
                                          </div>
                                          <div className="space-y-3">
                                            <Input
                                              value={option.text}
                                              onChange={(event) =>
                                                updateOption(question.id, option.id, (current) => ({
                                                  ...current,
                                                  text: event.target.value,
                                                }))
                                              }
                                              placeholder="Şık metni yazın veya sadece görsel kullanın"
                                            />

                                            <Input
                                              value={option.imageUrl ?? ''}
                                              onChange={(event) =>
                                                updateOption(question.id, option.id, (current) => ({
                                                  ...current,
                                                  imageUrl: event.target.value,
                                                }))
                                              }
                                              placeholder="Şık görsel URL'si"
                                            />

                                            <div className="flex flex-wrap gap-2">
                                              <label
                                                className={cn(
                                                  'inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50',
                                                  uploadingOptionKey === `${question.id}-${option.id}` && 'pointer-events-none opacity-60'
                                                )}
                                              >
                                                {uploadingOptionKey === `${question.id}-${option.id}` ? (
                                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                  <ImagePlus className="mr-2 h-4 w-4" />
                                                )}
                                                Şık Görseli Yükle
                                                <input
                                                  type="file"
                                                  accept="image/*"
                                                  className="hidden"
                                                  onChange={(event) => {
                                                    const file = event.target.files?.[0]
                                                    void handleOptionImageUpload(question.id, option.id, file)
                                                    event.target.value = ''
                                                  }}
                                                />
                                              </label>

                                              {option.imageUrl && (
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  onClick={() =>
                                                    updateOption(question.id, option.id, (current) => ({
                                                      ...current,
                                                      imageUrl: null,
                                                    }))
                                                  }
                                                  className="rounded-full"
                                                >
                                                  Görseli kaldır
                                                </Button>
                                              )}
                                            </div>

                                            {option.imageUrl && (
                                              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                                <img
                                                  src={option.imageUrl}
                                                  alt={`Seçenek ${option.id} görseli`}
                                                  className="max-h-[220px] w-full object-contain"
                                                />
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <Card className="border-0 shadow-xl">
                      <CardHeader>
                        <CardTitle className="text-xl font-bold text-slate-900">Yayın Özeti</CardTitle>
                        <CardDescription>Canlı sayfaya çıkacak içerik ve çözüm özeti.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Durum</div>
                          <div className="mt-2 text-lg font-bold text-slate-900">{selectedExam.is_published ? 'Yayında' : 'Taslak'}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Canlı rota</div>
                          <div className="mt-2 break-all text-sm font-semibold text-slate-900">/deneme-sinavlari?group={selectedExam.exam_group}&section={selectedExam.slug}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Kategori</div>
                          <div className="mt-2 text-sm font-semibold text-slate-900">{getMockExamGroupLabel(selectedExam.exam_group)}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Soru adedi</div>
                          <div className="mt-2 text-sm font-semibold text-slate-900">{selectedExam.questions.length} soru</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Ders Dağılımı</div>
                          <div className="mt-2 space-y-2 text-sm font-semibold text-slate-900">
                            {selectedExamSubjectStats.map((item) => (
                              <div key={item.id} className="flex items-center justify-between gap-3">
                                <span>{item.label}</span>
                                <span>{item.count} soru</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Süre</div>
                          <div className="mt-2 text-sm font-semibold text-slate-900">{selectedExam.duration_minutes} dakika</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Toplam çözüm</div>
                          <div className="mt-2 text-sm font-semibold text-slate-900">{selectedExam.attempt_count}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Son çözüm</div>
                          <div className="mt-2 text-sm font-semibold text-slate-900">{formatAttemptDate(selectedExam.last_attempt_at)}</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-xl">
                      <CardHeader>
                        <CardTitle className="text-xl font-bold text-slate-900">Çözüm Kayıtları</CardTitle>
                        <CardDescription>
                          Bu denemeyi kimlerin çözdüğünü, iletişim bilgilerini ve doğru yanlış dağılımını burada görürsün.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {attemptsLoading ? (
                          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 py-12 text-slate-600">
                            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                            Çözüm kayıtları yükleniyor...
                          </div>
                        ) : attempts.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm leading-6 text-slate-500">
                            Bu deneme için henüz kayıtlı bir çözüm yok.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {attempts.map((attempt) => (
                              <div key={attempt.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
                                      <UserRound className="h-4 w-4" />
                                      {attempt.full_name}
                                    </div>
                                    <div className="mt-2 space-y-1 text-sm text-slate-600">
                                      <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4" />
                                        {attempt.email}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4" />
                                        {attempt.phone}
                                      </div>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                                    {formatAttemptDate(attempt.submitted_at)}
                                  </Badge>
                                </div>

                                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Doğru</div>
                                    <div className="mt-2 text-2xl font-black text-emerald-600">{attempt.correct_count}</div>
                                  </div>
                                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Yanlış</div>
                                    <div className="mt-2 text-2xl font-black text-rose-600">{attempt.wrong_count}</div>
                                  </div>
                                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Boş</div>
                                    <div className="mt-2 text-2xl font-black text-amber-500">{attempt.blank_count}</div>
                                  </div>
                                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Başarı</div>
                                    <div className="mt-2 text-2xl font-black text-slate-900">%{attempt.score_percentage}</div>
                                  </div>
                                </div>

                                <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Yanlış yapılan sorular</div>
                                  <div className="mt-2 text-sm font-semibold text-slate-900">
                                    {attempt.wrong_question_ids.length > 0 ? attempt.wrong_question_ids.join(', ') : 'Yanlış soru yok'}
                                  </div>
                                </div>

                                <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
                                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Boş bırakılan sorular</div>
                                  <div className="mt-2 text-sm font-semibold text-slate-900">
                                    {attempt.blank_question_ids.length > 0 ? attempt.blank_question_ids.join(', ') : 'Boş soru yok'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <MockExamRunner
                  key={`preview-${selectedExam.id}`}
                  title={selectedExam.title}
                  description={selectedExam.description}
                  instructions={selectedExam.instructions}
                  durationMinutes={selectedExam.duration_minutes}
                  questions={selectedExam.questions}
                  sectionType={selectedExam.section_type}
                />
              </div>
            )}
          </div>
          </div>
        )}
      </div>
    </div>
  )
}
