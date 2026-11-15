"use client"

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { ref, serverTimestamp, set, update } from "firebase/database"
import { Music2, Pause, Play, Radio, SkipBack, SkipForward, Square, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { database } from "@/lib/firebase"
import { isDirectAudioSource, isDirectVideoSource } from "@/lib/audio-library"
import { useAudioPlayer } from "@/contexts/audio-player-context"
import {
  parseYouTubePlaylistInput,
  parseYouTubeVideoInput,
} from "@/lib/youtube-iframe-api"

const SETTINGS_PATH = "settings/sharedMusic"

function isSecureAudioUrl(value: string): boolean {
  if (!isDirectAudioSource(value)) return false
  try {
    return new URL(value.trim()).protocol === "https:"
  } catch {
    return false
  }
}

function isSecureImageUrl(value: string): boolean {
  if (!value.trim()) return true
  try {
    return new URL(value.trim()).protocol === "https:"
  } catch {
    return false
  }
}

export function MusicControl() {
  const player = useAudioPlayer()
  const broadcast = player.broadcast
  const formKey = broadcast
    ? JSON.stringify([broadcast.mediaKey, broadcast.title, broadcast.artist, broadcast.artworkUrl, broadcast.volume])
    : "empty"

  return <MusicControlForm key={formKey} player={player} />
}

function MusicControlForm({ player }: { player: ReturnType<typeof useAudioPlayer> }) {
  const broadcast = player.broadcast
  const broadcastMediaKey = broadcast?.mediaKey
  const mediaInputInitial = broadcast?.audioUrl
    || broadcast?.videoUrl
    || (broadcast?.playlistId
      ? `https://www.youtube.com/playlist?list=${broadcast.playlistId}`
      : broadcast?.videoId
        ? `https://www.youtube.com/watch?v=${broadcast.videoId}`
        : "")
  const [mediaInput, setMediaInput] = useState(mediaInputInitial)
  const [title, setTitle] = useState(broadcast?.title ?? "")
  const [artist, setArtist] = useState(broadcast?.artist ?? "")
  const [artworkUrl, setArtworkUrl] = useState(broadcast?.artworkUrl ?? "")
  const [volume, setVolume] = useState(broadcast?.volume ?? 70)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const currentTimeRef = useRef(player.currentTime)

  useEffect(() => {
    currentTimeRef.current = player.currentTime
  }, [player.currentTime])

  const synchronizePosition = useCallback(async () => {
    if (!database || !broadcastMediaKey) return
    try {
      await update(ref(database, SETTINGS_PATH), {
        position: currentTimeRef.current,
        playbackStartedAt: serverTimestamp(),
        updatedAt: Date.now(),
      })
    } catch (syncError) {
      console.error("[MusicControl] Playback position sync failed:", syncError)
      setError(syncError instanceof Error ? syncError.message : "Playback position could not be synchronized.")
    }
  }, [broadcastMediaKey])

  useEffect(() => {
    if (broadcast?.playbackState !== "playing") return
    const intervalId = window.setInterval(() => void synchronizePosition(), 10_000)
    return () => window.clearInterval(intervalId)
  }, [broadcast?.mediaKey, broadcast?.playbackState, synchronizePosition])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!database) {
      setError("Firebase database is not configured.")
      return
    }

    const playlistId = parseYouTubePlaylistInput(mediaInput)
    const videoId = playlistId ? null : parseYouTubeVideoInput(mediaInput)
    const videoUrl = !playlistId && !videoId && isDirectVideoSource(mediaInput) ? mediaInput.trim() : ""
    const audioUrl = !playlistId && !videoId && !videoUrl && isSecureAudioUrl(mediaInput) ? mediaInput.trim() : ""
    if (!playlistId && !videoId && !videoUrl && !audioUrl) {
      setError("Enter a secure direct audio/video URL, YouTube video URL, or YouTube playlist URL.")
      setNotice(null)
      return
    }
    if (!isSecureImageUrl(artworkUrl)) {
      setError("Artwork URL must use HTTPS.")
      setNotice(null)
      return
    }

    setBusy(true)
    setError(null)
    setNotice(null)
    const now = Date.now()
    try {
      await set(ref(database, SETTINGS_PATH), {
        playlistId: playlistId ?? "",
        videoId: videoId ?? "",
        audioUrl,
        videoUrl,
        title: title.trim(),
        artist: artist.trim(),
        artworkUrl: artworkUrl.trim(),
        playbackState: "paused",
        volume: broadcast?.volume ?? volume,
        position: 0,
        playbackStartedAt: 0,
        playlistIndex: 0,
        command: null,
        commandId: (broadcast?.commandId ?? 0) + 1,
        updatedAt: now,
      })
      setNotice("Track selection saved. Use the broadcast controls to start playback.")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Music setting could not be saved.")
    } finally {
      setBusy(false)
    }
  }

  const updatePlayback = async (
    playbackState: "playing" | "paused" | "stopped",
    command: "play" | "pause" | "stop",
  ) => {
    if (!database || !broadcast) return
    setBusy(true)
    setError(null)
    setNotice(null)
    const now = Date.now()
    const position = playbackState === "stopped" ? 0 : currentTimeRef.current
    try {
      await update(ref(database, SETTINGS_PATH), {
        playbackState,
        position,
        playbackStartedAt: playbackState === "playing" ? serverTimestamp() : 0,
        command,
        commandId: broadcast.commandId + 1,
        updatedAt: now,
      })
      setNotice(command === "play" ? "Music broadcast resumed for connected users." : `Broadcast ${command} command sent.`)
    } catch (commandError) {
      setError(commandError instanceof Error ? commandError.message : "Music command could not be broadcast.")
    } finally {
      setBusy(false)
    }
  }

  const changePlaylistTrack = async (command: "next" | "previous") => {
    if (!database || !broadcast || broadcast.mediaType !== "youtube-playlist") return
    const now = Date.now()
    const playlistIndex = command === "next"
      ? broadcast.playlistIndex + 1
      : Math.max(0, broadcast.playlistIndex - 1)
    try {
      await update(ref(database, SETTINGS_PATH), {
        playlistIndex,
        position: 0,
        playbackState: "playing",
        playbackStartedAt: serverTimestamp(),
        command,
        commandId: broadcast.commandId + 1,
        updatedAt: now,
      })
      setNotice(`Playlist ${command} track broadcast.`)
      setError(null)
    } catch (commandError) {
      setError(commandError instanceof Error ? commandError.message : "Playlist track could not be changed.")
    }
  }

  const changeVolume = async (nextVolume: number) => {
    setVolume(nextVolume)
    if (!database || !broadcast) return
    try {
      await update(ref(database, SETTINGS_PATH), { volume: nextVolume, updatedAt: Date.now() })
    } catch (volumeError) {
      setError(volumeError instanceof Error ? volumeError.message : "Broadcast volume could not be updated.")
    }
  }

  const clear = async () => {
    if (!database || !broadcast) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await set(ref(database, SETTINGS_PATH), null)
      setNotice("Music broadcast stopped and cleared.")
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "Music selection could not be cleared.")
    } finally {
      setBusy(false)
    }
  }

  const currentLabel = broadcast?.mediaType === "youtube-playlist"
    ? `YouTube playlist · ${broadcast.playlistId}`
    : broadcast?.mediaType === "youtube-video"
      ? `YouTube video · ${broadcast.videoId}`
      : broadcast?.mediaType === "video"
        ? `Direct video · ${broadcast.videoUrl}`
        : broadcast?.audioUrl
          ? `Direct audio · ${broadcast.audioUrl}`
          : "No track selected"

  return (
    <section className="dashboard-card max-w-4xl space-y-5 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <Radio className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-xl font-semibold">Admin music broadcast</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select licensed media, then control playback for connected user panels.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-background/40 p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Current selection</p>
        <p className="mt-1 break-all font-medium">{currentLabel}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Broadcast status: {broadcast?.playbackState ?? "idle"} · {player.isPlaying ? "playing in this browser" : "not playing in this browser"}
        </p>
      </div>

      <form onSubmit={(event) => void save(event)} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium sm:col-span-2" htmlFor="admin-shared-music">
            Track URL, YouTube video, or playlist
            <input
              id="admin-shared-music"
              value={mediaInput}
              onChange={(event) => setMediaInput(event.target.value)}
              placeholder="https://media.example/song.mp3 or YouTube playlist URL"
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Track title (optional)
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal" />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Artist (optional)
            <input value={artist} onChange={(event) => setArtist(event.target.value)} maxLength={120} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal" />
          </label>
          <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
            Artwork URL (optional, HTTPS)
            <input value={artworkUrl} onChange={(event) => setArtworkUrl(event.target.value)} placeholder="https://media.example/artwork.jpg" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal" />
          </label>
          <p className="sm:col-span-2 text-xs leading-relaxed text-muted-foreground">
            Audio-only playback requires a licensed direct HTTPS audio URL. YouTube sources play through the provider&apos;s visible, attributed video player; the app will not hide or extract it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy} className="gap-2"><Music2 className="h-4 w-4" />{busy ? "Saving..." : "Select broadcast media"}</Button>
          <Button type="button" variant="outline" disabled={busy || !broadcast} onClick={() => void clear()} className="gap-2"><Trash2 className="h-4 w-4" />Clear selection</Button>
        </div>
      </form>

      <section className="space-y-4 rounded-xl border border-border/70 bg-background/40 p-4" aria-label="Broadcast controls">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" disabled={busy || !broadcast || broadcast.playbackState === "playing"} onClick={() => void updatePlayback("playing", "play")} className="gap-2">
            <Play className="h-4 w-4" />{broadcast?.playbackState === "paused" ? "Resume" : "Play"}
          </Button>
          <Button type="button" variant="outline" disabled={busy || !broadcast || broadcast.playbackState !== "playing"} onClick={() => void updatePlayback("paused", "pause")} className="gap-2">
            <Pause className="h-4 w-4" />Pause
          </Button>
          <Button type="button" variant="outline" disabled={busy || !broadcast || broadcast.playbackState === "stopped"} onClick={() => void updatePlayback("stopped", "stop")} className="gap-2">
            <Square className="h-4 w-4" />Stop
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy || broadcast?.mediaType !== "youtube-playlist"}
            onClick={() => void changePlaylistTrack("previous")}
            aria-label="Previous playlist track"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy || broadcast?.mediaType !== "youtube-playlist"}
            onClick={() => void changePlaylistTrack("next")}
            aria-label="Next playlist track"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <span className="w-16 shrink-0">Volume</span>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={volume}
            disabled={!broadcast}
            aria-label="Admin broadcast volume"
            onChange={(event) => setVolume(Number(event.target.value))}
            onPointerUp={(event) => void changeVolume(Number(event.currentTarget.value))}
            onKeyUp={(event) => void changeVolume(Number(event.currentTarget.value))}
            className="min-w-0 flex-1 accent-primary disabled:opacity-50"
          />
          <span className="w-10 text-right tabular-nums">{volume}%</span>
        </label>
      </section>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
      <p className="text-xs text-muted-foreground">
        Use only media you are authorized to broadcast. Embedded video sources retain their provider attribution; audio analysis is enabled only for CORS-compatible direct sources.
      </p>
    </section>
  )
}
