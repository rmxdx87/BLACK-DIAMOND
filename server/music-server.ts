import express from 'express'
import type { Express } from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import type { Socket } from 'socket.io'
import cors from 'cors'

interface Music {
  id: string
  title: string
  artist: string
  category: 'bollywood' | 'bhojpuri' | 'punjabi'
  url: string
  duration: number
  coverImage?: string
}

interface PlayerState {
  currentMusic: Music | null
  isPlaying: boolean
  currentTime: number
  volume: number
  queue: Music[]
  timestamp: number
}

interface AdminSession {
  adminId: string
  connectedAt: number
  lastAction: string
}

const DEFAULT_ADMIN_PASSWORD = 'blackdiamond-admin'
const defaultMusicDatabase: Music[] = [
  {
    id: 'track-aurora',
    title: 'Aurora Drive',
    artist: 'Night Signal',
    category: 'bollywood',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration: 214,
    coverImage: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'track-sunset',
    title: 'Sunset Echo',
    artist: 'Metro Bloom',
    category: 'punjabi',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    duration: 198,
    coverImage: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'track-midnight',
    title: 'Midnight Circuit',
    artist: 'Silver Echo',
    category: 'bhojpuri',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    duration: 232,
    coverImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80',
  },
]

const musicDatabase: Music[] = [...defaultMusicDatabase]

// Global player state
let globalPlayerState: PlayerState = {
  currentMusic: null,
  isPlaying: false,
  currentTime: 0,
  volume: 100,
  queue: [],
  timestamp: Date.now(),
}

// Track admin sessions
const adminSessions = new Map<string, AdminSession>()

export class MusicServer {
  private app: Express
  private httpServer: ReturnType<typeof createServer>
  private io: Server
  private port: number

  constructor(port: number = 3001) {
    this.port = port
    this.app = express()
    this.httpServer = createServer(this.app)
    this.io = new Server(this.httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    })

