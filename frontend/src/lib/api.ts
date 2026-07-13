import axios from 'axios'

// If NEXT_PUBLIC_API_URL is provided, use it. Otherwise pick a sensible
// default so local development works without extra env setup.
// - In local dev (localhost/127.0.0.1) default to backend at http://localhost:8001
// - In production, prefer a relative path so Vercel/hosting can proxy requests
const apiUrlFromEnv = process.env.NEXT_PUBLIC_API_URL
const paymentApiUrlFromEnv = process.env.NEXT_PUBLIC_PAYMENT_API_URL

// For Vercel deployments we must use relative paths by default so
// `/api/*` goes to the platform's serverless functions / proxied backend.
// If you need to override the API URL in a preview or custom environment,
// set `NEXT_PUBLIC_API_URL` in the Vercel environment variables.
const API_BASE_URL = apiUrlFromEnv && apiUrlFromEnv.trim().length > 0 ? apiUrlFromEnv.trim() : ''
const PAYMENT_API_BASE_URL =
  paymentApiUrlFromEnv && paymentApiUrlFromEnv.trim().length > 0
    ? paymentApiUrlFromEnv.trim()
    : API_BASE_URL

function createApiClient(baseURL?: string) {
  return axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000,
    validateStatus: (status) => {
      return (status >= 200 && status < 300) || status === 304
    },
  })
}

function attachInterceptors(client: ReturnType<typeof axios.create>) {
  client.interceptors.request.use(
    (config) => {
      if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
        const headers: any = config.headers ?? {}
        if (typeof headers.setContentType === 'function') {
          headers.setContentType(undefined)
        } else {
          delete headers['Content-Type']
        }
        config.headers = headers
      }

      const token = localStorage.getItem('access_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => {
      console.error('❌ Request interceptor error:', error)
      return Promise.reject(error)
    }
  )

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error.response?.status

      if (!error.config?.__errorLogged) {
        try {
          const safeInfo = {
            url: error?.config?.url ?? '<unknown>',
            status: status ?? '<no-status>',
            message: error?.message ?? '<no-message>',
            data: (() => {
              const d = error?.response?.data
              if (d === undefined) return undefined
              if (typeof d === 'object' && d !== null) {
                try {
                  return Array.isArray(d)
                    ? d.slice(0, 5)
                    : Object.keys(d)
                        .slice(0, 20)
                        .reduce((acc: any, k) => ((acc[k] = (d as any)[k]), acc), {})
                } catch {
                  return '[unserializable data]'
                }
              }
              return d
            })(),
          }
          console.warn('API Error:', safeInfo)
        } catch {
          try {
            console.warn('API Error (minimal):', error?.message ?? String(error))
          } catch {}
        }
        if (error.config) error.config.__errorLogged = true
      }

      if (status === 401) {
        console.warn('401 Unauthorized received. Token:', localStorage.getItem('access_token'))

        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('user')

          const next = window.location.pathname + window.location.search
          window.location.href = `/auth/login?next=${encodeURIComponent(next)}`
        }
        return Promise.reject(error)
      }

      if (status === 403) {
        try {
          localStorage.removeItem('access_token')
        } catch {}
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          alert('Erişim reddedildi: Bu işlemi yapmak için yeterli yetkiniz yok. Lütfen giriş yapıp yetkilerinizi kontrol edin.')
          const next = window.location.pathname + window.location.search
          window.location.href = `/auth/login?next=${encodeURIComponent(next)}`
        }
      }
      return Promise.reject(error)
    }
  )
}

export const api = createApiClient(API_BASE_URL || undefined)
export const paymentsApi = createApiClient(PAYMENT_API_BASE_URL || undefined)

attachInterceptors(api)
attachInterceptors(paymentsApi)

