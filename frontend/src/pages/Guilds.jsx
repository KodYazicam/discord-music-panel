import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBotStore } from '../stores/botStore'
import {
  Server,
  Search,
  Bot,
  Users,
  Music,
  ChevronRight
} from 'lucide-react'

function Guilds() {
  const { bots, fetchBots, fetchBotGuilds, isLoading } = useBotStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBotId, setSelectedBotId] = useState('all')
  const [allGuilds, setAllGuilds] = useState([])
  const [isLoadingGuilds, setIsLoadingGuilds] = useState(false)

  useEffect(() => {
    fetchBots()
  }, [fetchBots])

  useEffect(() => {
    loadGuilds()
  }, [bots, selectedBotId])

  const loadGuilds = async () => {
    setIsLoadingGuilds(true)
    const guilds = []

    const botsToFetch = selectedBotId === 'all' 
      ? bots.filter(b => b.status === 'online')
      : bots.filter(b => b.id.toString() === selectedBotId && b.status === 'online')

    for (const bot of botsToFetch) {
      const result = await fetchBotGuilds(bot.id)
      if (result.success) {
        guilds.push(...result.guilds.map(g => ({ ...g, bot })))
      }
    }

    setAllGuilds(guilds)
    setIsLoadingGuilds(false)
  }

  const filteredGuilds = allGuilds.filter(guild =>
    guild.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const onlineBots = bots.filter(b => b.status === 'online')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Servers</h1>
        <p className="text-discord-muted">Servers where your bots are present</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-discord-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search servers..."
            className="input pl-10"
          />
        </div>
        <select
          value={selectedBotId}
          onChange={(e) => setSelectedBotId(e.target.value)}
          className="input sm:w-48"
        >
          <option value="all">All Bots</option>
          {onlineBots.map((bot) => (
            <option key={bot.id} value={bot.id}>
              {bot.name}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {isLoading || isLoadingGuilds ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-discord-primary border-t-transparent"></div>
        </div>
      ) : onlineBots.length === 0 ? (
        <div className="card text-center py-12">
          <Bot className="w-16 h-16 text-discord-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No online bots</h3>
          <p className="text-discord-muted mb-4">
            Start a bot to see which servers it is in
          </p>
          <Link to="/bots" className="btn btn-primary">
            Manage Bots
          </Link>
        </div>
      ) : filteredGuilds.length === 0 ? (
        <div className="card text-center py-12">
          <Server className="w-16 h-16 text-discord-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            {searchTerm ? 'No servers found' : 'No servers yet'}
          </h3>
          <p className="text-discord-muted">
            {searchTerm ? 'Try a different search' : 'Add bots to your Discord servers'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGuilds.map((guild) => (
            <Link
              key={`${guild.bot.id}-${guild.id}`}
              to={`/music/${guild.bot.id}/${guild.id}`}
              className="card hover:border-discord-primary/50 transition-colors group"
            >
              <div className="flex items-center gap-4">
                {guild.icon ? (
                  <img
                    src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                    alt={guild.name}
                    className="w-14 h-14 rounded-full"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-discord-primary flex items-center justify-center text-white text-xl font-bold">
                    {guild.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{guild.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-discord-muted mt-1">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{guild.memberCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bot className="w-4 h-4" />
                      <span className="truncate">{guild.bot.name}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-discord-muted group-hover:text-discord-primary transition-colors" />
              </div>

              {/* Quick Stats */}
              <div className="mt-4 pt-4 border-t border-discord-lightest">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-discord-muted">Music Status</span>
                  {guild.isPlaying ? (
                    <span className="flex items-center gap-1 text-discord-green">
                      <Music className="w-4 h-4" />
                      Playing
                    </span>
                  ) : (
                    <span className="text-discord-muted">Idle</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default Guilds
