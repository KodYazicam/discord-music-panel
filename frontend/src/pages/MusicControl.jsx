import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMusicStore, selectQueue } from '../stores/musicStore.js'
import { useBotStore } from '../stores/botStore'
import {
  ArrowLeft,
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  List,
  Plus,
  Trash2,
  Music,
  Clock,
  User,
  Search,
  Loader,
  GripVertical
} from 'lucide-react'

function MusicControl() {
  const { botId, guildId } = useParams()
  const { selectedBot, fetchBot } = useBotStore()
  const {
    fetchQueue,
    pause,
    resume,
    skip,
    setVolume,
    toggleLoop,
    shuffleQueue,
    removeFromQueue,
    clearQueue,
    addToQueue
  } = useMusicStore()
  const queueData = useMusicStore((state) => selectQueue(state, botId, guildId))
  const { tracks: queue, currentTrack, isPlaying, volume, loopMode, position } = queueData

  const [searchQuery, setSearchQuery] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [actionError, setActionError] = useState('')
  const [localVolume, setLocalVolume] = useState(100)

  useEffect(() => {
    fetchBot(botId)
    fetchQueue(botId, guildId)
  }, [botId, guildId])

  useEffect(() => {
    setLocalVolume(volume)
  }, [volume])

  const handleAddTrack = async (e) => {
    e.preventDefault()
    const query = searchQuery.trim()
    if (!query || isAdding) return

    setIsAdding(true)
    setActionError('')
    const result = await addToQueue(botId, guildId, query)
    if (result.success) {
      setSearchQuery('')
    } else {
      setActionError(result.error || 'Could not add the track')
    }
    setIsAdding(false)
  }

  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value)
    setLocalVolume(newVolume)
  }

  const handleVolumeCommit = () => {
    setVolume(botId, guildId, localVolume)
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const loopLabels = { off: 'Off', track: 'Track', queue: 'Queue' }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to={`/bots/${botId}`}
          className="p-2 rounded-lg hover:bg-discord-lightest text-discord-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Music Control</h1>
          <p className="text-discord-muted">{selectedBot?.name}</p>
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-discord-red/10 border border-discord-red/30 rounded-md text-discord-red text-sm">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Player */}
        <div className="lg:col-span-2 space-y-6">
          {/* Now Playing */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Music className="w-5 h-5" />
              Now Playing
            </h2>

            {currentTrack ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg bg-discord-darker flex items-center justify-center overflow-hidden">
                    {currentTrack.thumbnail ? (
                      <img 
                        src={currentTrack.thumbnail} 
                        alt={currentTrack.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music className="w-8 h-8 text-discord-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{currentTrack.title}</h3>
                    <p className="text-discord-muted text-sm truncate">{currentTrack.author}</p>
                    <div className="flex items-center gap-2 text-sm text-discord-muted mt-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(currentTrack.duration)}</span>
                      {currentTrack.requestedBy && (
                        <>
                          <span className="mx-1">•</span>
                          <User className="w-4 h-4" />
                          <span>{currentTrack.requestedBy}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="h-1 bg-discord-darker rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-discord-primary transition-all duration-300"
                      style={{ width: `${(position / currentTrack.duration) * 100 || 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-discord-muted">
                    <span>{formatDuration(position)}</span>
                    <span>{formatDuration(currentTrack.duration)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Music className="w-12 h-12 text-discord-muted mx-auto mb-2" />
                <p className="text-discord-muted">Nothing is playing</p>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => shuffleQueue(botId, guildId)}
                className={`p-2 rounded-full hover:bg-discord-lightest transition-colors ${
                  queue.length > 1 ? 'text-discord-text' : 'text-discord-muted'
                }`}
                disabled={queue.length <= 1}
                title="Shuffle"
              >
                <Shuffle className="w-5 h-5" />
              </button>

              <button
                onClick={() => isPlaying ? pause(botId, guildId) : resume(botId, guildId)}
                className="p-4 rounded-full bg-discord-primary hover:bg-discord-primary-dark text-white transition-colors"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6 ml-0.5" />
                )}
              </button>

              <button
                onClick={() => skip(botId, guildId)}
                className="p-2 rounded-full hover:bg-discord-lightest text-discord-text transition-colors"
                title="Skip"
              >
                <SkipForward className="w-6 h-6" />
              </button>

              <button
                onClick={() => toggleLoop(botId, guildId)}
                className={`p-2 rounded-full hover:bg-discord-lightest transition-colors ${
                  loopMode !== 'off' ? 'text-discord-primary' : 'text-discord-text'
                }`}
                title={`Loop: ${loopLabels[loopMode]}`}
              >
                <Repeat className="w-5 h-5" />
                {loopMode === 'track' && (
                  <span className="absolute text-xs font-bold">1</span>
                )}
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setVolume(botId, guildId, localVolume === 0 ? 100 : 0)}
                className="text-discord-text hover:text-white transition-colors"
              >
                {localVolume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={localVolume}
                onChange={handleVolumeChange}
                onMouseUp={handleVolumeCommit}
                onTouchEnd={handleVolumeCommit}
                className="flex-1 h-1 bg-discord-darker rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-discord-primary"
              />
              <span className="text-sm text-discord-muted w-10 text-right">{localVolume}%</span>
            </div>
          </div>

          {/* Add Track */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Track
              </h2>
            </div>

            <form onSubmit={handleAddTrack} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-discord-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search or paste YouTube/Spotify URL..."
                  className="input pl-10"
                />
              </div>
              <button
                type="submit"
                disabled={isAdding || !searchQuery.trim()}
                className="btn btn-primary"
              >
                {isAdding ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  'Add'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Queue */}
        <div className="card h-fit">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <List className="w-5 h-5" />
              Queue ({queue.length})
            </h2>
            {queue.length > 0 && (
              <button
                onClick={() => clearQueue(botId, guildId)}
                className="text-sm text-discord-red hover:text-red-400 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          {queue.length === 0 ? (
            <div className="text-center py-8">
              <List className="w-12 h-12 text-discord-muted mx-auto mb-2" />
              <p className="text-discord-muted">Queue is empty</p>
              <p className="text-sm text-discord-muted">Add tracks to the queue</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {queue.map((track, index) => (
                <div
                  key={track.id || index}
                  className={`flex items-center gap-3 p-2 rounded-lg hover:bg-discord-lightest transition-colors ${
                    index === 0 && isPlaying ? 'bg-discord-primary/10 border border-discord-primary/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-discord-muted cursor-grab" />
                    <span className="text-sm text-discord-muted w-5">{index + 1}</span>
                  </div>
                  <div className="w-10 h-10 rounded bg-discord-darker flex items-center justify-center overflow-hidden flex-shrink-0">
                    {track.thumbnail ? (
                      <img 
                        src={track.thumbnail} 
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music className="w-5 h-5 text-discord-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{track.title}</p>
                    <p className="text-xs text-discord-muted truncate">{track.author}</p>
                  </div>
                  <button
                    onClick={() => removeFromQueue(botId, guildId, index)}
                    className="p-1 rounded hover:bg-discord-light text-discord-muted hover:text-discord-red transition-colors"
                    title="Remove from queue"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MusicControl
