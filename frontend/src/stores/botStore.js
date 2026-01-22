import { create } from 'zustand'
import api from '../utils/api'

export const useBotStore = create((set, get) => ({
  bots: [],
  selectedBot: null,
  isLoading: false,
  error: null,

  // Fetch all bots
  fetchBots: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get('/bots')
      set({ bots: response.data.bots, isLoading: false })
      return { success: true }
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Failed to load bots', 
        isLoading: false 
      })
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Get bot by ID
  fetchBot: async (botId) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get(`/bots/${botId}`)
      set({ selectedBot: response.data.bot, isLoading: false })
      return { success: true, bot: response.data.bot }
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Failed to get bot info', 
        isLoading: false 
      })
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Create new bot
  createBot: async (botData) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/bots', botData)
      const newBot = response.data.bot
      set((state) => ({ 
        bots: [...state.bots, newBot], 
        isLoading: false 
      }))
      return { success: true, bot: newBot }
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Failed to create bot', 
        isLoading: false 
      })
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Update bot
  updateBot: async (botId, botData) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.put(`/bots/${botId}`, botData)
      const updatedBot = response.data.bot
      set((state) => ({
        bots: state.bots.map(bot => 
          bot.id === botId ? updatedBot : bot
        ),
        selectedBot: state.selectedBot?.id === botId ? updatedBot : state.selectedBot,
        isLoading: false
      }))
      return { success: true, bot: updatedBot }
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Failed to update bot', 
        isLoading: false 
      })
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Delete bot
  deleteBot: async (botId) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/bots/${botId}`)
      set((state) => ({
        bots: state.bots.filter(bot => bot.id !== botId),
        selectedBot: state.selectedBot?.id === botId ? null : state.selectedBot,
        isLoading: false
      }))
      return { success: true }
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Failed to delete bot', 
        isLoading: false 
      })
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Start bot
  startBot: async (botId) => {
    try {
      const response = await api.post(`/bots/${botId}/start`)
      set((state) => ({
        bots: state.bots.map(bot => 
          bot.id === botId ? { ...bot, status: 'online' } : bot
        ),
        selectedBot: state.selectedBot?.id === botId 
          ? { ...state.selectedBot, status: 'online' } 
          : state.selectedBot
      }))
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Stop bot
  stopBot: async (botId) => {
    try {
      const response = await api.post(`/bots/${botId}/stop`)
      set((state) => ({
        bots: state.bots.map(bot => 
          bot.id === botId ? { ...bot, status: 'offline' } : bot
        ),
        selectedBot: state.selectedBot?.id === botId 
          ? { ...state.selectedBot, status: 'offline' } 
          : state.selectedBot
      }))
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Restart bot
  restartBot: async (botId) => {
    try {
      await api.post(`/bots/${botId}/restart`)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Get bot guilds
  fetchBotGuilds: async (botId) => {
    try {
      const response = await api.get(`/bots/${botId}/guilds`)
      return { success: true, guilds: response.data.guilds }
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Update bot status from socket
  updateBotStatus: (botId, status) => {
    set((state) => ({
      bots: state.bots.map(bot => 
        bot.id === botId ? { ...bot, status } : bot
      ),
      selectedBot: state.selectedBot?.id === botId 
        ? { ...state.selectedBot, status } 
        : state.selectedBot
    }))
  },

  setSelectedBot: (bot) => set({ selectedBot: bot }),
  clearError: () => set({ error: null })
}))
