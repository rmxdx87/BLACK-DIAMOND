"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react"
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Music2,
  Pause,
  Play,
  Power,
  Repeat,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { onValue, ref } from "firebase/database"
import { Button } from "@/components/ui/button"
import {
  describeYouTubePlayerError,
  getOrCreateYouTubePlayer,
  getSharedYouTubePlayer,
  isValidYouTubePlaylistId,
  isValidYouTubeVideoId,
  parseYouTubePlaylistInput,
  parseYouTubeVideoInput,
  type YouTubePlayer,
  type YouTubePlayerEvent,
} from "@/lib/youtube-iframe-api"
import { UserMusicPlayer as ServerMusicPlayer } from "@/components/user-music-player"
import { database } from "@/lib/firebase"
import {
  YOUTUBE_MUSIC_COMMAND_EVENT,
  YOUTUBE_MUSIC_STATE_EVENT,
  type YouTubeMusicCommand,
  type YouTubeMusicStatus,
} from "@/lib/youtube-music-events"

interface MusicPreferences {
  playlistId: string
  videoId: string
  enabled: boolean
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: boolean
  collapsed: boolean
}

interface TrackDetails {
  title: string
  videoId: string | null
}

interface PlayerSnapshot {
  isPlaying: boolean
  currentTime: number
  duration: number
  track: TrackDetails | null
}

interface StoredPreferences {
  preferences: MusicPreferences
  warning: string | null
}

const STORAGE_KEY = "myhack:youtube-music"
const STORAGE_VERSION = 3
const INITIAL_PLAYLIST_ID = process.env.NEXT_PUBLIC_YOUTUBE_MUSIC_PLAYLIST_ID?.trim() ?? ""
const DEFAULT_PREFERENCES: MusicPreferences = {
  playlistId: isValidYouTubePlaylistId(INITIAL_PLAYLIST_ID) ? INITIAL_PLAYLIST_ID : "",
  videoId: "",
  enabled: true,
  volume: 35,
  muted: false,
  shuffle: false,
  repeat: false,
  collapsed: true,
}

const subscribeToMountedState = () => () => {}
const getMountedSnapshot = () => true
const getServerMountedSnapshot = () => false

