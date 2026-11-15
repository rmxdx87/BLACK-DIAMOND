'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

export interface Music {
  id: string
  title: string
  artist: string
  category: 'bollywood' | 'bhojpuri' | 'punjabi'
  url: string
  duration: number
  coverImage?: string
}

export interface PlayerState {
  currentMusic: Music | null
  isPlaying: boolean
  currentTime: number
  volume: number
  queue: Music[]
}

export function useMusicPlayer(serverUrl: string = 'http://localhost:3001') {
  const socketRef = useRef<Socket | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playerState, setPlayerState] = useState<PlayerState>({
    currentMusic: null,
    isPlaying: false,
    currentTime: 0,
    volume: 100,
    queue: [],
  })
  const [isConnected, setIsConnected] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize socket connection
  useEffect(() => {
    const socket = io(serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    })

    socket.on('connect', () => {
      console.log('[MusicPlayer] Connected to server')
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('[MusicPlayer] Disconnected from server')
      setIsConnected(false)
    })

    // Receive player state updates
    socket.on('player:state', (state: PlayerState & { serverTime: number }) => {
      setPlayerState({
        currentMusic: state.currentMusic,
        isPlaying: state.isPlaying,
        currentTime: state.currentTime,
        volume: state.volume,
        queue: state.queue,
      })

      // Sync audio element
      if (audioRef.current && state.currentMusic) {
        if (state.isPlaying && audioRef.current.paused) {
          audioRef.current.play().catch(e => console.error('[MusicPlayer] Play error:', e))
        } else if (!state.isPlaying && !audioRef.current.paused) {
          audioRef.current.pause()
        }
        audioRef.current.currentTime = state.currentTime
        audioRef.current.volume = state.volume / 100
      }
    })

    socket.on('player:playing', (data: { music: Music; timestamp: number; admin?: string }) => {
      setPlayerState(prev => ({
        ...prev,
        currentMusic: data.music,
        isPlaying: true,
        currentTime: 0,
      }))

      if (audioRef.current) {
        audioRef.current.src = data.music.url
        audioRef.current.currentTime = 0
        audioRef.current.play().catch(e => console.error('[MusicPlayer] Play error:', e))
      }

      if (data.admin) {
        console.log(`[MusicPlayer] Admin ${data.admin} started playing: ${data.music.title}`)
      }
    })

    socket.on('player:paused', () => {
      setPlayerState(prev => ({ ...prev, isPlaying: false }))
      if (audioRef.current) {
        audioRef.current.pause()
      }
    })

    socket.on('player:resumed', () => {
      setPlayerState(prev => ({ ...prev, isPlaying: true }))
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.error('[MusicPlayer] Play error:', e))
      }
    })

    socket.on('player:stopped', () => {
      setPlayerState(prev => ({
        ...prev,
        currentMusic: null,
        isPlaying: false,
        currentTime: 0,
      }))
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    })

    socket.on('player:seeked', (data: { currentTime: number }) => {
      setPlayerState(prev => ({ ...prev, currentTime: data.currentTime }))
      if (audioRef.current) {
        audioRef.current.currentTime = data.currentTime
      }
    })

    socket.on('player:volumeChanged', (data: { volume: number }) => {
      setPlayerState(prev => ({ ...prev, volume: data.volume }))
      if (audioRef.current) {
        audioRef.current.volume = data.volume / 100
      }
    })

    socket.on('player:queueUpdated', (data: { queue: Music[] }) => {
      setPlayerState(prev => ({ ...prev, queue: data.queue }))
    })

    socket.on('admin:authenticated', () => {
      setIsAdmin(true)
      setAuthError(null)
      console.log('[MusicPlayer] Admin authenticated')
    })

    socket.on('admin:auth-failed', (message: string) => {
      setIsAdmin(false)
      setAuthError(message)
    })

    socket.on('admin:logged-out', () => {
      setIsAdmin(false)
    })

    socketRef.current = socket

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
      socket.disconnect()
    }
  }, [serverUrl])

  // Audio element time update
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setPlayerState(prev => ({
        ...prev,
        currentTime: audio.currentTime,
      }))
    }

    const handleEnded = () => {
      socketRef.current?.emit('player:next')
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  // Admin methods
  const play = useCallback(
    (musicId: string) => {
      if (socketRef.current) {
        socketRef.current.emit('player:play', { musicId })
      }
    },
    []
  )

  const pause = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('player:pause')
    }
  }, [])

  const resume = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('player:resume')
    }
  }, [])

  const stop = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('player:stop')
    }
  }, [])

  const seek = useCallback((time: number) => {
    if (socketRef.current) {
      socketRef.current.emit('player:seek', { time })
    }
  }, [])

  const setVolume = useCallback((volume: number) => {
    if (socketRef.current) {
      socketRef.current.emit('player:volume', { volume: Math.max(0, Math.min(100, volume)) })
    }
  }, [])

  const addToQueue = useCallback((musicId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('player:queue-add', { musicId })
    }
  }, [])

  const clearQueue = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('player:queue-clear')
    }
  }, [])

  const next = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('player:next')
    }
  }, [])

  const authenticate = useCallback((adminId: string, password: string) => {
    setAuthError(null)
    if (socketRef.current) {
      socketRef.current.emit('admin:auth', { adminId, password })
    }
  }, [])

  const logout = useCallback(() => {
    socketRef.current?.emit('admin:logout')
    setIsAdmin(false)
  }, [])

  return {
    playerState,
    audioRef,
    isConnected,
    isAdmin,
    authError,
    // Admin controls
    play,
    pause,
    resume,
    stop,
    seek,
    setVolume,
    addToQueue,
    clearQueue,
    next,
    authenticate,
    logout,
  }
}
