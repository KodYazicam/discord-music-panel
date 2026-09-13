import { Outlet } from 'react-router-dom'
import { Music2, Github, Instagram, Heart } from 'lucide-react'

function AuthLayout() {
  return (
    <div className="min-h-screen bg-discord-darker flex flex-col">
      <div className="flex-1 flex">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-discord-primary to-discord-fuchsia items-center justify-center p-12">
          <div className="text-center">
            <div className="flex items-center justify-center mb-8">
              <div className="bg-white rounded-full p-6">
                <Music2 className="w-16 h-16 text-discord-primary" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Discord Music Panel
            </h1>
            <p className="text-xl text-white/80 max-w-md">
              Manage multiple music bots from a single panel.
              Different prefixes, unlimited possibilities.
            </p>
            <div className="mt-12 grid grid-cols-3 gap-8 text-white/90">
              <div>
                <div className="text-3xl font-bold">100+</div>
                <div className="text-sm text-white/70">Bot Support</div>
              </div>
              <div>
                <div className="text-3xl font-bold">∞</div>
                <div className="text-sm text-white/70">Prefixes</div>
              </div>
              <div>
                <div className="text-3xl font-bold">24/7</div>
                <div className="text-sm text-white/70">Uptime</div>
              </div>
            </div>

            {/* Author Info */}
            <div className="mt-12 pt-8 border-t border-white/20">
              <p className="text-white/60 text-sm mb-3">Created by KodYazicam</p>
              <div className="flex justify-center gap-4">
                <a
                  href="https://github.com/KodYazicam"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-white/80 hover:text-white transition-colors"
                >
                  <Github className="w-4 h-4" />
                  <span className="text-sm">GitHub</span>
                </a>
                <a
                  href="https://instagram.com/kodyazicam"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-white/80 hover:text-white transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                  <span className="text-sm">@kodyazicam</span>
                </a>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side - Auth forms */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-discord-primary rounded-full p-4">
                  <Music2 className="w-10 h-10 text-white" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-white">Discord Music Panel</h1>
            </div>
            
            <Outlet />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 px-6 text-center text-sm text-discord-muted">
        <div className="flex items-center justify-center gap-1 mb-2">
          <span>Made with</span>
          <Heart className="w-4 h-4 text-discord-red fill-current" />
          <span>by</span>
          <a
            href="https://github.com/KodYazicam"
            target="_blank"
            rel="noopener noreferrer"
            className="text-discord-primary hover:text-discord-primary-hover font-medium"
          >
            KodYazicam
          </a>
        </div>
        <div className="flex items-center justify-center gap-4 lg:hidden">
          <a
            href="https://github.com/KodYazicam/discord-music-panel"
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
      </footer>
    </div>
  )
}

export default AuthLayout