// Auth API
export const authAPI = {
  sendOTP: (phone?: string, email?: string) => api.post('/api/auth/send-otp', { phone, email }),
  verifyOTP: (otp_code: string, phone?: string, email?: string) => api.post('/api/auth/verify-otp', { phone, email, otp_code }),
  register: (userData: any) => api.post('/api/auth/register', userData),
  registerInstructor: (userData: any) => api.post('/api/auth/register-instructor', userData),
  registerInstitution: (userData: any) => api.post('/api/auth/register-institution', userData),
  registerFirebase: (idToken: string, userData: any) => api.post('/api/auth/register-firebase', { id_token: idToken, ...userData }),
  registerInstructorFirebase: (idToken: string, userData: any) => api.post('/api/auth/register-instructor-firebase', { id_token: idToken, ...userData }),
  registerInstitutionFirebase: (idToken: string, userData: any) => api.post('/api/auth/register-institution-firebase', { id_token: idToken, ...userData }),
  login: (email: string, password: string) => api.post('/api/auth/login', { email, password }),
  loginFirebase: (idToken: string) => api.post('/api/auth/login-firebase', { id_token: idToken }),
  getProfile: () => api.get('/api/auth/me'),
  updateProfile: (data: any) => api.put('/api/auth/profile', data),
  uploadAvatar: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/api/auth/upload-avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  submitStudentApplication: (data: { student_full_name: string; parent_full_name: string; phone: string }) =>
    api.post('/api/auth/student-application', data),
}

// Courses API
export const coursesAPI = {
  getCourses: (params?: any) => api.get('/api/courses', { params }),
  getFeaturedCourses: (limit?: number) => api.get('/api/courses/featured/list', { params: { limit } }),
  getCourse: (id: number) => api.get(`/api/courses/${id}`),
  createCourse: (data: any) => api.post('/api/courses', data),
  updateCourse: (id: number, data: any) => api.put(`/api/courses/${id}`, data),
  deleteCourse: (id: number) => api.delete(`/api/courses/${id}`),
  enrollInCourse: (id: number) => api.post(`/api/courses/${id}/enroll`),
  getMyCourses: () => api.get('/api/courses/my-courses'),
  getMyInventory: () => api.get('/api/courses/my-inventory'),
  getEnrolledCourses: () => api.get('/api/courses/enrolled'),
  createReview: (courseId: number, data: any) => api.post(`/api/courses/${courseId}/reviews`, data),
  getCategories: () => api.get('/api/courses/categories/list'),
  uploadThumbnail: (courseId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/api/courses/${courseId}/upload-thumbnail`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  presignUpload: (courseId: number, data: { kind: 'thumbnail' | 'preview_video' | 'video' | 'document'; filename: string; content_type: string }) =>
    api.post(`/api/courses/${courseId}/presign-upload`, data),
  setThumbnailUrl: (courseId: number, url: string) => api.put(`/api/courses/${courseId}/set-thumbnail-url`, { url }),
  setPreviewVideoUrl: (courseId: number, url: string) => api.put(`/api/courses/${courseId}/set-preview-video-url`, { url }),
  addMaterialUrl: (courseId: number, data: { title: string; material_type: 'video' | 'document'; file_url: string; file_size?: number }) =>
    api.post(`/api/courses/${courseId}/materials-url`, data),
  uploadPreviewVideo: (courseId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/api/courses/${courseId}/upload-preview-video`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  uploadVideo: (courseId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/api/courses/${courseId}/upload-video`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000 // 2 dakika timeout (video dosyaları için)
    })
  },
  uploadMaterial: (courseId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/api/courses/${courseId}/upload-material`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000 // 1 dakika timeout
    })
  },
  getCourseMaterials: (courseId: number) => api.get(`/api/courses/${courseId}/materials`),
  createLesson: (courseId: number, data: any) => api.post(`/api/courses/${courseId}/lessons`, data),
}

// Instructors API
export const instructorsAPI = {
  getInstructors: (params?: any) => api.get('/api/instructors', { params }),
  getFeaturedInstructors: (limit?: number) => api.get('/api/instructors/featured/list', { params: { limit } }),
  getInstructor: (id: number) => api.get(`/api/instructors/${id}`),
  applyAsInstructor: (data: FormData) =>
    api.post('/api/instructors/apply', data, {
      headers: { 'Content-Type': undefined as any }
    }),
  updateProfile: (data: any) => api.put('/api/instructors/profile', data),
  getMyProfile: () => api.get('/api/instructors/my/profile'),
  getMyDashboard: () => api.get('/api/instructors/my/dashboard'),
  getCourseAdminNotes: (courseId: number) => api.get(`/api/instructors/my/courses/${courseId}/admin-notes`),
  getCourseEnrollments: (courseId: number) => api.get(`/api/instructors/my/courses/${courseId}/enrollments`),
  getInstructorReviews: (id: number, params?: any) => api.get(`/api/instructors/${id}/reviews`, { params }),
  getSpecializations: () => api.get('/api/instructors/specializations/list'),
  uploadAvatar: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/api/instructors/upload-avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
}

