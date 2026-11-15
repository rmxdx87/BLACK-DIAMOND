import assert from "node:assert/strict"
import test from "node:test"
import { parseAudioLibrary } from "../lib/audio-library.ts"

test("accepts configured direct audio sources and rejects YouTube, video, and duplicate tracks", () => {
  const parsed = parseAudioLibrary([
    { id: "one", title: "Track One", artist: "Artist", url: "/licensed/one.mp3", duration: 180 },
    { id: "video", title: "Video", artist: "Channel", url: "https://www.youtube.com/watch?v=abc" },
    { id: "movie", title: "Movie", artist: "Studio", url: "/licensed/movie.mp4" },
    { id: "one", title: "Duplicate", artist: "Artist", url: "/licensed/two.mp3" },
  ], "https://example.test")

  assert.equal(parsed.tracks.length, 1)
  assert.equal(parsed.tracks[0].url, "https://example.test/licensed/one.mp3")
  assert.equal(parsed.invalidRecordCount, 3)
})

test("accepts direct audio URLs for admin-selected tracks and rejects malformed sources", () => {
  const parsed = parseAudioLibrary([
    { id: "remote", title: "Remote Track", artist: "Artist", url: "https://cdn.example.test/audio/song.mp3?token=abc123" },
    { id: "insecure", title: "Track", artist: "Artist", url: "http://audio.example.test/track.mp3" },
  ], "https://example.test")

  assert.equal(parsed.tracks.length, 1)
  assert.equal(parsed.tracks[0].url, "https://cdn.example.test/audio/song.mp3?token=abc123")
  assert.equal(parsed.invalidRecordCount, 1)
})

test("rejects insecure third-party URLs and malformed library responses", () => {
  const parsed = parseAudioLibrary([
    { id: "insecure", title: "Track", artist: "Artist", url: "http://audio.example.test/track.mp3" },
  ], "https://example.test")

  assert.equal(parsed.tracks.length, 0)
  assert.equal(parsed.invalidRecordCount, 1)
  assert.throws(() => parseAudioLibrary({}, "https://example.test"), /must be an array/)
})
