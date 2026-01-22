import { io } from 'socket.io-client'
import { useAuthStore } from '../stores/authStore'
import { useBotStore } from '../stores/botStore'
import { useMusicStore } from '../stores/musicStore'

let socket = null

export const initSocket = () => {
  if (socket) return socket

  const token = useAuthStore.getState().token

  socket = io('/', {
    auth: {
      token
    },
    transports: ['websocket', 'polling']
  })

  // Connection events
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id)
  })

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason)
  })

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message)
  })

  // Bot events
  socket.on('bot:status', (data) => {
    const { botId, status } = data
    useBotStore.getState().updateBotStatus(botId, status)
  })

  socket.on('bot:error', (data) => {
    console.error('Bot error:', data)
  })

  // Music events
  socket.on('music:trackStart', (data) => {
    const { botId, guildId, track } = data
    useMusicStore.getState().updateTrackStatus(botId, guildId, {
      track,
      isPlaying: true,
      position: 0
    })
  })

  socket.on('music:trackEnd', (data) => {
    const { botId, guildId } = data
    useMusicStore.getState().fetchQueue(botId, guildId)
  })

  socket.on('music:queueUpdate', (data) => {
    const { botId, guildId, queue } = data
    useMusicStore.getState().updateQueue(botId, guildId, queue)
  })

  socket.on('music:pause', (data) => {
    const { botId, guildId } = data
    const queue = useMusicStore.getState().getQueue(botId, guildId)
    useMusicStore.getState().updateQueue(botId, guildId, {
      ...queue,
      isPlaying: false
    })
  })

  socket.on('music:resume', (data) => {
    const { botId, guildId } = data
    const queue = useMusicStore.getState().getQueue(botId, guildId)
    useMusicStore.getState().updateQueue(botId, guildId, {
      ...queue,
      isPlaying: true
    })
  })

  socket.on('music:volumeChange', (data) => {
    const { botId, guildId, volume } = data
    const queue = useMusicStore.getState().getQueue(botId, guildId)
    useMusicStore.getState().updateQueue(botId, guildId, {
      ...queue,
      volume
    })
  })

  socket.on('music:stop', (data) => {
    const { botId, guildId } = data
    useMusicStore.getState().updateQueue(botId, guildId, {
      tracks: [],
      current: null,
      isPlaying: false,
      volume: 100,
      loopMode: 'off'
    })
  })

  return socket
}

export const getSocket = () => socket

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// Join a music room for real-time updates
export const joinMusicRoom = (botId, guildId) => {
  if (socket) {
    socket.emit('join:music', { botId, guildId })
  }
}

// Leave a music room
export const leaveMusicRoom = (botId, guildId) => {
  if (socket) {
    socket.emit('leave:music', { botId, guildId })
  }
}

// Join bot status updates room
export const joinBotRoom = (botId) => {
  if (socket) {
    socket.emit('join:bot', { botId })
  }
}

// Leave bot status room
export const leaveBotRoom = (botId) => {
  if (socket) {
    socket.emit('leave:bot', { botId })
  }
}

export default {
  initSocket,
  getSocket,
  disconnectSocket,
  joinMusicRoom,
  leaveMusicRoom,
  joinBotRoom,
  leaveBotRoom
}
