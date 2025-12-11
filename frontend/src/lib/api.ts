import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Token yenileme durumu için flag
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: Error) => void
}> = []

// Redirect loop önleme flag
let isRedirecting = false

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token!)
    }
  })
  failedQueue = []
}

// Request interceptor - token ekleme
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Bakım modu event'i için custom event
export const MAINTENANCE_EVENT = 'maintenance-mode'

export const triggerMaintenanceMode = (message: string) => {
  window.dispatchEvent(new CustomEvent(MAINTENANCE_EVENT, { detail: { message } }))
}

// Helper: Çıkış işlemi - loop önleyici
const handleLogout = () => {
  // Zaten redirect ediyorsak veya login sayfasındaysak tekrar etme
  if (isRedirecting || window.location.pathname === '/login') {
    return
  }

  isRedirecting = true

  // Tüm token ve auth verilerini temizle
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  localStorage.removeItem('auth-storage') // Zustand persist storage

  // Yönlendir
  window.location.href = '/login'
}

// Response interceptor - hata yönetimi ve token yenileme
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Eğer request config yoksa hata döndür
    if (!originalRequest) {
      return Promise.reject(error)
    }

    // Bakım modu kontrolü
    if (error.response?.status === 503 && (error.response?.data as any)?.maintenanceMode) {
      const message = (error.response.data as any).error || 'Sistem bakımda, lütfen daha sonra tekrar deneyin.'
      triggerMaintenanceMode(message)
      handleLogout()
      return Promise.reject(error)
    }

    // 401 hatası
    if (error.response?.status === 401) {
      // Login veya refresh endpoint'iyse direkt logout
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
        // Login hatasıysa logout yapma, sadece hata döndür
        if (originalRequest.url?.includes('/auth/login')) {
          return Promise.reject(error)
        }
        handleLogout()
        return Promise.reject(error)
      }

      // Henüz yeniden denenmemişse
      if (!originalRequest._retry) {
        // Token yenileme zaten devam ediyorsa, sıraya ekle
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          }).catch((err) => {
            return Promise.reject(err)
          })
        }

        originalRequest._retry = true
        isRefreshing = true

        const refreshToken = localStorage.getItem('refreshToken')

        // Refresh token yoksa logout
        if (!refreshToken) {
          isRefreshing = false
          handleLogout()
          return Promise.reject(error)
        }

        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken })
          const { accessToken } = response.data

          localStorage.setItem('token', accessToken)
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

          processQueue(null, accessToken)

          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        } catch (refreshError) {
          processQueue(refreshError as Error, null)
          handleLogout()
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      } else {
        // Zaten retry yapılmış, logout yap
        handleLogout()
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string; department?: string }) =>
    api.post('/auth/register', data),
  getProfile: () => api.get('/auth/me'),
  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken?: string) =>
    api.post('/auth/logout', { refreshToken }),
  logoutAll: () => api.post('/auth/logout-all'),
}

// Courses API
export const coursesApi = {
  getAll: (params?: { page?: number; limit?: number; isPublished?: boolean }) =>
    api.get('/courses', { params }),
  getById: (id: string) => api.get(`/courses/${id}`),
  create: (data: { title: string; description?: string }) =>
    api.post('/courses', data),
  update: (id: string, data: { title?: string; description?: string; isPublished?: boolean }) =>
    api.put(`/courses/${id}`, data),
  delete: (id: string) => api.delete(`/courses/${id}`),
  enroll: (id: string) => api.post(`/courses/${id}/enroll`),
  getEnrolled: () => api.get('/courses/enrolled/me'),
}

// Progress API
export const progressApi = {
  get: (lessonId: string) => api.get(`/progress/${lessonId}`),
  update: (lessonId: string, data: { lastWatchedSecond: number; totalWatchedSeconds?: number }) =>
    api.put(`/progress/${lessonId}`, data),
  getCourseProgress: (courseId: string) => api.get(`/progress/course/${courseId}`),
  getStats: () => api.get('/progress/stats/me'),
}

// Lessons API
export const lessonsApi = {
  get: (id: string) => api.get(`/lessons/${id}`),
  getByModule: (moduleId: string) => api.get(`/lessons/module/${moduleId}`),
  getNavigation: (id: string) => api.get(`/lessons/${id}/nav`),
  create: (moduleId: string, data: any) => api.post(`/lessons/module/${moduleId}`, data),
  update: (id: string, data: any) => api.put(`/lessons/${id}`, data),
  delete: (id: string) => api.delete(`/lessons/${id}`),
}

// Videos API
export const videosApi = {
  getVideoToken: (lessonId: string) => api.post(`/videos/${lessonId}/token`),
  getStreamUrl: (lessonId: string, token?: string) => token
    ? `${API_URL}/videos/${lessonId}/stream?token=${token}`
    : `${API_URL}/videos/${lessonId}/stream`,
  getThumbnailUrl: (lessonId: string) => `${API_URL}/videos/${lessonId}/thumbnail`,
}

// Comments API
export const commentsApi = {
  getByLesson: (lessonId: string) => api.get(`/comments/lesson/${lessonId}`),
  create: (lessonId: string, data: { content: string; timestamp?: number; parentId?: string }) =>
    api.post(`/comments/lesson/${lessonId}`, data),
  update: (id: string, data: { content: string }) => api.put(`/comments/${id}`, data),
  delete: (id: string) => api.delete(`/comments/${id}`),
}
