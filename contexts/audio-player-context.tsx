"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { onValue, ref } from "firebase/database"
import { database } from "@/lib/firebase"
import {
  describeYouTubePlayerError,
  destroySharedYouTubePlayer,
  getOrCreateYouTubePlayer,
  type YouTubePlayer,
  type YouTubePlayerEvent,
} from "@/lib/youtube-iframe-api"
import {
  getSharedPlaybackPosition,
  parseSharedMusicBroadcast,
  type SharedMusicBroadcast,
} from "@/lib/shared-music"

interface AudioPlayerContextValue {
  broadcast: SharedMusicBroadcast | null
  currentTime: number
  isPlaying: boolean
  isAutoplayBlocked: boolean
  playbackError: string | null
  visualizationAvailable: boolean
  resumeAfterPermission: () => void
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null)

function averageBand(
  data: Uint8Array,
  sampleRate: number,
  fftSize: number,
  lowHz: number,
  highHz: number,
): number {
  const binWidth = sampleRate / fftSize
  const first = Math.max(0, Math.floor(lowHz / binWidth))
  const last = Math.min(data.length - 1, Math.ceil(highHz / binWidth))
  if (last < first) return 0

  let total = 0
  for (let index = first; index <= last; index++) total += data[index]
  return total / (last - first + 1) / 255
}

async function supportsCrossOriginAnalysis(source: string): Promise<boolean> {
  try {
    const url = new URL(source, window.location.origin)
    if (url.origin === window.location.origin) return true

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 2000)
    try {
      const response = await fetch(url.href, {
        method: "HEAD",
        mode: "cors",
        cache: "no-store",
        signal: controller.signal,
      })
      return response.ok
    } finally {
      window.clearTimeout(timeoutId)
    }
  } catch {
    return false
  }
}

function isYouTubeBroadcast(broadcast: SharedMusicBroadcast | null): boolean {
  return broadcast?.mediaType === "youtube-video" || broadcast?.mediaType === "youtube-playlist"
}

function isNativeBroadcast(broadcast: SharedMusicBroadcast | null): boolean {
  return broadcast?.mediaType === "audio" || broadcast?.mediaType === "video"
}

