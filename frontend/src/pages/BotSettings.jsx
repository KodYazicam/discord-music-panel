import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useBotStore } from '../stores/botStore'
import {
  ArrowLeft,
  Bot,
  Settings,
  Save,
  Eye,
  EyeOff,
  Music,
  MessageSquare,
  Shield,
  Palette,
  Bell,
  Zap,
  Globe,
  Volume2,
  Clock,
  Users,
  Hash,
  AlertTriangle,
  Check,
  Info,
  RefreshCw
} from 'lucide-react'

function BotSettings() {
  const { botId } = useParams()
  const navigate = useNavigate()
  const { selectedBot, fetchBot, updateBot, isLoading } = useBotStore()
  
  const [activeTab, setActiveTab] = useState('general')
  const [showToken, setShowToken] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')
  
  const [settings, setSettings] = useState({
    // General Settings
    name: '',
    token: '',
    prefix: '!',
    prefixType: 'text',
    status: 'online',
    activityType: 'LISTENING',
    activityText: 'music | !help',
    
    // Music Settings
    defaultVolume: 100,
    maxVolume: 200,
    maxQueueSize: 500,
    maxTrackDuration: 3600, // seconds (1 hour)
    autoPlay: false,
    autoPlayPlaylist: '',
    defaultLoopMode: 'off',
    announceNowPlaying: true,
    showRequester: true,
    deleteCommandMessages: false,
    
    // Voice Settings
    autoLeave: true,
    autoLeaveDelay: 300, // seconds
    autoLeaveWhenAlone: true,
    autoPause: true,
    leaveOnQueueEnd: false,
    stayInVoice: false,
    
    // DJ Settings
    djEnabled: false,
    djRoleId: '',
    djOnlyCommands: ['stop', 'clear', 'volume', 'shuffle', 'loop'],
    everyoneCanAddTracks: true,
    maxTracksPerUser: 50,
    
    // Embed Settings
    embedColor: '#5865F2',
    showThumbnails: true,
    compactMode: false,
    useButtons: true,
    showProgressBar: true,
    
    // Restrictions
    allowedChannels: [],
    blockedChannels: [],
    allowedRoles: [],
    blockedUsers: [],
    maxUserQueueTracks: 10,
    
    // Advanced
    cacheEnabled: true,
    loggingEnabled: true,
    logChannelId: '',
    errorReporting: true
  })

  useEffect(() => {
    loadBotData()
  }, [botId])

  const loadBotData = async () => {
    const result = await fetchBot(botId)
    if (result.success && result.bot) {
      setSettings(prev => ({
        ...prev,
        name: result.bot.name || '',
        token: result.bot.token || '',
        prefix: result.bot.prefix || '!',
        prefixType: result.bot.prefixType || 'text',
        ...result.bot.settings
      }))
    }
  }

  const handleSave = async () => {
    setSaveError('')
    setSaveSuccess(false)
    
    const result = await updateBot(botId, {
      name: settings.name,
      token: settings.token,
      prefix: settings.prefix,
      prefixType: settings.prefixType,
      settings: settings
    })
    
    if (result.success) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } else {
      setSaveError(result.error || 'Failed to save settings')
    }
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'music', label: 'Music', icon: Music },
    { id: 'voice', label: 'Voice', icon: Volume2 },
    { id: 'dj', label: 'DJ Mode', icon: Shield },
    { id: 'embed', label: 'Embeds', icon: Palette },
    { id: 'restrictions', label: 'Restrictions', icon: Users },
    { id: 'advanced', label: 'Advanced', icon: Zap }
  ]

  const statusOptions = [
    { value: 'online', label: 'Online', color: 'bg-discord-green' },
    { value: 'idle', label: 'Idle', color: 'bg-discord-yellow' },
    { value: 'dnd', label: 'Do Not Disturb', color: 'bg-discord-red' },
    { value: 'invisible', label: 'Invisible', color: 'bg-gray-500' }
  ]

  const activityTypes = [
    { value: 'PLAYING', label: 'Playing' },
    { value: 'STREAMING', label: 'Streaming' },
    { value: 'LISTENING', label: 'Listening to' },
    { value: 'WATCHING', label: 'Watching' },
    { value: 'COMPETING', label: 'Competing in' }
  ]

  const loopModes = [
    { value: 'off', label: 'Off' },
    { value: 'track', label: 'Track' },
    { value: 'queue', label: 'Queue' }
  ]

  const djCommands = [
    'stop', 'clear', 'volume', 'shuffle', 'loop', 'remove', 
    'skip', 'seek', 'pause', 'resume', 'move', 'playnow'
  ]

  if (isLoading && !selectedBot) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-discord-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/bots/${botId}`}
            className="p-2 rounded-lg hover:bg-discord-lightest text-discord-muted hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Bot className="w-6 h-6" />
              Bot Settings
            </h1>
            <p className="text-discord-muted">{settings.name || 'Configure your bot'}</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          className="btn btn-primary flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save All Settings
        </button>
      </div>

      {/* Success/Error Messages */}
      {saveSuccess && (
        <div className="p-3 bg-discord-green/10 border border-discord-green/30 rounded-md text-discord-green text-sm flex items-center gap-2">
          <Check className="w-4 h-4" />
          Settings saved successfully!
        </div>
      )}
      {saveError && (
        <div className="p-3 bg-discord-red/10 border border-discord-red/30 rounded-md text-discord-red text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {saveError}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-56 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-discord-primary text-white'
                  : 'text-discord-muted hover:bg-discord-lightest hover:text-white'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Settings className="w-5 h-5" />
                General Settings
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Bot Name</label>
                  <input
                    type="text"
                    value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                    className="input"
                    placeholder="My Music Bot"
                  />
                </div>

                <div>
                  <label className="label">Bot Token</label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={settings.token}
                      onChange={(e) => setSettings({ ...settings, token: e.target.value })}
                      className="input pr-10"
                      placeholder="Discord bot token"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-discord-muted hover:text-discord-text"
                    >
                      {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-discord-lightest pt-4">
                <label className="label">Prefix Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: 'slash', label: 'Slash Only', desc: 'Only / commands' },
                    { value: 'text', label: 'Text Prefix', desc: 'Custom prefix (!play, .play)' },
                    { value: 'both', label: 'Both', desc: 'Slash and text commands' }
                  ].map((type) => (
                    <label
                      key={type.value}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        settings.prefixType === type.value
                          ? 'border-discord-primary bg-discord-primary/10'
                          : 'border-discord-lightest hover:border-discord-muted'
                      }`}
                    >
                      <input
                        type="radio"
                        name="prefixType"
                        value={type.value}
                        checked={settings.prefixType === type.value}
                        onChange={(e) => setSettings({ ...settings, prefixType: e.target.value })}
                        className="hidden"
                      />
                      <p className="font-medium text-white">{type.label}</p>
                      <p className="text-xs text-discord-muted">{type.desc}</p>
                    </label>
                  ))}
                </div>
              </div>

              {settings.prefixType !== 'slash' && (
                <div>
                  <label className="label">Text Prefix</label>
                  <input
                    type="text"
                    value={settings.prefix}
                    onChange={(e) => setSettings({ ...settings, prefix: e.target.value })}
                    className="input w-32"
                    placeholder="!"
                    maxLength={5}
                  />
                  <p className="text-xs text-discord-muted mt-1">
                    Examples: ! . - m! music. &gt;
                  </p>
                </div>
              )}

              <div className="border-t border-discord-lightest pt-4">
                <h3 className="font-medium text-white mb-3">Bot Presence</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Status</label>
                    <div className="flex gap-2">
                      {statusOptions.map((status) => (
                        <button
                          key={status.value}
                          onClick={() => setSettings({ ...settings, status: status.value })}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                            settings.status === status.value
                              ? 'border-discord-primary bg-discord-primary/10'
                              : 'border-discord-lightest hover:border-discord-muted'
                          }`}
                        >
                          <div className={`w-3 h-3 rounded-full ${status.color}`} />
                          <span className="text-sm text-discord-text">{status.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label">Activity Type</label>
                    <select
                      value={settings.activityType}
                      onChange={(e) => setSettings({ ...settings, activityType: e.target.value })}
                      className="input"
                    >
                      {activityTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="label">Activity Text</label>
                  <input
                    type="text"
                    value={settings.activityText}
                    onChange={(e) => setSettings({ ...settings, activityText: e.target.value })}
                    className="input"
                    placeholder="music | !help"
                  />
                  <p className="text-xs text-discord-muted mt-1">
                    Use {'{servers}'} for server count, {'{users}'} for user count
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Music Settings */}
          {activeTab === 'music' && (
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Music className="w-5 h-5" />
                Music Settings
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Default Volume</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.defaultVolume}
                      onChange={(e) => setSettings({ ...settings, defaultVolume: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-discord-text w-12">{settings.defaultVolume}%</span>
                  </div>
                </div>

                <div>
                  <label className="label">Max Volume</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="100"
                      max="300"
                      value={settings.maxVolume}
                      onChange={(e) => setSettings({ ...settings, maxVolume: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-discord-text w-12">{settings.maxVolume}%</span>
                  </div>
                </div>

                <div>
                  <label className="label">Max Queue Size</label>
                  <input
                    type="number"
                    min="10"
                    max="10000"
                    value={settings.maxQueueSize}
                    onChange={(e) => setSettings({ ...settings, maxQueueSize: parseInt(e.target.value) })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Max Track Duration (seconds)</label>
                  <input
                    type="number"
                    min="60"
                    max="36000"
                    value={settings.maxTrackDuration}
                    onChange={(e) => setSettings({ ...settings, maxTrackDuration: parseInt(e.target.value) })}
                    className="input"
                  />
                  <p className="text-xs text-discord-muted mt-1">
                    {Math.floor(settings.maxTrackDuration / 3600)}h {Math.floor((settings.maxTrackDuration % 3600) / 60)}m
                  </p>
                </div>
              </div>

              <div>
                <label className="label">Default Loop Mode</label>
                <div className="flex gap-2">
                  {loopModes.map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => setSettings({ ...settings, defaultLoopMode: mode.value })}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        settings.defaultLoopMode === mode.value
                          ? 'border-discord-primary bg-discord-primary/10 text-white'
                          : 'border-discord-lightest text-discord-muted hover:border-discord-muted'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-discord-lightest pt-4 space-y-3">
                <h3 className="font-medium text-white mb-3">Playback Options</h3>
                
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-discord-text">Auto Play</span>
                    <p className="text-xs text-discord-muted">Automatically play related tracks when queue ends</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoPlay}
                    onChange={(e) => setSettings({ ...settings, autoPlay: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-discord-text">Announce Now Playing</span>
                    <p className="text-xs text-discord-muted">Send message when new track starts</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.announceNowPlaying}
                    onChange={(e) => setSettings({ ...settings, announceNowPlaying: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-discord-text">Show Requester</span>
                    <p className="text-xs text-discord-muted">Display who requested the track</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showRequester}
                    onChange={(e) => setSettings({ ...settings, showRequester: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-discord-text">Delete Command Messages</span>
                    <p className="text-xs text-discord-muted">Automatically delete command messages</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.deleteCommandMessages}
                    onChange={(e) => setSettings({ ...settings, deleteCommandMessages: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Voice Settings */}
          {activeTab === 'voice' && (
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                Voice Settings
              </h2>

              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-discord-text">Auto Leave</span>
                    <p className="text-xs text-discord-muted">Leave voice channel when queue ends</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoLeave}
                    onChange={(e) => setSettings({ ...settings, autoLeave: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>

                {settings.autoLeave && (
                  <div className="ml-4 pl-4 border-l-2 border-discord-lightest">
                    <label className="label">Leave Delay (seconds)</label>
                    <input
                      type="number"
                      min="0"
                      max="3600"
                      value={settings.autoLeaveDelay}
                      onChange={(e) => setSettings({ ...settings, autoLeaveDelay: parseInt(e.target.value) })}
                      className="input w-32"
                    />
                    <p className="text-xs text-discord-muted mt-1">
                      Wait this long before leaving
                    </p>
                  </div>
                )}

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-discord-text">Auto Leave When Alone</span>
                    <p className="text-xs text-discord-muted">Leave when everyone else leaves the channel</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoLeaveWhenAlone}
                    onChange={(e) => setSettings({ ...settings, autoLeaveWhenAlone: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-discord-text">Auto Pause When Alone</span>
                    <p className="text-xs text-discord-muted">Pause playback when alone in channel</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoPause}
                    onChange={(e) => setSettings({ ...settings, autoPause: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-discord-text">Stay in Voice (24/7 Mode)</span>
                    <p className="text-xs text-discord-muted">Never leave the voice channel automatically</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.stayInVoice}
                    onChange={(e) => setSettings({ ...settings, stayInVoice: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>
              </div>
            </div>
          )}

          {/* DJ Mode Settings */}
          {activeTab === 'dj' && (
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Shield className="w-5 h-5" />
                DJ Mode Settings
              </h2>

              <div className="p-4 bg-discord-darker rounded-lg flex items-start gap-3">
                <Info className="w-5 h-5 text-discord-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-discord-text">
                  DJ Mode restricts certain commands to users with the DJ role. 
                  This is useful for public servers to prevent abuse.
                </p>
              </div>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-discord-text font-medium">Enable DJ Mode</span>
                  <p className="text-xs text-discord-muted">Restrict certain commands to DJ role</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.djEnabled}
                  onChange={(e) => setSettings({ ...settings, djEnabled: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
              </label>

              {settings.djEnabled && (
                <>
                  <div>
                    <label className="label">DJ Role ID</label>
                    <input
                      type="text"
                      value={settings.djRoleId}
                      onChange={(e) => setSettings({ ...settings, djRoleId: e.target.value })}
                      className="input"
                      placeholder="Enter role ID"
                    />
                    <p className="text-xs text-discord-muted mt-1">
                      Enable Developer Mode in Discord to copy role IDs
                    </p>
                  </div>

                  <div>
                    <label className="label">DJ Only Commands</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {djCommands.map((cmd) => (
                        <label
                          key={cmd}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                            settings.djOnlyCommands.includes(cmd)
                              ? 'border-discord-primary bg-discord-primary/10'
                              : 'border-discord-lightest hover:border-discord-muted'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={settings.djOnlyCommands.includes(cmd)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSettings({ ...settings, djOnlyCommands: [...settings.djOnlyCommands, cmd] })
                              } else {
                                setSettings({ ...settings, djOnlyCommands: settings.djOnlyCommands.filter(c => c !== cmd) })
                              }
                            }}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm text-discord-text">{cmd}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-discord-lightest pt-4 space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <span className="text-discord-text">Everyone Can Add Tracks</span>
                        <p className="text-xs text-discord-muted">Allow non-DJs to use play command</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.everyoneCanAddTracks}
                        onChange={(e) => setSettings({ ...settings, everyoneCanAddTracks: e.target.checked })}
                        className="w-5 h-5 rounded"
                      />
                    </label>

                    <div>
                      <label className="label">Max Tracks Per User</label>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={settings.maxTracksPerUser}
                        onChange={(e) => setSettings({ ...settings, maxTracksPerUser: parseInt(e.target.value) })}
                        className="input w-32"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Embed Settings */}
          {activeTab === 'embed' && (
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Embed Settings
              </h2>

              <div>
                <label className="label">Embed Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.embedColor}
                    onChange={(e) => setSettings({ ...settings, embedColor: e.target.value })}
                    className="w-12 h-10 rounded border border-discord-lightest cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.embedColor}
                    onChange={(e) => setSettings({ ...settings, embedColor: e.target.value })}
                    className="input w-32"
                    placeholder="#5865F2"
                  />
                  <div className="flex gap-1">
                    {['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setSettings({ ...settings, embedColor: color })}
                        className="w-8 h-8 rounded border-2 border-transparent hover:border-white transition-colors"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-discord-text">Show Thumbnails</span>
                    <p className="text-xs text-discord-muted">Display track artwork in embeds</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showThumbnails}
                    onChange={(e) => setSettings({ ...settings, showThumbnails: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-discord-text">Compact Mode</span>
                    <p className="text-xs text-discord-muted">Use smaller, minimalist embeds</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.compactMode}
                    onChange={(e) => setSettings({ ...settings, compactMode: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-discord-text">Use Buttons</span>
                    <p className="text-xs text-discord-muted">Add interactive buttons to now playing messages</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.useButtons}
                    onChange={(e) => setSettings({ ...settings, useButtons: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-discord-text">Show Progress Bar</span>
                    <p className="text-xs text-discord-muted">Display track progress in now playing</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showProgressBar}
                    onChange={(e) => setSettings({ ...settings, showProgressBar: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Restrictions Settings */}
          {activeTab === 'restrictions' && (
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Restrictions
              </h2>

              <div className="p-4 bg-discord-darker rounded-lg flex items-start gap-3">
                <Info className="w-5 h-5 text-discord-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-discord-text">
                  Enter IDs separated by commas. Enable Developer Mode in Discord settings to copy IDs.
                </p>
              </div>

              <div>
                <label className="label flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Allowed Channels (whitelist)
                </label>
                <input
                  type="text"
                  value={settings.allowedChannels.join(', ')}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    allowedChannels: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  className="input"
                  placeholder="Leave empty to allow all channels"
                />
              </div>

              <div>
                <label className="label flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Blocked Channels (blacklist)
                </label>
                <input
                  type="text"
                  value={settings.blockedChannels.join(', ')}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    blockedChannels: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  className="input"
                  placeholder="Channel IDs to block"
                />
              </div>

              <div>
                <label className="label flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Allowed Roles (whitelist)
                </label>
                <input
                  type="text"
                  value={settings.allowedRoles.join(', ')}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    allowedRoles: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  className="input"
                  placeholder="Leave empty to allow all roles"
                />
              </div>

              <div>
                <label className="label flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Blocked Users
                </label>
                <input
                  type="text"
                  value={settings.blockedUsers.join(', ')}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    blockedUsers: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  className="input"
                  placeholder="User IDs to block"
                />
              </div>

              <div>
                <label className="label">Max Queue Tracks Per User</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.maxUserQueueTracks}
                  onChange={(e) => setSettings({ ...settings, maxUserQueueTracks: parseInt(e.target.value) })}
                  className="input w-32"
                />
                <p className="text-xs text-discord-muted mt-1">
                  Maximum tracks a single user can add to queue
                </p>
              </div>
            </div>
          )}

          {/* Advanced Settings */}
          {activeTab === 'advanced' && (
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Advanced Settings
              </h2>

              <div className="p-4 bg-discord-yellow/10 border border-discord-yellow/30 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-discord-yellow flex-shrink-0 mt-0.5" />
                <p className="text-sm text-discord-text">
                  These settings are for advanced users. Incorrect configuration may affect bot performance.
                </p>
              </div>

              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-discord-text">Enable Caching</span>
                    <p className="text-xs text-discord-muted">Cache track data for faster responses</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.cacheEnabled}
                    onChange={(e) => setSettings({ ...settings, cacheEnabled: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-discord-text">Enable Logging</span>
                    <p className="text-xs text-discord-muted">Log bot activities to a channel</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.loggingEnabled}
                    onChange={(e) => setSettings({ ...settings, loggingEnabled: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>

                {settings.loggingEnabled && (
                  <div className="ml-4 pl-4 border-l-2 border-discord-lightest">
                    <label className="label">Log Channel ID</label>
                    <input
                      type="text"
                      value={settings.logChannelId}
                      onChange={(e) => setSettings({ ...settings, logChannelId: e.target.value })}
                      className="input"
                      placeholder="Channel ID for logs"
                    />
                  </div>
                )}

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-discord-text">Error Reporting</span>
                    <p className="text-xs text-discord-muted">Show detailed error messages to users</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.errorReporting}
                    onChange={(e) => setSettings({ ...settings, errorReporting: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BotSettings
