export type MockExamSectionId = 'verbal' | 'quantitative'
export type MockExamSubjectId =
  | 'turkce'
  | 'sosyal'
  | 'din'
  | 'ingilizce'
  | 'inkilap'
  | 'matematik'
  | 'fen'
export type MockExamGroupId =
  | 'lgs'
  | 'grade_4'
  | 'grade_5'
  | 'grade_6'
  | 'grade_7'
  | 'grade_8'
  | 'grade_9'
  | 'grade_10'
  | 'grade_11'
  | 'grade_12'

export interface MockExamOption {
  id: string
  text: string
  imageUrl?: string | null
}

export interface MockExamQuestion {
  id: number
  subject: MockExamSubjectId
  prompt: string
  imageUrl?: string | null
  options: MockExamOption[]
  correctOptionId: string
}

export interface MockExamPublicQuestion {
  id: number
  subject: MockExamSubjectId
  prompt: string
  imageUrl?: string | null
  options: MockExamOption[]
}

export interface MockExamRecord {
  id: number
  slug: string
  title: string
  exam_group: MockExamGroupId
  section_type: MockExamSectionId
  description?: string | null
  instructions?: string | null
  duration_minutes: number
  question_count: number
  questions: MockExamQuestion[]
  sort_order: number
  is_published: boolean
  attempt_count: number
  last_attempt_at?: string | null
  created_at: string
  updated_at: string
}

export interface MockExamPayload {
  slug: string
  title: string
  exam_group: MockExamGroupId
  section_type: MockExamSectionId
  description?: string
  instructions?: string
  duration_minutes: number
  questions: MockExamQuestion[]
  sort_order: number
  is_published: boolean
}

export interface MockExamPublicListItem {
  id: number
  slug: string
  title: string
  exam_group: MockExamGroupId
  section_type: MockExamSectionId
  description?: string | null
  instructions?: string | null
  duration_minutes: number
  question_count: number
  sort_order: number
}

export interface MockExamPublicRecord extends MockExamPublicListItem {
  questions: MockExamPublicQuestion[]
}

export interface MockExamContactInfo {
  full_name: string
  email: string
  phone: string
}

export interface MockExamReviewItem {
  question_id: number
  selected_option_id?: string | null
  correct_option_id: string
  is_correct: boolean
}

export interface MockExamSubmitResult {
  attempt_id: number
  correct_count: number
  wrong_count: number
  blank_count: number
  total_questions: number
  review: MockExamReviewItem[]
}

export interface MockExamAttemptRecord {
  id: number
  exam_id: number
  full_name: string
  email: string
  phone: string
  correct_count: number
  wrong_count: number
  blank_count: number
  total_questions: number
  score_percentage: number
  wrong_question_ids: number[]
  blank_question_ids: number[]
  review: MockExamReviewItem[]
  submitted_at: string
}

export interface MockExamAttemptOverviewRecord extends MockExamAttemptRecord {
  exam_title: string
  exam_slug: string
  exam_group: MockExamGroupId
  exam_section_type: MockExamSectionId
}

export const optionLetters = ['A', 'B', 'C', 'D'] as const

type MockExamOptionInput = Partial<MockExamOption> | null | undefined
type MockExamQuestionInput = Partial<MockExamQuestion> & {
  options?: MockExamOptionInput[] | null
}

interface MockExamSubjectConfig {
  id: MockExamSubjectId
  label: string
}

export const mockExamGroupOrder: MockExamGroupId[] = [
  'lgs',
  'grade_4',
  'grade_5',
  'grade_6',
  'grade_7',
  'grade_8',
  'grade_9',
  'grade_10',
  'grade_11',
  'grade_12',
]

export const mockExamGroupConfig: Record<
  MockExamGroupId,
  {
    label: string
    shortLabel: string
    pageTitle: string
    menuLabel: string
    description: string
  }
