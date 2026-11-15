export interface YouTubeVideoData {
  title?: string
  video_id?: string
}

export interface YouTubePlayerEvent {
  target: YouTubePlayer
  data: number
}

export interface YouTubePlayerOptions {
  width: number
  height: number
  playerVars: {
    controls: 0 | 1
    enablejsapi: 1
    fs: 0 | 1
    origin: string
    playsinline: 1
  }
  events: {
    onReady: (event: YouTubePlayerEvent) => void
    onStateChange: (event: YouTubePlayerEvent) => void
    onError: (event: YouTubePlayerEvent) => void
    onAutoplayBlocked: () => void
  }
}

export interface YouTubePlayer {
  destroy(): void
  cueVideoById(videoId: string): void
  cuePlaylist(playlist: { listType: "playlist"; list: string; index: number }): void
  loadVideoById(videoId: string): void
  loadPlaylist(playlist: { listType: "playlist"; list: string; index: number }): void
  playVideo(): void
  pauseVideo(): void
  stopVideo(): void
  nextVideo(): void
  previousVideo(): void
  setVolume(volume: number): void
  mute(): void
  unMute(): void
  isMuted(): boolean
  setShuffle(shuffle: boolean): void
  setLoop(loop: boolean): void
  getPlayerState(): number
  getCurrentTime(): number
  getDuration(): number
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getVideoData(): YouTubeVideoData
  getVideoUrl(): string
}

interface YouTubeNamespace {
  Player: new (element: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayer
}

declare global {
  interface Window {
    YT?: YouTubeNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

const API_URL = "https://www.youtube.com/iframe_api"
const API_TIMEOUT_MS = 20_000
const PLAYER_READY_TIMEOUT_MS = 20_000

let apiPromise: Promise<YouTubeNamespace> | null = null
let sharedPlayer: YouTubePlayer | null = null
let playerPromise: Promise<YouTubePlayer> | null = null

export function loadYouTubeIframeApi(): Promise<YouTubeNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("The YouTube player can only be initialized in a browser."))
  }

  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise

  apiPromise = new Promise<YouTubeNamespace>((resolve, reject) => {
    let settled = false
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeoutId)
      if (error) {
        apiPromise = null
        reject(error)
      } else if (window.YT?.Player) {
        resolve(window.YT)
      } else {
        apiPromise = null
        reject(new Error("YouTube loaded without exposing its IFrame Player API."))
      }
    }

    const previousReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.()
      finish()
    }

    const timeoutId = window.setTimeout(
      () => finish(new Error("Timed out while loading the YouTube IFrame Player API.")),
      API_TIMEOUT_MS,
    )
    let script = document.querySelector<HTMLScriptElement>(`script[src="${API_URL}"]`)
    if (!script) {
      script = document.createElement("script")
      script.src = API_URL
      script.async = true
      script.onerror = () => finish(new Error("Could not load the YouTube IFrame Player API."))
      document.head.appendChild(script)
    } else {
      script.addEventListener("error", () => finish(new Error("Could not load the YouTube IFrame Player API.")), { once: true })
    }
  })

  return apiPromise
}

export function getOrCreateYouTubePlayer(
  element: HTMLElement,
  options: YouTubePlayerOptions,
): Promise<YouTubePlayer> {
  if (sharedPlayer) return Promise.resolve(sharedPlayer)
  if (playerPromise) return playerPromise

  playerPromise = loadYouTubeIframeApi()
    .then((youtube) => new Promise<YouTubePlayer>((resolve, reject) => {
      let ready = false
      let readyTimeoutId: number | null = null
      try {
        const configuredEvents = options.events
        const player = new youtube.Player(element, {
          ...options,
          events: {
            ...configuredEvents,
            onReady: (event) => {
              ready = true
              if (readyTimeoutId !== null) window.clearTimeout(readyTimeoutId)
              sharedPlayer = event.target
              configuredEvents.onReady(event)
              resolve(event.target)
            },
            onError: (event) => {
              configuredEvents.onError(event)
              if (!ready) {
                if (readyTimeoutId !== null) window.clearTimeout(readyTimeoutId)
                playerPromise = null
                event.target.destroy()
                reject(new Error("The YouTube player failed before becoming ready."))
              }
            },
          },
        })
        if (!player) reject(new Error("YouTube did not create a player instance."))
        else {
          readyTimeoutId = window.setTimeout(() => {
            if (ready) return
            playerPromise = null
            player.destroy()
            reject(new Error("Timed out while waiting for the YouTube player to become ready. Check your connection and try again."))
          }, PLAYER_READY_TIMEOUT_MS)
        }
      } catch (error) {
        playerPromise = null
        reject(error instanceof Error ? error : new Error("Could not create the YouTube player."))
      }
    }))
    .catch((error: unknown) => {
      playerPromise = null
      throw error
    })

  return playerPromise
}

export function getSharedYouTubePlayer(): YouTubePlayer | null {
  return sharedPlayer
}

export function destroySharedYouTubePlayer(): void {
  sharedPlayer?.destroy()
  sharedPlayer = null
  playerPromise = null
}

export function isValidYouTubePlaylistId(value: unknown): boolean {
  return typeof value === "string" && /^[A-Za-z0-9_-]{12,128}$/.test(value.trim())
}

export function isValidYouTubeVideoId(value: unknown): boolean {
  return typeof value === "string" && /^[A-Za-z0-9_-]{11}$/.test(value.trim())
}

export function parseYouTubePlaylistInput(value: string): string | null {
  const input = value.trim()
  if (isValidYouTubePlaylistId(input)) return input

  const normalizedInput = /^(www|music|m)\.youtube\.com\//i.test(input)
    ? `https://${input}`
    : input
  try {
    const url = new URL(normalizedInput)
    if (!["youtube.com", "www.youtube.com", "music.youtube.com", "m.youtube.com"].includes(url.hostname)) {
      return null
    }

    const playlistId = url.searchParams.get("list")
    return playlistId && isValidYouTubePlaylistId(playlistId) ? playlistId : null
  } catch {
    return null
  }
}

export function parseYouTubeVideoInput(value: string): string | null {
  const input = value.trim()
  if (isValidYouTubeVideoId(input)) return input

  const shortLink = input.match(/^(?:https?:\/\/)?youtu\.be\/([A-Za-z0-9_-]{11})(?:[?&#/].*)?$/i)
  if (shortLink) return shortLink[1]

  const normalizedInput = /^(www|music|m)\.youtube\.com\//i.test(input)
    ? `https://${input}`
    : input
  try {
    const url = new URL(normalizedInput)
    if (!["youtube.com", "www.youtube.com", "music.youtube.com", "m.youtube.com"].includes(url.hostname)) {
      return null
    }

    const videoId = url.searchParams.get("v")
    return videoId && isValidYouTubeVideoId(videoId) ? videoId : null
  } catch {
    return null
  }
}

export function describeYouTubePlayerError(code: number): string {
  switch (code) {
    case 2:
      return "YouTube rejected the playlist request. Check the playlist ID and try again."
    case 5:
      return "YouTube could not play this video in the current browser. Try another playlist item."
    case 100:
      return "This video is unavailable, private, or deleted."
    case 101:
    case 150:
      return "The video owner does not allow playback on other websites."
    case 153:
      return "YouTube could not verify this site's origin. Check the page's referrer configuration."
    default:
      return `YouTube reported a playback error${Number.isFinite(code) ? ` (${code})` : ""}.`
  }
}
