export interface AudioTrack {
  id: string
  title: string
  artist: string
  url: string
  duration: number | null
}

export interface ParsedAudioLibrary {
  tracks: readonly AudioTrack[]
  invalidRecordCount: number
}

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "youtube-nocookie.com", "www.youtube-nocookie.com"])
const VIDEO_FILE_EXTENSION = /\.(mp4|m4v|mov|avi|mkv|webm)(?:$|[?#])/i
const SUPPORTED_VIDEO_EXTENSION = /\.(mp4|m4v|webm)(?:$|[?#])/i

export function isDirectVideoSource(input: string): boolean {
  if (!input || !input.trim()) return false

  try {
    const url = new URL(input.trim())
    return url.protocol === "https:"
      && !YOUTUBE_HOSTS.has(url.hostname.toLowerCase())
      && SUPPORTED_VIDEO_EXTENSION.test(url.pathname)
  } catch {
    return false
  }
}

export function isDirectAudioSource(input: string): boolean {
  if (!input || !input.trim()) return false

  try {
    const url = new URL(input.trim(), "https://example.test")
    if (!["http:", "https:"].includes(url.protocol)) return false
    if (YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return false
    if (VIDEO_FILE_EXTENSION.test(url.pathname)) return false
    return true
  } catch {
    return false
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeTrack(value: unknown, baseOrigin: string): AudioTrack | null {
  if (!isRecord(value)) return null
  const { id, title, artist, url, duration } = value
  if (
    typeof id !== "string" ||
    !id.trim() ||
    typeof title !== "string" ||
    !title.trim() ||
    typeof artist !== "string" ||
    !artist.trim() ||
    typeof url !== "string" ||
    !url.trim()
  ) return null

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url, baseOrigin)
  } catch {
    return null
  }

  const sameOrigin = parsedUrl.origin === baseOrigin
  if (
    (parsedUrl.protocol !== "https:" && !(parsedUrl.protocol === "http:" && sameOrigin)) ||
    YOUTUBE_HOSTS.has(parsedUrl.hostname.toLowerCase()) ||
    VIDEO_FILE_EXTENSION.test(parsedUrl.pathname)
  ) return null

  const safeDuration = typeof duration === "number" && Number.isFinite(duration) && duration > 0
    ? duration
    : null

  return {
    id: id.trim(),
    title: title.trim(),
    artist: artist.trim(),
    url: parsedUrl.href,
    duration: safeDuration,
  }
}

export function parseAudioLibrary(payload: unknown, baseOrigin: string): ParsedAudioLibrary {
  if (!Array.isArray(payload)) {
    throw new TypeError("Audio library response must be an array")
  }

  const tracks: AudioTrack[] = []
  let invalidRecordCount = 0
  const seenIds = new Set<string>()

  for (const item of payload) {
    const track = normalizeTrack(item, baseOrigin)
    if (!track || seenIds.has(track.id)) {
      invalidRecordCount++
      continue
    }
    seenIds.add(track.id)
    tracks.push(track)
  }

  return { tracks, invalidRecordCount }
}
