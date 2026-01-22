import { useEffect, useState } from 'react'
import {
  ListMusic,
  Plus,
  Search,
  MoreVertical,
  Play,
  Edit,
  Trash2,
  Music,
  Clock,
  X,
  Save,
  Globe,
  Lock
} from 'lucide-react'

function Playlists() {
  const [playlists, setPlaylists] = useState([
    {
      id: 1,
      name: 'My Favorites',
      description: 'My favorite tracks',
      trackCount: 25,
      totalDuration: '1h 32m',
      isPublic: false,
      createdAt: '2024-01-15'
    },
    {
      id: 2,
      name: 'Chill Vibes',
      description: 'Relaxing music collection',
      trackCount: 42,
      totalDuration: '2h 45m',
      isPublic: true,
      createdAt: '2024-01-10'
    },
    {
      id: 3,
      name: 'Party Mix',
      description: 'Party tracks',
      trackCount: 18,
      totalDuration: '1h 05m',
      isPublic: true,
      createdAt: '2024-01-05'
    }
  ])

  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(null)
  const [activeMenu, setActiveMenu] = useState(null)
  const [editingPlaylist, setEditingPlaylist] = useState(null)
  const [newPlaylist, setNewPlaylist] = useState({
    name: '',
    description: '',
    isPublic: false
  })

  const filteredPlaylists = playlists.filter(playlist =>
    playlist.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreatePlaylist = (e) => {
    e.preventDefault()
    const playlist = {
      id: Date.now(),
      ...newPlaylist,
      trackCount: 0,
      totalDuration: '0m',
      createdAt: new Date().toISOString().split('T')[0]
    }
    setPlaylists([...playlists, playlist])
    setShowCreateModal(false)
    setNewPlaylist({ name: '', description: '', isPublic: false })
  }

  const handleEditPlaylist = (e) => {
    e.preventDefault()
    setPlaylists(playlists.map(p => 
      p.id === editingPlaylist.id ? editingPlaylist : p
    ))
    setEditingPlaylist(null)
  }

  const handleDeletePlaylist = (id) => {
    setPlaylists(playlists.filter(p => p.id !== id))
    setShowDeleteModal(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Playlists</h1>
          <p className="text-discord-muted">Create and manage your playlists</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Playlist
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-discord-muted" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search playlists..."
          className="input pl-10"
        />
      </div>

      {/* Playlist List */}
      {filteredPlaylists.length === 0 ? (
        <div className="card text-center py-12">
          <ListMusic className="w-16 h-16 text-discord-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            {searchTerm ? 'No playlists found' : 'No playlists yet'}
          </h3>
          <p className="text-discord-muted mb-4">
            {searchTerm ? 'Try a different search' : 'Create your first playlist'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              Create Playlist
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlaylists.map((playlist) => (
            <div key={playlist.id} className="card relative group">
              {/* Menu Button */}
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setActiveMenu(activeMenu === playlist.id ? null : playlist.id)}
                  className="p-1 rounded hover:bg-discord-lightest text-discord-muted hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {activeMenu === playlist.id && (
                  <>
                    <div 
                      className="fixed inset-0 z-10"
                      onClick={() => setActiveMenu(null)}
                    />
                    <div className="absolute right-0 mt-1 w-48 bg-discord-darker rounded-md shadow-lg z-20 py-1">
                      <button
                        onClick={() => {
                          // Play playlist
                          setActiveMenu(null)
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-discord-text hover:bg-discord-lightest"
                      >
                        <Play className="w-4 h-4" />
                        Play
                      </button>
                      <button
                        onClick={() => {
                          setEditingPlaylist(playlist)
                          setActiveMenu(null)
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-discord-text hover:bg-discord-lightest"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteModal(playlist.id)
                          setActiveMenu(null)
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-discord-red hover:bg-discord-lightest"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Playlist Info */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-lg bg-discord-primary/20 flex items-center justify-center">
                  <ListMusic className="w-8 h-8 text-discord-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{playlist.name}</h3>
                  <p className="text-sm text-discord-muted truncate">{playlist.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {playlist.isPublic ? (
                      <Globe className="w-3 h-3 text-discord-green" />
                    ) : (
                      <Lock className="w-3 h-3 text-discord-muted" />
                    )}
                    <span className="text-xs text-discord-muted">
                      {playlist.isPublic ? 'Public' : 'Private'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-discord-muted">
                <div className="flex items-center gap-1">
                  <Music className="w-4 h-4" />
                  <span>{playlist.trackCount} tracks</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{playlist.totalDuration}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Create Playlist</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-discord-muted hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreatePlaylist} className="space-y-4">
              <div>
                <label className="label">Playlist Name</label>
                <input
                  type="text"
                  value={newPlaylist.name}
                  onChange={(e) => setNewPlaylist({ ...newPlaylist, name: e.target.value })}
                  className="input"
                  placeholder="My Playlist"
                  required
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={newPlaylist.description}
                  onChange={(e) => setNewPlaylist({ ...newPlaylist, description: e.target.value })}
                  className="input resize-none"
                  rows={3}
                  placeholder="Describe your playlist..."
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPlaylist.isPublic}
                  onChange={(e) => setNewPlaylist({ ...newPlaylist, isPublic: e.target.checked })}
                  className="w-4 h-4 rounded border-discord-lightest"
                />
                <div>
                  <span className="text-discord-text">Public Playlist</span>
                  <p className="text-xs text-discord-muted">Other users can see and use this playlist</p>
                </div>
              </label>

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

      {/* Edit Playlist Modal */}
      {editingPlaylist && (
        <div className="modal-overlay" onClick={() => setEditingPlaylist(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Edit Playlist</h2>
              <button
                onClick={() => setEditingPlaylist(null)}
                className="text-discord-muted hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleEditPlaylist} className="space-y-4">
              <div>
                <label className="label">Playlist Name</label>
                <input
                  type="text"
                  value={editingPlaylist.name}
                  onChange={(e) => setEditingPlaylist({ ...editingPlaylist, name: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={editingPlaylist.description}
                  onChange={(e) => setEditingPlaylist({ ...editingPlaylist, description: e.target.value })}
                  className="input resize-none"
                  rows={3}
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingPlaylist.isPublic}
                  onChange={(e) => setEditingPlaylist({ ...editingPlaylist, isPublic: e.target.checked })}
                  className="w-4 h-4 rounded border-discord-lightest"
                />
                <div>
                  <span className="text-discord-text">Public Playlist</span>
                  <p className="text-xs text-discord-muted">Other users can see and use this playlist</p>
                </div>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingPlaylist(null)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  Save
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
            <h2 className="text-xl font-bold text-white mb-2">Delete Playlist</h2>
            <p className="text-discord-muted mb-6">
              Are you sure you want to delete this playlist? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePlaylist(showDeleteModal)}
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

export default Playlists