// Payments API
export const paymentsAPI = {
  createPayment: (courseId: number, paymentMethod?: string, discountCode?: string, slug?: string) => 
    paymentsApi.post('/api/payments/create-payment', {
      course_id: courseId,
      payment_method: paymentMethod,
      discount_code: discountCode,
      slug,
    }),
  verifyPayment: (paymentId: number) => paymentsApi.post(`/api/payments/verify-payment/${paymentId}`),
  getMyPayments: () => paymentsApi.get('/api/payments/my-payments'),
  getPayment: (id: number) => paymentsApi.get(`/api/payments/payment/${id}`),
  lookupCourseBySlug: (slug: string) => paymentsApi.get('/api/payments/course-lookup', { params: { slug } }),
}

// Discounts API
export const discountsAPI = {
  validate: (code: string, itemType?: string, itemId?: number) => 
    api.post('/api/discounts/validate', { code, item_type: itemType, item_id: itemId })
}

// Categories API
export const categoriesAPI = {
  getCategories: (type?: string) => api.get('/api/admin/categories', { params: type ? { type } : {} }),
  createCategory: (data: { name: string; description?: string; type?: string; color?: string; parent_id?: number }) =>
    api.post('/api/admin/categories', data),
  updateCategory: (id: number, data: any) => api.put(`/api/admin/categories/${id}`, data),
  deleteCategory: (id: number) => api.delete(`/api/admin/categories/${id}`),
}

// AI API
export const aiAPI = {
  chat: (message: string, context?: string) => api.post('/api/ai/chat', { message, context }),
  generateQuiz: (courseId: number, topic: string, difficulty?: string, questionCount?: number) =>
    api.post('/api/ai/generate-quiz', {
      course_id: courseId,
      topic,
      difficulty: difficulty || 'medium',
      question_count: questionCount || 5
    }),
  generateStudyPlan: (courseId: number, availableHours: number, targetWeeks: number) =>
    api.post('/api/ai/study-plan', {
      course_id: courseId,
      available_hours_per_week: availableHours,
      target_completion_weeks: targetWeeks
    }),
  getRecommendations: () => api.get('/api/ai/recommendations'),
  getMyInteractions: () => api.get('/api/ai/my-interactions'),
  // Chatbot API
  chatbot: (message: string, conversationHistory?: any[]) =>
    api.post('/api/ai/chatbot', {
      message,
      conversation_history: conversationHistory || []
    }),
  chatbotHealth: () => api.get('/api/ai/chatbot/health'),
}

// Messages API
export const messagesAPI = {
  listThreads: () => api.get('/api/messages/threads'),
  searchRecipients: (query: string, limit?: number) =>
    api.get('/api/messages/recipients', { params: { query, limit } }),
  createThread: (data: { recipient_user_id: number }) => api.post('/api/messages/threads', data),
  listMessages: (threadId: number) => api.get(`/api/messages/threads/${threadId}/messages`),
  sendMessage: (
    threadId: number,
    data: {
      body?: string | null
      attachments?:
        | Array<{
            file_url: string
            file_name?: string
            content_type?: string
            file_size?: number
          }>
        | null
    }
  ) =>
    api.post(`/api/messages/threads/${threadId}/messages`, data),
  presignAttachment: (data: { thread_id: number; filename: string; content_type: string }) =>
    api.post('/api/messages/attachments/presign', data),
}

