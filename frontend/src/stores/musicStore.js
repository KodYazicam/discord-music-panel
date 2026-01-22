import { create } from 'zustand'
import api from '../utils/api'

export const useMusicStore = create((set, get) => ({
  queues: {}, // { `${botId}-${guildId}`: queueData }
  currentTrack: null,
  isPlaying: false,
  volume: 100,
  loopMode: 'off', // off, track, queue
  isLoading: false,
  error: null,

  // Get queue for specific bot and guild
  getQueue: (botId, guildId) => {
    const key = `${botId}-${guildId}`
    return get().queues[key] || { tracks: [], current: null, isPlaying: false, volume: 100, loopMode: 'off' }
  },

  // Fetch queue from server
  fetchQueue: async (botId, guildId) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get(`/music/${botId}/${guildId}/queue`)
      const key = `${botId}-${guildId}`
      set((state) => ({
        queues: {
          ...state.queues,
          [key]: response.data.queue
        },
        isLoading: false
      }))
      return { success: true, queue: response.data.queue }
    } catch (error) {
      set({
        error: error.response?.data?.error || 'Failed to get queue info',
        isLoading: false
      })
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Play a track
  play: async (botId, guildId, query) => {
    try {
      const response = await api.post(`/music/${botId}/${guildId}/play`, { query })
      return { success: true, track: response.data.track }
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Pause playback
  pause: async (botId, guildId) => {
    try {
      await api.post(`/music/${botId}/${guildId}/pause`)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Resume playback
  resume: async (botId, guildId) => {
    try {
      await api.post(`/music/${botId}/${guildId}/resume`)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Skip current track
  skip: async (botId, guildId) => {
    try {
      await api.post(`/music/${botId}/${guildId}/skip`)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Stop playback
  stop: async (botId, guildId) => {
    try {
      await api.post(`/music/${botId}/${guildId}/stop`)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Set volume
  setVolume: async (botId, guildId, volume) => {
    try {
      await api.post(`/music/${botId}/${guildId}/volume`, { volume })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Shuffle queue
  shuffle: async (botId, guildId) => {
    try {
      await api.post(`/music/${botId}/${guildId}/shuffle`)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Set loop mode
  setLoop: async (botId, guildId, mode) => {
    try {
      await api.post(`/music/${botId}/${guildId}/loop`, { mode })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Remove track from queue
  removeTrack: async (botId, guildId, index) => {
    try {
      await api.delete(`/music/${botId}/${guildId}/queue/${index}`)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Clear queue
  clearQueue: async (botId, guildId) => {
    try {
      await api.delete(`/music/${botId}/${guildId}/queue`)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Move track in queue
  moveTrack: async (botId, guildId, from, to) => {
    try {
      await api.post(`/music/${botId}/${guildId}/move`, { from, to })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Seek to position
  seek: async (botId, guildId, position) => {
    try {
      await api.post(`/music/${botId}/${guildId}/seek`, { position })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Update queue from socket event
  updateQueue: (botId, guildId, queueData) => {
    const key = `${botId}-${guildId}`
    set((state) => ({
      queues: {
        ...state.queues,
        [key]: queueData
      }
    }))
  },

  // Update track status from socket
  updateTrackStatus: (botId, guildId, trackData) => {
    const key = `${botId}-${guildId}`
    set((state) => ({
      queues: {
        ...state.queues,
        [key]: {
          ...state.queues[key],
          current: trackData.track,
          isPlaying: trackData.isPlaying,
          position: trackData.position
        }
      }
    }))
  },

  clearError: () => set({ error: null })
}))
