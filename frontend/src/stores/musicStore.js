import { create } from 'zustand'
import api from '../utils/api.js'

export const EMPTY_QUEUE = Object.freeze({
  tracks: [],
  currentTrack: null,
  isPlaying: false,
  volume: 100,
  loop: false,
  loopQueue: false,
  loopMode: 'off',
  position: 0
})

const queueKey = (botId, guildId) => `${botId}-${guildId}`
const guildPath = (botId, guildId) => `/bots/${botId}/guilds/${guildId}`

// REST returns tracks/currentTrack/loop/loopQueue, while socket payloads may
// use current/loopMode. Normalise both into one shape for every consumer.
export const normalizeQueue = (queue) => ({
  ...EMPTY_QUEUE,
  ...(queue || {}),
  tracks: Array.isArray(queue?.tracks) ? queue.tracks : [],
  currentTrack: queue?.currentTrack ?? queue?.current ?? null,
  loopMode: queue?.loopQueue ? 'queue' : queue?.loop ? 'track' : (queue?.loopMode || 'off')
})

export const selectQueue = (state, botId, guildId) =>
  state.queues[queueKey(botId, guildId)] || EMPTY_QUEUE

async function runCommand(botId, guildId, command, args = {}) {
  const response = await api.post(`${guildPath(botId, guildId)}/command`, { command, args })
  if (response.data?.success === false) {
    return { success: false, error: response.data.message || 'Command failed' }
  }
  return { success: true, data: response.data }
}

export const useMusicStore = create((set, get) => ({
  queues: {}, // { `${botId}-${guildId}`: normalised queue }
  currentTrack: null,
  isPlaying: false,
  volume: 100,
  loopMode: 'off', // off, track, queue
  isLoading: false,
  error: null,

  // Get queue for specific bot and guild
  getQueue: (botId, guildId) => selectQueue(get(), botId, guildId),

  // Fetch queue from server
  fetchQueue: async (botId, guildId) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get(`${guildPath(botId, guildId)}/queue`)
      const key = queueKey(botId, guildId)
      const queue = normalizeQueue(response.data.queue)
      set((state) => ({
        queues: {
          ...state.queues,
          [key]: queue
        },
        isLoading: false
      }))
      return { success: true, queue }
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
      const result = await runCommand(botId, guildId, 'play', { query })
      return result.success ? { ...result, track: result.data?.tracks?.[0] } : result
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Pause playback
  pause: async (botId, guildId) => {
    try {
      return await runCommand(botId, guildId, 'pause')
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Resume playback
  resume: async (botId, guildId) => {
    try {
      return await runCommand(botId, guildId, 'resume')
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Skip current track
  skip: async (botId, guildId) => {
    try {
      return await runCommand(botId, guildId, 'skip')
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Stop playback
  stop: async (botId, guildId) => {
    try {
      return await runCommand(botId, guildId, 'stop')
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Set volume
  setVolume: async (botId, guildId, volume) => {
    try {
      return await runCommand(botId, guildId, 'volume', { volume })
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Shuffle queue
  shuffle: async (botId, guildId) => {
    try {
      return await runCommand(botId, guildId, 'shuffle')
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Set loop mode
  setLoop: async (botId, guildId, mode) => {
    try {
      const result = await runCommand(botId, guildId, 'loop', { mode })
      if (result.success) {
        set((state) => ({
          queues: {
            ...state.queues,
            [queueKey(botId, guildId)]: {
              ...selectQueue(state, botId, guildId),
              loopMode: mode,
              loop: mode === 'track',
              loopQueue: mode === 'queue'
            }
          }
        }))
      }
      return result
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Remove track from queue
  removeTrack: async (botId, guildId, index) => {
    try {
      return await runCommand(botId, guildId, 'remove', { index })
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Clear queue
  clearQueue: async (botId, guildId) => {
    try {
      return await runCommand(botId, guildId, 'clear')
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Move track in queue
  moveTrack: async (botId, guildId, from, to) => {
    try {
      return await runCommand(botId, guildId, 'move', { from, to })
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Seek to position
  seek: async (botId, guildId, position) => {
    try {
      return await runCommand(botId, guildId, 'seek', { position })
    } catch (error) {
      return { success: false, error: error.response?.data?.error }
    }
  },

  // Aliases used by the music pages
  addToQueue: (botId, guildId, query) => get().play(botId, guildId, query),
  shuffleQueue: (botId, guildId) => get().shuffle(botId, guildId),
  removeFromQueue: (botId, guildId, index) => get().removeTrack(botId, guildId, index),
  toggleLoop: async (botId, guildId) => {
    const current = get().getQueue(botId, guildId).loopMode
    const next = current === 'off' ? 'track' : current === 'track' ? 'queue' : 'off'
    return get().setLoop(botId, guildId, next)
  },

  // Update queue from socket event
  updateQueue: (botId, guildId, queueData) => {
    const key = `${botId}-${guildId}`
    set((state) => ({
      queues: {
        ...state.queues,
        [key]: normalizeQueue(queueData)
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
          currentTrack: trackData.track,
          isPlaying: trackData.isPlaying,
          position: trackData.position
        }
      }
    }))
  },

  clearError: () => set({ error: null })
}))