> = {
  lgs: {
    label: 'LGS',
    shortLabel: 'LGS',
    pageTitle: 'LGS Deneme Sınavları',
    menuLabel: 'LGS Deneme Sınavları',
    description: 'LGS hazırlık süreci için yayınlanan sözel ve sayısal denemeler bu alanda listelenir.',
  },
  grade_4: {
    label: '4. Sınıf',
    shortLabel: '4. Sınıf',
    pageTitle: '4. Sınıf Deneme Sınavları',
    menuLabel: '4. Sınıf Deneme Sınavları',
    description: '4. sınıf öğrencileri için hazırlanan denemeler bu alanda yayınlanır.',
  },
  grade_5: {
    label: '5. Sınıf',
    shortLabel: '5. Sınıf',
    pageTitle: '5. Sınıf Deneme Sınavları',
    menuLabel: '5. Sınıf Deneme Sınavları',
    description: '5. sınıf öğrencileri için hazırlanan denemeler bu alanda yayınlanır.',
  },
  grade_6: {
    label: '6. Sınıf',
    shortLabel: '6. Sınıf',
    pageTitle: '6. Sınıf Deneme Sınavları',
    menuLabel: '6. Sınıf Deneme Sınavları',
    description: '6. sınıf öğrencileri için hazırlanan denemeler bu alanda yayınlanır.',
  },
  grade_7: {
    label: '7. Sınıf',
    shortLabel: '7. Sınıf',
    pageTitle: '7. Sınıf Deneme Sınavları',
    menuLabel: '7. Sınıf Deneme Sınavları',
    description: '7. sınıf öğrencileri için hazırlanan denemeler bu alanda yayınlanır.',
  },
  grade_8: {
    label: '8. Sınıf',
    shortLabel: '8. Sınıf',
    pageTitle: '8. Sınıf Deneme Sınavları',
    menuLabel: '8. Sınıf Deneme Sınavları',
    description: '8. sınıf öğrencileri için hazırlanan denemeler bu alanda yayınlanır.',
  },
  grade_9: {
    label: '9. Sınıf',
    shortLabel: '9. Sınıf',
    pageTitle: '9. Sınıf Deneme Sınavları',
    menuLabel: '9. Sınıf Deneme Sınavları',
    description: '9. sınıf öğrencileri için hazırlanan denemeler bu alanda yayınlanır.',
  },
  grade_10: {
    label: '10. Sınıf',
    shortLabel: '10. Sınıf',
    pageTitle: '10. Sınıf Deneme Sınavları',
    menuLabel: '10. Sınıf Deneme Sınavları',
    description: '10. sınıf öğrencileri için hazırlanan denemeler bu alanda yayınlanır.',
  },
  grade_11: {
    label: '11. Sınıf',
    shortLabel: '11. Sınıf',
    pageTitle: '11. Sınıf Deneme Sınavları',
    menuLabel: '11. Sınıf Deneme Sınavları',
    description: '11. sınıf öğrencileri için hazırlanan denemeler bu alanda yayınlanır.',
  },
  grade_12: {
    label: '12. Sınıf',
    shortLabel: '12. Sınıf',
    pageTitle: '12. Sınıf Deneme Sınavları',
    menuLabel: '12. Sınıf Deneme Sınavları',
    description: '12. sınıf öğrencileri için hazırlanan denemeler bu alanda yayınlanır.',
  },
}

export function isMockExamGroupId(value: unknown): value is MockExamGroupId {
  return typeof value === 'string' && mockExamGroupOrder.includes(value as MockExamGroupId)
}

export function isMockExamSectionId(value: unknown): value is MockExamSectionId {
  return value === 'verbal' || value === 'quantitative'
}

export function normalizeMockExamGroupId(value: unknown): MockExamGroupId {
  return isMockExamGroupId(value) ? value : getDefaultMockExamGroup()
}

export function normalizeMockExamSectionId(value: unknown): MockExamSectionId {
  return isMockExamSectionId(value) ? value : 'verbal'
}

const defaultVerbalSubjects: MockExamSubjectConfig[] = [
  { id: 'turkce', label: 'Türkçe' },
  { id: 'sosyal', label: 'Sosyal Bilgiler' },
  { id: 'din', label: 'Din Kültürü' },
]

const gradeSixSevenVerbalSubjects: MockExamSubjectConfig[] = [
  { id: 'turkce', label: 'Türkçe' },
  { id: 'sosyal', label: 'Sosyal Bilgiler' },
  { id: 'ingilizce', label: 'İngilizce' },
]

