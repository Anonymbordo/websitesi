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
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/auth/login'
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
  getProfile: () => api.get('/api/auth/me'),
  updateProfile: (data: any) => api.put('/api/auth/profile', data),
}

// Courses API
export const coursesAPI = {
  getCourses: (params?: any) => api.get('/api/courses', { params }),
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
  // Stats & Analytics
  getStats: () => api.get('/api/admin/stats'),
  getRevenueAnalytics: (days?: number) => api.get('/api/admin/analytics/revenue', { params: { days } }),
  getUserAnalytics: (days?: number) => api.get('/api/admin/analytics/users', { params: { days } }),

  // Users
  getUsers: (params?: any) => api.get('/api/admin/users', { params }),
  activateUser: (id: number) => api.put(`/api/admin/users/${id}/activate`),
  deactivateUser: (id: number) => api.put(`/api/admin/users/${id}/deactivate`),

  // Instructors
  getInstructors: (params?: any) => api.get('/api/admin/instructors', { params }),
  approveInstructor: (id: number) => api.put(`/api/admin/instructors/${id}/approve`),
  rejectInstructor: (id: number) => api.put(`/api/admin/instructors/${id}/reject`),

  // Courses
  getCourses: (params?: any) => api.get('/api/admin/courses', { params }),
  publishCourse: (id: number) => api.put(`/api/admin/courses/${id}/publish`),
  unpublishCourse: (id: number) => api.put(`/api/admin/courses/${id}/unpublish`),

  // Reviews
  getPendingReviews: (params?: any) => api.get('/api/admin/reviews/pending', { params }),
  approveReview: (id: number) => api.put(`/api/admin/reviews/${id}/approve`),
  deleteReview: (id: number) => api.delete(`/api/admin/reviews/${id}`),

  // Blog
  getBlogPosts: (params?: any) => api.get('/api/admin/blog', { params }),
  createBlogPost: (data: any) => api.post('/api/admin/blog', data),
  updateBlogPost: (id: number, data: any) => api.put(`/api/admin/blog/${id}`, data),
  deleteBlogPost: (id: number) => api.delete(`/api/admin/blog/${id}`),

  // Categories
  getCategories: (params?: any) => api.get('/api/admin/categories', { params }),
  createCategory: (data: any) => api.post('/api/admin/categories', data),
  updateCategory: (id: number, data: any) => api.put(`/api/admin/categories/${id}`, data),
  deleteCategory: (id: number) => api.delete(`/api/admin/categories/${id}`),

  // Media
  getMediaFiles: (params?: any) => api.get('/api/admin/media', { params }),
  deleteMediaFile: (id: number) => api.delete(`/api/admin/media/${id}`),
}

export default api