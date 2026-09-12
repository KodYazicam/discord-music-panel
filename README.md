# 🎵 Discord Music Bot Management Panel

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-18%2B-green.svg)
![Discord.js](https://img.shields.io/badge/discord.js-v14-blurple.svg)
![Author](https://img.shields.io/badge/Author-KodYazicam-purple.svg)

**Created by [KodYazicam](https://github.com/KodYazicam)** | [Instagram: @4veles](https://instagram.com/4veles)

Multi-instance Discord music bot management panel. Run 1-100+ bots with different prefixes from a single dashboard.

---

## 📋 Table of Contents

1. [Features](#-features)
2. [Requirements](#-requirements)
3. [Installation](#-installation)
4. [Configuration](#-configuration)
5. [Running the Application](#-running-the-application)
6. [Creating a Discord Bot](#-creating-a-discord-bot)
7. [Project Structure](#-project-structure)
8. [File Reference](#-file-reference)
9. [Environment Variables](#-environment-variables)
10. [API Reference](#-api-reference)
11. [WebSocket Events](#-websocket-events)
12. [Commands Reference](#-commands-reference)
13. [Database Schema](#-database-schema)
14. [Customization Guide](#-customization-guide)
15. [Troubleshooting](#-troubleshooting)
16. [License](#-license)

---

## ✨ Features

- **Multi-Bot Support**: Run 1-100+ bots simultaneously
- **Flexible Prefixes**: Slash (`/`), text (`!`, `.`), or both
- **Music Sources**: YouTube, Spotify, SoundCloud
- **Real-time Control**: WebSocket-based live updates
- **Web Dashboard**: React + TailwindCSS interface
- **90+ Settings**: Bot and server customization options

---

## 📦 Requirements

- Node.js 18.0+
- npm 9.0+
- Discord Bot Token(s)

---

## 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/KodYazicam/discord-music-panel.git
cd discord-music-panel

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Create configuration file
cp .env.example .env
```

---

## ⚙️ Configuration

### `.env` File

Create `.env` in the root directory:

```env
PORT=4000
NODE_ENV=development
JWT_SECRET=your-secret-key-minimum-32-characters
DATABASE_PATH=./data/database.sqlite
FRONTEND_URL=http://localhost:3000
```

Install **ffmpeg** on the host. Voice playback also needs `libsodium-wrappers` (already in package.json).

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Backend server port | `4000` | No |
| `NODE_ENV` | Environment mode (`development`/`production`) | `development` | No |
| `JWT_SECRET` | Secret key for JWT authentication (min 32 chars) | - | **Yes** |
| `DATABASE_PATH` | SQLite database file location | `./data/database.sqlite` | No |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` | No |

---

## ▶️ Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Production Mode

```bash
# Build frontend
cd frontend
npm run build
cd ..

# Start backend
npm start
```

**Access Points:**
- Backend API: `http://localhost:3000`
- Frontend Dashboard: `http://localhost:5173`

---

## 🤖 Creating a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** → Enter name → Create
3. Go to **Bot** section
4. Click **Reset Token** → Copy and save the token
5. Enable **Privileged Gateway Intents**:
   - Presence Intent
   - Server Members Intent
   - Message Content Intent (required for text commands)
6. Go to **OAuth2 → URL Generator**
7. Select scopes: `bot`, `applications.commands`
8. Select permissions: `Administrator` (or individual permissions)
9. Copy URL and invite bot to your server

---

## 📁 Project Structure

```
discord-music-panel/
├── .env                          # Environment configuration
├── .env.example                  # Example configuration
├── .gitignore                    # Git ignore rules
├── package.json                  # Backend dependencies
├── LICENSE                       # MIT License
├── CONTRIBUTING.md               # Contribution guidelines
├── README.md                     # This file
│
├── src/                          # Backend source code
│   ├── index.js                  # Main entry point
│   ├── api/
│   │   ├── routes.js             # REST API endpoints
│   │   └── socket.js             # WebSocket event handlers
│   ├── bot/
│   │   ├── BotManager.js         # Multi-bot instance manager
│   │   ├── MusicBot.js           # Individual bot logic
│   │   ├── MusicQueue.js         # Queue management system
│   │   └── commands/
│   │       ├── index.js          # Command loader
│   │       ├── slash/            # Slash commands
│   │       └── text/             # Text prefix commands
│   ├── database/
│   │   └── db.js                 # SQLite database setup
│   └── utils/
│       └── Logger.js             # Logging utility
│
└── frontend/                     # React frontend
    ├── package.json              # Frontend dependencies
    ├── index.html                # HTML template
    ├── vite.config.js            # Vite configuration
    ├── tailwind.config.js        # TailwindCSS configuration
    └── src/
        ├── App.jsx               # Main React component
        ├── main.jsx              # React entry point
        ├── index.css             # Global styles
        ├── layouts/
        │   ├── AuthLayout.jsx    # Login/Register layout
        │   └── DashboardLayout.jsx # Main dashboard layout
        ├── pages/
        │   ├── Dashboard.jsx     # Home page
        │   ├── Bots.jsx          # Bot list
        │   ├── BotDetail.jsx     # Single bot view
        │   ├── BotSettings.jsx   # Bot configuration (7 tabs)
        │   ├── Guilds.jsx        # Server list
        │   ├── GuildDetail.jsx   # Single server view
        │   ├── GuildSettings.jsx # Server configuration (8 tabs)
        │   ├── MusicControl.jsx  # Music player interface
        │   ├── Playlists.jsx     # Playlist management
        │   ├── Statistics.jsx    # Usage statistics
        │   ├── Settings.jsx      # User settings
        │   └── auth/
        │       ├── Login.jsx     # Login page
        │       └── Register.jsx  # Registration page
        ├── stores/
        │   ├── authStore.js      # Authentication state
        │   ├── botStore.js       # Bot data state
        │   └── musicStore.js     # Music playback state
        └── utils/
            ├── api.js            # API client (axios)
            └── socket.js         # WebSocket client
```

---

## 📄 File Reference

### Backend Files

#### `src/index.js`
Main entry point. Starts Express server and initializes components.

**Key Variables:**
```javascript
const PORT = process.env.PORT || 3000;  // Server port
```

**Modification:** Change port in `.env` file.

---

#### `src/api/routes.js`
REST API endpoints.

**Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/bots` | List all bots |
| GET | `/api/bots/:id` | Get single bot |
| POST | `/api/bots` | Create bot |
| PUT | `/api/bots/:id` | Update bot |
| DELETE | `/api/bots/:id` | Delete bot |
| POST | `/api/bots/:id/start` | Start bot |
| POST | `/api/bots/:id/stop` | Stop bot |
| GET | `/api/bots/:id/guilds` | Get bot's servers |
| POST | `/api/music/:botId/:guildId/play` | Play track |
| POST | `/api/music/:botId/:guildId/pause` | Pause |
| POST | `/api/music/:botId/:guildId/resume` | Resume |
| POST | `/api/music/:botId/:guildId/skip` | Skip track |
| POST | `/api/music/:botId/:guildId/stop` | Stop playback |
| POST | `/api/music/:botId/:guildId/volume` | Set volume |
| GET | `/api/music/:botId/:guildId/queue` | Get queue |

**Adding a new endpoint:**
```javascript
router.get('/api/custom', authenticate, async (req, res) => {
  // Your code here
  res.json({ success: true });
});
```

---

#### `src/api/socket.js`
WebSocket event handlers.

**Events:**
| Event | Direction | Description |
|-------|-----------|-------------|
| `join-bot` | Client → Server | Subscribe to bot updates |
| `leave-bot` | Client → Server | Unsubscribe |
| `bot-status` | Server → Client | Bot online/offline |
| `queue-update` | Server → Client | Queue changed |
| `track-start` | Server → Client | New track started |
| `track-end` | Server → Client | Track finished |

---

#### `src/bot/BotManager.js`
Manages multiple bot instances.

**Key Variables:**
```javascript
this.bots = new Map();  // Stores all bot instances
```

**Key Methods:**
| Method | Description |
|--------|-------------|
| `createBot(config)` | Create new bot instance |
| `startBot(botId)` | Start a bot |
| `stopBot(botId)` | Stop a bot |
| `getBot(botId)` | Get bot instance |
| `getAllBots()` | Get all bots |
| `deleteBot(botId)` | Delete a bot |

**Adding a new method:**
```javascript
async customMethod(botId) {
  const bot = this.bots.get(botId);
  if (!bot) return null;
  // Your code here
  return result;
}
```

---

#### `src/bot/MusicBot.js`
Individual bot logic.

**Constructor Parameters:**
```javascript
{
  id: string,           // Bot ID in database
  token: string,        // Discord bot token
  prefix: string,       // Text command prefix (e.g., "!")
  prefixType: string,   // "slash", "text", or "both"
  name: string          // Display name
}
```

**Key Variables:**
```javascript
this.client = new Client();     // Discord.js client
this.queues = new Map();        // Music queues per guild
this.prefix = config.prefix;    // Command prefix
this.prefixType = config.prefixType;
```

**Key Methods:**
| Method | Description |
|--------|-------------|
| `start()` | Connect bot to Discord |
| `stop()` | Disconnect bot |
| `getQueue(guildId)` | Get queue for a server |
| `play(guildId, query, member)` | Play a track |
| `pause(guildId)` | Pause playback |
| `resume(guildId)` | Resume playback |
| `skip(guildId)` | Skip to next track |
| `stop(guildId)` | Stop playback |
| `setVolume(guildId, volume)` | Set volume (0-200) |
| `shuffle(guildId)` | Shuffle queue |
| `setLoop(guildId, mode)` | Set loop mode |

**Modifying bot behavior:**
```javascript
// In MusicBot.js constructor, add event handlers:
this.client.on('messageCreate', async (message) => {
  // Your custom message handling
});
```

---

#### `src/bot/MusicQueue.js`
Queue management for each server.

**Key Variables:**
```javascript
this.tracks = [];           // Array of tracks
this.currentIndex = 0;      // Current track index
this.isPlaying = false;     // Playback state
this.volume = 100;          // Volume level (0-200)
this.loopMode = 'off';      // "off", "track", "queue"
```

**Track Object Structure:**
```javascript
{
  title: string,        // Track title
  url: string,          // Original URL
  duration: number,     // Duration in seconds
  thumbnail: string,    // Thumbnail URL
  requestedBy: {
    id: string,         // User ID
    username: string,   // Username
    avatar: string      // Avatar URL
  }
}
```

**Key Methods:**
| Method | Description |
|--------|-------------|
| `addTrack(track)` | Add track to queue |
| `removeTrack(index)` | Remove track by index |
| `clear()` | Clear entire queue |
| `shuffle()` | Randomize queue |
| `getCurrentTrack()` | Get current track |
| `getNextTrack()` | Get next track |
| `setLoop(mode)` | Set loop mode |

---

#### `src/bot/commands/index.js`
Command loader.

**Loading custom commands:**
```javascript
// Commands are auto-loaded from slash/ and text/ directories
// File name = command name (e.g., play.js = "play" command)
```

---

#### `src/bot/commands/slash/play.js`
Example slash command structure.

**Structure:**
```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('Song name or URL')
        .setRequired(true)),
  
  async execute(interaction, bot) {
    const query = interaction.options.getString('query');
    // Command logic here
  }
};
```

---

#### `src/bot/commands/text/play.js`
Example text command structure.

**Structure:**
```javascript
module.exports = {
  name: 'play',
  aliases: ['p'],
  description: 'Play a song',
  usage: '<song name or URL>',
  
  async execute(message, args, bot) {
    const query = args.join(' ');
    // Command logic here
  }
};
```

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Command name |
| `aliases` | array | Alternative names |
| `description` | string | Help text |
| `usage` | string | Usage syntax |
| `execute` | function | Command logic |

---

#### `src/database/db.js`
SQLite database setup.

**Tables:**
| Table | Description |
|-------|-------------|
| `users` | User accounts |
| `bots` | Bot configurations |
| `guild_settings` | Per-server settings |
| `playlists` | Saved playlists |

**Modifying database:**
```javascript
// Add new table:
db.exec(`
  CREATE TABLE IF NOT EXISTS custom_table (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
```

---

#### `src/utils/Logger.js`
Logging utility using Winston.

**Log Levels:**
| Level | Method | Description |
|-------|--------|-------------|
| error | `Logger.error()` | Error messages |
| warn | `Logger.warn()` | Warnings |
| info | `Logger.info()` | Information |
| debug | `Logger.debug()` | Debug messages |

**Usage:**
```javascript
const Logger = require('./utils/Logger');
Logger.info('Server started');
Logger.error('Something went wrong', error);
```

---

### Frontend Files

#### `frontend/src/App.jsx`
Main React component with routing.

**Routes:**
| Path | Component | Description |
|------|-----------|-------------|
| `/login` | Login | Login page |
| `/register` | Register | Registration page |
| `/dashboard` | Dashboard | Home page |
| `/bots` | Bots | Bot list |
| `/bots/:id` | BotDetail | Bot details |
| `/bots/:id/settings` | BotSettings | Bot configuration |
| `/guilds` | Guilds | Server list |
| `/guilds/:botId/:guildId` | GuildDetail | Server details |
| `/guilds/:botId/:guildId/settings` | GuildSettings | Server configuration |
| `/music/:botId/:guildId` | MusicControl | Music player |
| `/playlists` | Playlists | Playlist management |
| `/statistics` | Statistics | Usage stats |
| `/settings` | Settings | User settings |

**Adding a new route:**
```jsx
<Route path="/custom" element={<CustomPage />} />
```

---

#### `frontend/src/stores/authStore.js`
Authentication state management using Zustand.

**State:**
```javascript
{
  user: null,           // Current user object
  token: null,          // JWT token
  isAuthenticated: false
}
```

**Actions:**
| Action | Description |
|--------|-------------|
| `login(credentials)` | Login user |
| `register(data)` | Register user |
| `logout()` | Logout user |
| `loadUser()` | Load user from token |

---

#### `frontend/src/stores/botStore.js`
Bot data state management.

**State:**
```javascript
{
  bots: [],             // All bots
  currentBot: null,     // Selected bot
  loading: false
}
```

**Actions:**
| Action | Description |
|--------|-------------|
| `fetchBots()` | Load all bots |
| `fetchBot(id)` | Load single bot |
| `createBot(data)` | Create new bot |
| `updateBot(id, data)` | Update bot |
| `deleteBot(id)` | Delete bot |
| `startBot(id)` | Start bot |
| `stopBot(id)` | Stop bot |

---

#### `frontend/src/stores/musicStore.js`
Music playback state.

**State:**
```javascript
{
  queue: [],            // Current queue
  currentTrack: null,   // Now playing
  isPlaying: false,
  volume: 100,
  loopMode: 'off'
}
```

**Actions:**
| Action | Description |
|--------|-------------|
| `play(query)` | Play track |
| `pause()` | Pause playback |
| `resume()` | Resume playback |
| `skip()` | Skip track |
| `stop()` | Stop playback |
| `setVolume(level)` | Set volume |
| `shuffle()` | Shuffle queue |
| `setLoop(mode)` | Set loop mode |
| `removeTrack(index)` | Remove from queue |
| `clearQueue()` | Clear queue |

---

#### `frontend/src/utils/api.js`
Axios API client.

**Configuration:**
```javascript
const API_URL = 'http://localhost:3000/api';
```

**Change API URL:** Edit `API_URL` constant.

**Usage:**
```javascript
import api from '../utils/api';

// GET request
const response = await api.get('/bots');

// POST request
const response = await api.post('/bots', { name: 'My Bot' });
```

---

#### `frontend/src/utils/socket.js`
Socket.IO client.

**Configuration:**
```javascript
const SOCKET_URL = 'http://localhost:3000';
```

**Usage:**
```javascript
import { socket, initSocket, disconnectSocket } from '../utils/socket';

// Initialize connection
initSocket();

// Listen to events
socket.on('queue-update', (data) => {
  console.log('Queue updated:', data);
});

// Emit events
socket.emit('join-bot', { botId: '123' });
```

---

#### `frontend/src/pages/BotSettings.jsx`
Bot configuration page with 7 tabs.

**Tabs:**
| Tab | Settings |
|-----|----------|
| General | Name, token, prefix type, prefix, status, activity |
| Music | Default volume, max volume, queue size, track duration, auto-play, loop mode |
| Voice | Auto-leave, leave delay, auto-pause, 24/7 mode |
| DJ Mode | Enable/disable, DJ role, restricted commands |
| Embeds | Color, thumbnails, compact mode, buttons |
| Restrictions | Allowed channels, blocked channels, allowed roles |
| Advanced | Caching, logging, log channel |

---

#### `frontend/src/pages/GuildSettings.jsx`
Server configuration page with 8 tabs.

**Tabs:**
| Tab | Settings |
|-----|----------|
| General | Enable bot, language, timezone |
| Music | Volume, queue size, playlists, live streams, vote skip |
| Voice | Auto-leave, default channel |
| DJ Mode | Server-specific DJ settings |
| Channels | Allowed/blocked text and voice channels |
| Roles | Allowed/blocked roles and users |
| Appearance | Embed color, thumbnails, delete commands |
| Auto-DJ | Enable, playlist URL, shuffle, welcome message |

---

## 🌐 API Reference

### Authentication

**Register:**
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "user123",
  "email": "user@example.com",
  "password": "password123"
}
```

**Login:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "user123",
  "password": "password123"
}

Response:
{
  "token": "jwt-token-here",
  "user": { "id": 1, "username": "user123" }
}
```

### Bots

**Create Bot:**
```http
POST /api/bots
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Music Bot",
  "token": "discord-bot-token",
  "prefix": "!",
  "prefixType": "both"
}
```

**Start Bot:**
```http
POST /api/bots/:id/start
Authorization: Bearer <token>
```

### Music

**Play Track:**
```http
POST /api/music/:botId/:guildId/play
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "never gonna give you up",
  "voiceChannelId": "123456789"
}
```

**Set Volume:**
```http
POST /api/music/:botId/:guildId/volume
Authorization: Bearer <token>
Content-Type: application/json

{
  "volume": 80
}
```

---

## 📡 WebSocket Events

### Client → Server

**Join Bot Room:**
```javascript
socket.emit('join-bot', { botId: 'bot-id' });
```

**Leave Bot Room:**
```javascript
socket.emit('leave-bot', { botId: 'bot-id' });
```

### Server → Client

**Bot Status Update:**
```javascript
socket.on('bot-status', (data) => {
  // data = { botId: 'id', status: 'online'/'offline' }
});
```

**Queue Update:**
```javascript
socket.on('queue-update', (data) => {
  // data = { botId, guildId, queue: [...tracks] }
});
```

**Track Start:**
```javascript
socket.on('track-start', (data) => {
  // data = { botId, guildId, track: {...} }
});
```

---

## 🎹 Commands Reference

### Slash Commands

| Command | Description | Options |
|---------|-------------|---------|
| `/play <query>` | Play a song | query: Song name or URL |
| `/pause` | Pause playback | - |
| `/resume` | Resume playback | - |
| `/skip` | Skip current track | - |
| `/stop` | Stop and clear queue | - |
| `/queue` | View queue | - |
| `/nowplaying` | Show current track | - |
| `/volume <level>` | Set volume | level: 0-200 |
| `/shuffle` | Shuffle queue | - |
| `/loop <mode>` | Set loop mode | mode: off/track/queue |
| `/remove <position>` | Remove from queue | position: Track number |
| `/clear` | Clear queue | - |
| `/help` | Show commands | - |

### Text Commands

With prefix `!` (configurable):

| Command | Aliases | Description |
|---------|---------|-------------|
| `!play <query>` | `!p` | Play a song |
| `!pause` | - | Pause playback |
| `!resume` | - | Resume playback |
| `!skip` | `!s` | Skip track |
| `!stop` | - | Stop playback |
| `!queue` | `!q` | View queue |
| `!nowplaying` | `!np` | Show current track |
| `!volume <level>` | `!vol` | Set volume |
| `!shuffle` | - | Shuffle queue |
| `!loop <mode>` | - | Set loop mode |
| `!remove <pos>` | - | Remove from queue |
| `!clear` | - | Clear queue |
| `!search <query>` | - | Search for songs |
| `!lyrics` | - | Get lyrics |
| `!leave` | - | Disconnect bot |
| `!seek <seconds>` | - | Seek position |
| `!jump <position>` | - | Jump to track |
| `!move <from> <to>` | - | Move track |
| `!help` | - | Show commands |

---

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Bots Table
```sql
CREATE TABLE bots (
  id TEXT PRIMARY KEY,
  user_id INTEGER,
  name TEXT NOT NULL,
  token TEXT NOT NULL,
  prefix TEXT DEFAULT '!',
  prefix_type TEXT DEFAULT 'both',
  status TEXT DEFAULT 'offline',
  settings TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Guild Settings Table
```sql
CREATE TABLE guild_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_id TEXT,
  guild_id TEXT,
  settings TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES bots(id)
);
```

### Playlists Table
```sql
CREATE TABLE playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  name TEXT NOT NULL,
  tracks TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 🎨 Customization Guide

### Changing Default Volume
**File:** `src/bot/MusicQueue.js`
```javascript
// Line 6
this.volume = 100;  // Change to desired default (0-200)
```

### Changing Default Prefix
**File:** `src/bot/MusicBot.js`
```javascript
// In constructor
this.prefix = config.prefix || '!';  // Change default prefix
```

### Adding New Command

**Slash Command:** Create `src/bot/commands/slash/custom.js`
```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('custom')
    .setDescription('My custom command'),
  
  async execute(interaction, bot) {
    await interaction.reply('Hello from custom command!');
  }
};
```

**Text Command:** Create `src/bot/commands/text/custom.js`
```javascript
module.exports = {
  name: 'custom',
  aliases: ['c'],
  description: 'My custom command',
  
  async execute(message, args, bot) {
    await message.reply('Hello from custom command!');
  }
};
```

### Changing Embed Color
**File:** `src/bot/MusicBot.js`

Find embed creation and change color:
```javascript
const embed = new EmbedBuilder()
  .setColor('#5865F2')  // Change this hex color
  .setTitle('Title');
```

### Adding New API Endpoint
**File:** `src/api/routes.js`
```javascript
router.get('/api/custom', authenticate, async (req, res) => {
  try {
    // Your logic here
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Adding New Frontend Page

1. Create `frontend/src/pages/CustomPage.jsx`:
```jsx
function CustomPage() {
  return (
    <div>
      <h1>Custom Page</h1>
    </div>
  );
}

export default CustomPage;
```

2. Add route in `frontend/src/App.jsx`:
```jsx
import CustomPage from './pages/CustomPage';

// In routes:
<Route path="/custom" element={<CustomPage />} />
```

3. Add navigation in `frontend/src/layouts/DashboardLayout.jsx`:
```javascript
const navigation = [
  // ... existing items
  { name: 'Custom', href: '/custom', icon: CustomIcon },
];
```

---

## 🔧 Troubleshooting

### Bot doesn't respond to commands

1. Check MESSAGE CONTENT INTENT is enabled in Discord Developer Portal
2. Verify correct prefix in bot settings
3. Check bot has permissions in the channel

### "Invalid token" error

1. Go to Discord Developer Portal
2. Bot section → Reset Token
3. Copy new token
4. Update in dashboard

### Cannot connect to voice channel

1. Bot needs Connect and Speak permissions
2. Check voice channel isn't full
3. Verify @discordjs/voice is installed

### Frontend shows "Cannot connect to server"

1. Make sure backend is running (`npm run dev`)
2. Check PORT in `.env` matches
3. Verify CORS settings allow frontend URL

### Music is laggy

1. Check internet connection
2. Try different Discord voice region
3. Restart bot

### Database errors

1. Delete `data/database.sqlite`
2. Restart backend (database will be recreated)

---

## 👤 Author

**KodYazicam**

- 🐙 GitHub: [@KodYazicam](https://github.com/KodYazicam)
- 📸 Instagram: [@4veles](https://instagram.com/4veles)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Repository:** [https://github.com/KodYazicam/discord-music-panel](https://github.com/KodYazicam/discord-music-panel)