const gradeEightVerbalSubjects: MockExamSubjectConfig[] = [
  { id: 'turkce', label: 'Türkçe' },
  { id: 'inkilap', label: 'T.C. İnkılap Tarihi ve Atatürkçülük' },
  { id: 'din', label: 'Din Kültürü' },
  { id: 'ingilizce', label: 'İngilizce' },
]

const quantitativeSubjects: MockExamSubjectConfig[] = [
  { id: 'matematik', label: 'Matematik' },
  { id: 'fen', label: 'Fen Bilimleri' },
]

export const mockExamSectionConfig = {
  verbal: {
    title: 'Sözel Oturum',
    shortLabel: 'Sözel',
    durationMinutes: 75,
  },
  quantitative: {
    title: 'Sayısal Oturum',
    shortLabel: 'Sayısal',
    durationMinutes: 80,
  },
} as const

const subjectLabelMap: Record<MockExamSubjectId, string> = {
  turkce: 'Türkçe',
  sosyal: 'Sosyal Bilgiler',
  din: 'Din Kültürü',
  ingilizce: 'İngilizce',
  inkilap: 'T.C. İnkılap Tarihi ve Atatürkçülük',
  matematik: 'Matematik',
  fen: 'Fen Bilimleri',
}

const subjectSectionMap: Record<MockExamSubjectId, MockExamSectionId> = {
  turkce: 'verbal',
  sosyal: 'verbal',
  din: 'verbal',
  ingilizce: 'verbal',
  inkilap: 'verbal',
  matematik: 'quantitative',
  fen: 'quantitative',
}

const mockExamSubjectAliases: Partial<Record<MockExamGroupId, Partial<Record<MockExamSubjectId, MockExamSubjectId>>>> = {
  grade_6: { din: 'ingilizce' },
  grade_7: { din: 'ingilizce' },
  grade_8: { sosyal: 'inkilap' },
}

const verbalTopics = [
  'ana düşünce',
  'yardımcı düşünce',
  'sözcükte anlam',
  'cümlede yorum',
  'anlatım biçimi',
  'paragrafta yapı',
  'çıkarım yapma',
  'anlam ilişkisi',
]

const verbalCorrectTexts = [
  'Metindeki temel yargıyı doğrudan verir.',
  'Paragraftan kesin olarak çıkarılabilir.',
  'Anlam akışını destekleyen ifadedir.',
  'Yazarın bakış açısını açık biçimde yansıtır.',
]

const verbalDistractorTexts = [
  'Parçada yer almayan yeni bir bilgi ekler.',
  'Anlamı metnin tersine çevirir.',
  'Yalnızca ayrıntıya odaklanır.',
  'Konu dışı bir çıkarım kurar.',
  'Cümlenin bağlamını zayıflatır.',
  'Kesin yargı gerektirmeyen bir olasılık sunar.',
]

function getNormalizedSubjectAlias(
  subject: string | null | undefined,
  examGroup: MockExamGroupId | string | null | undefined
) {
  const normalizedSubject = (subject ?? '').trim().toLowerCase() as MockExamSubjectId
  const safeExamGroup = normalizeMockExamGroupId(examGroup)
  return mockExamSubjectAliases[safeExamGroup]?.[normalizedSubject] ?? normalizedSubject
}

export function getMockExamSectionSubjects(
  sectionType: MockExamSectionId | string | null | undefined,
  examGroup: MockExamGroupId | string | null | undefined = getDefaultMockExamGroup()
) {
  const safeSectionType = normalizeMockExamSectionId(sectionType)
  const safeExamGroup = normalizeMockExamGroupId(examGroup)

  if (safeSectionType === 'quantitative') {
    return quantitativeSubjects
  }

  if (safeExamGroup === 'grade_6' || safeExamGroup === 'grade_7') {
    return gradeSixSevenVerbalSubjects
  }

  if (safeExamGroup === 'grade_8') {
    return gradeEightVerbalSubjects
  }

  return defaultVerbalSubjects
}

function joinSubjectLabels(subjects: MockExamSubjectConfig[]) {
  return subjects.map((subject) => subject.label).join(', ')
}

export function getMockExamGroupConfig(group: MockExamGroupId | string | null | undefined) {
  return mockExamGroupConfig[normalizeMockExamGroupId(group)]
}

