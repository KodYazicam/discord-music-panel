import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { initSocket, disconnectSocket } from '../utils/socket'
import {
  Music2,
  LayoutDashboard,
  Bot,
  Server,
  ListMusic,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  User,
  Github,
  Instagram,
  Heart
} from 'lucide-react'

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    // Initialize socket connection
    initSocket()

    return () => {
      // Cleanup socket on unmount
      disconnectSocket()
    }
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Bots', href: '/bots', icon: Bot },
    { name: 'Servers', href: '/guilds', icon: Server },
    { name: 'Playlists', href: '/playlists', icon: ListMusic },
    { name: 'Statistics', href: '/statistics', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-discord-darker">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-discord-dark transform transition-transform duration-300
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-discord-lightest">
          <div className="flex items-center gap-3">
            <div className="bg-discord-primary rounded-lg p-2">
              <Music2 className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-lg text-white">Music Panel</span>
          </div>
          <button 
            className="lg:hidden text-discord-muted hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) => `
                sidebar-item ${isActive ? 'active' : ''}
              `}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-discord-lightest">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-discord-primary flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.username || 'User'}
              </p>
              <p className="text-xs text-discord-muted truncate">
                {user?.email || ''}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="h-16 bg-discord-dark border-b border-discord-lightest flex items-center justify-between px-4">
          {/* Mobile menu button */}
          <button 
            className="lg:hidden text-discord-muted hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-discord-lightest transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-discord-primary flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-discord-text hidden sm:block">
                {user?.username || 'User'}
              </span>
              <ChevronDown className="w-4 h-4 text-discord-muted" />
            </button>

            {/* Dropdown menu */}
            {userMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-discord-light rounded-md shadow-lg z-20 py-1">
                  <NavLink
                    to="/settings"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-discord-text hover:bg-discord-lightest"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-discord-red hover:bg-discord-lightest"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 min-h-[calc(100vh-8rem)]">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="bg-discord-dark border-t border-discord-lightest py-4 px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-discord-muted">
            <div className="flex items-center gap-1">
              <span>Made with</span>
              <Heart className="w-4 h-4 text-discord-red fill-current" />
              <span>by</span>
              <a
                href="https://github.com/Veleslobo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-discord-primary hover:text-discord-primary-hover font-medium"
              >
                VelesLobo
              </a>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/Veleslobo/discord-music-panel"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                <Github className="w-4 h-4" />
                <span>GitHub</span>
              </a>
              <a
                href="https://instagram.com/kodyazicam"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                <Instagram className="w-4 h-4" />
                <span>@kodyazicam</span>
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default DashboardLayout
