import { useCallback, useEffect, useState } from 'react'
import { useBotStore } from '../stores/botStore'
import api from '../utils/api'
import {
  BarChart3,
  TrendingUp,
  Music,
  Clock,
  Bot,
  Server,
  Calendar
} from 'lucide-react'

function formatDuration(seconds) {
  const total = Number(seconds) || 0
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

function Statistics() {
  const { bots, fetchBots } = useBotStore()
  const [timeRange, setTimeRange] = useState('week')
  const [isLoading, setIsLoading] = useState(true)
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState(null)

  const loadOverview = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await api.get('/stats/overview', { params: { days: { day: 1, week: 7, month: 30, year: 365 }[timeRange] } })
      setOverview(response.data)
      setError(null)
    } catch {
      setOverview(null)
      setError('Failed to load statistics')
    } finally {
      setIsLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    fetchBots()
  }, [fetchBots])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  const timeRanges = [
    { value: 'day', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' }
  ]

  const daily = overview?.daily || []
  const onlineBots = overview?.onlineBots || 0
  const totalSongs = daily.reduce((sum, entry) => sum + entry.songs, 0)
  const maxChartValue = Math.max(...daily.map((entry) => entry.songs), 1)

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

      {error && <p className="text-discord-red">{error}</p>}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-discord-muted text-sm">Tracks Played</span>
            <Music className="w-5 h-5 text-discord-primary" />
          </div>
          <p className="text-2xl font-bold text-white">{totalSongs.toLocaleString()}</p>
          <div className="text-sm text-discord-muted mt-1">in the selected range</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-discord-muted text-sm">Total Playtime</span>
            <Clock className="w-5 h-5 text-discord-yellow" />
          </div>
          <p className="text-2xl font-bold text-white">{formatDuration(overview?.totalPlaytime)}</p>
          <div className="text-sm text-discord-muted mt-1">all time</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-discord-muted text-sm">Active Servers</span>
            <Server className="w-5 h-5 text-discord-green" />
          </div>
          <p className="text-2xl font-bold text-white">{overview?.totalGuilds || 0}</p>
          <div className="text-sm text-discord-muted mt-1">{overview?.totalBots || 0} bots managed</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-discord-muted text-sm">Commands Used</span>
            <TrendingUp className="w-5 h-5 text-discord-purple" />
          </div>
          <p className="text-2xl font-bold text-white">{(overview?.totalCommands || 0).toLocaleString()}</p>
          <div className="text-sm text-discord-muted mt-1">{overview?.activeQueues || 0} active queue(s)</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Tracks Played
          </h2>

          {/* Simple Bar Chart */}
          {daily.length === 0 ? (
            <p className="text-discord-muted text-center py-16">No tracks played in this range yet.</p>
          ) : (
            <div className="flex items-end justify-between gap-2 h-48">
              {daily.map((entry) => (
                <div key={entry.date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex justify-center">
                    <div
                      className="w-full max-w-[40px] bg-discord-primary rounded-t transition-all hover:bg-discord-primary-dark"
                      style={{ height: `${(entry.songs / maxChartValue) * 160}px` }}
                      title={`${entry.songs} track(s) on ${entry.date}`}
                    />
                  </div>
                  <span className="text-xs text-discord-muted">{entry.date.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Highlights */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Highlights
          </h2>
          <div className="space-y-4">
            <div className="p-3 bg-discord-darker rounded-lg">
              <span className="text-sm text-discord-muted">Online Bots</span>
              <p className="text-white font-medium mt-1">{onlineBots} / {overview?.totalBots || 0}</p>
            </div>

            <div className="p-3 bg-discord-darker rounded-lg">
              <span className="text-sm text-discord-muted">Active Queues</span>
              <p className="text-white font-medium mt-1">{overview?.activeQueues || 0}</p>
            </div>

            <div className="p-3 bg-discord-darker rounded-lg">
              <span className="text-sm text-discord-muted">Total Playtime</span>
              <p className="text-white font-medium mt-1">{formatDuration(overview?.totalPlaytime)}</p>
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
                  <th className="pb-3 font-medium">Session Tracks</th>
                  <th className="pb-3 font-medium">Session Commands</th>
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
                    <td className="py-3 text-discord-text">{(bot.songsPlayed || 0).toLocaleString()}</td>
                    <td className="py-3 text-discord-text">{(bot.commandsExecuted || 0).toLocaleString()}</td>
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