    this.setupMiddleware()
    this.setupRoutes()
    this.setupSockets()
  }

  private setupMiddleware() {
    this.app.use(cors())
    this.app.use(express.json())
  }

  private requireAdmin(password: string | undefined): boolean {
    const configuredPassword = process.env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD
    return typeof password === 'string' && password === configuredPassword
  }

  private setupRoutes() {
    // Get current player state
    this.app.get('/api/player/state', (req, res) => {
      res.json({
        ...globalPlayerState,
        serverTime: Date.now(),
      })
    })

    // Get music by category
    this.app.get('/api/music/category/:category', (req, res) => {
      const { category } = req.params
      const filtered = musicDatabase.filter(m => m.category === category)
      res.json(filtered)
    })

    // Get all music
    this.app.get('/api/music/all', (req, res) => {
      res.json(musicDatabase)
    })

    this.app.post('/api/music', (req, res) => {
      const adminPassword = req.headers['x-admin-password']
      if (!this.requireAdmin(typeof adminPassword === 'string' ? adminPassword : undefined)) {
        res.status(401).json({ error: 'Admin authentication required to manage music.' })
        return
      }

      const { id, title, artist, category, url, duration, coverImage } = req.body ?? {}
      if (!title || !artist || !url || !category || !['bollywood', 'bhojpuri', 'punjabi'].includes(category)) {
        res.status(400).json({ error: 'Track metadata is incomplete or invalid.' })
        return
      }

      const normalizedId = typeof id === 'string' && id.trim() ? id.trim() : `${title}-${artist}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const track: Music = {
        id: normalizedId,
        title: String(title),
        artist: String(artist),
        category: String(category) as Music['category'],
        url: String(url),
        duration: typeof duration === 'number' ? duration : 0,
        coverImage: typeof coverImage === 'string' ? coverImage : undefined,
      }

      const existingIndex = musicDatabase.findIndex((item) => item.id === track.id)
      if (existingIndex >= 0) {
        musicDatabase.splice(existingIndex, 1, track)
      } else {
        musicDatabase.push(track)
      }

      musicDatabase.sort((left, right) => left.title.localeCompare(right.title))
      res.status(201).json({ ok: true, track, tracks: musicDatabase })
    })

    this.app.delete('/api/music', (req, res) => {
      const adminPassword = req.headers['x-admin-password']
      if (!this.requireAdmin(typeof adminPassword === 'string' ? adminPassword : undefined)) {
        res.status(401).json({ error: 'Admin authentication required to manage music.' })
        return
      }

      const { id } = req.body ?? {}
      if (typeof id !== 'string' || !id.trim()) {
        res.status(400).json({ error: 'Track id is required.' })
        return
      }

      const remaining = musicDatabase.filter((item) => item.id !== id)
      musicDatabase.splice(0, musicDatabase.length, ...remaining)
      res.json({ ok: true, removedId: id, tracks: musicDatabase })
    })

    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        currentlyPlaying: globalPlayerState.currentMusic?.title || 'None',
        connectedClients: this.io.engine.clientsCount,
        adminSessions: adminSessions.size,
      })
    })
  }

  private setupSockets() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`[MusicServer] Client connected: ${socket.id}`)

      // Send current state to new client
      socket.emit('player:state', {
        ...globalPlayerState,
        serverTime: Date.now(),
      })

      // Admin authentication
      socket.on('admin:auth', (data: { adminId: string; password: string }) => {
        const configuredPassword = process.env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD

        if (
          data &&
          typeof data.adminId === 'string' &&
          data.adminId.trim().length > 0 &&
          typeof data.password === 'string' &&
          data.password === configuredPassword
        ) {
          adminSessions.set(socket.id, {
            adminId: data.adminId,
            connectedAt: Date.now(),
            lastAction: 'authenticated',
          })
          socket.join('admin-room')
          socket.emit('admin:authenticated')
          this.broadcast('admin:connected', { adminId: data.adminId })
        } else {
          socket.emit('admin:auth-failed', 'Invalid admin credentials')
        }
      })

      socket.on('admin:logout', () => {
        const admin = adminSessions.get(socket.id)
        if (!admin) return

        adminSessions.delete(socket.id)
        socket.leave('admin-room')
        socket.emit('admin:logged-out')
        this.broadcast('admin:disconnected', { adminId: admin.adminId })
      })

      // Play music
      socket.on('player:play', (data: { musicId: string }) => {
        const music = musicDatabase.find(m => m.id === data.musicId)
        if (music) {
          globalPlayerState.currentMusic = music
          globalPlayerState.isPlaying = true
          globalPlayerState.currentTime = 0
          globalPlayerState.timestamp = Date.now()

          const admin = adminSessions.get(socket.id)
          if (admin) {
            admin.lastAction = `played: ${music.title}`
          }

          this.broadcast('player:playing', {
            music,
            timestamp: Date.now(),
            admin: admin?.adminId,
          })
        }
      })

      // Pause music
      socket.on('player:pause', () => {
        globalPlayerState.isPlaying = false
        globalPlayerState.timestamp = Date.now()

        const admin = adminSessions.get(socket.id)
        this.broadcast('player:paused', {
          timestamp: Date.now(),
          admin: admin?.adminId,
        })
      })

      // Resume music
      socket.on('player:resume', () => {
        globalPlayerState.isPlaying = true
        globalPlayerState.timestamp = Date.now()

        const admin = adminSessions.get(socket.id)
        this.broadcast('player:resumed', {
          timestamp: Date.now(),
          admin: admin?.adminId,
        })
      })

      // Stop music
      socket.on('player:stop', () => {
        globalPlayerState.currentMusic = null
        globalPlayerState.isPlaying = false
        globalPlayerState.currentTime = 0
        globalPlayerState.timestamp = Date.now()

        const admin = adminSessions.get(socket.id)
        this.broadcast('player:stopped', {
          timestamp: Date.now(),
          admin: admin?.adminId,
        })
      })

      // Seek to time
      socket.on('player:seek', (data: { time: number }) => {
        globalPlayerState.currentTime = Math.min(
          data.time,
          globalPlayerState.currentMusic?.duration || 0
        )
        globalPlayerState.timestamp = Date.now()

        const admin = adminSessions.get(socket.id)
        this.broadcast('player:seeked', {
          currentTime: globalPlayerState.currentTime,
          timestamp: Date.now(),
          admin: admin?.adminId,
        })
      })

      // Set volume
      socket.on('player:volume', (data: { volume: number }) => {
        globalPlayerState.volume = Math.max(0, Math.min(100, data.volume))
        globalPlayerState.timestamp = Date.now()

        const admin = adminSessions.get(socket.id)
        this.broadcast('player:volumeChanged', {
          volume: globalPlayerState.volume,
          admin: admin?.adminId,
        })
      })

      // Add to queue
      socket.on('player:queue-add', (data: { musicId: string }) => {
        const music = musicDatabase.find(m => m.id === data.musicId)
        if (music && !globalPlayerState.queue.find(m => m.id === music.id)) {
          globalPlayerState.queue.push(music)
          this.broadcast('player:queueUpdated', {
            queue: globalPlayerState.queue,
          })
        }
      })

      // Clear queue
      socket.on('player:queue-clear', () => {
        globalPlayerState.queue = []
        this.broadcast('player:queueUpdated', { queue: [] })
      })

      // Next in queue
      socket.on('player:next', () => {
        if (globalPlayerState.queue.length > 0) {
          const nextMusic = globalPlayerState.queue.shift()
          if (nextMusic) {
            globalPlayerState.currentMusic = nextMusic
            globalPlayerState.currentTime = 0
            globalPlayerState.timestamp = Date.now()

            const admin = adminSessions.get(socket.id)
            this.broadcast('player:playing', {
              music: nextMusic,
              timestamp: Date.now(),
              admin: admin?.adminId,
            })
          }
        }
      })

      // Disconnect
      socket.on('disconnect', () => {
        adminSessions.delete(socket.id)
        console.log(`[MusicServer] Client disconnected: ${socket.id}`)
        this.broadcast('admin:disconnected', {
          totalAdmins: adminSessions.size,
        })
      })
    })
  }

  private broadcast(event: string, data: unknown) {
    this.io.emit(event, data)
  }

  public start() {
    this.httpServer.listen(this.port, () => {
      console.log(`[MusicServer] Running on port ${this.port}`)
    })
  }

  public getIO() {
    return this.io
  }

  public getPlayerState() {
    return globalPlayerState
  }

  public setPlayerState(state: Partial<PlayerState>) {
    globalPlayerState = { ...globalPlayerState, ...state }
  }
}

// Export for API routes
export { musicDatabase, globalPlayerState }
export type { Music, PlayerState, AdminSession }
