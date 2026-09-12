import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBotStore } from '../stores/botStore'
import {
  Bot,
  Plus,
  Search,
  MoreVertical,
  Play,
  Square,
  RefreshCw,
  Trash2,
  Edit,
  Server,
  X
} from 'lucide-react'

function Bots() {
  const { bots, fetchBots, createBot, deleteBot, startBot, stopBot, restartBot, isLoading } = useBotStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(null)
  const [activeMenu, setActiveMenu] = useState(null)
  const [newBot, setNewBot] = useState({
    name: '',
    token: '',
    clientId: '',
    prefix: '!',
    prefixType: 'text'
  })
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    fetchBots()
  }, [fetchBots])

  const filteredBots = bots.filter(bot => 
    bot.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreateBot = async (e) => {
    e.preventDefault()
    setCreateError('')

    if (!newBot.name || !newBot.token) {
      setCreateError('Bot name and token are required')
      return
    }

    const result = await createBot(newBot)
    
    if (result.success) {
      setShowCreateModal(false)
      setNewBot({ name: '', token: '', clientId: '', prefix: '!', prefixType: 'text' })
    } else {
      setCreateError(result.error)
    }
  }

  const handleDeleteBot = async (botId) => {
    await deleteBot(botId)
    setShowDeleteModal(null)
  }

  const handleAction = async (action, botId) => {
    setActiveMenu(null)
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
      case 'delete':
        setShowDeleteModal(botId)
        break
    }
  }

  const prefixTypes = [
    { value: 'slash', label: 'Slash (/) Commands', description: 'Only / commands are used' },
    { value: 'text', label: 'Text Prefix', description: 'Custom prefix message commands (!, ., etc.)' },
    { value: 'both', label: 'Both', description: 'Both slash and text commands' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Bots</h1>
          <p className="text-discord-muted">Manage your music bots</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Bot
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-discord-muted" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search bots..."
          className="input pl-10"
        />
      </div>

      {/* Bot List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-discord-primary border-t-transparent"></div>
        </div>
      ) : filteredBots.length === 0 ? (
        <div className="card text-center py-12">
          <Bot className="w-16 h-16 text-discord-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            {searchTerm ? 'No bots found' : 'No bots added yet'}
          </h3>
          <p className="text-discord-muted mb-4">
            {searchTerm ? 'Try a different search' : 'Get started by adding your first bot'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              Add Bot
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBots.map((bot) => (
            <div key={bot.id} className="card relative">
              {/* Menu Button */}
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setActiveMenu(activeMenu === bot.id ? null : bot.id)}
                  className="p-1 rounded hover:bg-discord-lightest text-discord-muted hover:text-white"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {/* Dropdown Menu */}
                {activeMenu === bot.id && (
                  <>
                    <div 
                      className="fixed inset-0 z-10"
                      onClick={() => setActiveMenu(null)}
                    />
                    <div className="absolute right-0 mt-1 w-48 bg-discord-darker rounded-md shadow-lg z-20 py-1">
                      {bot.status === 'online' ? (
                        <>
                          <button
                            onClick={() => handleAction('stop', bot.id)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-discord-text hover:bg-discord-lightest"
                          >
                            <Square className="w-4 h-4" />
                            Stop
                          </button>
                          <button
                            onClick={() => handleAction('restart', bot.id)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-discord-text hover:bg-discord-lightest"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Restart
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleAction('start', bot.id)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-discord-text hover:bg-discord-lightest"
                        >
                          <Play className="w-4 h-4" />
                          Start
                        </button>
                      )}
                      <Link
                        to={`/bots/${bot.id}`}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-discord-text hover:bg-discord-lightest"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Link>
                      <button
                        onClick={() => handleAction('delete', bot.id)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-discord-red hover:bg-discord-lightest"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Bot Info */}
              <Link to={`/bots/${bot.id}`} className="block">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-discord-primary flex items-center justify-center">
                    <Bot className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{bot.name}</h3>
                    <span className={`badge ${bot.status === 'online' ? 'badge-online' : 'badge-offline'}`}>
                      {bot.status === 'online' ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-discord-muted">Prefix Type</span>
                    <span className="text-discord-text">
                      {bot.prefixType === 'slash' ? 'Slash (/)' : 
                       bot.prefixType === 'text' ? 'Text' : 'Both'}
                    </span>
                  </div>
                  {bot.prefixType !== 'slash' && (
                    <div className="flex items-center justify-between">
                      <span className="text-discord-muted">Prefix</span>
                      <code className="bg-discord-darker px-2 py-1 rounded text-discord-text">
                        {bot.prefix}
                      </code>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-discord-muted">Servers</span>
                    <div className="flex items-center gap-1 text-discord-text">
                      <Server className="w-4 h-4" />
                      {bot.guildCount || 0}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Create Bot Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Add New Bot</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-discord-muted hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 bg-discord-red/10 border border-discord-red/30 rounded-md text-discord-red text-sm">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateBot} className="space-y-4">
              <div>
                <label className="label">Bot Name</label>
                <input
                  type="text"
                  value={newBot.name}
                  onChange={(e) => setNewBot({ ...newBot, name: e.target.value })}
                  className="input"
                  placeholder="Music Bot 1"
                  required
                />
              </div>

              <div>
                <label className="label">Bot Token</label>
                <input
                  type="password"
                  value={newBot.token}
                  onChange={(e) => setNewBot({ ...newBot, token: e.target.value })}
                  className="input"
                  placeholder="Discord bot token"
                  required
                />
                <p className="text-xs text-discord-muted mt-1">
                  Get this from Discord Developer Portal. Client ID is derived from the token if left blank.
                </p>
              </div>

              <div>
                <label className="label">Application / Client ID (optional)</label>
                <input
                  type="text"
                  value={newBot.clientId}
                  onChange={(e) => setNewBot({ ...newBot, clientId: e.target.value })}
                  className="input"
                  placeholder="Leave empty to detect from token"
                />
              </div>

              <div>
                <label className="label">Prefix Type</label>
                <div className="space-y-2">
                  {prefixTypes.map((type) => (
                    <label
                      key={type.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        newBot.prefixType === type.value
                          ? 'border-discord-primary bg-discord-primary/10'
                          : 'border-discord-lightest hover:border-discord-muted'
                      }`}
                    >
                      <input
                        type="radio"
                        name="prefixType"
                        value={type.value}
                        checked={newBot.prefixType === type.value}
                        onChange={(e) => setNewBot({ ...newBot, prefixType: e.target.value })}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium text-white">{type.label}</p>
                        <p className="text-sm text-discord-muted">{type.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {newBot.prefixType !== 'slash' && (
                <div>
                  <label className="label">Prefix</label>
                  <input
                    type="text"
                    value={newBot.prefix}
                    onChange={(e) => setNewBot({ ...newBot, prefix: e.target.value })}
                    className="input"
                    placeholder="!"
                    maxLength={5}
                  />
                  <p className="text-xs text-discord-muted mt-1">
                    Example: !, ., -, m!, music.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-2">Delete Bot</h2>
            <p className="text-discord-muted mb-6">
              Are you sure you want to delete this bot? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteBot(showDeleteModal)}
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

export default Bots
