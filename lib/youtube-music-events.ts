export interface YouTubeMusicStatus {
  playlistId: string
  videoId: string
  enabled: boolean
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: boolean
  isReady: boolean
  autoplayBlocked: boolean
  error: string | null
  isPlaying: boolean
  currentTime: number
  duration: number
  trackTitle: string | null
  trackVideoId: string | null
}

export type YouTubeMusicCommand =
  | { type: "request-state" }
  | { type: "load-playlist"; playlistId: string }
  | { type: "load-video"; videoId: string }
  | { type: "play" }
  | { type: "pause" }
  | { type: "next" }
  | { type: "previous" }
  | { type: "set-enabled"; enabled: boolean }
  | { type: "set-volume"; volume: number }
  | { type: "set-muted"; muted: boolean }
  | { type: "set-shuffle"; shuffle: boolean }
  | { type: "set-repeat"; repeat: boolean }

export const YOUTUBE_MUSIC_COMMAND_EVENT = "myhack:youtube-music-command"
export const YOUTUBE_MUSIC_STATE_EVENT = "myhack:youtube-music-state"

declare global {
  interface WindowEventMap {
    [YOUTUBE_MUSIC_COMMAND_EVENT]: CustomEvent<YouTubeMusicCommand>
    [YOUTUBE_MUSIC_STATE_EVENT]: CustomEvent<YouTubeMusicStatus>
  }
}

export function dispatchYouTubeMusicCommand(command: YouTubeMusicCommand): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(YOUTUBE_MUSIC_COMMAND_EVENT, { detail: command }))
}