function readStoredPreferences(): StoredPreferences {
  if (typeof window === "undefined") {
    return { preferences: DEFAULT_PREFERENCES, warning: null }
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return { preferences: DEFAULT_PREFERENCES, warning: null }

    const value: unknown = JSON.parse(stored)
    if (!value || typeof value !== "object") {
      return {
        preferences: DEFAULT_PREFERENCES,
        warning: "Saved music preferences were invalid; defaults are being used.",
      }
    }

    const saved = value as Partial<MusicPreferences> & { version?: number }
    const hasInvalidPlaylistId = typeof saved.playlistId === "string"
      && saved.playlistId.length > 0
      && !isValidYouTubePlaylistId(saved.playlistId)
    const playlistId = typeof saved.playlistId === "string" && isValidYouTubePlaylistId(saved.playlistId)
      ? saved.playlistId.trim()
      : DEFAULT_PREFERENCES.playlistId
    const hasInvalidVideoId = typeof saved.videoId === "string"
      && saved.videoId.length > 0
      && !isValidYouTubeVideoId(saved.videoId)
    const videoId = playlistId
      ? ""
      : typeof saved.videoId === "string" && isValidYouTubeVideoId(saved.videoId)
        ? saved.videoId.trim()
        : DEFAULT_PREFERENCES.videoId
    return {
      preferences: {
        playlistId,
        videoId,
        enabled: typeof saved.enabled === "boolean" ? saved.enabled : DEFAULT_PREFERENCES.enabled,
        volume: typeof saved.volume === "number" && Number.isFinite(saved.volume)
          ? Math.max(0, Math.min(100, saved.volume))
          : DEFAULT_PREFERENCES.volume,
        muted: typeof saved.muted === "boolean" ? saved.muted : DEFAULT_PREFERENCES.muted,
        shuffle: typeof saved.shuffle === "boolean" ? saved.shuffle : DEFAULT_PREFERENCES.shuffle,
        repeat: typeof saved.repeat === "boolean" ? saved.repeat : DEFAULT_PREFERENCES.repeat,
        collapsed: saved.version === STORAGE_VERSION && typeof saved.collapsed === "boolean"
          ? saved.collapsed
          : DEFAULT_PREFERENCES.collapsed,
      },
      warning: hasInvalidPlaylistId || hasInvalidVideoId
        ? "The saved YouTube media ID was invalid; configure a valid playlist or video URL."
        : null,
    }
  } catch {
    return {
      preferences: DEFAULT_PREFERENCES,
      warning: "Music preferences could not be read from this browser.",
    }
  }
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`
}

function getVideoId(player: YouTubePlayer): string | null {
  const data = player.getVideoData()
  if (data.video_id) return data.video_id

  try {
    const url = new URL(player.getVideoUrl())
    return url.searchParams.get("v")
  } catch {
    return null
  }
}

function getConfiguredMediaKey(preferences: MusicPreferences): string | null {
  if (isValidYouTubePlaylistId(preferences.playlistId)) return `playlist:${preferences.playlistId}`
  if (isValidYouTubeVideoId(preferences.videoId)) return `video:${preferences.videoId}`
  return null
}

export function YouTubeMusicPlayer() {
  const pathname = usePathname()
  const isMusicDashboard = pathname === "/music"
  const [storedPreferences] = useState(readStoredPreferences)
  const [preferences, setPreferences] = useState(storedPreferences.preferences)
  const [storageWarning, setStorageWarning] = useState(storedPreferences.warning)
  const [playlistDraft, setPlaylistDraft] = useState(
    storedPreferences.preferences.playlistId
    || (storedPreferences.preferences.videoId
      ? `https://www.youtube.com/watch?v=${storedPreferences.preferences.videoId}`
      : ""),
  )
  const [isReady, setIsReady] = useState(false)
  const [retryAttempt, setRetryAttempt] = useState(0)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showServerPlayer, setShowServerPlayer] = useState(false)
  const [snapshot, setSnapshot] = useState<PlayerSnapshot>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    track: null,
  })

  const playerHostRef = useRef<HTMLDivElement>(null)
  const preferencesRef = useRef(preferences)
  const serverPlayerVisibleRef = useRef(showServerPlayer)
  const loadedMediaKeyRef = useRef<string | null>(null)
  const dashboardCommandRef = useRef<(command: YouTubeMusicCommand) => void>(() => {})
  const configuredMediaKey = getConfiguredMediaKey(preferences)

  const isClientMounted = useSyncExternalStore(
    subscribeToMountedState,
    getMountedSnapshot,
    getServerMountedSnapshot,
  )

  const persistPreferences = useCallback((next: MusicPreferences) => {
    preferencesRef.current = next
    setPreferences(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...next, version: STORAGE_VERSION }))
      setStorageWarning(null)
    } catch {
      setStorageWarning("Music playback works, but preferences could not be saved in this browser.")
    }
  }, [])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved) as { version?: number }
      if (parsed.version !== STORAGE_VERSION) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...preferences, version: STORAGE_VERSION }))
      }
    } catch (error) {
      console.error("[YouTubeMusicPlayer] Could not migrate saved music preferences:", error)
    }
  }, [preferences])

  const loadPlaylist = useCallback((player: YouTubePlayer, playlistId: string, play: boolean) => {
    if (!isValidYouTubePlaylistId(playlistId)) return

    const playlist = { listType: "playlist" as const, list: playlistId, index: 0 }
    loadedMediaKeyRef.current = `playlist:${playlistId}`
    setError(null)
    setAutoplayBlocked(false)
    if (play) {
      player.loadPlaylist(playlist)
      player.playVideo()
    } else {
      player.cuePlaylist(playlist)
    }
    player.setShuffle(preferencesRef.current.shuffle)
    player.setLoop(preferencesRef.current.repeat)
  }, [])

  const loadVideo = useCallback((player: YouTubePlayer, videoId: string, play: boolean) => {
    if (!isValidYouTubeVideoId(videoId)) return

    loadedMediaKeyRef.current = `video:${videoId}`
    setError(null)
    setAutoplayBlocked(false)
    if (play) player.loadVideoById(videoId)
    else player.cueVideoById(videoId)
  }, [])

  const loadConfiguredMedia = useCallback((
    player: YouTubePlayer,
    current: MusicPreferences,
    play: boolean,
  ) => {
    if (isValidYouTubePlaylistId(current.playlistId)) {
      loadPlaylist(player, current.playlistId, play)
    } else if (isValidYouTubeVideoId(current.videoId)) {
      loadVideo(player, current.videoId, play)
    }
  }, [loadPlaylist, loadVideo])

  useEffect(() => {
    if (!database) return
    return onValue(ref(database, "settings/sharedMusic"), (snapshot) => {
      const shared = snapshot.val() as { playlistId?: unknown; videoId?: unknown } | null
      if (!shared) return
      const playlistId = typeof shared.playlistId === "string" && isValidYouTubePlaylistId(shared.playlistId) ? shared.playlistId : ""
      const videoId = typeof shared.videoId === "string" && isValidYouTubeVideoId(shared.videoId) ? shared.videoId : ""
      if (!playlistId && !videoId) return
      const next = { ...preferencesRef.current, playlistId, videoId, enabled: true }
      persistPreferences(next)
      const player = getSharedYouTubePlayer()
      if (player && !showServerPlayer) loadConfiguredMedia(player, next, true)
    }, (listenerError) => {
      console.error("[YouTubeMusicPlayer] Could not sync admin music selection:", listenerError)
    })
  }, [loadConfiguredMedia, persistPreferences, showServerPlayer])

  const updateSnapshot = useCallback((player: YouTubePlayer) => {
    const video = player.getVideoData()
    const videoId = getVideoId(player)
    const title = video.title?.trim()
    setSnapshot({
      isPlaying: player.getPlayerState() === 1,
      currentTime: player.getCurrentTime(),
      duration: player.getDuration(),
      track: title || videoId ? { title: title || "Track information unavailable", videoId } : null,
    })
  }, [])

  const handleReady = useCallback((player: YouTubePlayer) => {
    setIsReady(true)
    player.setVolume(preferencesRef.current.volume)
    if (preferencesRef.current.muted) player.mute()
    else player.unMute()
    loadConfiguredMedia(
      player,
      preferencesRef.current,
      preferencesRef.current.enabled && !serverPlayerVisibleRef.current,
    )
    updateSnapshot(player)
  }, [loadConfiguredMedia, updateSnapshot])

  const handleStateChange = useCallback((event: YouTubePlayerEvent) => {
    if (event.data === 1) {
      setAutoplayBlocked(false)
      setError(null)
    }
    updateSnapshot(event.target)
  }, [updateSnapshot])

  const handleError = useCallback((event: YouTubePlayerEvent) => {
    setError(describeYouTubePlayerError(event.data))
  }, [])

  const handleAutoplayBlocked = useCallback(() => {
    setAutoplayBlocked(true)
  }, [])

  const handlersRef = useRef({
    onReady: handleReady,
    onStateChange: handleStateChange,
    onError: handleError,
    onAutoplayBlocked: handleAutoplayBlocked,
  })

  useEffect(() => {
    handlersRef.current = {
      onReady: handleReady,
      onStateChange: handleStateChange,
      onError: handleError,
      onAutoplayBlocked: handleAutoplayBlocked,
    }
  }, [handleAutoplayBlocked, handleError, handleReady, handleStateChange])

  useEffect(() => {
    if (!isClientMounted || !configuredMediaKey || !playerHostRef.current) return
    let cancelled = false
    setError(null)

    void getOrCreateYouTubePlayer(playerHostRef.current, {
      width: Math.max(200, Math.min(320, playerHostRef.current.clientWidth || 320)),
      height: 200,
      playerVars: {
        controls: 1,
        enablejsapi: 1,
        fs: 1,
        origin: window.location.origin,
        playsinline: 1,
      },
      events: {
        onReady: (event) => handlersRef.current.onReady(event.target),
        onStateChange: (event) => handlersRef.current.onStateChange(event),
        onError: (event) => handlersRef.current.onError(event),
        onAutoplayBlocked: () => handlersRef.current.onAutoplayBlocked(),
      },
    })
      .then((player) => {
        if (cancelled) return
        setIsReady(true)
        if (loadedMediaKeyRef.current !== getConfiguredMediaKey(preferencesRef.current)) {
          loadConfiguredMedia(
            player,
            preferencesRef.current,
            preferencesRef.current.enabled && !serverPlayerVisibleRef.current,
          )
        }
        updateSnapshot(player)
      })
      .catch((loadError: unknown) => {
        if (cancelled) return
        setError(loadError instanceof Error ? loadError.message : "The YouTube player could not be initialized.")
      })

    return () => {
      cancelled = true
    }
  }, [configuredMediaKey, isClientMounted, loadConfiguredMedia, retryAttempt, updateSnapshot])

  useEffect(() => {
    if (!isReady) return
    const intervalId = window.setInterval(() => {
      const player = getSharedYouTubePlayer()
      if (player) updateSnapshot(player)
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [isReady, updateSnapshot])

  const handlePlaylistSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const playlistId = parseYouTubePlaylistInput(playlistDraft)
    const videoId = playlistId ? null : parseYouTubeVideoInput(playlistDraft)
    if (!playlistId && !videoId) {
      setError("Enter a valid YouTube playlist ID, playlist URL, or video URL.")
      return
    }

    const next = {
      ...preferences,
      playlistId: playlistId ?? "",
      videoId: videoId ?? "",
    }
    setPlaylistDraft(playlistId ?? `https://www.youtube.com/watch?v=${videoId}`)
    persistPreferences(next)
    setError(null)
    const player = getSharedYouTubePlayer()
    if (player) {
      loadConfiguredMedia(player, next, next.enabled && !showServerPlayer)
      setIsReady(true)
    }
  }

  const toggleEnabled = useCallback(() => {
    const enabled = !preferences.enabled
    const next = { ...preferences, enabled }
    persistPreferences(next)

    const player = getSharedYouTubePlayer()
    if (!enabled) {
      player?.stopVideo()
      setAutoplayBlocked(false)
      return
    }

    if (!showServerPlayer && player && isReady) {
      if (loadedMediaKeyRef.current !== getConfiguredMediaKey(next)) {
        loadConfiguredMedia(player, next, true)
      }
      else player.playVideo()
    }
  }, [isReady, loadConfiguredMedia, persistPreferences, preferences, showServerPlayer])

  const toggleServerPlayer = () => {
    const nextVisible = !showServerPlayer
    serverPlayerVisibleRef.current = nextVisible
    setShowServerPlayer(nextVisible)
    if (nextVisible) getSharedYouTubePlayer()?.pauseVideo()
  }

  const changeVolume = useCallback((volume: number) => {
    const next = { ...preferences, volume, muted: volume === 0 }
    persistPreferences(next)
    const player = getSharedYouTubePlayer()
    if (volume === 0) player?.mute()
    else {
      player?.setVolume(volume)
      if (preferences.muted) player?.unMute()
    }
  }, [persistPreferences, preferences])

  const toggleMute = useCallback(() => {
    const muted = !preferences.muted
    const volume = !muted && preferences.volume === 0 ? 35 : preferences.volume
    persistPreferences({ ...preferences, muted, volume })
    const player = getSharedYouTubePlayer()
    if (muted) player?.mute()
    else {
      player?.unMute()
      player?.setVolume(volume)
    }
  }, [persistPreferences, preferences])

  const toggleShuffle = useCallback(() => {
    const shuffle = !preferences.shuffle
    persistPreferences({ ...preferences, shuffle })
    getSharedYouTubePlayer()?.setShuffle(shuffle)
  }, [persistPreferences, preferences])

  const toggleRepeat = useCallback(() => {
    const repeat = !preferences.repeat
    persistPreferences({ ...preferences, repeat })
    getSharedYouTubePlayer()?.setLoop(repeat)
  }, [persistPreferences, preferences])

  const toggleCollapsed = () => {
    const collapsed = !preferences.collapsed
    persistPreferences({ ...preferences, collapsed })
  }

  const retryPlayerInitialization = () => {
    setIsReady(false)
    setAutoplayBlocked(false)
    setError(null)
    const player = getSharedYouTubePlayer()
    if (player) {
      loadConfiguredMedia(
        player,
        preferencesRef.current,
        preferencesRef.current.enabled && !serverPlayerVisibleRef.current,
      )
      setIsReady(true)
      return
    }
    setRetryAttempt((attempt) => attempt + 1)
  }

  const musicStatus = useMemo<YouTubeMusicStatus>(() => ({
    playlistId: preferences.playlistId,
    videoId: preferences.videoId,
    enabled: preferences.enabled,
    volume: preferences.volume,
    muted: preferences.muted,
    shuffle: preferences.shuffle,
    repeat: preferences.repeat,
    isReady,
    autoplayBlocked,
    error,
    isPlaying: snapshot.isPlaying,
    currentTime: snapshot.currentTime,
    duration: snapshot.duration,
    trackTitle: snapshot.track?.title ?? null,
    trackVideoId: snapshot.track?.videoId ?? null,
  }), [autoplayBlocked, error, isReady, preferences, snapshot])

  useEffect(() => {
    dashboardCommandRef.current = (command) => {
      switch (command.type) {
        case "request-state":
          window.dispatchEvent(new CustomEvent(YOUTUBE_MUSIC_STATE_EVENT, { detail: musicStatus }))
          return
        case "load-playlist": {
          if (!isValidYouTubePlaylistId(command.playlistId)) {
            setError("Enter a valid YouTube playlist ID.")
            return
          }
          const next = { ...preferencesRef.current, playlistId: command.playlistId, videoId: "" }
          setPlaylistDraft(command.playlistId)
          persistPreferences(next)
          const player = getSharedYouTubePlayer()
          if (player) {
            loadConfiguredMedia(player, next, next.enabled && !serverPlayerVisibleRef.current)
            setIsReady(true)
          }
          return
        }
        case "load-video": {
          if (!isValidYouTubeVideoId(command.videoId)) {
            setError("Enter a valid YouTube video ID.")
            return
          }
          const next = { ...preferencesRef.current, playlistId: "", videoId: command.videoId }
          setPlaylistDraft(`https://www.youtube.com/watch?v=${command.videoId}`)
          persistPreferences(next)
          const player = getSharedYouTubePlayer()
          if (player) {
            loadConfiguredMedia(player, next, next.enabled && !serverPlayerVisibleRef.current)
            setIsReady(true)
          }
          return
        }
        case "play": {
          const player = getSharedYouTubePlayer()
          if (player && preferencesRef.current.enabled) {
            player.playVideo()
            setAutoplayBlocked(false)
          }
          return
        }
        case "pause":
          getSharedYouTubePlayer()?.pauseVideo()
          return
        case "next":
          getSharedYouTubePlayer()?.nextVideo()
          return
        case "previous":
          getSharedYouTubePlayer()?.previousVideo()
          return
        case "set-enabled":
          if (command.enabled !== preferencesRef.current.enabled) toggleEnabled()
          return
        case "set-volume":
          changeVolume(Math.max(0, Math.min(100, command.volume)))
          return
        case "set-muted":
          if (command.muted !== preferencesRef.current.muted) toggleMute()
          return
        case "set-shuffle":
          if (command.shuffle !== preferencesRef.current.shuffle) toggleShuffle()
          return
        case "set-repeat":
          if (command.repeat !== preferencesRef.current.repeat) toggleRepeat()
          return
      }
    }
  }, [
    autoplayBlocked,
    changeVolume,
    error,
    isReady,
    loadConfiguredMedia,
    musicStatus,
    persistPreferences,
    snapshot,
    toggleEnabled,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
  ])

  useEffect(() => {
    const handleCommand = (event: WindowEventMap[typeof YOUTUBE_MUSIC_COMMAND_EVENT]) => {
      dashboardCommandRef.current(event.detail)
    }
    window.addEventListener(YOUTUBE_MUSIC_COMMAND_EVENT, handleCommand)
    return () => window.removeEventListener(YOUTUBE_MUSIC_COMMAND_EVENT, handleCommand)
  }, [])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(YOUTUBE_MUSIC_STATE_EVENT, { detail: musicStatus }))
  }, [musicStatus])

  if (!isClientMounted) return null

  const playlistUrl = isValidYouTubePlaylistId(preferences.playlistId)
    ? `https://www.youtube.com/playlist?list=${encodeURIComponent(preferences.playlistId)}`
    : null
  const configuredVideoUrl = isValidYouTubeVideoId(preferences.videoId)
    ? `https://www.youtube.com/watch?v=${encodeURIComponent(preferences.videoId)}`
    : null
  const mediaUrl = playlistUrl ?? configuredVideoUrl
  const hasConfiguredMedia = Boolean(playlistUrl || configuredVideoUrl)

  return (
    <aside
      aria-label="YouTube music player"
      className={isMusicDashboard
        ? "mx-auto w-full max-w-[360px] overflow-hidden rounded-xl border border-border bg-card/95 text-card-foreground shadow-xl"
        : "fixed bottom-20 right-2 z-40 w-80 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-border bg-card/95 text-card-foreground shadow-2xl backdrop-blur-md sm:right-4"}
      style={isMusicDashboard ? undefined : { maxHeight: "calc(100dvh - 6rem)" }}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Music2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">YouTube Music</p>
            <p className="text-[11px] text-muted-foreground">
              {error
                ? "Player issue"
                : !preferences.enabled
                ? "Music off"
                : !hasConfiguredMedia
                  ? "Enabled · add a playlist or video"
                  : isReady
                    ? "Music enabled"
                    : "Preparing player"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={preferences.enabled ? "Turn music off" : "Turn music on"}
            aria-pressed={preferences.enabled}
            onClick={toggleEnabled}
          >
            <Power className={`h-4 w-4 ${preferences.enabled ? "text-primary" : "text-muted-foreground"}`} />
          </Button>
          {!isMusicDashboard && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={preferences.collapsed ? "Expand music player" : "Collapse music player"}
              aria-expanded={!preferences.collapsed}
              onClick={toggleCollapsed}
            >
              {preferences.collapsed
                ? <ChevronUp className="h-4 w-4" />
                : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-2 border-b border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p>{error}</p>
            <Button type="button" size="sm" variant="outline" className="mt-2 h-7" onClick={retryPlayerInitialization}>Retry player</Button>
          </div>
        </div>
      )}

      {hasConfiguredMedia ? (
        <div className="w-full bg-black">
          <div
            ref={playerHostRef}
            className="mx-auto h-[200px] min-h-[200px] w-full min-w-[200px] max-w-[320px]"
          />
        </div>
      ) : (
        <div className={`border-b border-border bg-background/45 px-3 text-center text-xs text-muted-foreground ${isMusicDashboard ? "py-5" : preferences.collapsed ? "py-3" : "py-8"}`}>
          {isMusicDashboard
            ? "Configure a playlist above to start the official YouTube player."
            : preferences.collapsed
              ? <button type="button" onClick={toggleCollapsed} className="w-full rounded-md text-left hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Set up a playlist or video</button>
              : "Add a YouTube playlist or video URL to load the official player."}
        </div>
      )}

      {!isMusicDashboard && !preferences.collapsed && (
        <div className="space-y-3 p-3">
          <div className="flex items-center gap-3">
            {snapshot.track?.videoId ? (
              <Image
                src={`https://i.ytimg.com/vi/${encodeURIComponent(snapshot.track.videoId)}/mqdefault.jpg`}
                alt=""
                width={64}
                height={48}
                className="h-12 w-16 shrink-0 rounded object-cover"
                loading="lazy"
                unoptimized
              />
            ) : (
              <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded bg-muted">
                <Music2 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {snapshot.track?.title ?? (isReady ? "Waiting for YouTube track" : "No track loaded")}
              </p>
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {isReady ? (snapshot.isPlaying ? "Playing" : "Paused") : "Player not ready"}
                {snapshot.duration > 0 && ` · ${formatTime(snapshot.currentTime)} / ${formatTime(snapshot.duration)}`}
              </p>
            </div>
            {mediaUrl && (
              <a
                href={mediaUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Open playlist on YouTube"
                className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>

          <form onSubmit={handlePlaylistSubmit} className="space-y-2">
            <label htmlFor="youtube-playlist-id" className="text-xs font-medium">
              YouTube playlist or video
            </label>
            <div className="flex gap-2">
              <input
                id="youtube-playlist-id"
                value={playlistDraft}
                onChange={(event) => setPlaylistDraft(event.target.value)}
                placeholder="Paste playlist ID, playlist URL, or video URL"
                autoComplete="off"
                className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button type="submit" size="sm" disabled={!playlistDraft.trim()}>
                Load
              </Button>
            </div>
          </form>

          <div className="flex items-center justify-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Previous track"
              disabled={!isReady || !preferences.enabled || showServerPlayer || Boolean(configuredVideoUrl)}
              onClick={() => getSharedYouTubePlayer()?.previousVideo()}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label={snapshot.isPlaying ? "Pause" : "Play"}
              disabled={!isReady || !preferences.enabled || showServerPlayer}
              onClick={() => {
                const player = getSharedYouTubePlayer()
                if (!player) return
                if (snapshot.isPlaying) player.pauseVideo()
                else {
                  player.playVideo()
                  setAutoplayBlocked(false)
                }
              }}
            >
              {snapshot.isPlaying
                ? <Pause className="h-4 w-4" />
                : <Play className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Next track"
              disabled={!isReady || !preferences.enabled || showServerPlayer || Boolean(configuredVideoUrl)}
              onClick={() => getSharedYouTubePlayer()?.nextVideo()}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={preferences.shuffle ? "secondary" : "ghost"}
              size="icon"
              aria-label="Shuffle playlist"
              aria-pressed={preferences.shuffle}
              disabled={!isReady || Boolean(configuredVideoUrl)}
              onClick={toggleShuffle}
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={preferences.repeat ? "secondary" : "ghost"}
              size="icon"
              aria-label="Repeat playlist"
              aria-pressed={preferences.repeat}
              disabled={!isReady || Boolean(configuredVideoUrl)}
              onClick={toggleRepeat}
            >
              <Repeat className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={preferences.muted ? "Unmute" : "Mute"}
              onClick={toggleMute}
            >
              {preferences.muted
                ? <VolumeX className="h-4 w-4" />
                : <Volume2 className="h-4 w-4" />}
            </Button>
            <input
              type="range"
              aria-label="YouTube player volume"
              min={0}
              max={100}
              step={1}
              value={preferences.volume}
              onChange={(event) => changeVolume(Number(event.target.value))}
              className="h-2 flex-1 cursor-pointer accent-primary"
            />
            <span className="w-8 text-right text-xs text-muted-foreground">{preferences.volume}%</span>
          </div>

          {autoplayBlocked && preferences.enabled && (
            <Button
              type="button"
              className="w-full"
              disabled={!isReady}
              onClick={() => {
                const player = getSharedYouTubePlayer()
                if (player) {
                  player.playVideo()
                  setAutoplayBlocked(false)
                }
              }}
            >
              <Play className="mr-2 h-4 w-4" />
              Enable Music
            </Button>
          )}

          {storageWarning && <p role="status" className="text-xs text-amber-600">{storageWarning}</p>}

          <div className="border-t border-border pt-2">
            <Button asChild type="button" variant="outline" size="sm" className="mb-2 w-full">
              <Link href="/music"><Music2 className="mr-2 h-4 w-4" />Open music dashboard</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-between px-1 text-xs"
              aria-expanded={showServerPlayer}
              onClick={toggleServerPlayer}
            >
              Existing server music
              {showServerPlayer ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            {showServerPlayer && preferences.enabled && (
              <div className="mt-2">
                <ServerMusicPlayer />
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
