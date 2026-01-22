import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../utils/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      
      login: async (username, password) => {
        try {
          const response = await api.post('/auth/login', { username, password })
          const { token, user } = response.data
          
          set({ 
            token, 
            user, 
            isAuthenticated: true,
            isLoading: false 
          })
          
          return { success: true }
        } catch (error) {
          return {
            success: false,
            error: error.response?.data?.error || 'Login failed'
          }
        }
      },
      
      register: async (username, email, password) => {
        try {
          const response = await api.post('/auth/register', { username, email, password })
          const { token, user } = response.data
          
          set({
            token,
            user,
            isAuthenticated: true,
            isLoading: false
          })
          
          return { success: true }
        } catch (error) {
          return {
            success: false,
            error: error.response?.data?.error || 'Registration failed'
          }
        }
      },
      
      logout: () => {
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false,
          isLoading: false 
        })
      },
      
      checkAuth: async () => {
        const token = get().token
        
        if (!token) {
          set({ isLoading: false, isAuthenticated: false })
          return
        }
        
        try {
          const response = await api.get('/auth/me')
          set({ 
            user: response.data.user, 
            isAuthenticated: true,
            isLoading: false 
          })
        } catch (error) {
          set({ 
            user: null, 
            token: null, 
            isAuthenticated: false,
            isLoading: false 
          })
        }
      },
      
      initAuth: () => {
        get().checkAuth()
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token })
    }
  )
)

// Initialize auth on app load
if (typeof window !== 'undefined') {
  useAuthStore.getState().initAuth()
}
