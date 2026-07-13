'use client'

import { type ReactNode, useEffect, useState } from 'react'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Play,
  RefreshCw,
  Target,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MockExamSubjectId, getMockExamSubjectLabel } from '@/lib/mockExams'
import { cn } from '@/lib/utils'

export interface MockExamRunnerOption {
  id: string
  text: string
  imageUrl?: string | null
}

export interface MockExamRunnerQuestion {
  id: number
  subject: MockExamSubjectId
  prompt: string
  imageUrl?: string | null
  options: MockExamRunnerOption[]
  correctOptionId?: string
}

export interface MockExamRunnerReviewItem {
  question_id: number
  selected_option_id?: string | null
  correct_option_id: string
  is_correct: boolean
}

export interface MockExamRunnerSubmitResult {
  attempt_id?: number
  correct_count: number
  wrong_count: number
  blank_count: number
  total_questions: number
  review: MockExamRunnerReviewItem[]
}

interface MockExamRunnerProps {
  title: string
  description?: string | null
  instructions?: string | null
  durationMinutes: number
  questions: MockExamRunnerQuestion[]
  sectionType: 'verbal' | 'quantitative'
  submitAction?: (answers: Array<{ question_id: number; selected_option_id?: string | null }>) => Promise<MockExamRunnerSubmitResult>
  beforeStartContent?: ReactNode
  startDisabled?: boolean
  startDisabledMessage?: string | null
}

const sectionTheme = {
  verbal: {
    pill: 'border-sky-200 bg-sky-50 text-sky-700',
    button: 'from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700',
    soft: 'from-sky-50 via-white to-blue-50',
  },
  quantitative: {
    pill: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    button: 'from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700',
    soft: 'from-emerald-50 via-white to-teal-50',
  },
} as const

function formatRemainingTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function buildLocalResult(
  questions: MockExamRunnerQuestion[],
  answers: Record<number, string>
): MockExamRunnerSubmitResult {
  const review = questions.map((question) => {
    const selectedOptionId = answers[question.id] ?? null
    const correctOptionId = question.correctOptionId ?? ''
    const isCorrect = Boolean(selectedOptionId) && selectedOptionId === correctOptionId
    return {
      question_id: question.id,
      selected_option_id: selectedOptionId,
      correct_option_id: correctOptionId,
      is_correct: isCorrect,
    }
  })

  const correctCount = review.filter((item) => item.is_correct).length
  const blankCount = review.filter((item) => !item.selected_option_id).length
  const wrongCount = review.length - correctCount - blankCount

  return {
    attempt_id: 0,
    correct_count: correctCount,
    wrong_count: wrongCount,
    blank_count: blankCount,
    total_questions: questions.length,
    review,
  }
}

