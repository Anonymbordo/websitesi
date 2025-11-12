import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: number
  email: string
  phone: string
  full_name: string
  role: string
  is_active: boolean
  is_verified: boolean
  city?: string
  district?: string
  created_at: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string, remember?: boolean) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token, remember = true) => {
        try {
          if (remember) {
            localStorage.setItem('access_token', token)
          } else {
            // store in sessionStorage for non-persistent sessions
            sessionStorage.setItem('access_token', token)
          }
        } catch (e) {
          // fallback to localStorage if sessionStorage unavailable
          localStorage.setItem('access_token', token)
        }
        set({ user, token, isAuthenticated: true })
      },
      logout: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        set({ user: null, token: null, isAuthenticated: false })
      },
      updateUser: (userData) => {
        const currentUser = get().user
        if (currentUser) {
          const updatedUser = { ...currentUser, ...userData }
          set({ user: updatedUser })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
)

interface InstructorInfo {
  id: number
  full_name: string
  email?: string
  bio?: string
  specialization?: string
}

interface Course {
  id: number
  title: string
  description: string
  short_description?: string
  price: number
  discount_price?: number
  duration_hours: number
  level: string
  category: string
  subcategory?: string
  language: string
  thumbnail?: string
  preview_video?: string
  location?: string
  latitude?: number
  longitude?: number
  is_online: boolean
  is_published: boolean
  enrollment_count: number
  rating: number
  total_ratings: number
  created_at: string
  instructor: InstructorInfo | Record<string, unknown>
}

interface CoursesState {
  courses: Course[]
  selectedCourse: Course | null
  categories: string[]
  loading: boolean
  setCourses: (courses: Course[]) => void
  setSelectedCourse: (course: Course | null) => void
  setCategories: (categories: string[]) => void
  setLoading: (loading: boolean) => void
  addCourse: (course: Course) => void
  updateCourse: (id: number, updates: Partial<Course>) => void
  removeCourse: (id: number) => void
}

export const useCoursesStore = create<CoursesState>((set, get) => ({
  courses: [],
  selectedCourse: null,
  categories: [],
  loading: false,
  setCourses: (courses) => set({ courses }),
  setSelectedCourse: (course) => set({ selectedCourse: course }),
  setCategories: (categories) => set({ categories }),
  setLoading: (loading) => set({ loading }),
  addCourse: (course) => {
    const courses = get().courses
    set({ courses: [course, ...courses] })
  },
  updateCourse: (id, updates) => {
    const courses = get().courses.map(course => 
      course.id === id ? { ...course, ...updates } : course
    )
    set({ courses })
  },
  removeCourse: (id) => {
    const courses = get().courses.filter(course => course.id !== id)
    set({ courses })
  },
}))

interface Instructor {
  id: number
  bio?: string
  specialization?: string
  experience_years: number
  rating: number
  total_ratings: number
  total_students: number
  is_approved: boolean
  created_at: string
  user: User | Record<string, unknown>
  total_courses: number
  courses?: Course[]
}

interface InstructorsState {
  instructors: Instructor[]
  selectedInstructor: Instructor | null
  specializations: string[]
  loading: boolean
  setInstructors: (instructors: Instructor[]) => void
  setSelectedInstructor: (instructor: Instructor | null) => void
  setSpecializations: (specializations: string[]) => void
  setLoading: (loading: boolean) => void
}

export const useInstructorsStore = create<InstructorsState>((set) => ({
  instructors: [],
  selectedInstructor: null,
  specializations: [],
  loading: false,
  setInstructors: (instructors) => set({ instructors }),
  setSelectedInstructor: (instructor) => set({ selectedInstructor: instructor }),
  setSpecializations: (specializations) => set({ specializations }),
  setLoading: (loading) => set({ loading }),
}))

interface Notification {
  id?: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
}

interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  notifications: Notification[]
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: 'light' | 'dark') => void
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: false,
      theme: 'light',
      notifications: [],
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => set({ theme }),
      addNotification: (notification) => {
        const notifications = get().notifications
        set({ notifications: [...notifications, { ...notification, id: Date.now().toString() }] })
      },
      removeNotification: (id) => {
        const notifications = get().notifications.filter(n => n.id !== id)
        set({ notifications })
      },
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
)