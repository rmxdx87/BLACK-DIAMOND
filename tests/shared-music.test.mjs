import test from "node:test"
import assert from "node:assert/strict"
import { getSharedPlaybackPosition, parseSharedMusicBroadcast } from "../lib/shared-music.ts"

test("legacy admin video selections remain playable while new paused broadcasts stay paused", () => {
  const legacy = parseSharedMusicBroadcast({ videoId: "795n1IjWRCI" })
  assert.equal(legacy?.playbackState, "playing")
  assert.equal(legacy?.mediaType, "youtube-video")

  const paused = parseSharedMusicBroadcast({
    videoId: "795n1IjWRCI",
    playbackState: "paused",
  })
  assert.equal(paused?.playbackState, "paused")
})

test("broadcast parsing rejects unsupported and insecure media URLs", () => {
  assert.equal(parseSharedMusicBroadcast({ videoId: "invalid" }), null)
  assert.equal(parseSharedMusicBroadcast({ audioUrl: "http://music.example/song.mp3" }), null)

  const video = parseSharedMusicBroadcast({ videoUrl: "https://media.example/video.mp4" })
  assert.equal(video?.mediaType, "video")
  assert.equal(parseSharedMusicBroadcast({ videoUrl: "https://media.example/video.mkv" }), null)
})

test("playback position follows the admin timestamp without using browser-local play decisions", () => {
  const broadcast = parseSharedMusicBroadcast({
    audioUrl: "https://media.example/song.mp3",
    playbackState: "playing",
    position: 12,
    playbackStartedAt: 1_000,
  })

  assert.equal(broadcast && getSharedPlaybackPosition(broadcast, 4_000), 15)
  assert.equal(broadcast && getSharedPlaybackPosition({ ...broadcast, playbackState: "paused" }, 4_000), 12)
})
