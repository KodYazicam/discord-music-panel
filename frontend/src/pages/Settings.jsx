import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import {
  Settings as SettingsIcon,
  User,
  Lock,
  Bell,
  Palette,
  Save,
  Eye,
  EyeOff,
  Check
} from 'lucide-react'

function Settings() {
  const { user, updateProfile, changePassword } = useAuthStore()
  
  const [activeTab, setActiveTab] = useState('profile')
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || ''
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [notifications, setNotifications] = useState({
    botStatus: true,
    queueEmpty: false,
    newFeatures: true,
    weeklyReport: false
  })
  const [theme, setTheme] = useState('dark')
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState('')
  const [saveError, setSaveError] = useState('')

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaveError('')
    setSaveSuccess('')
    
    // Normally API request would be sent here
    setSaveSuccess('Profile updated successfully')
    setTimeout(() => setSaveSuccess(''), 3000)
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setSaveError('')
    setSaveSuccess('')
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setSaveError('Passwords do not match')
      return
    }
    
    if (passwordData.newPassword.length < 6) {
      setSaveError('Password must be at least 6 characters')
      return
    }
    
    // Normally API request would be sent here
    setSaveSuccess('Password changed successfully')
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setTimeout(() => setSaveSuccess(''), 3000)
  }

  const handleSaveNotifications = () => {
    setSaveSuccess('Notification preferences saved')
    setTimeout(() => setSaveSuccess(''), 3000)
  }

  const handleSaveTheme = () => {
    setSaveSuccess('Theme preferences saved')
    setTimeout(() => setSaveSuccess(''), 3000)
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-7 h-7" />
          Settings
        </h1>
        <p className="text-discord-muted">Manage your account and preferences</p>
      </div>

      {/* Success/Error Messages */}
      {saveSuccess && (
        <div className="p-3 bg-discord-green/10 border border-discord-green/30 rounded-md text-discord-green text-sm flex items-center gap-2">
          <Check className="w-4 h-4" />
          {saveSuccess}
        </div>
      )}
      {saveError && (
        <div className="p-3 bg-discord-red/10 border border-discord-red/30 rounded-md text-discord-red text-sm">
          {saveError}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs */}
        <div className="lg:w-48 flex lg:flex-col gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-discord-primary text-white'
                  : 'text-discord-muted hover:bg-discord-lightest hover:text-white'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="hidden sm:inline lg:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-4">Profile Information</h2>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="label">Username</label>
                  <input
                    type="text"
                    value={profileData.username}
                    onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="input"
                  />
                </div>
                <div className="pt-4">
                  <button type="submit" className="btn btn-primary flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-4">Change Password</h2>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="label">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="input pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-discord-muted hover:text-discord-text"
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="input pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-discord-muted hover:text-discord-text"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div className="pt-4">
                  <button type="submit" className="btn btn-primary flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Change Password
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-4">Notification Preferences</h2>
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-discord-text">Bot Status Changes</span>
                    <p className="text-sm text-discord-muted">Get notified when a bot goes online/offline</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.botStatus}
                    onChange={(e) => setNotifications({ ...notifications, botStatus: e.target.checked })}
                    className="w-5 h-5 rounded border-discord-lightest"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-discord-text">Queue Empty</span>
                    <p className="text-sm text-discord-muted">Get notified when a queue is empty</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.queueEmpty}
                    onChange={(e) => setNotifications({ ...notifications, queueEmpty: e.target.checked })}
                    className="w-5 h-5 rounded border-discord-lightest"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-discord-text">New Features</span>
                    <p className="text-sm text-discord-muted">Get notified about updates and new features</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.newFeatures}
                    onChange={(e) => setNotifications({ ...notifications, newFeatures: e.target.checked })}
                    className="w-5 h-5 rounded border-discord-lightest"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-discord-text">Weekly Report</span>
                    <p className="text-sm text-discord-muted">Receive weekly usage statistics</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.weeklyReport}
                    onChange={(e) => setNotifications({ ...notifications, weeklyReport: e.target.checked })}
                    className="w-5 h-5 rounded border-discord-lightest"
                  />
                </label>

                <div className="pt-4">
                  <button 
                    onClick={handleSaveNotifications}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-4">Appearance</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Theme</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'dark', name: 'Dark', colors: ['#1a1b1e', '#25262b'] },
                      { id: 'light', name: 'Light', colors: ['#ffffff', '#f1f3f5'] },
                      { id: 'discord', name: 'Discord', colors: ['#36393f', '#2f3136'] }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={`p-3 rounded-lg border-2 transition-colors ${
                          theme === t.id
                            ? 'border-discord-primary'
                            : 'border-discord-lightest hover:border-discord-muted'
                        }`}
                      >
                        <div className="flex gap-1 mb-2">
                          {t.colors.map((color, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 rounded"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-discord-text">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handleSaveTheme}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Settings
