import assert from "node:assert/strict"
import test from "node:test"
import {
  describeYouTubePlayerError,
  isValidYouTubePlaylistId,
  isValidYouTubeVideoId,
  loadYouTubeIframeApi,
  parseYouTubePlaylistInput,
  parseYouTubeVideoInput,
} from "../lib/youtube-iframe-api.ts"

test("validates playlist IDs rather than accepting a full URL or a video ID", () => {
  assert.equal(isValidYouTubePlaylistId("PL1234567890abcdefgh"), true)
  assert.equal(isValidYouTubePlaylistId("https://www.youtube.com/playlist?list=PL1234567890"), false)
  assert.equal(isValidYouTubePlaylistId("dQw4w9WgXcQ"), false)
  assert.equal(isValidYouTubePlaylistId("short"), false)
  assert.equal(isValidYouTubePlaylistId(""), false)
})

test("accepts playlist URLs and IDs but rejects single-video and unrelated URLs", () => {
  const playlistId = "PL1234567890abcdefgh"
  assert.equal(parseYouTubePlaylistInput(playlistId), playlistId)
  assert.equal(
    parseYouTubePlaylistInput(`https://www.youtube.com/playlist?list=${playlistId}`),
    playlistId,
  )
  assert.equal(
    parseYouTubePlaylistInput(`https://music.youtube.com/playlist?list=${playlistId}`),
    playlistId,
  )
  assert.equal(parseYouTubePlaylistInput("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), null)
  assert.equal(parseYouTubePlaylistInput("https://example.com/playlist?list=PL1234567890abcdefgh"), null)
})

test("accepts YouTube video IDs and watch or short URLs", () => {
  const videoId = "dQw4w9WgXcQ"
  assert.equal(isValidYouTubeVideoId(videoId), true)
  assert.equal(isValidYouTubeVideoId("PL1234567890"), false)
  assert.equal(parseYouTubeVideoInput(videoId), videoId)
  assert.equal(parseYouTubeVideoInput(`https://www.youtube.com/watch?v=${videoId}`), videoId)
  assert.equal(parseYouTubeVideoInput(`https://youtu.be/${videoId}`), videoId)
  assert.equal(parseYouTubeVideoInput("https://example.com/watch?v=dQw4w9WgXcQ"), null)
})

test("reports clear errors for unavailable and restricted YouTube videos", () => {
  assert.match(describeYouTubePlayerError(100), /unavailable, private, or deleted/)
  assert.match(describeYouTubePlayerError(101), /does not allow playback/)
  assert.match(describeYouTubePlayerError(150), /does not allow playback/)
  assert.match(describeYouTubePlayerError(999), /999/)
})

test("does not initialize the browser-only IFrame API during server rendering", async () => {
  await assert.rejects(loadYouTubeIframeApi(), /only be initialized in a browser/)
})
