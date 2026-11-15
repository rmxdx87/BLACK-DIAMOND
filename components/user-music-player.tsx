'use client'

import { useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Music, Volume2, Play, Pause } from 'lucide-react'
import { useMusicPlayer } from '@/hooks/use-music-player'

export function UserMusicPlayer() {
  const { playerState, audioRef, isConnected, setVolume } = useMusicPlayer()
  const containerRef = useRef<HTMLDivElement>(null)

  const currentTimePercent = playerState.currentMusic
    ? (playerState.currentTime / playerState.currentMusic.duration) * 100
    : 0

  if (!isConnected) {
    return (
      <Card className="p-4 max-w-md">
        <div className="flex items-center gap-2 text-gray-500">
          <Music className="w-4 h-4" />
          <p className="text-sm">Connecting to music server...</p>
        </div>
      </Card>
    )
  }

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Current Playing Card */}
      {playerState.currentMusic ? (
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
          <div className="flex items-center gap-4 mb-4">
            {playerState.isPlaying ? (
              <Pause className="w-6 h-6 text-blue-500 animate-pulse" />
            ) : (
              <Play className="w-6 h-6 text-gray-500" />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{playerState.currentMusic.title}</h3>
              <p className="text-sm text-gray-600 truncate">{playerState.currentMusic.artist}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="h-1 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-200"
                style={{ width: `${currentTimePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>
                {Math.floor(playerState.currentTime / 60)}:
                {String(Math.floor(playerState.currentTime % 60)).padStart(2, '0')}
              </span>
              <span>
                {Math.floor(playerState.currentMusic.duration / 60)}:
                {String(Math.floor(playerState.currentMusic.duration % 60)).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-gray-600" />
            <input
              type="range"
              min="0"
              max="100"
              value={playerState.volume}
              onChange={e => setVolume(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-600 w-6 text-right">{playerState.volume}%</span>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
            <span>{playerState.isPlaying ? 'Playing' : 'Paused'}</span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              Live Sync
            </span>
          </div>
        </Card>
      ) : (
        <Card className="p-6 text-center text-gray-500">
          <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No music playing</p>
        </Card>
      )}

      {/* Hidden Audio */}
      <audio
        ref={audioRef}
        id="user-music-player"
        crossOrigin="anonymous"
        preload="metadata"
      />
    </div>
  )
}
