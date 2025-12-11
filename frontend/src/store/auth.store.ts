import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT'
  department?: string
  avatar?: string
  status?: 'PENDING' | 'APPROVED' | 'REJECTED'
}

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string, refreshToken?: string) => void
  setUser: (user: User) => void
  setTokens: (token: string, refreshToken?: string) => void
  logout: () => void
  getRefreshToken: () => string | null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, token, refreshToken) => {
        localStorage.setItem('token', token)
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken)
        }
        set({ user, token, refreshToken: refreshToken || null, isAuthenticated: true })
      },
      setUser: (user) => {
        set({ user })
      },
      setTokens: (token, refreshToken) => {
        localStorage.setItem('token', token)
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken)
        }
        set({ token, refreshToken: refreshToken || get().refreshToken })
      },
      logout: () => {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false })
      },
      getRefreshToken: () => {
        return get().refreshToken || localStorage.getItem('refreshToken')
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)