// Admin API
export const adminAPI = {
  getStats: () => api.get('/api/admin/stats'),
  getUsers: (params?: any) => api.get('/api/admin/users', { params }),
  makeInstructor: (id: number) => api.put(`/api/admin/users/${id}/make-instructor`),
  getInstructors: (params?: any) => api.get('/api/admin/instructors', { params }),
  getInstructorDetail: (id: number) => api.get(`/api/admin/instructors/${id}`),
  getCourses: (params?: any) => api.get('/api/admin/courses', { params }),
  approveInstructor: (id: number) => api.put(`/api/admin/instructors/${id}/approve`),
  rejectInstructor: (id: number) => api.put(`/api/admin/instructors/${id}/reject`),
  featureInstructor: (id: number) => api.put(`/api/admin/instructors/${id}/feature`),
  unfeatureInstructor: (id: number) => api.put(`/api/admin/instructors/${id}/unfeature`),
  publishCourse: (id: number) => api.put(`/api/admin/courses/${id}/publish`),
  unpublishCourse: (id: number) => api.put(`/api/admin/courses/${id}/unpublish`),
  featureCourse: (id: number) => api.put(`/api/admin/courses/${id}/feature`),
  unfeatureCourse: (id: number) => api.put(`/api/admin/courses/${id}/unfeature`),
  deleteCourse: (id: number) => api.delete(`/api/admin/courses/${id}`),
  activateUser: (id: number) => api.put(`/api/admin/users/${id}/activate`),
  deactivateUser: (id: number) => api.put(`/api/admin/users/${id}/deactivate`),
  deleteUser: (id: number) => api.delete(`/api/admin/users/${id}`),
  getRevenueAnalytics: (days?: number) => api.get('/api/admin/analytics/revenue', { params: { days } }),
  getUserAnalytics: (days?: number) => api.get('/api/admin/analytics/users', { params: { days } }),
  getPayments: (params?: { skip?: number; limit?: number; payment_status?: string; search?: string; payment_id?: number }) =>
    api.get('/api/admin/payments', { params }),
  getPaymentDetail: (paymentId: number) => api.get(`/api/admin/payments/${paymentId}`),
  refundPayment: (paymentId: number, data: { reason: string }) =>
    api.post(`/api/admin/payments/${paymentId}/refund`, data),
  voidPayment: (paymentId: number, data: { reason: string }) =>
    api.post(`/api/admin/payments/${paymentId}/void`, data),
  getPendingReviews: (params?: any) => api.get('/api/admin/reviews/pending', { params }),
  approveReview: (id: number) => api.put(`/api/admin/reviews/${id}/approve`),
  deleteReview: (id: number) => api.delete(`/api/admin/reviews/${id}`),
  // Course Details and Notes
  getCourseDetails: (courseId: number) => api.get(`/api/admin/courses/${courseId}/details`),
  createCourseNote: (courseId: number, data: { note: string; note_type: string }) => 
    api.post(`/api/admin/courses/${courseId}/notes`, data),
  resolveCourseNote: (courseId: number, noteId: number) => 
    api.put(`/api/admin/courses/${courseId}/notes/${noteId}/resolve`),
  deleteCourseNote: (courseId: number, noteId: number) => 
    api.delete(`/api/admin/courses/${courseId}/notes/${noteId}`),
  
  // School Courses Management
  getSchools: (params?: any) => api.get('/api/admin/schools', { params }),
  getSchool: (id: number) => api.get(`/api/admin/schools/${id}`),
  createSchool: (data: any) => api.post('/api/admin/schools', data),
  updateSchool: (id: number, data: any) => api.put(`/api/admin/schools/${id}`, data),
  deleteSchool: (id: number) => api.delete(`/api/admin/schools/${id}`),
  // School Videos
  addSchoolVideo: (courseId: number, data: any) => api.post(`/api/admin/schools/${courseId}/videos`, data),
  updateSchoolVideo: (courseId: number, videoId: number, data: any) => 
    api.put(`/api/admin/schools/${courseId}/videos/${videoId}`, data),
  deleteSchoolVideo: (courseId: number, videoId: number) => 
    api.delete(`/api/admin/schools/${courseId}/videos/${videoId}`),
  // School Notes/Materials
  addSchoolNote: (courseId: number, data: any) => api.post(`/api/admin/schools/${courseId}/notes`, data),
  deleteSchoolNote: (courseId: number, noteId: number) => 
    api.delete(`/api/admin/schools/${courseId}/notes/${noteId}`),
  // School Instructors
  addSchoolInstructor: (courseId: number, data: any) => api.post(`/api/admin/schools/${courseId}/instructors`, data),
  deleteSchoolInstructor: (courseId: number, instructorId: number) => 
    api.delete(`/api/admin/schools/${courseId}/instructors/${instructorId}`),
  
  // Institutions Management
  getInstitutions: (params?: any) => api.get('/api/admin/institutions', { params }),
  getInstitution: (id: number) => api.get(`/api/admin/institutions/${id}`),
  createInstitution: (data: any) => api.post('/api/admin/institutions', data),
  updateInstitution: (id: number, data: any) => api.put(`/api/admin/institutions/${id}`, data),
  deleteInstitution: (id: number) => api.delete(`/api/admin/institutions/${id}`),
  getInstitutionApplications: () => api.get('/api/admin/institutions/applications'),
  approveInstitution: (id: number) => api.post(`/api/admin/institutions/${id}/approve`),
  rejectInstitution: (id: number) => api.post(`/api/admin/institutions/${id}/reject`),
  // Institution Files Upload
  presignInstitutionUpload: (institutionId: number, data: { kind: string; filename: string; content_type: string }) =>
    api.post(`/api/admin/institutions/${institutionId}/presign-upload`, data),
  setInstitutionLogo: (institutionId: number, url: string) =>
    api.post(`/api/admin/institutions/${institutionId}/set-logo`, null, { params: { url } }),
  setInstitutionCover: (institutionId: number, url: string) =>
    api.post(`/api/admin/institutions/${institutionId}/set-cover`, null, { params: { url } }),
  setInstitutionVideo: (institutionId: number, url: string) =>
    api.post(`/api/admin/institutions/${institutionId}/set-video`, null, { params: { url } }),
  setInstitutionBrochure: (institutionId: number, url: string) =>
    api.post(`/api/admin/institutions/${institutionId}/set-brochure`, null, { params: { url } }),
  createInstitutionInstructor: (institutionId: number, data: any) =>
    api.post(`/api/admin/institutions/${institutionId}/instructors/create`, data),
  // Institution Courses
  addInstitutionCourse: (institutionId: number, data: any) => 
    api.post(`/api/admin/institutions/${institutionId}/courses`, data),
  deleteInstitutionCourse: (institutionId: number, courseId: number) => 
    api.delete(`/api/admin/institutions/${institutionId}/courses/${courseId}`),
  // Institution Instructor Requests
  getInstitutionInstructorRequests: (params?: any) =>
    api.get('/api/admin/institutions/instructor-requests', { params }),
  approveInstitutionInstructorRequest: (requestId: number) =>
    api.post(`/api/admin/institutions/instructor-requests/${requestId}/approve`),
  rejectInstitutionInstructorRequest: (requestId: number) =>
    api.post(`/api/admin/institutions/instructor-requests/${requestId}/reject`),
  getMockExams: () => api.get('/api/admin/mock-exams'),
  getAllMockExamAttempts: (limit?: number) => api.get('/api/admin/mock-exams/attempts', { params: { limit } }),
  getMockExamAttempts: (id: number) => api.get(`/api/admin/mock-exams/${id}/attempts`),
  createMockExam: (data: any) => api.post('/api/admin/mock-exams', data),
  updateMockExam: (id: number, data: any) => api.put(`/api/admin/mock-exams/${id}`, data),
  deleteMockExam: (id: number) => api.delete(`/api/admin/mock-exams/${id}`),
  publishMockExam: (id: number) => api.put(`/api/admin/mock-exams/${id}/publish`),
  unpublishMockExam: (id: number) => api.put(`/api/admin/mock-exams/${id}/unpublish`),
  getStudentApplications: () => api.get('/api/admin/student-applications'),
  checkStudentApplication: (applicationId: number, isChecked: boolean) =>
    api.put(`/api/admin/student-applications/${applicationId}/check`, { is_checked: isChecked }),
}

