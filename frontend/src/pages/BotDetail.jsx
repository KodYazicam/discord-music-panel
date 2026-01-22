import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useBotStore } from '../stores/botStore'
import {
  Bot,
  ArrowLeft,
  Play,
  Square,
  RefreshCw,
  Server,
  Music,
  Settings,
  Save,
  Eye,
  EyeOff,
  Trash2,
  Activity,
  Sliders
} from 'lucide-react'

function BotDetail() {
  const { botId } = useParams()
  const navigate = useNavigate()
  const { selectedBot, fetchBot, updateBot, deleteBot, startBot, stopBot, restartBot, fetchBotGuilds, isLoading } = useBotStore()
  
  const [guilds, setGuilds] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editData, setEditData] = useState({
    name: '',
    token: '',
    prefix: '',
    prefixType: 'text'
  })
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    loadBotData()
  }, [botId])

  const loadBotData = async () => {
    const result = await fetchBot(botId)
    if (result.success) {
      setEditData({
        name: result.bot.name,
        token: result.bot.token,
        prefix: result.bot.prefix,
        prefixType: result.bot.prefixType
      })
      
      const guildsResult = await fetchBotGuilds(botId)
      if (guildsResult.success) {
        setGuilds(guildsResult.guilds)
      }
    }
  }

  const handleSave = async () => {
    setSaveError('')
    setSaveSuccess(false)
    
    const result = await updateBot(botId, editData)
    
    if (result.success) {
      setSaveSuccess(true)
      setIsEditing(false)
      setTimeout(() => setSaveSuccess(false), 3000)
    } else {
      setSaveError(result.error)
    }
  }

  const handleDelete = async () => {
    const result = await deleteBot(botId)
    if (result.success) {
      navigate('/bots')
    }
  }

  const handleAction = async (action) => {
    switch (action) {
      case 'start':
        await startBot(botId)
        break
      case 'stop':
        await stopBot(botId)
        break
      case 'restart':
        await restartBot(botId)
        break
    }
    await fetchBot(botId)
  }

  if (isLoading && !selectedBot) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-discord-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!selectedBot) {
    return (
      <div className="text-center py-12">
        <Bot className="w-16 h-16 text-discord-muted mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Bot not found</h2>
        <Link to="/bots" className="btn btn-primary">
          Back to Bots
        </Link>
      </div>
    )
  }

  const prefixTypes = [
    { value: 'slash', label: 'Slash (/)' },
    { value: 'text', label: 'Text Prefix' },
    { value: 'both', label: 'Both' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/bots"
          className="p-2 rounded-lg hover:bg-discord-lightest text-discord-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{selectedBot.name}</h1>
          <span className={`badge ${selectedBot.status === 'online' ? 'badge-online' : 'badge-offline'}`}>
            {selectedBot.status === 'online' ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/bots/${botId}/settings`}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Sliders className="w-4 h-4" />
            Advanced Settings
          </Link>
          {selectedBot.status === 'online' ? (
            <>
              <button
                onClick={() => handleAction('stop')}
                className="btn btn-secondary flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
              <button
                onClick={() => handleAction('restart')}
                className="btn btn-secondary flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Restart
              </button>
            </>
          ) : (
            <button
              onClick={() => handleAction('start')}
              className="btn btn-primary flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          )}
        </div>
      </div>

      {/* Success/Error Messages */}
      {saveSuccess && (
        <div className="p-3 bg-discord-green/10 border border-discord-green/30 rounded-md text-discord-green text-sm">
          Bot updated successfully
        </div>
      )}
      {saveError && (
        <div className="p-3 bg-discord-red/10 border border-discord-red/30 rounded-md text-discord-red text-sm">
          {saveError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bot Settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Bot Settings
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
                    onClick={() => {
                      setIsEditing(false)
                      setEditData({
                        name: selectedBot.name,
                        token: selectedBot.token,
                        prefix: selectedBot.prefix,
                        prefixType: selectedBot.prefixType
                      })
                    }}
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
              <div>
                <label className="label">Bot Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="input"
                  />
                ) : (
                  <p className="text-discord-text">{selectedBot.name}</p>
                )}
              </div>

              <div>
                <label className="label">Bot Token</label>
                {isEditing ? (
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={editData.token}
                      onChange={(e) => setEditData({ ...editData, token: e.target.value })}
                      className="input pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-discord-muted hover:text-discord-text"
                    >
                      {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                ) : (
                  <p className="text-discord-text font-mono">••••••••••••••••</p>
                )}
              </div>

              <div>
                <label className="label">Prefix Type</label>
                {isEditing ? (
                  <select
                    value={editData.prefixType}
                    onChange={(e) => setEditData({ ...editData, prefixType: e.target.value })}
                    className="input"
                  >
                    {prefixTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-discord-text">
                    {prefixTypes.find(t => t.value === selectedBot.prefixType)?.label}
                  </p>
                )}
              </div>

              {(isEditing ? editData.prefixType !== 'slash' : selectedBot.prefixType !== 'slash') && (
                <div>
                  <label className="label">Prefix</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.prefix}
                      onChange={(e) => setEditData({ ...editData, prefix: e.target.value })}
                      className="input"
                      maxLength={5}
                    />
                  ) : (
                    <code className="bg-discord-darker px-2 py-1 rounded text-discord-text">
                      {selectedBot.prefix}
                    </code>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="card border border-discord-red/30">
            <h2 className="text-lg font-semibold text-discord-red mb-4">Danger Zone</h2>
            <p className="text-discord-muted text-sm mb-4">
              Deleting this bot will remove all its settings and statistics. This action cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn btn-danger flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Bot
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Statistics
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-discord-muted">Servers</span>
                <span className="font-semibold text-white">{guilds.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-discord-muted">Tracks Played</span>
                <span className="font-semibold text-white">{selectedBot.stats?.tracksPlayed || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-discord-muted">Total Playtime</span>
                <span className="font-semibold text-white">{selectedBot.stats?.totalPlaytime || '0h'}</span>
              </div>
            </div>
          </div>

          {/* Guilds */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Server className="w-5 h-5" />
              Servers ({guilds.length})
            </h2>
            {guilds.length === 0 ? (
              <p className="text-discord-muted text-sm text-center py-4">
                {selectedBot.status === 'online' ? 'No servers yet' : 'Bot is offline'}
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {guilds.map((guild) => (
                  <Link
                    key={guild.id}
                    to={`/music/${botId}/${guild.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-discord-lightest transition-colors"
                  >
                    {guild.icon ? (
                      <img
                        src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                        alt={guild.name}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-discord-primary flex items-center justify-center text-white text-sm font-medium">
                        {guild.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{guild.name}</p>
                      <p className="text-xs text-discord-muted">{guild.memberCount} members</p>
                    </div>
                    <Music className="w-4 h-4 text-discord-muted" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-2">Delete Bot</h2>
            <p className="text-discord-muted mb-6">
              Are you sure you want to delete <strong className="text-white">{selectedBot.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-danger flex-1"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BotDetail
