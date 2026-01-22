import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useBotStore } from '../stores/botStore'
import {
  ArrowLeft,
  Server,
  Settings,
  Save,
  Music,
  MessageSquare,
  Shield,
  Volume2,
  Clock,
  Users,
  Hash,
  Check,
  Info,
  AlertTriangle,
  Bell,
  Mic,
  Languages,
  Palette
} from 'lucide-react'

function GuildSettings() {
  const { botId, guildId } = useParams()
  const { selectedBot, fetchBot, fetchBotGuilds } = useBotStore()
  
  const [guild, setGuild] = useState(null)
  const [activeTab, setActiveTab] = useState('general')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  
  const [settings, setSettings] = useState({
    // General Settings
    enabled: true,
    language: 'en',
    timezone: 'UTC',
    
    // Music Settings
    defaultVolume: 100,
    maxVolume: 200,
    maxQueueSize: 200,
    maxTrackDuration: 1800,
    allowPlaylists: true,
    maxPlaylistSize: 50,
    allowLiveStreams: false,
    announceNowPlaying: true,
    announceChannelId: '',
    showRequester: true,
    voteSkipEnabled: false,
    voteSkipPercentage: 50,
    
    // Voice Settings
    autoLeave: true,
    autoLeaveDelay: 300,
    autoPause: true,
    defaultVoiceChannel: '',
    
    // DJ Mode
    djEnabled: false,
    djRoleId: '',
    djOnlyCommands: ['stop', 'clear', 'volume', 'shuffle'],
    
    // Channel Restrictions
    allowedTextChannels: [],
    allowedVoiceChannels: [],
    blockedTextChannels: [],
    
    // Role Restrictions
    allowedRoles: [],
    blockedRoles: [],
    
    // User Restrictions
    blockedUsers: [],
    maxTracksPerUser: 10,
    
    // Response Settings
    embedColor: '#5865F2',
    showThumbnails: true,
    compactMode: false,
    deleteCommandMessages: false,
    deleteCommandDelay: 5,
    useButtons: true,
    
    // Welcome Message
    welcomeMessageEnabled: false,
    welcomeMessage: 'Hello! I\'m your music bot. Use {prefix}help to see commands.',
    
    // Auto-DJ
    autoDjEnabled: false,
    autoDjPlaylist: '',
    autoDjShuffled: true
  })

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
      if (foundGuild?.settings) {
        setSettings(prev => ({ ...prev, ...foundGuild.settings }))
      }
    }
    setIsLoading(false)
  }

  const handleSave = async () => {
    setSaveError('')
    setSaveSuccess(false)
    
    // API call would go here
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'music', label: 'Music', icon: Music },
    { id: 'voice', label: 'Voice', icon: Mic },
    { id: 'dj', label: 'DJ Mode', icon: Shield },
    { id: 'channels', label: 'Channels', icon: Hash },
    { id: 'roles', label: 'Roles', icon: Users },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'autodj', label: 'Auto-DJ', icon: Bell }
  ]

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'tr', label: 'Türkçe' },
    { value: 'de', label: 'Deutsch' },
    { value: 'fr', label: 'Français' },
    { value: 'es', label: 'Español' },
    { value: 'pt', label: 'Português' },
    { value: 'ru', label: 'Русский' },
    { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한국어' },
    { value: 'zh', label: '中文' }
  ]

  const timezones = [
    'UTC', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Istanbul',
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore', 'Australia/Sydney'
  ]

  const djCommands = [
    'stop', 'clear', 'volume', 'shuffle', 'loop', 'remove', 
    'skip', 'seek', 'pause', 'resume', 'move', 'playnow', 'filter'
  ]

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/guilds/${botId}/${guildId}`}
            className="p-2 rounded-lg hover:bg-discord-lightest text-discord-muted hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            {guild.icon ? (
              <img
                src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                alt={guild.name}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-discord-primary flex items-center justify-center text-white font-bold">
                {guild.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">Server Settings</h1>
              <p className="text-discord-muted">{guild.name}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleSave}
          className="btn btn-primary flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Settings
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
        <div className="lg:w-48 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
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

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-discord-text font-medium">Enable Bot for this Server</span>
                  <p className="text-xs text-discord-muted">Turn off to disable all bot functionality</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label flex items-center gap-2">
                    <Languages className="w-4 h-4" />
                    Language
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                    className="input"
                  >
                    {languages.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Timezone
                  </label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                    className="input"
                  >
                    {timezones.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
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
                    max="1000"
                    value={settings.maxQueueSize}
                    onChange={(e) => setSettings({ ...settings, maxQueueSize: parseInt(e.target.value) })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Max Track Duration (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="600"
                    value={Math.floor(settings.maxTrackDuration / 60)}
                    onChange={(e) => setSettings({ ...settings, maxTrackDuration: parseInt(e.target.value) * 60 })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Max Playlist Size</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={settings.maxPlaylistSize}
                    onChange={(e) => setSettings({ ...settings, maxPlaylistSize: parseInt(e.target.value) })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Max Tracks Per User</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.maxTracksPerUser}
                    onChange={(e) => setSettings({ ...settings, maxTracksPerUser: parseInt(e.target.value) })}
                    className="input"
                  />
                </div>
              </div>

              <div className="border-t border-discord-lightest pt-4 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-discord-text">Allow Playlists</span>
                    <p className="text-xs text-discord-muted">Allow users to add entire playlists to queue</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.allowPlaylists}
                    onChange={(e) => setSettings({ ...settings, allowPlaylists: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-discord-text">Allow Live Streams</span>
                    <p className="text-xs text-discord-muted">Allow playing YouTube live streams</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.allowLiveStreams}
                    onChange={(e) => setSettings({ ...settings, allowLiveStreams: e.target.checked })}
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

                {settings.announceNowPlaying && (
                  <div className="ml-4 pl-4 border-l-2 border-discord-lightest">
                    <label className="label">Announce Channel ID (optional)</label>
                    <input
                      type="text"
                      value={settings.announceChannelId}
                      onChange={(e) => setSettings({ ...settings, announceChannelId: e.target.value })}
                      className="input"
                      placeholder="Leave empty for command channel"
                    />
                  </div>
                )}

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-discord-text">Vote Skip</span>
                    <p className="text-xs text-discord-muted">Require votes to skip tracks</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.voteSkipEnabled}
                    onChange={(e) => setSettings({ ...settings, voteSkipEnabled: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>

                {settings.voteSkipEnabled && (
                  <div className="ml-4 pl-4 border-l-2 border-discord-lightest">
                    <label className="label">Vote Skip Percentage</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={settings.voteSkipPercentage}
                        onChange={(e) => setSettings({ ...settings, voteSkipPercentage: parseInt(e.target.value) })}
                        className="flex-1"
                      />
                      <span className="text-discord-text w-12">{settings.voteSkipPercentage}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Voice Settings */}
          {activeTab === 'voice' && (
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Mic className="w-5 h-5" />
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
                  </div>
                )}

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

                <div>
                  <label className="label">Default Voice Channel ID (optional)</label>
                  <input
                    type="text"
                    value={settings.defaultVoiceChannel}
                    onChange={(e) => setSettings({ ...settings, defaultVoiceChannel: e.target.value })}
                    className="input"
                    placeholder="Bot will join this channel on startup"
                  />
                </div>
              </div>
            </div>
          )}

          {/* DJ Mode */}
          {activeTab === 'dj' && (
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Shield className="w-5 h-5" />
                DJ Mode
              </h2>

              <div className="p-4 bg-discord-darker rounded-lg flex items-start gap-3">
                <Info className="w-5 h-5 text-discord-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-discord-text">
                  DJ Mode restricts certain commands to users with the DJ role. 
                  Great for public servers to prevent abuse.
                </p>
              </div>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-discord-text font-medium">Enable DJ Mode</span>
                  <p className="text-xs text-discord-muted">Restrict commands to DJ role</p>
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
                </>
              )}
            </div>
          )}

          {/* Channel Restrictions */}
          {activeTab === 'channels' && (
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Channel Restrictions
              </h2>

              <div className="p-4 bg-discord-darker rounded-lg flex items-start gap-3">
                <Info className="w-5 h-5 text-discord-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-discord-text">
                  Enter channel IDs separated by commas. Enable Developer Mode in Discord to copy IDs.
                </p>
              </div>

              <div>
                <label className="label">Allowed Text Channels (whitelist)</label>
                <input
                  type="text"
                  value={settings.allowedTextChannels.join(', ')}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    allowedTextChannels: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  className="input"
                  placeholder="Leave empty to allow all text channels"
                />
              </div>

              <div>
                <label className="label">Blocked Text Channels (blacklist)</label>
                <input
                  type="text"
                  value={settings.blockedTextChannels.join(', ')}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    blockedTextChannels: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  className="input"
                  placeholder="Channel IDs to block"
                />
              </div>

              <div>
                <label className="label">Allowed Voice Channels (whitelist)</label>
                <input
                  type="text"
                  value={settings.allowedVoiceChannels.join(', ')}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    allowedVoiceChannels: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  className="input"
                  placeholder="Leave empty to allow all voice channels"
                />
              </div>
            </div>
          )}

          {/* Role Restrictions */}
          {activeTab === 'roles' && (
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Role & User Restrictions
              </h2>

              <div className="p-4 bg-discord-darker rounded-lg flex items-start gap-3">
                <Info className="w-5 h-5 text-discord-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-discord-text">
                  Enter IDs separated by commas. Whitelist takes priority over blacklist.
                </p>
              </div>

              <div>
                <label className="label">Allowed Roles (whitelist)</label>
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
                <label className="label">Blocked Roles (blacklist)</label>
                <input
                  type="text"
                  value={settings.blockedRoles.join(', ')}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    blockedRoles: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  className="input"
                  placeholder="Role IDs to block"
                />
              </div>

              <div>
                <label className="label">Blocked Users</label>
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
            </div>
          )}

          {/* Appearance */}
          {activeTab === 'appearance' && (
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Appearance Settings
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
                  />
                  <div className="flex gap-1">
                    {['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245', '#9B59B6'].map((color) => (
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
                    <p className="text-xs text-discord-muted">Display track artwork</p>
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
                    <p className="text-xs text-discord-muted">Use smaller embeds</p>
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
                    <p className="text-xs text-discord-muted">Add interactive buttons to messages</p>
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
                    <span className="text-discord-text">Delete Command Messages</span>
                    <p className="text-xs text-discord-muted">Auto-delete user commands</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.deleteCommandMessages}
                    onChange={(e) => setSettings({ ...settings, deleteCommandMessages: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>

                {settings.deleteCommandMessages && (
                  <div className="ml-4 pl-4 border-l-2 border-discord-lightest">
                    <label className="label">Delete Delay (seconds)</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={settings.deleteCommandDelay}
                      onChange={(e) => setSettings({ ...settings, deleteCommandDelay: parseInt(e.target.value) })}
                      className="input w-24"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Auto-DJ */}
          {activeTab === 'autodj' && (
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Auto-DJ Settings
              </h2>

              <div className="p-4 bg-discord-darker rounded-lg flex items-start gap-3">
                <Info className="w-5 h-5 text-discord-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-discord-text">
                  Auto-DJ will automatically play music from a playlist when the queue is empty.
                </p>
              </div>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-discord-text font-medium">Enable Auto-DJ</span>
                  <p className="text-xs text-discord-muted">Play music automatically when queue ends</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoDjEnabled}
                  onChange={(e) => setSettings({ ...settings, autoDjEnabled: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
              </label>

              {settings.autoDjEnabled && (
                <>
                  <div>
                    <label className="label">Auto-DJ Playlist URL</label>
                    <input
                      type="text"
                      value={settings.autoDjPlaylist}
                      onChange={(e) => setSettings({ ...settings, autoDjPlaylist: e.target.value })}
                      className="input"
                      placeholder="YouTube/Spotify playlist URL"
                    />
                  </div>

                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-discord-text">Shuffle Auto-DJ</span>
                      <p className="text-xs text-discord-muted">Randomly select tracks from playlist</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoDjShuffled}
                      onChange={(e) => setSettings({ ...settings, autoDjShuffled: e.target.checked })}
                      className="w-5 h-5 rounded"
                    />
                  </label>
                </>
              )}

              <div className="border-t border-discord-lightest pt-4">
                <h3 className="font-medium text-white mb-3">Welcome Message</h3>
                
                <label className="flex items-center justify-between cursor-pointer mb-4">
                  <div>
                    <span className="text-discord-text">Enable Welcome Message</span>
                    <p className="text-xs text-discord-muted">Send message when bot joins voice</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.welcomeMessageEnabled}
                    onChange={(e) => setSettings({ ...settings, welcomeMessageEnabled: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>

                {settings.welcomeMessageEnabled && (
                  <div>
                    <label className="label">Welcome Message</label>
                    <textarea
                      value={settings.welcomeMessage}
                      onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
                      className="input resize-none"
                      rows={3}
                      placeholder="Hello! Use {prefix}help for commands."
                    />
                    <p className="text-xs text-discord-muted mt-1">
                      Use {'{prefix}'} for bot prefix, {'{server}'} for server name
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GuildSettings
