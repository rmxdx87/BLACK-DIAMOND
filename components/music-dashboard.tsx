"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  ExternalLink,
  Music2,
  Pause,
  Play,
  Power,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  isValidYouTubePlaylistId,
  isValidYouTubeVideoId,
  parseYouTubePlaylistInput,
  parseYouTubeVideoInput,
} from "@/lib/youtube-iframe-api"
import {
  dispatchYouTubeMusicCommand,
  YOUTUBE_MUSIC_STATE_EVENT,
  type YouTubeMusicStatus,
} from "@/lib/youtube-music-events"

const EMPTY_STATUS: YouTubeMusicStatus = {
  playlistId: "",
  videoId: "",
  enabled: true,
  volume: 35,
  muted: false,
  shuffle: false,
  repeat: false,
  isReady: false,
  autoplayBlocked: false,
  error: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  trackTitle: null,
  trackVideoId: null,
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`
}

export function MusicDashboard() {
  const [status, setStatus] = useState(EMPTY_STATUS)
  const [playlistInput, setPlaylistInput] = useState("")
  const [playlistError, setPlaylistError] = useState<string | null>(null)
  const initializedInput = useRef(false)

  useEffect(() => {
    const handleStatus = (event: WindowEventMap[typeof YOUTUBE_MUSIC_STATE_EVENT]) => {
      setStatus(event.detail)
      if (!initializedInput.current) {
        setPlaylistInput(event.detail.playlistId
          || (event.detail.videoId
            ? `https://www.youtube.com/watch?v=${event.detail.videoId}`
            : ""))
        initializedInput.current = true
      }
    }

    window.addEventListener(YOUTUBE_MUSIC_STATE_EVENT, handleStatus)
    dispatchYouTubeMusicCommand({ type: "request-state" })
    return () => window.removeEventListener(YOUTUBE_MUSIC_STATE_EVENT, handleStatus)
  }, [])

  const submitPlaylist = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const playlistId = parseYouTubePlaylistInput(playlistInput)
    const videoId = playlistId ? null : parseYouTubeVideoInput(playlistInput)
    if (!playlistId && !videoId) {
      setPlaylistError("Paste a valid YouTube playlist URL, playlist ID, or video URL.")
      return
    }

    setPlaylistInput(playlistId ?? `https://www.youtube.com/watch?v=${videoId}`)
    setPlaylistError(null)
    if (playlistId) dispatchYouTubeMusicCommand({ type: "load-playlist", playlistId })
    else if (videoId) dispatchYouTubeMusicCommand({ type: "load-video", videoId })
  }

  const mediaUrl = isValidYouTubePlaylistId(status.playlistId)
    ? `https://www.youtube.com/playlist?list=${encodeURIComponent(status.playlistId)}`
    : isValidYouTubeVideoId(status.videoId)
      ? `https://www.youtube.com/watch?v=${encodeURIComponent(status.videoId)}`
      : null
  const isSingleVideo = isValidYouTubeVideoId(status.videoId)
  const progress = status.duration > 0
    ? Math.min(100, (status.currentTime / status.duration) * 100)
    : 0

  return (
    <main className="black-diamond-surface min-h-screen bg-background pb-24">
      <header className="border-b border-primary/20 bg-card text-foreground shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 rounded-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <ArrowLeft className="h-4 w-4" />
            <span>My Hack</span>
          </Link>
          <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs text-primary">
            {status.enabled ? (status.isReady ? "Player ready" : "Music enabled") : "Music off"}
          </span>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-7 pt-2 sm:px-6 sm:pb-9">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Your sound space</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Music dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Set up a playlist and control playback from one place. The official YouTube player stays available beside this dashboard.
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-5 sm:px-6 sm:py-7 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Now playing</p>
              <h2 className="mt-1 text-xl font-semibold">Your music</h2>
            </div>
            {mediaUrl && (
              <a
                href={mediaUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                View on YouTube <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <div className="flex items-center gap-4 rounded-xl bg-muted/50 p-4">
            {status.trackVideoId ? (
              <Image
                src={`https://i.ytimg.com/vi/${encodeURIComponent(status.trackVideoId)}/mqdefault.jpg`}
                alt=""
                width={96}
                height={72}
                unoptimized
                className="h-18 w-24 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="grid h-18 w-24 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Music2 className="h-7 w-7" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold">
                {status.trackTitle ?? (status.isReady ? "Waiting for YouTube track" : "No media loaded")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
                {status.isReady ? (status.isPlaying ? "Playing" : "Paused") : "Add a playlist or video to start"}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div
              role="progressbar"
              aria-label="Track progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
              className="h-2 overflow-hidden rounded-full bg-muted"
            >
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(status.currentTime)}</span>
              <span>{formatTime(status.duration)}</span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Previous track"
              disabled={!status.isReady || !status.enabled || isSingleVideo}
              onClick={() => dispatchYouTubeMusicCommand({ type: "previous" })}
            >
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              size="lg"
              className="h-12 w-12 rounded-full"
              aria-label={status.isPlaying ? "Pause music" : "Play music"}
              disabled={!status.isReady || !status.enabled}
              onClick={() => dispatchYouTubeMusicCommand({ type: status.isPlaying ? "pause" : "play" })}
            >
              {status.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Next track"
              disabled={!status.isReady || !status.enabled || isSingleVideo}
              onClick={() => dispatchYouTubeMusicCommand({ type: "next" })}
            >
              <SkipForward className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant={status.shuffle ? "secondary" : "ghost"}
              size="icon"
              aria-label="Shuffle playlist"
              aria-pressed={status.shuffle}
              disabled={!status.isReady || isSingleVideo}
              onClick={() => dispatchYouTubeMusicCommand({ type: "set-shuffle", shuffle: !status.shuffle })}
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={status.repeat ? "secondary" : "ghost"}
              size="icon"
              aria-label="Repeat playlist"
              aria-pressed={status.repeat}
              disabled={!status.isReady || isSingleVideo}
              onClick={() => dispatchYouTubeMusicCommand({ type: "set-repeat", repeat: !status.repeat })}
            >
              <Repeat className="h-4 w-4" />
            </Button>
          </div>

          {status.autoplayBlocked && status.enabled && (
            <Button
              type="button"
              className="mt-4 w-full"
              onClick={() => dispatchYouTubeMusicCommand({ type: "play" })}
            >
              <Play className="mr-2 h-4 w-4" />Enable Music
            </Button>
          )}
        </section>

        <section className="space-y-5">
          <form onSubmit={submitPlaylist} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Music setup</p>
            <h2 className="mt-1 text-xl font-semibold">Connect YouTube</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Paste a playlist URL or ID, or a single YouTube video URL. Track navigation and shuffle are available for playlists.
            </p>
            <label htmlFor="music-dashboard-playlist" className="mt-4 block text-sm font-medium">
              Playlist or video URL
            </label>
            <input
              id="music-dashboard-playlist"
              value={playlistInput}
              onChange={(event) => setPlaylistInput(event.target.value)}
              placeholder="Playlist link, playlist ID, or video link"
              autoComplete="off"
              className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" className="mt-3 w-full">
              <Music2 className="mr-2 h-4 w-4" />Load and play
            </Button>
            {playlistError && <p role="alert" className="mt-3 text-sm text-destructive">{playlistError}</p>}
            {status.error && <p role="alert" className="mt-3 text-sm text-destructive">{status.error}</p>}
          </form>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Global setting</p>
                <h2 className="mt-1 text-lg font-semibold">Music playback</h2>
              </div>
              <Button
                type="button"
                variant={status.enabled ? "secondary" : "outline"}
                aria-pressed={status.enabled}
                onClick={() => dispatchYouTubeMusicCommand({ type: "set-enabled", enabled: !status.enabled })}
              >
                <Power className="mr-2 h-4 w-4" />{status.enabled ? "On" : "Off"}
              </Button>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={status.muted ? "Unmute music" : "Mute music"}
                onClick={() => dispatchYouTubeMusicCommand({ type: "set-muted", muted: !status.muted })}
              >
                {status.muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
              <input
                type="range"
                aria-label="Music volume"
                min={0}
                max={100}
                step={1}
                value={status.volume}
                onChange={(event) => dispatchYouTubeMusicCommand({
                  type: "set-volume",
                  volume: Number(event.target.value),
                })}
                className="h-2 flex-1 cursor-pointer accent-primary"
              />
              <span className="w-10 text-right text-sm tabular-nums">{status.volume}%</span>
            </div>

            <p className="mt-4 rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
              These controls use the same official YouTube player shown beside the dashboard on larger screens and below it on mobile.
            </p>
          </section>
        </section>
      </div>
    </main>
  )
}