export function getMockExamGroupLabel(group: MockExamGroupId | string | null | undefined) {
  if (!group) return 'Genel'
  return mockExamGroupConfig[group as MockExamGroupId]?.label || group
}

export function getDefaultMockExamGroup(): MockExamGroupId {
  return 'lgs'
}

export function getMockExamSectionConfig(
  sectionType: MockExamSectionId | string | null | undefined,
  examGroup: MockExamGroupId | string | null | undefined = getDefaultMockExamGroup()
) {
  const safeSectionType = normalizeMockExamSectionId(sectionType)
  const baseConfig = mockExamSectionConfig[safeSectionType]

  if (safeSectionType === 'quantitative') {
    const quantitativeSubjectLabels = joinSubjectLabels(quantitativeSubjects)
    return {
      ...baseConfig,
      subjects: quantitativeSubjects,
      summary: `${quantitativeSubjectLabels} soruları sayısal oturumda tek toplam ${baseConfig.durationMinutes} dakika ile çözülür.`,
      description: `${quantitativeSubjectLabels} sorularını içeren sayısal oturum`,
      instructions: `Sayısal oturumdaki ${quantitativeSubjectLabels} dersleri tek toplam ${baseConfig.durationMinutes} dakika içinde çözülür. Son soruda Testi Bitir ile sonuç özeti açılır.`,
    }
  }

  const subjects = getMockExamSectionSubjects('verbal', examGroup)
  const subjectLabels = joinSubjectLabels(subjects)

  return {
    ...baseConfig,
    subjects,
    summary: `${subjectLabels} soruları sözel oturumda tek toplam ${baseConfig.durationMinutes} dakika ile çözülür.`,
    description: `${subjectLabels} sorularını içeren sözel oturum`,
    instructions: `Sözel oturumdaki ${subjectLabels} dersleri tek toplam ${baseConfig.durationMinutes} dakika içinde çözülür. Son soruda Testi Bitir ile sonuç özeti açılır.`,
  }
}

export function getMockExamSubjectLabel(subject: MockExamSubjectId | string | null | undefined) {
  if (!subject) return 'Ders'
  return subjectLabelMap[subject as MockExamSubjectId] || subject
}

export function getDefaultMockExamDuration(sectionType: MockExamSectionId | string | null | undefined) {
  return mockExamSectionConfig[normalizeMockExamSectionId(sectionType)].durationMinutes
}

export function normalizeMockExamDuration(
  duration: unknown,
  sectionType: MockExamSectionId | string | null | undefined
) {
  const numericDuration = typeof duration === 'number' ? duration : Number(duration)
  if (Number.isFinite(numericDuration)) {
    return Math.max(1, Math.min(300, Math.round(numericDuration)))
  }
  return getDefaultMockExamDuration(sectionType)
}

export function getDefaultMockExamSubject(
  sectionType: MockExamSectionId | string | null | undefined,
  examGroup: MockExamGroupId | string | null | undefined = getDefaultMockExamGroup()
): MockExamSubjectId {
  return getMockExamSectionSubjects(normalizeMockExamSectionId(sectionType), examGroup)[0].id
}

export function isSubjectValidForSection(
  subject: string | null | undefined,
  sectionType: MockExamSectionId | string | null | undefined,
  examGroup: MockExamGroupId | string | null | undefined = getDefaultMockExamGroup()
) {
  const normalizedSubject = getNormalizedSubjectAlias(subject, examGroup)
  return getMockExamSectionSubjects(normalizeMockExamSectionId(sectionType), examGroup).some((item) => item.id === normalizedSubject)
}

export function inferMockExamSubject(
  sectionType: MockExamSectionId | string | null | undefined,
  position: number,
  totalQuestions: number,
  examGroup: MockExamGroupId | string | null | undefined = getDefaultMockExamGroup()
): MockExamSubjectId {
  const subjects = getMockExamSectionSubjects(normalizeMockExamSectionId(sectionType), examGroup)
  const safeTotal = Math.max(totalQuestions, subjects.length, 1)
  const ratio = Math.min(subjects.length - 1, Math.floor((position * subjects.length) / safeTotal))
  return subjects[ratio].id
}

