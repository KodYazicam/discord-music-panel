import { useEffect, useState } from 'react'
import { useBotStore } from '../stores/botStore'
import {
  BarChart3,
  TrendingUp,
  Music,
  Clock,
  Users,
  Bot,
  Server,
  Calendar,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

function Statistics() {
  const { bots, fetchBots } = useBotStore()
  const [timeRange, setTimeRange] = useState('week')
  const [isLoading, setIsLoading] = useState(true)

  const [stats, setStats] = useState({
    totalTracksPlayed: 2547,
    totalPlaytime: '156h 32m',
    totalServers: 45,
    totalUsers: 1250,
    averageTracksPerDay: 364,
    mostPlayedTrack: 'Blinding Lights - The Weeknd',
    peakHour: '20:00 - 21:00',
    trends: {
      tracks: 12.5,
      playtime: 8.3,
      servers: 5.2,
      users: 15.7
    }
  })

  const [chartData, setChartData] = useState({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    values: [320, 420, 380, 450, 520, 680, 590]
  })

  useEffect(() => {
    fetchBots()
    // Normally statistics data would be fetched from API here
    setIsLoading(false)
  }, [fetchBots])

  const timeRanges = [
    { value: 'day', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' }
  ]

  const onlineBots = bots.filter(b => b.status === 'online').length
  const maxChartValue = Math.max(...chartData.values)

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Statistics</h1>
          <p className="text-discord-muted">Track your bot's activity and performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-discord-muted" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="input w-40"
          >
            {timeRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-discord-muted text-sm">Tracks Played</span>
            <Music className="w-5 h-5 text-discord-primary" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalTracksPlayed.toLocaleString()}</p>
          <div className={`flex items-center gap-1 text-sm mt-1 ${stats.trends.tracks >= 0 ? 'text-discord-green' : 'text-discord-red'}`}>
            {stats.trends.tracks >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            <span>{Math.abs(stats.trends.tracks)}% from last period</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-discord-muted text-sm">Total Playtime</span>
            <Clock className="w-5 h-5 text-discord-yellow" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalPlaytime}</p>
          <div className={`flex items-center gap-1 text-sm mt-1 ${stats.trends.playtime >= 0 ? 'text-discord-green' : 'text-discord-red'}`}>
            {stats.trends.playtime >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            <span>{Math.abs(stats.trends.playtime)}% from last period</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-discord-muted text-sm">Active Servers</span>
            <Server className="w-5 h-5 text-discord-green" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalServers}</p>
          <div className={`flex items-center gap-1 text-sm mt-1 ${stats.trends.servers >= 0 ? 'text-discord-green' : 'text-discord-red'}`}>
            {stats.trends.servers >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            <span>{Math.abs(stats.trends.servers)}% from last period</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-discord-muted text-sm">Unique Users</span>
            <Users className="w-5 h-5 text-discord-purple" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalUsers.toLocaleString()}</p>
          <div className={`flex items-center gap-1 text-sm mt-1 ${stats.trends.users >= 0 ? 'text-discord-green' : 'text-discord-red'}`}>
            {stats.trends.users >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            <span>{Math.abs(stats.trends.users)}% from last period</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Tracks Played
            </h2>
            <div className="text-sm text-discord-muted">
              Avg: {stats.averageTracksPerDay} tracks/day
            </div>
          </div>

          {/* Simple Bar Chart */}
          <div className="flex items-end justify-between gap-2 h-48">
            {chartData.values.map((value, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex justify-center">
                  <div
                    className="w-full max-w-[40px] bg-discord-primary rounded-t transition-all hover:bg-discord-primary-dark"
                    style={{ height: `${(value / maxChartValue) * 160}px` }}
                  />
                </div>
                <span className="text-xs text-discord-muted">{chartData.labels[index]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Highlights */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Highlights
          </h2>
          <div className="space-y-4">
            <div className="p-3 bg-discord-darker rounded-lg">
              <span className="text-sm text-discord-muted">Most Played Track</span>
              <p className="text-white font-medium mt-1 truncate">{stats.mostPlayedTrack}</p>
            </div>

            <div className="p-3 bg-discord-darker rounded-lg">
              <span className="text-sm text-discord-muted">Peak Activity Hour</span>
              <p className="text-white font-medium mt-1">{stats.peakHour}</p>
            </div>

            <div className="p-3 bg-discord-darker rounded-lg">
              <span className="text-sm text-discord-muted">Online Bots</span>
              <p className="text-white font-medium mt-1">{onlineBots} / {bots.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bot Statistics */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Bot Statistics
        </h2>

        {bots.length === 0 ? (
          <p className="text-discord-muted text-center py-8">No bots added yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-discord-muted border-b border-discord-lightest">
                  <th className="pb-3 font-medium">Bot</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Servers</th>
                  <th className="pb-3 font-medium">Tracks Played</th>
                  <th className="pb-3 font-medium">Playtime</th>
                </tr>
              </thead>
              <tbody>
                {bots.map((bot) => (
                  <tr key={bot.id} className="border-b border-discord-lightest last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-discord-primary flex items-center justify-center">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-medium text-white">{bot.name}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`badge ${bot.status === 'online' ? 'badge-online' : 'badge-offline'}`}>
                        {bot.status === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="py-3 text-discord-text">{bot.guildCount || 0}</td>
                    <td className="py-3 text-discord-text">{bot.stats?.tracksPlayed || 0}</td>
                    <td className="py-3 text-discord-text">{bot.stats?.totalPlaytime || '0h'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Statistics
