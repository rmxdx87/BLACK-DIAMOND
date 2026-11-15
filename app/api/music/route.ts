import { NextResponse } from 'next/server'

type MusicTrack = {
  id: string
  title: string
  artist: string
  category: 'bollywood' | 'bhojpuri' | 'punjabi'
  url: string
  duration: number | null
  coverImage?: string
}

const FALLBACK_LIBRARY_KEY = '__black_diamond_music_library__'
const DEFAULT_ADMIN_PASSWORD = 'blackdiamond-admin'
const AUDIO_LIBRARY = [
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
] satisfies MusicTrack[]

function getFallbackLibrary(): MusicTrack[] {
  const globalScope = globalThis as typeof globalThis & {
    [FALLBACK_LIBRARY_KEY]?: MusicTrack[]
  }
  if (!Array.isArray(globalScope[FALLBACK_LIBRARY_KEY])) {
    globalScope[FALLBACK_LIBRARY_KEY] = [...AUDIO_LIBRARY]
  }
  return globalScope[FALLBACK_LIBRARY_KEY]
}

function isAdminRequest(request: Request): boolean {
  const configuredPassword = process.env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD
  const header = request.headers.get('x-admin-password') ?? request.headers.get('authorization') ?? ''
  if (!header) return false
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim() === configuredPassword
  }
  return header.trim() === configuredPassword
}

function normalizeTrack(record: unknown): MusicTrack | null {
  if (!record || typeof record !== 'object') return null
  const track = record as Record<string, unknown>
  const title = typeof track.title === 'string' ? track.title.trim() : ''
  const artist = typeof track.artist === 'string' ? track.artist.trim() : ''
  const url = typeof track.url === 'string' ? track.url.trim() : ''
  const category = track.category
  if (!title || !artist || !url) return null
  if (!['bollywood', 'bhojpuri', 'punjabi'].includes(String(category ?? ''))) return null
  const durationValue = typeof track.duration === 'number' && Number.isFinite(track.duration) ? track.duration : null
  return {
    id: typeof track.id === 'string' && track.id.trim() ? track.id.trim() : `${title}-${artist}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title,
    artist,
    category: String(category) as MusicTrack['category'],
    url,
    duration: durationValue,
    coverImage: typeof track.coverImage === 'string' ? track.coverImage : undefined,
  }
}

export async function GET() {
  const musicServerUrl = process.env.MUSIC_SERVER_URL
  if (!musicServerUrl) {
    return NextResponse.json(getFallbackLibrary())
  }

  try {
    const response = await fetch(`${musicServerUrl}/api/music/all`)
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Configured audio library returned an error' },
        { status: 502 }
      )
    }
    const music = await response.json()
    if (!Array.isArray(music)) {
      return NextResponse.json(
        { error: 'Configured audio library returned an invalid response' },
        { status: 502 }
      )
    }
    return NextResponse.json(music)
  } catch (error) {
    console.error('[Music API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch music' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const musicServerUrl = process.env.MUSIC_SERVER_URL
  if (musicServerUrl) {
    try {
      const response = await fetch(`${musicServerUrl}/api/music`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-admin-password': request.headers.get('x-admin-password') ?? '' },
        body: await request.text(),
      })
      const payload = await response.text()
      return new NextResponse(payload, {
        status: response.status,
        headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
      })
    } catch (error) {
      console.error('[Music API] Proxy POST error:', error)
      return NextResponse.json({ error: 'Failed to save music metadata' }, { status: 500 })
    }
  }

  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Admin authentication required to manage music.' }, { status: 401 })
  }

  try {
    const input = await request.json()
    const track = normalizeTrack(input)
    if (!track) {
      return NextResponse.json({ error: 'Track metadata is incomplete or invalid.' }, { status: 400 })
    }

    const library = getFallbackLibrary()
    const existingIndex = library.findIndex((item) => item.id === track.id)
    if (existingIndex >= 0) {
      library.splice(existingIndex, 1, track)
    } else {
      library.push(track)
    }
    library.sort((left, right) => left.title.localeCompare(right.title))
    return NextResponse.json({ ok: true, track, tracks: library })
  } catch (error) {
    console.error('[Music API] Local save error:', error)
    return NextResponse.json({ error: 'Track payload is not valid JSON.' }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  const musicServerUrl = process.env.MUSIC_SERVER_URL
  if (musicServerUrl) {
    try {
      const response = await fetch(`${musicServerUrl}/api/music`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json', 'x-admin-password': request.headers.get('x-admin-password') ?? '' },
        body: await request.text(),
      })
      const payload = await response.text()
      return new NextResponse(payload, {
        status: response.status,
        headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
      })
    } catch (error) {
      console.error('[Music API] Proxy DELETE error:', error)
      return NextResponse.json({ error: 'Failed to delete music metadata' }, { status: 500 })
    }
  }

  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Admin authentication required to manage music.' }, { status: 401 })
  }

  try {
    const input = await request.json()
    const id = typeof input?.id === 'string' ? input.id.trim() : ''
    if (!id) {
      return NextResponse.json({ error: 'Track id is required.' }, { status: 400 })
    }
    const library = getFallbackLibrary().filter((track) => track.id !== id)
    ;(globalThis as typeof globalThis & { [FALLBACK_LIBRARY_KEY]?: MusicTrack[] })[FALLBACK_LIBRARY_KEY] = library
    return NextResponse.json({ ok: true, removedId: id, tracks: library })
  } catch (error) {
    console.error('[Music API] Local delete error:', error)
    return NextResponse.json({ error: 'Delete payload is not valid JSON.' }, { status: 400 })
  }
}