// Public Institutions API
export const institutionsAPI = {
  getPublicInstitutions: (params?: any) => api.get('/api/admin/public/institutions', { params }),
  getInstitutions: (params?: any) => api.get('/api/admin/public/institutions', { params }),
  getInstitution: (id: number) => api.get(`/api/admin/public/institutions/${id}`),
  applyInstitution: (data: any) => api.post('/api/institutions/apply', data),
  getMyInstitution: () => api.get('/api/institutions/me'),
  updateMyInstitution: (data: any) => api.put('/api/institutions/me', data),
  presignMyInstitutionUpload: (data: { kind: string; filename: string; content_type: string }) =>
    api.post('/api/institutions/me/presign-upload', data),
  getMyInstitutionInstructors: () => api.get('/api/institutions/me/instructors'),
  createInstitutionInstructor: (data: any) => api.post('/api/institutions/me/instructors/create', data),
  getMyInstitutionInstructorCourses: () => api.get('/api/institutions/me/instructor-courses'),
  getMyInstitutionCourses: () => api.get('/api/institutions/me/courses'),
  createMyInstitutionCourse: (data: any) => api.post('/api/institutions/me/courses', data),
  updateMyInstitutionCourse: (courseId: number, data: any) => api.put(`/api/institutions/me/courses/${courseId}`, data),
  deleteMyInstitutionCourse: (courseId: number) => api.delete(`/api/institutions/me/courses/${courseId}`),
  linkInstructor: (data: { instructor_user_id?: number; email?: string }) =>
    api.post('/api/institutions/me/instructors/link', data),
  unlinkInstructor: (instructorId: number) =>
    api.delete(`/api/institutions/me/instructors/${instructorId}`),
}

