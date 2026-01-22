import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useBotStore } from '../stores/botStore'
import { useMusicStore } from '../stores/musicStore'
import {
  ArrowLeft,
  Server,
  Settings,
  Music,
  Users,
  Activity,
  Volume2,
  Clock,
  Save,
  Hash,
  MessageSquare,
  Sliders
} from 'lucide-react'

function GuildDetail() {
  const { botId, guildId } = useParams()
  const { selectedBot, fetchBot, fetchBotGuilds } = useBotStore()
  const { currentTrack, isPlaying, queue, fetchQueue } = useMusicStore()
  
  const [guild, setGuild] = useState(null)
  const [settings, setSettings] = useState({
    defaultVolume: 100,
    maxQueueSize: 100,
    djRoleId: '',
    textChannelId: '',
    announceTrack: true,
    autoLeave: true,
    autoLeaveTimeout: 300
  })
  const [isEditing, setIsEditing] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [botId, guildId])

  const loadData = async () => {
    setIsLoading(true)
    
    await fetchBot(botId)
    const guildsResult = await fetchBotGuilds(botId)
    
    if (guildsResult.success) {
      const foundGuild = guildsResult.guilds.find(g => g.id === guildId)
      setGuild(foundGuild)
    }
    
    await fetchQueue(botId, guildId)
    setIsLoading(false)
  }

  const handleSave = async () => {
    // Normalde API'ye kayıt isteği gönderilir
    setSaveSuccess(true)
    setIsEditing(false)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-discord-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!guild) {
    return (
      <div className="text-center py-12">
        <Server className="w-16 h-16 text-discord-muted mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Server not found</h2>
        <Link to="/guilds" className="btn btn-primary">
          Back to Servers
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/guilds"
          className="p-2 rounded-lg hover:bg-discord-lightest text-discord-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-4 flex-1">
          {guild.icon ? (
            <img
              src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
              alt={guild.name}
              className="w-12 h-12 rounded-full"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-discord-primary flex items-center justify-center text-white text-xl font-bold">
              {guild.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{guild.name}</h1>
            <p className="text-discord-muted">{selectedBot?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/guilds/${botId}/${guildId}/settings`}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Sliders className="w-4 h-4" />
            Advanced Settings
          </Link>
          <Link
            to={`/music/${botId}/${guildId}`}
            className="btn btn-primary flex items-center gap-2"
          >
            <Music className="w-4 h-4" />
            Music Control
          </Link>
        </div>
      </div>

      {/* Success Message */}
      {saveSuccess && (
        <div className="p-3 bg-discord-green/10 border border-discord-green/30 rounded-md text-discord-green text-sm">
          Settings saved successfully
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Now Playing */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Music className="w-5 h-5" />
              Now Playing
            </h2>
            
            {currentTrack ? (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-discord-darker flex items-center justify-center overflow-hidden">
                  {currentTrack.thumbnail ? (
                    <img 
                      src={currentTrack.thumbnail} 
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music className="w-6 h-6 text-discord-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate">{currentTrack.title}</h3>
                  <p className="text-sm text-discord-muted truncate">{currentTrack.author}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm ${isPlaying ? 'bg-discord-green/20 text-discord-green' : 'bg-discord-yellow/20 text-discord-yellow'}`}>
                  {isPlaying ? 'Playing' : 'Paused'}
                </div>
              </div>
            ) : (
              <p className="text-discord-muted text-center py-4">Nothing is playing</p>
            )}
          </div>

          {/* Settings */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Server Settings
              </h2>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn btn-secondary text-sm"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="btn btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="btn btn-primary text-sm flex items-center gap-1"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Default Volume
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.defaultVolume}
                      onChange={(e) => setSettings({ ...settings, defaultVolume: parseInt(e.target.value) })}
                      className="input"
                    />
                  ) : (
                    <p className="text-discord-text">{settings.defaultVolume}%</p>
                  )}
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    Max Queue Size
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={settings.maxQueueSize}
                      onChange={(e) => setSettings({ ...settings, maxQueueSize: parseInt(e.target.value) })}
                      className="input"
                    />
                  ) : (
                    <p className="text-discord-text">{settings.maxQueueSize} tracks</p>
                  )}
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    DJ Role
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={settings.djRoleId}
                      onChange={(e) => setSettings({ ...settings, djRoleId: e.target.value })}
                      className="input"
                      placeholder="Role ID"
                    />
                  ) : (
                    <p className="text-discord-text">
                      {settings.djRoleId || <span className="text-discord-muted">Not set</span>}
                    </p>
                  )}
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Music Channel
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={settings.textChannelId}
                      onChange={(e) => setSettings({ ...settings, textChannelId: e.target.value })}
                      className="input"
                      placeholder="Channel ID"
                    />
                  ) : (
                    <p className="text-discord-text">
                      {settings.textChannelId || <span className="text-discord-muted">All channels</span>}
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-discord-lightest pt-4">
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.announceTrack}
                      onChange={(e) => isEditing && setSettings({ ...settings, announceTrack: e.target.checked })}
                      disabled={!isEditing}
                      className="w-4 h-4 rounded border-discord-lightest"
                    />
                    <span className="text-discord-text">Announce when new track plays</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoLeave}
                      onChange={(e) => isEditing && setSettings({ ...settings, autoLeave: e.target.checked })}
                      disabled={!isEditing}
                      className="w-4 h-4 rounded border-discord-lightest"
                    />
                    <span className="text-discord-text">Leave voice channel when queue is empty</span>
                  </label>

                  {settings.autoLeave && (
                    <div className="ml-7">
                      <label className="label flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Wait before leaving (seconds)
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="3600"
                          value={settings.autoLeaveTimeout}
                          onChange={(e) => setSettings({ ...settings, autoLeaveTimeout: parseInt(e.target.value) })}
                          className="input w-32"
                        />
                      ) : (
                        <p className="text-discord-text">{settings.autoLeaveTimeout} seconds</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Server Info */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Server Info
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-discord-muted flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Members
                </span>
                <span className="text-white">{guild.memberCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-discord-muted flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  Queue
                </span>
                <span className="text-white">{queue.length} tracks</span>
              </div>
            </div>
          </div>

          {/* Queue Preview */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Queue</h2>
              <Link
                to={`/music/${botId}/${guildId}`}
                className="text-sm text-discord-primary hover:underline"
              >
                View All
              </Link>
            </div>
            
            {queue.length === 0 ? (
              <p className="text-discord-muted text-sm text-center py-4">Queue is empty</p>
            ) : (
              <div className="space-y-2">
                {queue.slice(0, 5).map((track, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-discord-darker">
                    <span className="text-sm text-discord-muted w-4">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{track.title}</p>
                      <p className="text-xs text-discord-muted truncate">{track.author}</p>
                    </div>
                  </div>
                ))}
                {queue.length > 5 && (
                  <p className="text-sm text-discord-muted text-center pt-2">
                    +{queue.length - 5} more tracks
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GuildDetail