export function normalizeQuestionSubject(
  sectionType: MockExamSectionId | string | null | undefined,
  subject: string | null | undefined,
  position: number,
  totalQuestions: number,
  examGroup: MockExamGroupId | string | null | undefined = getDefaultMockExamGroup()
): MockExamSubjectId {
  const normalizedSubject = getNormalizedSubjectAlias(subject, examGroup)
  if (isSubjectValidForSection(normalizedSubject, sectionType, examGroup)) {
    return normalizedSubject as MockExamSubjectId
  }

  return inferMockExamSubject(sectionType, position, totalQuestions, examGroup)
}

function normalizePlainText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeNullableText(value: unknown) {
  const normalized = normalizePlainText(value)
  return normalized.length > 0 ? normalized : null
}

function getFallbackOptionId(index: number, usedIds: Set<string>) {
  const baseId = optionLetters[index] ?? String.fromCharCode(65 + index)
  if (!usedIds.has(baseId)) {
    return baseId
  }

  let suffix = 1
  while (usedIds.has(`${baseId}${suffix}`)) {
    suffix += 1
  }
  return `${baseId}${suffix}`
}

function createFallbackQuestionPrompt(subject: MockExamSubjectId, id: number) {
  return `${getMockExamSubjectLabel(subject)} için yeni soru ${id}`
}

function normalizeQuestionOptions(options: MockExamQuestionInput['options']): MockExamOption[] {
  const rawOptions = Array.isArray(options)
    ? (options.filter((option) => option != null) as Array<Partial<MockExamOption>>)
    : []
  const usedIds = new Set<string>()

  const normalized = rawOptions.map((option, index) => {
    const fallbackId = getFallbackOptionId(index, usedIds)
    const requestedId = normalizePlainText(option.id).toUpperCase()
    const optionId = requestedId && !usedIds.has(requestedId) ? requestedId : fallbackId
    const imageUrl = normalizeNullableText(option.imageUrl)
    const text = normalizePlainText(option.text)

    usedIds.add(optionId)

    return {
      id: optionId,
      text: text || (imageUrl ? '' : `Seçenek ${optionId}`),
      imageUrl,
    }
  })

  if (normalized.length === 0) {
    return optionLetters.map((letter) => ({
      id: letter,
      text: `Seçenek ${letter}`,
      imageUrl: null,
    }))
  }

  while (normalized.length < optionLetters.length) {
    const optionId = getFallbackOptionId(normalized.length, usedIds)
    normalized.push({
      id: optionId,
      text: `Seçenek ${optionId}`,
      imageUrl: null,
    })
    usedIds.add(optionId)
  }

  return normalized
}

export function normalizeMockExamQuestions(
  sectionType: MockExamSectionId | string | null | undefined,
  questions: MockExamQuestionInput[] | null | undefined,
  examGroup: MockExamGroupId | string | null | undefined = getDefaultMockExamGroup()
) {
  const safeSectionType = normalizeMockExamSectionId(sectionType)
  const safeExamGroup = normalizeMockExamGroupId(examGroup)
  const rawQuestions = Array.isArray(questions) ? questions.filter((question): question is MockExamQuestionInput => Boolean(question)) : []
  const seedQuestions =
    rawQuestions.length > 0
      ? rawQuestions
      : getMockExamSectionSubjects(safeSectionType, safeExamGroup).map((subject, index) =>
          createEmptyQuestion(index + 1, safeSectionType, subject.id, safeExamGroup)
        )
  const subjectOrder = getMockExamSectionSubjects(safeSectionType, safeExamGroup).map((item) => item.id)

  return [...seedQuestions]
    .map((question, index) => {
      const fallbackId = Number.isFinite(question.id) && Number(question.id) > 0 ? Number(question.id) : index + 1
      const subject = normalizeQuestionSubject(safeSectionType, question.subject, index, seedQuestions.length, safeExamGroup)
      const options = normalizeQuestionOptions(question.options)
      const imageUrl = normalizeNullableText(question.imageUrl)
      const prompt = normalizePlainText(question.prompt)
      const requestedCorrectOptionId = normalizePlainText(question.correctOptionId).toUpperCase()
      const correctOptionId = options.some((option) => option.id === requestedCorrectOptionId)
        ? requestedCorrectOptionId
        : options[0].id

      return {
        id: fallbackId,
        subject,
        prompt: prompt || (imageUrl ? '' : createFallbackQuestionPrompt(subject, fallbackId)),
        imageUrl,
        options,
        correctOptionId,
      }
    })
    .sort((left, right) => {
      const leftOrder = subjectOrder.indexOf(left.subject)
      const rightOrder = subjectOrder.indexOf(right.subject)
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder
      }
      return left.id - right.id
    })
    .map((question, index) => ({
      ...question,
      id: index + 1,
    }))
}

