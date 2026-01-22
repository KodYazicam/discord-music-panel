import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBotStore } from '../stores/botStore'
import api from '../utils/api'
import {
  Bot,
  Server,
  Music,
  Users,
  Activity,
  TrendingUp,
  Clock,
  Zap
} from 'lucide-react'

function Dashboard() {
  const { bots, fetchBots } = useBotStore()
  const [stats, setStats] = useState({
    totalBots: 0,
    onlineBots: 0,
    totalGuilds: 0,
    totalTracksPlayed: 0,
    totalPlaytime: 0,
    activeQueues: 0
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      await fetchBots()
      
      try {
        const statsRes = await api.get('/stats/overview')
        setStats(statsRes.data)
        
        const activityRes = await api.get('/stats/recent-activity')
        setRecentActivity(activityRes.data.activities || [])
      } catch (error) {
        console.error('Failed to load stats:', error)
      }
      
      setIsLoading(false)
    }

    loadData()
  }, [fetchBots])

  const onlineBots = bots.filter(bot => bot.status === 'online').length

  const statCards = [
    {
      title: 'Total Bots',
      value: bots.length,
      icon: Bot,
      color: 'text-discord-primary',
      bgColor: 'bg-discord-primary/10'
    },
    {
      title: 'Online Bots',
      value: onlineBots,
      icon: Activity,
      color: 'text-discord-green',
      bgColor: 'bg-discord-green/10'
    },
    {
      title: 'Total Servers',
      value: stats.totalGuilds || 0,
      icon: Server,
      color: 'text-discord-yellow',
      bgColor: 'bg-discord-yellow/10'
    },
    {
      title: 'Active Queues',
      value: stats.activeQueues || 0,
      icon: Music,
      color: 'text-discord-fuchsia',
      bgColor: 'bg-discord-fuchsia/10'
    }
  ]

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-discord-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-discord-muted">Overview of your music bots</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.title} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-discord-muted">{stat.title}</p>
                <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bot List */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Your Bots</h2>
            <Link to="/bots" className="text-sm text-discord-primary hover:underline">
              View All
            </Link>
          </div>

          {bots.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="w-12 h-12 text-discord-muted mx-auto mb-3" />
              <p className="text-discord-muted">No bots added yet</p>
              <Link to="/bots" className="btn btn-primary mt-4 inline-block">
                Add Bot
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {bots.slice(0, 5).map((bot) => (
                <Link
                  key={bot.id}
                  to={`/bots/${bot.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-discord-darker hover:bg-discord-lightest transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-discord-primary flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{bot.name}</p>
                      <p className="text-sm text-discord-muted">
                        Prefix: <code className="bg-discord-lightest px-1 rounded">{bot.prefix}</code>
                      </p>
                    </div>
                  </div>
                  <span className={`badge ${bot.status === 'online' ? 'badge-online' : 'badge-offline'}`}>
                    {bot.status === 'online' ? 'Online' : 'Offline'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          {/* Playback Stats */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">Playback Stats</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-discord-muted">
                  <Music className="w-4 h-4" />
                  <span>Total Tracks</span>
                </div>
                <span className="font-semibold text-white">{stats.totalTracksPlayed || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-discord-muted">
                  <Clock className="w-4 h-4" />
                  <span>Total Duration</span>
                </div>
                <span className="font-semibold text-white">{formatDuration(stats.totalPlaytime || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-discord-muted">
                  <Users className="w-4 h-4" />
                  <span>Active Listeners</span>
                </div>
                <span className="font-semibold text-white">{stats.activeListeners || 0}</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
            {recentActivity.length === 0 ? (
              <p className="text-discord-muted text-sm text-center py-4">
                No activity yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 text-sm">
                    <div className="mt-1">
                      <Zap className="w-4 h-4 text-discord-primary" />
                    </div>
                    <div>
                      <p className="text-discord-text">{activity.message}</p>
                      <p className="text-discord-muted text-xs">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/bots"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-discord-darker hover:bg-discord-lightest transition-colors"
          >
            <Bot className="w-8 h-8 text-discord-primary" />
            <span className="text-sm text-discord-text">Add Bot</span>
          </Link>
          <Link
            to="/guilds"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-discord-darker hover:bg-discord-lightest transition-colors"
          >
            <Server className="w-8 h-8 text-discord-green" />
            <span className="text-sm text-discord-text">Servers</span>
          </Link>
          <Link
            to="/playlists"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-discord-darker hover:bg-discord-lightest transition-colors"
          >
            <Music className="w-8 h-8 text-discord-fuchsia" />
            <span className="text-sm text-discord-text">Playlists</span>
          </Link>
          <Link
            to="/statistics"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-discord-darker hover:bg-discord-lightest transition-colors"
          >
            <TrendingUp className="w-8 h-8 text-discord-yellow" />
            <span className="text-sm text-discord-text">Statistics</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
