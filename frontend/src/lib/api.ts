import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

console.log('API_BASE_URL:', API_BASE_URL) // Debug log

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 saniye timeout
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
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

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    
    // Log error only once
    if (!error.config?.__errorLogged) {
      console.error('API Error:', {
        url: error.config?.url,
        status,
        message: error.message,
        data: error.response?.data
      })
      if (error.config) error.config.__errorLogged = true
    }
    
    // Unauthorized -> force login
    if (status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      // Only redirect if not already on login page
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        const next = window.location.pathname + window.location.search
        window.location.href = `/auth/login?next=${encodeURIComponent(next)}`
      }
      return Promise.reject(error)
    }

    // Forbidden -> show informative redirect (user may lack admin rights)
    if (status === 403) {
      try {
        // Clear token to avoid repeated 403s
        localStorage.removeItem('access_token')
      } catch (e) {}
      // Optionally show a friendly message then redirect to home/login
      // Use alert as a fallback; UI toast may not be available here
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        alert('Erişim reddedildi: Bu işlemi yapmak için yeterli yetkiniz yok. Lütfen giriş yapıp yetkilerinizi kontrol edin.')
        const next = window.location.pathname + window.location.search
        window.location.href = `/auth/login?next=${encodeURIComponent(next)}`
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  sendOTP: (phone: string) => api.post('/api/auth/send-otp', { phone }),
  verifyOTP: (phone: string, otp_code: string) => api.post('/api/auth/verify-otp', { phone, otp_code }),
  register: (userData: any) => api.post('/api/auth/register', userData),
  registerFirebase: (idToken: string, userData: any) => api.post('/api/auth/register-firebase', { id_token: idToken, ...userData }),
  login: (email: string, password: string) => api.post('/api/auth/login', { email, password }),
  loginFirebase: (idToken: string) => api.post('/api/auth/login-firebase', { id_token: idToken }),
  getProfile: () => api.get('/api/auth/me'),
  updateProfile: (data: any) => api.put('/api/auth/profile', data),
}

// Courses API
export const coursesAPI = {
  getCourses: (params?: any) => api.get('/api/courses', { params }),
  getFeaturedCourses: (limit?: number) => api.get('/api/courses/featured/list', { params: { limit } }),
  getCourse: (id: number) => api.get(`/api/courses/${id}`),
  createCourse: (data: any) => api.post('/api/courses', data),
  updateCourse: (id: number, data: any) => api.put(`/api/courses/${id}`, data),
  enrollInCourse: (id: number) => api.post(`/api/courses/${id}/enroll`),
  getMyCourses: () => api.get('/api/courses/my-courses'),
  createReview: (courseId: number, data: any) => api.post(`/api/courses/${courseId}/reviews`, data),
  getCategories: () => api.get('/api/courses/categories/list'),
  uploadThumbnail: (courseId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/api/courses/${courseId}/upload-thumbnail`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  createLesson: (courseId: number, data: any) => api.post(`/api/courses/${courseId}/lessons`, data),
}

// Instructors API
export const instructorsAPI = {
  getInstructors: (params?: any) => api.get('/api/instructors', { params }),
  getInstructor: (id: number) => api.get(`/api/instructors/${id}`),
  applyAsInstructor: (data: any) => api.post('/api/instructors/apply', data),
  updateProfile: (data: any) => api.put('/api/instructors/profile', data),
  getMyProfile: () => api.get('/api/instructors/my/profile'),
  getInstructorReviews: (id: number, params?: any) => api.get(`/api/instructors/${id}/reviews`, { params }),
  getSpecializations: () => api.get('/api/instructors/specializations/list'),
}

// Payments API
export const paymentsAPI = {
  createPayment: (courseId: number, paymentMethod?: string) => 
    api.post('/api/payments/create-payment', { course_id: courseId, payment_method: paymentMethod }),
  verifyPayment: (paymentId: number) => api.post(`/api/payments/verify-payment/${paymentId}`),
  getMyPayments: () => api.get('/api/payments/my-payments'),
  getPayment: (id: number) => api.get(`/api/payments/payment/${id}`),
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

// Admin API
export const adminAPI = {
  getStats: () => api.get('/api/admin/stats'),
  getUsers: (params?: any) => api.get('/api/admin/users', { params }),
  getInstructors: (params?: any) => api.get('/api/admin/instructors', { params }),
  getInstructorDetail: (id: number) => api.get(`/api/admin/instructors/${id}`),
  getCourses: (params?: any) => api.get('/api/admin/courses', { params }),
  approveInstructor: (id: number) => api.put(`/api/admin/instructors/${id}/approve`),
  rejectInstructor: (id: number) => api.put(`/api/admin/instructors/${id}/reject`),
  publishCourse: (id: number) => api.put(`/api/admin/courses/${id}/publish`),
  unpublishCourse: (id: number) => api.put(`/api/admin/courses/${id}/unpublish`),
  featureCourse: (id: number) => api.put(`/api/admin/courses/${id}/feature`),
  unfeatureCourse: (id: number) => api.put(`/api/admin/courses/${id}/unfeature`),
  activateUser: (id: number) => api.put(`/api/admin/users/${id}/activate`),
  deactivateUser: (id: number) => api.put(`/api/admin/users/${id}/deactivate`),
  getRevenueAnalytics: (days?: number) => api.get('/api/admin/analytics/revenue', { params: { days } }),
  getUserAnalytics: (days?: number) => api.get('/api/admin/analytics/users', { params: { days } }),
  getPendingReviews: (params?: any) => api.get('/api/admin/reviews/pending', { params }),
  approveReview: (id: number) => api.put(`/api/admin/reviews/${id}/approve`),
  deleteReview: (id: number) => api.delete(`/api/admin/reviews/${id}`),
}

// Pages API
export const pagesAPI = {
  // Tüm sayfaları getir
  getPages: (status?: string) => api.get('/api/pages', { params: status ? { status } : {} }),
  
  // Slug'a göre sayfa getir (public)
  getPageBySlug: (slug: string) => api.get(`/api/pages/${slug}`),
  
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

// Media API
export const mediaAPI = {
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