function createVerbalQuestion(subject: MockExamSubjectId, globalIndex: number, subjectIndex: number): MockExamQuestion {
  const correctOptionIndex = (globalIndex - 1) % optionLetters.length
  const topic = verbalTopics[(globalIndex - 1) % verbalTopics.length]
  const correctText = verbalCorrectTexts[(globalIndex - 1) % verbalCorrectTexts.length]
  const distractors = verbalDistractorTexts.slice(
    (globalIndex - 1) % (verbalDistractorTexts.length - 2),
    ((globalIndex - 1) % (verbalDistractorTexts.length - 2)) + 3
  )

  const optionTexts = [...distractors]
  optionTexts.splice(correctOptionIndex, 0, correctText)
  const subjectLabel = getMockExamSubjectLabel(subject)

  return {
    id: globalIndex,
    subject,
    prompt: `${subjectLabel} soru ${subjectIndex}: Aşağıdaki seçeneklerden hangisi "${topic}" bakımından en doğru değerlendirmedir?`,
    imageUrl: null,
    options: optionLetters.map((letter, optionIndex) => ({
      id: letter,
      text: optionTexts[optionIndex],
      imageUrl: null,
    })),
    correctOptionId: optionLetters[correctOptionIndex],
  }
}

function createQuantitativeQuestion(subject: MockExamSubjectId, globalIndex: number, subjectIndex: number): MockExamQuestion {
  const correctOptionIndex = (globalIndex - 1) % optionLetters.length
  const a = 8 + globalIndex
  const b = 3 + (globalIndex % 6)
  const correctValue = a * 2 + b
  const distractorValues = [correctValue - 3, correctValue + 2, correctValue + 5]
  const optionValues = [...distractorValues]
  optionValues.splice(correctOptionIndex, 0, correctValue)
  const subjectLabel = getMockExamSubjectLabel(subject)

  return {
    id: globalIndex,
    subject,
    prompt: `${subjectLabel} soru ${subjectIndex}: x = ${a} ve y = ${b} ise 2x + y işleminin sonucu kaçtır?`,
    imageUrl: null,
    options: optionLetters.map((letter, optionIndex) => ({
      id: letter,
      text: `${optionValues[optionIndex]}`,
      imageUrl: null,
    })),
    correctOptionId: optionLetters[correctOptionIndex],
  }
}

function createSubjectQuestionSet(sectionType: MockExamSectionId, subject: MockExamSubjectId, count: number, startIndex: number) {
  return Array.from({ length: count }, (_, index) => {
    const globalIndex = startIndex + index
    const subjectIndex = index + 1

    return sectionType === 'verbal'
      ? createVerbalQuestion(subject, globalIndex, subjectIndex)
      : createQuantitativeQuestion(subject, globalIndex, subjectIndex)
  })
}

export function createMockExamDraftTitle(sectionType: MockExamSectionId, examGroup: MockExamGroupId) {
  const groupLabel = getMockExamGroupLabel(examGroup)
  const sectionLabel = sectionType === 'verbal' ? 'Sözel Deneme' : 'Sayısal Deneme'
  return `${groupLabel} ${sectionLabel}`
}

export function createMockExamSlug(sectionType: MockExamSectionId, examGroup: MockExamGroupId) {
  const suffix = sectionType === 'verbal' ? 'sozel' : 'sayisal'
  return `${examGroup}-${suffix}-${Date.now()}`
}

function getDefaultQuestionCountsBySubject(
  sectionType: MockExamSectionId,
  examGroup: MockExamGroupId = getDefaultMockExamGroup()
) {
  const subjects = getMockExamSectionSubjects(sectionType, examGroup)
  if (sectionType === 'quantitative') {
    return subjects.map((subject, index) => ({
      ...subject,
      count: index === 0 ? 20 : 20,
    }))
  }

  if (subjects.length === 4) {
    return subjects.map((subject, index) => ({
      ...subject,
      count: index === 0 ? 20 : 10,
    }))
  }

  return subjects.map((subject, index) => ({
    ...subject,
    count: index < 2 ? 20 : 10,
  }))
}

