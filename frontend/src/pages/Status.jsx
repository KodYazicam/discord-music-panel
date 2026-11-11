import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  Bot,
  Clock,
  Music,
  RefreshCw,
  Server,
  Terminal,
  Users,
  Wifi,
  WifiOff
} from 'lucide-react'

const REFRESH_MS = 15000

function formatUptime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0m'

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function StatCard({ label, value, icon: Icon, tone = 'text-discord-primary' }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-discord-muted text-sm">{label}</span>
        <Icon className={`w-5 h-5 ${tone}`} aria-hidden="true" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

function StatusBadge({ status }) {
  const online = status === 'online'

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        online ? 'bg-discord-green/10 text-discord-green' : 'bg-discord-muted/10 text-discord-muted'
      }`}
    >
      {online ? <Wifi className="w-3.5 h-3.5" aria-hidden="true" /> : <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />}
      {online ? 'Online' : 'Offline'}
    </span>
  )
}

function Status() {
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/status', {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error(`Status API returned ${response.status}`)
      }

      const data = await response.json()
      setStatus(data)
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message || 'Status API is unreachable')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
    const timer = setInterval(loadStatus, REFRESH_MS)
    return () => clearInterval(timer)
  }, [loadStatus])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-discord-darker">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-discord-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-discord-darker text-discord-text">
      <header className="border-b border-discord-light">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-discord-primary/10 flex items-center justify-center">
              <Activity className="w-6 h-6 text-discord-primary" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Panel Status</h1>
              <p className="text-sm text-discord-muted">Public, read-only overview</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-sm text-discord-primary hover:underline">
              Open dashboard
            </Link>
            <button
              type="button"
              onClick={loadStatus}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-discord-light text-sm text-white hover:bg-discord-lighter"
              aria-label="Refresh status now"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div role="status" aria-live="polite" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-2 text-white">
            <span
              className={`w-2.5 h-2.5 rounded-full ${error ? 'bg-discord-red' : 'bg-discord-green'}`}
              aria-hidden="true"
            />
            {error ? 'Status unavailable' : 'All systems operational'}
          </span>
          {status && <span className="text-discord-muted">Version {status.version}</span>}
          {lastUpdated && (
            <span className="text-discord-muted">
              Updated {lastUpdated.toLocaleTimeString()} · refreshes every {REFRESH_MS / 1000}s
            </span>
          )}
        </div>

        {error && (
          <div className="card border border-discord-red/40">
            <p className="text-discord-red font-medium">Could not load status</p>
            <p className="text-discord-muted text-sm mt-1">
              {error}. {status ? 'Showing the last successful result.' : 'Retrying automatically.'}
            </p>
          </div>
        )}

        {status && (
          <>
            <section aria-label="Aggregate statistics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Running bots"
                value={`${status.runningBots}/${status.totalBots}`}
                icon={Bot}
              />
              <StatCard label="Guilds" value={status.totalGuilds} icon={Server} tone="text-discord-green" />
              <StatCard label="Playing now" value={status.totalPlaying} icon={Music} tone="text-discord-fuchsia" />
              <StatCard label="Queued tracks" value={status.totalQueued} icon={Music} tone="text-discord-yellow" />
              <StatCard label="Reachable users" value={status.totalUsers} icon={Users} tone="text-discord-purple" />
              <StatCard label="Panel uptime" value={formatUptime(status.uptimeSeconds)} icon={Clock} />
            </section>

            {status.ytDlp && (
              <section
                aria-label="yt-dlp dependency"
                className={`card flex items-start gap-3 ${status.ytDlp.available ? '' : 'border border-discord-red/40'}`}
              >
                {status.ytDlp.available ? (
                  <Terminal className="w-5 h-5 text-discord-green mt-0.5" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-discord-red mt-0.5" aria-hidden="true" />
                )}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-white">yt-dlp</h2>
                    <span className={`text-xs font-medium ${status.ytDlp.available ? 'text-discord-green' : 'text-discord-red'}`}>
                      {status.ytDlp.available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  <p className="text-sm text-discord-muted mt-1">
                    {status.ytDlp.available
                      ? `Version ${status.ytDlp.version}`
                      : status.ytDlp.error || 'Playback will fail until yt-dlp is installed.'}
                  </p>
                </div>
              </section>
            )}

            <section aria-labelledby="bots-heading" className="card">
              <div className="flex items-center gap-2 mb-4">
                <Bot className="w-5 h-5 text-discord-primary" aria-hidden="true" />
                <h2 id="bots-heading" className="text-lg font-semibold text-white">
                  Bots
                </h2>
              </div>

              {status.bots.length === 0 ? (
                <p className="text-discord-muted text-sm">No bots configured yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-discord-muted border-b border-discord-light">
                        <th scope="col" className="py-2 pr-4 font-medium">Name</th>
                        <th scope="col" className="py-2 pr-4 font-medium">Status</th>
                        <th scope="col" className="py-2 pr-4 font-medium">Guilds</th>
                        <th scope="col" className="py-2 pr-4 font-medium">Playing</th>
                        <th scope="col" className="py-2 pr-4 font-medium">Queued</th>
                        <th scope="col" className="py-2 font-medium">Uptime</th>
                      </tr>
                    </thead>
                    <tbody>
                      {status.bots.map((bot) => (
                        <tr key={bot.id} className="border-b border-discord-light/50 last:border-0">
                          <td className="py-3 pr-4 text-white">{bot.name}</td>
                          <td className="py-3 pr-4">
                            <StatusBadge status={bot.status} />
                          </td>
                          <td className="py-3 pr-4">{bot.guildCount}</td>
                          <td className="py-3 pr-4">{bot.playingCount}</td>
                          <td className="py-3 pr-4">{bot.totalQueuedSongs}</td>
                          <td className="py-3">{formatUptime(bot.uptime / 1000)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        <p className="text-xs text-discord-muted">
          This page exposes aggregate counters and bot names only. Tokens, client IDs, guild names, and queue
          contents are never published.
        </p>
      </main>
    </div>
  )
}

export default Status