// Pages API
export const pagesAPI = {
  // Tüm sayfaları getir
  getPages: (status?: string) => api.get('/api/pages', { params: status ? { status } : {} }),
  
  // Slug'a göre sayfa getir (public)
  getPageBySlug: (slug: string) => api.get(`/api/pages/${slug}`),
  getPageBySlugOptional: (slug: string) =>
    api.get(`/api/pages/${slug}`, {
      validateStatus: (status) =>
        (status >= 200 && status < 300) || status === 304 || status === 404,
    }),
  
  // Yeni sayfa oluştur (admin only)
  createPage: (data: {
    slug: string
    title: string
    blocks: any[]
    status?: string
    show_in_header?: boolean
  }) => api.post('/api/pages', data),
  
  // Sayfayı güncelle (admin only)
  updatePage: (slug: string, data: {
    title?: string
    blocks?: any[]
    status?: string
    show_in_header?: boolean
  }) => api.put(`/api/pages/${slug}`, data),
  
  // Sayfayı sil (admin only)
  deletePage: (slug: string) => api.delete(`/api/pages/${slug}`),
  
  // Header menüsündeki sayfaları getir (public)
  getHeaderMenuPages: () => api.get('/api/pages/header/menu'),
}

export const mockExamsAPI = {
  listPublished: () => api.get('/api/mock-exams'),
  getBySlug: (slug: string) => api.get(`/api/mock-exams/${slug}`),
  submit: (
    slug: string,
    data: {
      full_name: string
      email: string
      phone: string
      answers: Array<{ question_id: number; selected_option_id?: string | null }>
    }
  ) => api.post(`/api/mock-exams/${slug}/submit`, data),
}

export const blogAPI = {
  listPosts: (params?: { status?: 'draft' | 'published' | 'scheduled'; include_all?: boolean; limit?: number }) =>
    api.get('/api/blog', { params }),

  getPostById: (id: number) =>
    api.get(`/api/blog/id/${id}`),

  getPostBySlug: (slug: string) =>
    api.get(`/api/blog/${slug}`),

  createPost: (data: {
    title: string
    slug: string
    excerpt?: string
    content: string
    featured_image?: string | null
    video_url?: string | null
    video_title?: string | null
    author_name: string
    category: string
    tags: string[]
    status: 'draft' | 'published' | 'scheduled'
    is_featured: boolean
    published_at?: string | null
    scheduled_at?: string | null
  }) => api.post('/api/blog', data),

  updatePost: (id: number, data: {
    title?: string
    slug?: string
    excerpt?: string
    content?: string
    featured_image?: string | null
    video_url?: string | null
    video_title?: string | null
    author_name?: string
    category?: string
    tags?: string[]
    status?: 'draft' | 'published' | 'scheduled'
    is_featured?: boolean
    published_at?: string | null
    scheduled_at?: string | null
  }) => api.put(`/api/blog/${id}`, data),

  deletePost: (id: number) =>
    api.delete(`/api/blog/${id}`),

  incrementViews: (id: number) =>
    api.post(`/api/blog/${id}/views`),
}

// Media API
export const mediaAPI = {
  // S3 direct upload için presigned URL (admin only)
  presignUpload: (data: { filename: string; content_type: string }) =>
    api.post('/api/media/presign', data),

  // Tek dosya yükle (admin only)
  uploadFile: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/api/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  // Birden fazla dosya yükle (admin only)
  uploadMultiple: (files: File[]) => {
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    return api.post('/api/media/upload-multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  // Yüklenmiş dosyaları listele (admin only)
  listFiles: (year?: number, month?: number) => 
    api.get('/api/media/list', { params: { year, month } }),
  
  // Dosya sil (admin only)
  deleteFile: (fileUrl: string) => 
    api.delete('/api/media/delete', { params: { file_url: fileUrl } }),
}

export default api