export function createDefaultMockExamPayloads(examGroup: MockExamGroupId = getDefaultMockExamGroup()): MockExamPayload[] {
  let nextVerbalQuestionIndex = 1
  const verbalQuestions = getDefaultQuestionCountsBySubject('verbal', examGroup).flatMap((subject) => {
    const questionSet = createSubjectQuestionSet('verbal', subject.id, subject.count, nextVerbalQuestionIndex)
    nextVerbalQuestionIndex += subject.count
    return questionSet
  })

  let nextQuantitativeQuestionIndex = 1
  const quantitativeQuestions = getDefaultQuestionCountsBySubject('quantitative', examGroup).flatMap((subject) => {
    const questionSet = createSubjectQuestionSet('quantitative', subject.id, subject.count, nextQuantitativeQuestionIndex)
    nextQuantitativeQuestionIndex += subject.count
    return questionSet
  })

  return [
    {
      slug: `${examGroup}-sozel-sorular`,
      title: createMockExamDraftTitle('verbal', examGroup),
      exam_group: examGroup,
      section_type: 'verbal',
      description: getMockExamSectionConfig('verbal', examGroup).description,
      instructions: getMockExamSectionConfig('verbal', examGroup).instructions,
      duration_minutes: mockExamSectionConfig.verbal.durationMinutes,
      questions: normalizeMockExamQuestions('verbal', verbalQuestions, examGroup),
      sort_order: 1,
      is_published: false,
    },
    {
      slug: `${examGroup}-sayisal-sorular`,
      title: createMockExamDraftTitle('quantitative', examGroup),
      exam_group: examGroup,
      section_type: 'quantitative',
      description: getMockExamSectionConfig('quantitative', examGroup).description,
      instructions: getMockExamSectionConfig('quantitative', examGroup).instructions,
      duration_minutes: mockExamSectionConfig.quantitative.durationMinutes,
      questions: normalizeMockExamQuestions('quantitative', quantitativeQuestions, examGroup),
      sort_order: 2,
      is_published: false,
    },
  ]
}

export function createSectionDraftQuestions(
  sectionType: MockExamSectionId,
  examGroup: MockExamGroupId = getDefaultMockExamGroup()
) {
  return normalizeMockExamQuestions(
    sectionType,
    getMockExamSectionSubjects(sectionType, examGroup).map((subject, index) =>
      createEmptyQuestion(index + 1, sectionType, subject.id, examGroup)
    ),
    examGroup
  )
}

export function createEmptyQuestion(
  id: number,
  sectionType: MockExamSectionId,
  subject: MockExamSubjectId = getDefaultMockExamSubject(sectionType),
  examGroup: MockExamGroupId = getDefaultMockExamGroup()
): MockExamQuestion {
  const normalizedSubject = normalizeQuestionSubject(sectionType, subject, id - 1, 1, examGroup)
  const subjectLabel = getMockExamSubjectLabel(normalizedSubject)

  return {
    id,
    subject: normalizedSubject,
    prompt: `${subjectLabel} için yeni soru ${id}`,
    imageUrl: null,
    options: [
      { id: 'A', text: 'Seçenek A', imageUrl: null },
      { id: 'B', text: 'Seçenek B', imageUrl: null },
      { id: 'C', text: 'Seçenek C', imageUrl: null },
      { id: 'D', text: 'Seçenek D', imageUrl: null },
    ],
    correctOptionId: 'A',
  }
}

export function getMockExamQuestionCountsBySubject(
  sectionType: MockExamSectionId,
  questions: MockExamQuestion[],
  examGroup: MockExamGroupId = getDefaultMockExamGroup()
) {
  return getMockExamSectionSubjects(sectionType, examGroup).map((subject) => ({
    ...subject,
    count: questions.filter((question) => question.subject === subject.id).length,
  }))
}

export function getMockExamSectionFromSubject(subject: MockExamSubjectId) {
  return subjectSectionMap[subject]
}
