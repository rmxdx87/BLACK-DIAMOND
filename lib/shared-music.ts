import { isDirectAudioSource, isDirectVideoSource } from "./audio-library.ts"
import { isValidYouTubePlaylistId, isValidYouTubeVideoId } from "./youtube-iframe-api.ts"

export type SharedPlaybackState = "playing" | "paused" | "stopped"
export type SharedMediaType = "audio" | "video" | "youtube-video" | "youtube-playlist"
export type SharedMusicCommand = "next" | "previous" | null

export interface SharedMusicBroadcast {
  mediaKey: string
  mediaType: SharedMediaType
  audioUrl: string
  videoUrl: string
  playlistId: string
  videoId: string
  title: string
  artist: string
  artworkUrl: string
  playbackState: SharedPlaybackState
  volume: number
  position: number
  playbackStartedAt: number
  playlistIndex: number
  command: SharedMusicCommand
  commandId: number
  updatedAt: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readHttpsUrl(value: unknown): string {
  if (typeof value !== "string") return ""
  try {
    const url = new URL(value.trim())
    return url.protocol === "https:" ? url.href : ""
  } catch {
    return ""
  }
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

export function parseSharedMusicBroadcast(value: unknown): SharedMusicBroadcast | null {
  if (!isRecord(value)) return null

  const rawAudioUrl = typeof value.audioUrl === "string" ? value.audioUrl.trim() : ""
  const audioUrl = isDirectAudioSource(rawAudioUrl) && readHttpsUrl(rawAudioUrl) ? readHttpsUrl(rawAudioUrl) : ""
  const rawVideoUrl = typeof value.videoUrl === "string" ? value.videoUrl.trim() : ""
  const videoUrl = isDirectVideoSource(rawVideoUrl) ? rawVideoUrl : ""
  const playlistId = typeof value.playlistId === "string" && isValidYouTubePlaylistId(value.playlistId)
    ? value.playlistId.trim()
    : ""
  const videoId = typeof value.videoId === "string" && isValidYouTubeVideoId(value.videoId)
    ? value.videoId.trim()
    : ""

  let mediaType: SharedMediaType
  let mediaKey: string
  if (audioUrl) {
    mediaType = "audio"
    mediaKey = `audio:${audioUrl}`
  } else if (videoUrl) {
    mediaType = "video"
    mediaKey = `video:${videoUrl}`
  } else if (playlistId) {
    mediaType = "youtube-playlist"
    mediaKey = `youtube-playlist:${playlistId}`
  } else if (videoId) {
    mediaType = "youtube-video"
    mediaKey = `youtube-video:${videoId}`
  } else {
    return null
  }

  const state = value.playbackState
  const playbackState: SharedPlaybackState = state === "paused" || state === "stopped"
    ? state
    : "playing"
  const command = value.command === "next" || value.command === "previous" ? value.command : null
  const artworkUrl = readHttpsUrl(value.artworkUrl)

  return {
    mediaKey,
    mediaType,
    audioUrl,
    videoUrl,
    playlistId,
    videoId,
    title: typeof value.title === "string" ? value.title.trim().slice(0, 160) : "",
    artist: typeof value.artist === "string" ? value.artist.trim().slice(0, 120) : "",
    artworkUrl,
    playbackState,
    volume: Math.max(0, Math.min(100, readNumber(value.volume, 70))),
    position: Math.max(0, readNumber(value.position, 0)),
    playbackStartedAt: Math.max(0, readNumber(value.playbackStartedAt, 0)),
    playlistIndex: Math.max(0, Math.floor(readNumber(value.playlistIndex, 0))),
    command,
    commandId: Math.max(0, readNumber(value.commandId, 0)),
    updatedAt: Math.max(0, readNumber(value.updatedAt, 0)),
  }
}

export function getSharedPlaybackPosition(broadcast: SharedMusicBroadcast, now = Date.now()): number {
  if (broadcast.playbackState !== "playing" || !broadcast.playbackStartedAt) {
    return broadcast.position
  }
  return broadcast.position + Math.max(0, now - broadcast.playbackStartedAt) / 1000
}