export default function MockExamRunner({
  title,
  description,
  instructions,
  durationMinutes,
  questions,
  sectionType,
  submitAction,
  beforeStartContent,
  startDisabled = false,
  startDisabledMessage,
}: MockExamRunnerProps) {
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [reviewMode, setReviewMode] = useState(false)
  const [timeExpired, setTimeExpired] = useState(false)
  const [showFinishPrompt, setShowFinishPrompt] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [remainingSeconds, setRemainingSeconds] = useState(durationMinutes * 60)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [result, setResult] = useState<MockExamRunnerSubmitResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const theme = sectionTheme[sectionType]
  const activeQuestion = questions[currentQuestionIndex]
  const unansweredQuestions = questions.filter((question) => !answers[question.id]).map((question) => question.id)
  const answeredCount = questions.filter((question) => Boolean(answers[question.id])).length
  const reviewByQuestionId = new Map(result?.review.map((item) => [item.question_id, item]) ?? [])
  const wrongQuestionIds = result?.review.filter((item) => item.selected_option_id && !item.is_correct).map((item) => item.question_id) ?? []
  const blankQuestionIds = result?.review.filter((item) => !item.selected_option_id).map((item) => item.question_id) ?? []

  useEffect(() => {
    setStarted(false)
    setFinished(false)
    setReviewMode(false)
    setTimeExpired(false)
    setShowFinishPrompt(false)
    setCurrentQuestionIndex(0)
    setRemainingSeconds(durationMinutes * 60)
    setAnswers({})
    setResult(null)
    setSubmitting(false)
    setSubmitError(null)
  }, [durationMinutes, questions, title])

  useEffect(() => {
    if (!started || finished || reviewMode) {
      return
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId)
          void finishExam(true)
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [answers, finished, questions, reviewMode, started, submitAction])

  const startExam = () => {
    if (startDisabled) {
      return
    }

    setStarted(true)
    setFinished(false)
    setReviewMode(false)
    setTimeExpired(false)
    setShowFinishPrompt(false)
    setCurrentQuestionIndex(0)
    setRemainingSeconds(durationMinutes * 60)
    setAnswers({})
    setResult(null)
    setSubmitError(null)
  }

  const resetExam = () => {
    setStarted(false)
    setFinished(false)
    setReviewMode(false)
    setTimeExpired(false)
    setShowFinishPrompt(false)
    setCurrentQuestionIndex(0)
    setRemainingSeconds(durationMinutes * 60)
    setAnswers({})
    setResult(null)
    setSubmitting(false)
    setSubmitError(null)
  }

  const selectAnswer = (optionId: string) => {
    if (reviewMode || finished) {
      return
    }

    setAnswers((prev) => ({
      ...prev,
      [activeQuestion.id]: optionId,
    }))
  }

  const openReviewMode = () => {
    const firstProblemIndex = questions.findIndex((question) => {
      const reviewItem = reviewByQuestionId.get(question.id)
      return !reviewItem?.is_correct
    })

    setCurrentQuestionIndex(firstProblemIndex >= 0 ? firstProblemIndex : 0)
    setReviewMode(true)
  }

  const finishExam = async (expired = false) => {
    setSubmitting(true)
    setSubmitError(null)
    setShowFinishPrompt(false)

    try {
      const submission = questions.map((question) => ({
        question_id: question.id,
        selected_option_id: answers[question.id] ?? null,
      }))

      const nextResult = submitAction
        ? await submitAction(submission)
        : buildLocalResult(questions, answers)

      setStarted(false)
      setFinished(true)
      setReviewMode(false)
      setTimeExpired(expired)
      setResult(nextResult)
    } catch (error: any) {
      setSubmitError(error?.response?.data?.detail || error?.message || 'Sınav sonucu alınamadı.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="overflow-hidden border-0 shadow-xl">
      <CardHeader className={cn('border-b p-6', `bg-gradient-to-r ${theme.soft}`)}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className={cn('border font-semibold', theme.pill)}>
                {sectionType === 'verbal' ? 'Sözel Oturum' : 'Sayısal Oturum'}
              </Badge>
              <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                {questions.length} soru
              </Badge>
              <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                {durationMinutes} dakika
              </Badge>
            </div>
            <CardTitle className="text-3xl font-black tracking-tight text-slate-900">{title}</CardTitle>
            <CardDescription className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {description || instructions || 'Teste başla ile sayaç çalışır, boş soru kontrolü ve cevap inceleme akışı aktiftir.'}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                <Clock className="h-4 w-4" />
                Sayaç
              </div>
              <div className={cn('mt-2 text-3xl font-black tracking-tight', remainingSeconds <= 300 ? 'text-red-600' : 'text-slate-900')}>
                {formatRemainingTime(remainingSeconds)}
              </div>
            </div>

            <Button variant="outline" onClick={resetExam} className="rounded-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Sıfırla
            </Button>

            {!started && !finished && (
              <div className="flex flex-col items-end gap-2">
                <Button
                  onClick={startExam}
                  disabled={startDisabled}
                  className={cn('rounded-full bg-gradient-to-r text-white shadow-lg', theme.button)}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Teste Başla
                </Button>
                {startDisabled && startDisabledMessage && (
                  <p className="max-w-xs text-right text-xs font-medium leading-5 text-amber-700">
                    {startDisabledMessage}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative p-6">
        {instructions && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-600">
            {instructions}
          </div>
        )}

        {timeExpired && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            Üzgünüz. Süreniz bitti.
          </div>
        )}

        {submitError && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {submitError}
          </div>
        )}

        {!started && !finished && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-2xl font-bold text-slate-900">Sınav akışı hazır</h3>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="text-sm font-semibold text-slate-500">Zaman kuralı</div>
                    <p className="mt-2 text-base font-semibold text-slate-900">{durationMinutes} dakikalık geri sayım</p>
                  </div>
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="text-sm font-semibold text-slate-500">Soru adedi</div>
                    <p className="mt-2 text-base font-semibold text-slate-900">{questions.length} çoktan seçmeli soru</p>
                  </div>
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="text-sm font-semibold text-slate-500">Navigasyon</div>
                    <p className="mt-2 text-base font-semibold text-slate-900">İleri ve geri butonları aktif</p>
                  </div>
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="text-sm font-semibold text-slate-500">Bitirme akışı</div>
                    <p className="mt-2 text-base font-semibold text-slate-900">Boş soru uyarısı ve cevap inceleme</p>
                  </div>
                </div>
              </div>

              {beforeStartContent}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-slate-900">
                <Target className="h-5 w-5" />
                <span className="font-semibold">Canlı deneme</span>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                Teste Başla tıklandıktan sonra sayaç da başlar. Son soruda boş bırakılanlar için onay akışı çalışır.
              </p>
              <Button
                onClick={startExam}
                disabled={startDisabled}
                className={cn('mt-6 w-full rounded-2xl bg-gradient-to-r text-white', theme.button)}
              >
                <Play className="mr-2 h-4 w-4" />
                Teste Başla
              </Button>
              {startDisabled && startDisabledMessage && (
                <p className="mt-3 text-xs font-medium leading-5 text-amber-700">
                  {startDisabledMessage}
                </p>
              )}
            </div>
          </div>
        )}

        {(started || reviewMode) && activeQuestion && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm">
                  Soru {currentQuestionIndex + 1} / {questions.length}
                </div>
                <div className="text-sm text-slate-500">
                  Cevaplanan: <span className="font-semibold text-slate-900">{answeredCount}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-500">
                {reviewMode ? (
                  <>
                    <Eye className="h-4 w-4 text-slate-900" />
                    Cevap inceleme modu
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 text-slate-900" />
                    Aktif çözüm modu
                  </>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                {activeQuestion.prompt ? 'Soru Metni' : 'Soru Görseli'}
              </div>
              <div className="mb-4">
                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                  {getMockExamSubjectLabel(activeQuestion.subject)}
                </Badge>
              </div>
              {activeQuestion.prompt && <h3 className="text-xl font-semibold leading-8 text-slate-900">{activeQuestion.prompt}</h3>}

              {activeQuestion.imageUrl && (
                <div className={cn('overflow-hidden rounded-3xl border border-slate-200 bg-slate-50', activeQuestion.prompt ? 'mt-6' : 'mt-2')}>
                  <img
                    src={activeQuestion.imageUrl}
                    alt={`Soru ${activeQuestion.id} görseli`}
                    className="max-h-[420px] w-full object-contain"
                  />
                </div>
              )}

              <div className="mt-8 grid gap-3">
                {activeQuestion.options.map((option) => {
                  const selectedAnswer = answers[activeQuestion.id]
                  const isSelected = selectedAnswer === option.id
                  const reviewItem = reviewByQuestionId.get(activeQuestion.id)
                  const correctOptionId = reviewItem?.correct_option_id ?? activeQuestion.correctOptionId
                  const isCorrect = option.id === correctOptionId
                  const showReviewState = reviewMode

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={reviewMode}
                      onClick={() => selectAnswer(option.id)}
                      className={cn(
                        'rounded-2xl border px-5 py-4 text-left transition-all',
                        !showReviewState && isSelected && 'border-slate-900 bg-slate-900 text-white shadow-lg',
                        !showReviewState && !isSelected && 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                        showReviewState && isCorrect && 'border-emerald-300 bg-emerald-50 text-emerald-800',
                        showReviewState && isSelected && !isCorrect && 'border-red-300 bg-red-50 text-red-700',
                        showReviewState && !isCorrect && !isSelected && 'border-slate-200 bg-white text-slate-600'
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold',
                            !showReviewState && isSelected && 'border-white/20 bg-white/10 text-white',
                            !showReviewState && !isSelected && 'border-slate-200 bg-slate-50 text-slate-700',
                            showReviewState && isCorrect && 'border-emerald-300 bg-white text-emerald-700',
                            showReviewState && isSelected && !isCorrect && 'border-red-300 bg-white text-red-700'
                          )}
                        >
                          {option.id}
                        </div>
                        <div className="flex-1">
                          {option.text && <div className="text-sm font-medium leading-6">{option.text}</div>}
                          {option.imageUrl && (
                            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                              <img
                                src={option.imageUrl}
                                alt={`Seçenek ${option.id} görseli`}
                                className="max-h-[220px] w-full object-contain"
                              />
                            </div>
                          )}
                          {showReviewState && isCorrect && (
                            <div className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                              Doğru cevap
                            </div>
                          )}
                          {showReviewState && isSelected && !isCorrect && (
                            <div className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
                              İşaretlediğiniz cevap
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="outline"
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex((current) => current - 1)}
                className="rounded-full"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Geri
              </Button>

              <div className="flex flex-wrap gap-3">
                {!reviewMode && currentQuestionIndex < questions.length - 1 && (
                  <Button
                    onClick={() => setCurrentQuestionIndex((current) => current + 1)}
                    className={cn('rounded-full bg-gradient-to-r text-white', theme.button)}
                  >
                    İleri
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}

                {!reviewMode && currentQuestionIndex === questions.length - 1 && (
                  <Button
                    onClick={() => {
                      if (unansweredQuestions.length > 0) {
                        setShowFinishPrompt(true)
                        return
                      }
                      void finishExam()
                    }}
                    className="rounded-full bg-slate-900 text-white hover:bg-slate-800"
                    disabled={submitting}
                  >
                    Testi Bitir
                  </Button>
                )}

                {reviewMode && currentQuestionIndex < questions.length - 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex((current) => current + 1)}
                    className="rounded-full"
                  >
                    Sonraki cevap
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {finished && !reviewMode && result && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-2xl font-bold text-slate-900">Deneme tamamlandı</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Sistem boşları kontrol etti ve sonuç özetini hazırladı. İstersen cevap inceleme moduna geçebilirsin.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Doğru soru sayısı</div>
                  <div className="mt-2 text-3xl font-black text-emerald-600">{result.correct_count}</div>
                </div>
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Yanlış soru sayısı</div>
                  <div className="mt-2 text-3xl font-black text-rose-600">{result.wrong_count}</div>
                </div>
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Boş bırakılan soru sayısı</div>
                  <div className="mt-2 text-3xl font-black text-amber-500">{result.blank_count}</div>
                </div>
              </div>

              {(wrongQuestionIds.length > 0 || blankQuestionIds.length > 0) && (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Yanlış yapılan sorular</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">
                      {wrongQuestionIds.length > 0 ? wrongQuestionIds.join(', ') : 'Yanlış yok'}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Boş bırakılan sorular</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">
                      {blankQuestionIds.length > 0 ? blankQuestionIds.join(', ') : 'Boş yok'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={openReviewMode} className="rounded-full bg-slate-900 text-white hover:bg-slate-800">
                <Eye className="mr-2 h-4 w-4" />
                Cevaplarınızı Kontrol Edin
              </Button>
              <Button variant="outline" onClick={resetExam} className="rounded-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Yeniden Başlat
              </Button>
            </div>
          </div>
        )}

        {showFinishPrompt && (
          <div className="absolute inset-0 flex items-center justify-center rounded-b-lg bg-slate-900/40 p-6">
            <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-600">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Boş bırakılan sorular var</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    BOŞ BIRAKILAN SORULAR VAR! TESTİ BİTİRMEYE EMİN MİSİN?
                  </p>
                  <p className="mt-3 text-sm text-slate-500">
                    Boş kalan sorular: {unansweredQuestions.join(', ')}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  onClick={() => {
                    void finishExam()
                  }}
                  className="rounded-full bg-slate-900 text-white hover:bg-slate-800"
                  disabled={submitting}
                >
                  Evet
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowFinishPrompt(false)
                    setCurrentQuestionIndex(Math.max(0, unansweredQuestions[0] - 1))
                  }}
                  className="rounded-full"
                >
                  Hayır
                </Button>
              </div>
            </div>
          </div>
        )}

        {reviewMode && (
          <div className="mt-6 grid gap-2 sm:grid-cols-5">
            {questions.map((question, index) => {
              const reviewItem = reviewByQuestionId.get(question.id)
              const answered = reviewItem?.selected_option_id
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={cn(
                    'flex h-11 items-center justify-center rounded-2xl border text-sm font-semibold transition-all',
                    !answered && 'border-slate-200 bg-slate-50 text-slate-500',
                    answered && reviewItem?.is_correct && 'border-emerald-300 bg-emerald-50 text-emerald-700',
                    answered && !reviewItem?.is_correct && 'border-red-300 bg-red-50 text-red-700',
                    currentQuestionIndex === index && 'ring-2 ring-slate-900/15'
                  )}
                >
                  {question.id}
                </button>
              )
            })}
          </div>
        )}

        {submitting && (
          <div className="absolute inset-0 flex items-center justify-center rounded-b-lg bg-white/70">
            <div className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-lg">
              Sonuç hesaplanıyor...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