function getBroadcastSource(broadcast: SharedMusicBroadcast): string {
  return broadcast.mediaType === "video" ? broadcast.videoUrl : broadcast.audioUrl
}

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [broadcast, setBroadcast] = useState<SharedMusicBroadcast | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false)
  const [playbackError, setPlaybackError] = useState<string | null>(null)
  const [visualizationAvailable, setVisualizationAvailable] = useState(false)
  const [mediaReady, setMediaReady] = useState(false)
  const [youtubeReady, setYoutubeReady] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const youtubeHostRef = useRef<HTMLDivElement>(null)
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null)
  const broadcastRef = useRef<SharedMusicBroadcast | null>(null)
  const youtubeLoadedKeyRef = useRef<string | null>(null)
  const youtubeLoadedIndexRef = useRef(-1)
  const youtubeCommandIdRef = useRef(0)
  const serverTimeOffsetRef = useRef(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const loadedNativeKeyRef = useRef<string | null>(null)
  const stageRef = useRef<HTMLElement>(null)

  const mediaKey = broadcast?.mediaKey ?? null
  const youtubeMedia = isYouTubeBroadcast(broadcast)
  const nativeMedia = isNativeBroadcast(broadcast)

  useEffect(() => {
    if (!database) {
      return
    }

    const unsubscribe = onValue(ref(database, "settings/sharedMusic"), (snapshot) => {
      const next = parseSharedMusicBroadcast(snapshot.val())
      broadcastRef.current = next
      setBroadcast(next)
      setPlaybackError(null)
      setIsAutoplayBlocked(false)
    }, (error) => {
      setPlaybackError(`Music broadcast connection failed: ${error.message}`)
      setIsPlaying(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!database) return
    return onValue(ref(database, ".info/serverTimeOffset"), (snapshot) => {
      const offset = snapshot.val()
      serverTimeOffsetRef.current = typeof offset === "number" && Number.isFinite(offset) ? offset : 0
    }, (error) => {
      console.error("[AudioPlayer] Server clock synchronization failed:", error)
    })
  }, [])

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const updatePreference = () => setPrefersReducedMotion(query.matches)
    updatePreference()
    query.addEventListener("change", updatePreference)
    return () => query.removeEventListener("change", updatePreference)
  }, [])

  useEffect(() => {
    const currentBroadcast = broadcastRef.current
    const media = currentBroadcast?.mediaType === "audio"
      ? audioRef.current
      : currentBroadcast?.mediaType === "video"
        ? videoRef.current
        : null
    if (!currentBroadcast || !media || !isNativeBroadcast(currentBroadcast)) {
      setMediaReady(false)
      setVisualizationAvailable(false)
      return
    }

    let cancelled = false
    let context: AudioContext | null = null
    let sourceNode: MediaElementAudioSourceNode | null = null
    let analyser: AnalyserNode | null = null
    setMediaReady(false)
    setVisualizationAvailable(false)
    setIsPlaying(false)
    loadedNativeKeyRef.current = null
    media.pause()
    media.removeAttribute("src")

    const loadMedia = async () => {
      const sourceUrl = getBroadcastSource(currentBroadcast)
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      const canAnalyze = !reducedMotion && await supportsCrossOriginAnalysis(sourceUrl)
      if (cancelled) return

      if (canAnalyze && typeof window.AudioContext === "function") {
        media.crossOrigin = "anonymous"
        try {
          context = new window.AudioContext()
          sourceNode = context.createMediaElementSource(media)
          analyser = context.createAnalyser()
          analyser.fftSize = 1024
          analyser.smoothingTimeConstant = 0.78
          sourceNode.connect(analyser)
          analyser.connect(context.destination)
          audioContextRef.current = context
          mediaSourceRef.current = sourceNode
          analyserRef.current = analyser
          setVisualizationAvailable(true)
        } catch (error) {
          console.error("[AudioPlayer] Audio analysis could not be initialized:", error)
          if (context && context.state !== "closed") void context.close()
          context = null
          sourceNode = null
          analyser = null
          media.removeAttribute("crossorigin")
          setVisualizationAvailable(false)
        }
      } else {
        media.removeAttribute("crossorigin")
      }

      media.src = sourceUrl
      media.load()
      loadedNativeKeyRef.current = currentBroadcast.mediaKey
      setMediaReady(true)
    }

    void loadMedia()

    return () => {
      cancelled = true
      media.pause()
      media.removeAttribute("src")
      media.load()
      if (sourceNode) sourceNode.disconnect()
      if (analyser) analyser.disconnect()
      if (context && context.state !== "closed") void context.close()
      if (audioContextRef.current === context) audioContextRef.current = null
      if (mediaSourceRef.current === sourceNode) mediaSourceRef.current = null
      if (analyserRef.current === analyser) analyserRef.current = null
    }
  }, [mediaKey])

  const applyYouTubeBroadcast = useCallback((player: YouTubePlayer, next: SharedMusicBroadcast) => {
    player.setVolume(next.volume)

    const mediaChanged = youtubeLoadedKeyRef.current !== next.mediaKey
    const playlistChanged = next.mediaType === "youtube-playlist"
      && youtubeLoadedIndexRef.current !== next.playlistIndex

    if (mediaChanged || playlistChanged) {
      youtubeLoadedKeyRef.current = next.mediaKey
      youtubeLoadedIndexRef.current = next.playlistIndex
      youtubeCommandIdRef.current = next.commandId
      if (next.mediaType === "youtube-playlist") {
        const playlist = { listType: "playlist" as const, list: next.playlistId, index: next.playlistIndex }
        if (next.playbackState === "playing") player.loadPlaylist(playlist)
        else player.cuePlaylist(playlist)
      } else if (next.playbackState === "playing") {
        player.loadVideoById(next.videoId)
      } else {
        player.cueVideoById(next.videoId)
      }
    } else if (youtubeCommandIdRef.current !== next.commandId) {
      youtubeCommandIdRef.current = next.commandId
      if (next.command === "next") player.nextVideo()
      else if (next.command === "previous") player.previousVideo()
    }

    if (next.playbackState === "playing") {
      const target = getSharedPlaybackPosition(next, Date.now() + serverTimeOffsetRef.current)
      const current = player.getCurrentTime()
      if (Number.isFinite(current) && Math.abs(current - target) > 2 && player.getDuration() > 0) {
        player.seekTo(target, true)
      }
      player.playVideo()
      setIsAutoplayBlocked(false)
    } else if (next.playbackState === "paused") {
      if (player.getDuration() > 0 && Math.abs(player.getCurrentTime() - next.position) > 2) {
        player.seekTo(next.position, true)
      }
      player.pauseVideo()
    } else {
      player.stopVideo()
    }
  }, [])

  useEffect(() => {
    if (!youtubeMedia || !youtubeHostRef.current) {
      const player = youtubePlayerRef.current
      if (player) {
        player.stopVideo()
        destroySharedYouTubePlayer()
      }
      youtubePlayerRef.current = null
      youtubeLoadedKeyRef.current = null
      youtubeLoadedIndexRef.current = -1
      setYoutubeReady(false)
      setIsPlaying(false)
      return
    }

    let cancelled = false
    setPlaybackError(null)
    void getOrCreateYouTubePlayer(youtubeHostRef.current, {
      width: 640,
      height: 360,
      playerVars: {
        controls: 0,
        enablejsapi: 1,
        fs: 0,
        origin: window.location.origin,
        playsinline: 1,
      },
      events: {
        onReady: (event: YouTubePlayerEvent) => {
          youtubePlayerRef.current = event.target
          const iframe = youtubeHostRef.current?.querySelector("iframe")
          if (iframe) iframe.tabIndex = -1
          setYoutubeReady(true)
        },
        onStateChange: (event: YouTubePlayerEvent) => {
          const playing = event.data === 1
          setIsPlaying(playing)
          if (!playing && broadcastRef.current?.playbackState === "stopped") setCurrentTime(0)
          if (playing) {
            setIsAutoplayBlocked(false)
            setPlaybackError(null)
          }
        },
        onError: (event: YouTubePlayerEvent) => {
          setIsPlaying(false)
          setPlaybackError(describeYouTubePlayerError(event.data))
        },
        onAutoplayBlocked: () => {
          setIsPlaying(false)
          setIsAutoplayBlocked(true)
        },
      },
    })
      .then((player) => {
        if (cancelled) {
          player.destroy()
          destroySharedYouTubePlayer()
          return
        }
        youtubePlayerRef.current = player
        setYoutubeReady(true)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setPlaybackError(error instanceof Error ? error.message : "The authorized video player could not be initialized.")
      })

    return () => {
      cancelled = true
    }
  }, [youtubeMedia])

  useEffect(() => {
    if (!broadcast || !youtubeReady || !youtubePlayerRef.current || !youtubeMedia) return
    applyYouTubeBroadcast(youtubePlayerRef.current, broadcast)
  }, [applyYouTubeBroadcast, broadcast, youtubeMedia, youtubeReady])

  useEffect(() => {
    if (!broadcast || !nativeMedia || !mediaReady || loadedNativeKeyRef.current !== broadcast.mediaKey) return
    const media = broadcast.mediaType === "audio" ? audioRef.current : videoRef.current
    if (!media) return
    media.volume = broadcast.volume / 100

    if (broadcast.playbackState === "stopped") {
      media.pause()
      media.currentTime = 0
      return
    }

    const targetTime = getSharedPlaybackPosition(broadcast, Date.now() + serverTimeOffsetRef.current)
    if (Number.isFinite(media.duration) && Math.abs(media.currentTime - targetTime) > 2) {
      media.currentTime = Math.min(targetTime, media.duration)
      setCurrentTime(media.currentTime)
    }

    if (broadcast.playbackState === "paused") {
      media.pause()
      return
    }

    const startAuthorizedPlayback = async () => {
      try {
        const context = audioContextRef.current
        if (context?.state === "suspended") await context.resume()
        await media.play()
        setIsAutoplayBlocked(false)
        setPlaybackError(null)
      } catch (error) {
        if (error instanceof DOMException && error.name === "NotAllowedError") {
          setIsAutoplayBlocked(true)
          setIsPlaying(false)
          return
        }
        setPlaybackError(error instanceof Error ? error.message : "The admin broadcast could not start.")
        setIsPlaying(false)
      }
    }

    void startAuthorizedPlayback()
  }, [broadcast, mediaReady, nativeMedia])

  useEffect(() => {
    if (!youtubeMedia || !youtubeReady) return
    const intervalId = window.setInterval(() => {
      const player = youtubePlayerRef.current
      if (player && player.getPlayerState() === 1) setCurrentTime(player.getCurrentTime())
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [youtubeMedia, youtubeReady])

  useEffect(() => {
    const stage = stageRef.current
    const analyser = analyserRef.current
    const context = audioContextRef.current
    if (!stage || !isPlaying || !visualizationAvailable || !analyser || !context || prefersReducedMotion) {
      stage?.style.setProperty("--music-bass", "0")
      stage?.style.setProperty("--music-mid", "0")
      stage?.style.setProperty("--music-treble", "0")
      stage?.style.setProperty("--music-bar-0", "4px")
      stage?.style.setProperty("--music-bar-1", "4px")
      stage?.style.setProperty("--music-bar-2", "4px")
      stage?.style.setProperty("--music-bar-3", "4px")
      stage?.style.setProperty("--music-bar-4", "4px")
      return
    }

    const data = new Uint8Array(analyser.frequencyBinCount)
    let frameId = 0
    const animate = () => {
      analyser.getByteFrequencyData(data)
      const bass = averageBand(data, context.sampleRate, analyser.fftSize, 20, 250)
      const mid = averageBand(data, context.sampleRate, analyser.fftSize, 250, 4000)
      const treble = averageBand(data, context.sampleRate, analyser.fftSize, 4000, 16000)
      stage.style.setProperty("--music-bass", bass.toFixed(3))
      stage.style.setProperty("--music-mid", mid.toFixed(3))
      stage.style.setProperty("--music-treble", treble.toFixed(3))
      ;[bass, bass * .65 + mid * .35, mid, mid * .5 + treble * .5, treble].forEach((level, index) => {
        stage.style.setProperty(`--music-bar-${index}`, `${(4 + level * 22).toFixed(1)}px`)
      })
      frameId = window.requestAnimationFrame(animate)
    }

    frameId = window.requestAnimationFrame(animate)
    return () => {
      window.cancelAnimationFrame(frameId)
      stage.style.setProperty("--music-bass", "0")
      stage.style.setProperty("--music-mid", "0")
      stage.style.setProperty("--music-treble", "0")
      stage.style.setProperty("--music-bar-0", "4px")
      stage.style.setProperty("--music-bar-1", "4px")
      stage.style.setProperty("--music-bar-2", "4px")
      stage.style.setProperty("--music-bar-3", "4px")
      stage.style.setProperty("--music-bar-4", "4px")
    }
  }, [isPlaying, prefersReducedMotion, visualizationAvailable])

  const resumeAfterPermission = useCallback(() => {
    const currentBroadcast = broadcastRef.current
    if (!currentBroadcast || currentBroadcast.playbackState !== "playing") return

    if (isYouTubeBroadcast(currentBroadcast)) {
      youtubePlayerRef.current?.playVideo()
      return
    }

    const media = currentBroadcast.mediaType === "audio" ? audioRef.current : videoRef.current
    if (!media) return
    void (async () => {
      try {
        const context = audioContextRef.current
        if (context?.state === "suspended") await context.resume()
        await media.play()
        setIsAutoplayBlocked(false)
        setPlaybackError(null)
      } catch (error) {
        setPlaybackError(error instanceof Error ? error.message : "Browser audio permission is still required.")
      }
    })()
  }, [])

  const youtubeSourceUrl = broadcast?.mediaType === "youtube-playlist"
    ? `https://www.youtube.com/playlist?list=${encodeURIComponent(broadcast.playlistId)}`
    : broadcast?.mediaType === "youtube-video"
      ? `https://www.youtube.com/watch?v=${encodeURIComponent(broadcast.videoId)}`
      : null

  const contextValue = useMemo<AudioPlayerContextValue>(() => ({
    broadcast,
    currentTime,
    isPlaying,
    isAutoplayBlocked,
    playbackError: playbackError ?? (!database ? "Music broadcast is unavailable because Firebase is not configured." : null),
    visualizationAvailable,
    resumeAfterPermission,
  }), [
    broadcast,
    currentTime,
    isPlaying,
    isAutoplayBlocked,
    playbackError,
    visualizationAvailable,
    resumeAfterPermission,
  ])

  return (
    <AudioPlayerContext.Provider value={contextValue}>
      {children}
      {broadcast && (
        <aside
          ref={stageRef}
          aria-label="Admin broadcast music presentation"
          className="music-glass-shell music-rgb-shell fixed bottom-20 right-3 z-40 w-[min(460px,calc(100vw-2.5rem))] overflow-hidden rounded-3xl p-3 shadow-2xl backdrop-blur-2xl sm:bottom-5 sm:right-5 sm:p-4"
        >
          <div className="music-stage-media relative overflow-hidden rounded-2xl border border-white/10 bg-black/30">
            {broadcast.mediaType === "video" ? (
              <video
                key={broadcast.mediaKey}
                ref={videoRef}
                className="aspect-video max-h-[34vh] min-h-50 w-full object-contain"
                playsInline
                preload="metadata"
                poster={broadcast.artworkUrl || undefined}
                onPlay={() => setIsPlaying(true)}
                onPause={(event) => {
                  setIsPlaying(false)
                  setCurrentTime(event.currentTarget.currentTime)
                }}
                onSeeked={(event) => setCurrentTime(event.currentTarget.currentTime)}
                onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                onLoadedMetadata={(event) => {
                  const currentBroadcast = broadcastRef.current
                  const targetTime = currentBroadcast?.mediaKey === broadcast.mediaKey
                    ? getSharedPlaybackPosition(currentBroadcast, Date.now() + serverTimeOffsetRef.current)
                    : 0
                  if (Number.isFinite(event.currentTarget.duration)) {
                    event.currentTarget.currentTime = Math.min(targetTime, event.currentTarget.duration)
                  }
                  setCurrentTime(event.currentTarget.currentTime)
                  setMediaReady(true)
                }}
                onCanPlay={() => setMediaReady(true)}
                onError={() => {
                  setIsPlaying(false)
                  setPlaybackError("The authorized video source could not be played.")
                }}
              />
            ) : broadcast.mediaType === "youtube-video" || broadcast.mediaType === "youtube-playlist" ? (
              <div className="music-stage-youtube-frame relative aspect-video min-h-50 w-full overflow-hidden">
                <div
                  ref={youtubeHostRef}
                  aria-hidden="true"
                  className={`music-stage-youtube absolute inset-0 transition-opacity duration-300 ${isPlaying && !isAutoplayBlocked ? "opacity-100" : "pointer-events-none opacity-0"}`}
                />
                {!isPlaying || isAutoplayBlocked ? (
                  <div
                    role="img"
                    aria-label={broadcast.title ? `${broadcast.title} artwork` : "Admin-selected video artwork"}
                    className="music-stage-artwork absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: broadcast.artworkUrl
                        ? `linear-gradient(90deg, rgba(13, 9, 20, .84), rgba(13, 9, 20, .15)), url("${broadcast.artworkUrl}")`
                        : broadcast.mediaType === "youtube-video"
                          ? `url("https://img.youtube.com/vi/${encodeURIComponent(broadcast.videoId)}/hqdefault.jpg")`
                          : undefined,
                    }}
                  />
                ) : null}
              </div>
            ) : broadcast.artworkUrl ? (
              <div
                role="img"
                aria-label={broadcast.title ? `${broadcast.title} artwork` : "Admin-selected music artwork"}
                className="music-stage-artwork aspect-video max-h-[34vh] min-h-50 w-full bg-cover bg-center"
                style={{ backgroundImage: `linear-gradient(90deg, rgba(13, 9, 20, .84), rgba(13, 9, 20, .15)), url("${broadcast.artworkUrl}")` }}
              />
            ) : (
              <div className="music-stage-artwork music-stage-abstract flex aspect-video max-h-[34vh] min-h-50 items-center justify-center">
                <div className="music-orbit" aria-hidden="true"><span /><span /><span /></div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 px-1 pb-1 pt-3">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isPlaying ? "bg-fuchsia-300 shadow-[0_0_12px_rgba(232,121,249,.95)]" : "bg-white/35"}`} />
                <p className="truncate text-[9px] font-semibold uppercase tracking-[0.2em] text-fuchsia-100/80">
                  {isPlaying ? "Admin broadcast live" : broadcast.playbackState === "stopped" ? "Broadcast stopped" : "Admin broadcast paused"}
                </p>
              </div>
              {broadcast.title && <h2 className="truncate text-sm font-semibold tracking-wide text-white">{broadcast.title}</h2>}
              {broadcast.artist && <p className="truncate text-xs text-white/55">{broadcast.artist}</p>}
              {!broadcast.title && !broadcast.artist && <p className="text-xs text-white/55">Admin-selected music</p>}
            </div>
            <div className="music-signal-bars flex h-7 shrink-0 items-end gap-1" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((bar) => (
                <span key={bar} />
              ))}
            </div>
          </div>

          {isAutoplayBlocked && broadcast.playbackState === "playing" && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-fuchsia-200/15 bg-white/4 px-3 py-2">
              <p role="status" className="text-xs text-white/70">Audio awaiting browser permission</p>
              <button
                type="button"
                onClick={resumeAfterPermission}
                className="rounded-lg border border-fuchsia-200/25 px-3 py-1.5 text-xs font-medium text-fuchsia-100 transition hover:bg-fuchsia-200/10 focus-visible:outline-2 focus-visible:outline-fuchsia-200"
              >
                Enable audio
              </button>
            </div>
          )}
          {playbackError && <p role="alert" className="mt-2 rounded-xl border border-rose-300/20 bg-rose-300/6 px-3 py-2 text-xs text-rose-100/80">{playbackError}</p>}
          {isPlaying && broadcast.mediaType === "audio" && !visualizationAvailable && (
            <p className="mt-2 px-1 text-[10px] text-white/45">Audio-reactive lighting is unavailable for this source.</p>
          )}
          {isYouTubeBroadcast(broadcast) && (
            <p className="mt-2 flex items-center justify-between gap-2 px-1 text-[10px] text-white/45">
              <span>Embedded source · audio-reactive lighting unavailable.</span>
              {youtubeSourceUrl && <a href={youtubeSourceUrl} target="_blank" rel="noreferrer" className="shrink-0 underline decoration-white/30 underline-offset-2">YouTube source</a>}
            </p>
          )}

          {nativeMedia && broadcast.mediaType === "audio" && (
            <audio
              key={broadcast.mediaKey}
              ref={audioRef}
              preload="metadata"
              onPlay={() => {
                setIsPlaying(true)
                setIsAutoplayBlocked(false)
              }}
              onPause={(event) => {
                setIsPlaying(false)
                setCurrentTime(event.currentTarget.currentTime)
              }}
              onSeeked={(event) => setCurrentTime(event.currentTarget.currentTime)}
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
              onLoadedMetadata={(event) => {
                const currentBroadcast = broadcastRef.current
                const targetTime = currentBroadcast?.mediaKey === broadcast.mediaKey
                  ? getSharedPlaybackPosition(currentBroadcast, Date.now() + serverTimeOffsetRef.current)
                  : 0
                if (Number.isFinite(event.currentTarget.duration)) {
                  event.currentTarget.currentTime = Math.min(targetTime, event.currentTarget.duration)
                }
                setCurrentTime(event.currentTarget.currentTime)
                setMediaReady(true)
              }}
              onCanPlay={() => setMediaReady(true)}
              onError={() => {
                setIsPlaying(false)
                setPlaybackError("The authorized audio source could not be played.")
              }}
              className="hidden"
            />
          )}
        </aside>
      )}
    </AudioPlayerContext.Provider>
  )
}

export function useAudioPlayer(): AudioPlayerContextValue {
  const context = useContext(AudioPlayerContext)
  if (!context) throw new Error("useAudioPlayer must be used within AudioPlayerProvider")
  return context
}
