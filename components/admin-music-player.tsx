'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Card } from '@/components/ui/card'
import {
  Play,
  Pause,
  StopCircle,
  Volume2,
  Music,
  LogIn,
  LogOut,
  Plus,
  Trash2,
  SkipForward,
} from 'lucide-react'
import { useMusicPlayer, Music as MusicType } from '@/hooks/use-music-player'

export function AdminMusicPlayer() {
  const {
    playerState,
    isConnected,
    isAdmin,
    authError,
    play,
    pause,
    resume,
    stop,
    seek,
    setVolume,
    addToQueue,
    clearQueue,
    next,
    authenticate,
    logout,
  } = useMusicPlayer()

  const [adminId, setAdminId] = useState('admin-1')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [musicList, setMusicList] = useState<MusicType[]>([])
  const [selectedCategory, setSelectedCategory] = useState<'bollywood' | 'bhojpuri' | 'punjabi'>(
    'bollywood'
  )
  const [error, setError] = useState('')

  useEffect(() => {
    // Fetch music list
    fetch('http://localhost:3001/api/music/all')
      .then(res => res.json())
      .then(data => setMusicList(data))
      .catch(err => console.error('[AdminMusicPlayer] Fetch error:', err))
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminId || !password) {
      setError('Please enter admin ID and password')
      return
    }
    authenticate(adminId, password)
    setPassword('')
  }

  const filteredMusic = musicList.filter(m => m.category === selectedCategory)
  const currentTimePercent = playerState.currentMusic
    ? (playerState.currentTime / playerState.currentMusic.duration) * 100
    : 0

  if (!isConnected) {
    return (
      <Card className="p-6 max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Music className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Music Player</h2>
        </div>
        <p className="text-red-500">Connecting to server...</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Music className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold">Admin Music Control</h1>
          </div>
          <div className="flex gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>

        {!isAdmin ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Admin ID</label>
              <input
                type="text"
                value={adminId}
                onChange={e => setAdminId(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="admin-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value)
                  setError('')
                }}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Enter admin password"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {authError && <p className="text-red-500 text-sm" role="alert">{authError}</p>}
            <Button type="submit" className="w-full" variant="default">
              <LogIn className="w-4 h-4 mr-2" />
              Login as Admin
            </Button>
          </form>
        ) : (
          <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <span className="font-medium">Admin Mode Active</span>
            <Button
              onClick={() => {
                logout()
                setPassword('')
              }}
              variant="ghost"
              size="sm"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        )}
      </Card>

      {/* Now Playing */}
      {playerState.currentMusic && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Now Playing</h3>
          {playerState.currentMusic.coverImage && (
            <img
              src={playerState.currentMusic.coverImage}
              alt={playerState.currentMusic.title}
              className="w-full h-40 object-cover rounded-lg mb-4"
            />
          )}
          <div className="mb-4">
            <h4 className="text-xl font-bold">{playerState.currentMusic.title}</h4>
            <p className="text-gray-600">{playerState.currentMusic.artist}</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">
                {Math.floor(playerState.currentTime / 60)}:
                {String(Math.floor(playerState.currentTime % 60)).padStart(2, '0')}
              </span>
              <div className="flex-1 h-2 bg-gray-300 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${currentTimePercent}%` }}
                />
              </div>
              <span className="text-sm">
                {Math.floor(playerState.currentMusic.duration / 60)}:
                {String(Math.floor(playerState.currentMusic.duration % 60)).padStart(2, '0')}
              </span>
            </div>
            {isAdmin && (
              <Slider
                value={[playerState.currentTime]}
                max={playerState.currentMusic.duration}
                step={1}
                onValueChange={values => seek(values[0])}
                className="w-full"
              />
            )}
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-4 mb-6">
            <Volume2 className="w-4 h-4" />
            <Slider
              value={[playerState.volume]}
              max={100}
              step={1}
              onValueChange={values => setVolume(values[0])}
              className="flex-1"
            />
            <span className="text-sm w-8">{playerState.volume}%</span>
          </div>

          {/* Player Controls */}
          {isAdmin && (
            <div className="flex gap-2 flex-wrap">
              {!playerState.isPlaying ? (
                <Button onClick={() => resume()} variant="default" size="lg">
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </Button>
              ) : (
                <Button onClick={() => pause()} variant="default" size="lg">
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              )}
              <Button onClick={() => next()} variant="outline" size="lg">
                <SkipForward className="w-4 h-4 mr-2" />
                Next
              </Button>
              <Button onClick={() => stop()} variant="destructive" size="lg">
                <StopCircle className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Music Selection */}
      {isAdmin && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Select Music</h3>

          {/* Category Tabs */}
          <div className="flex gap-2 mb-4">
            {(['bollywood', 'bhojpuri', 'punjabi'] as const).map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Button>
            ))}
          </div>

          {/* Music List */}
          <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
            {filteredMusic.map(music => (
              <div
                key={music.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  playerState.currentMusic?.id === music.id
                    ? 'bg-blue-100 dark:bg-blue-950 border-blue-500'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => play(music.id)}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{music.title}</h4>
                  <p className="text-sm text-gray-600 truncate">{music.artist}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm text-gray-500">
                    {Math.floor(music.duration / 60)}:{String(music.duration % 60).padStart(2, '0')}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={e => {
                      e.stopPropagation()
                      addToQueue(music.id)
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Queue */}
      {playerState.queue.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Queue ({playerState.queue.length})</h3>
            {isAdmin && (
              <Button onClick={() => clearQueue()} variant="ghost" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
            {playerState.queue.map((music, idx) => (
              <div key={`${music.id}-${idx}`}  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-medium">{idx + 1}. {music.title}</h4>
                <p className="text-sm text-gray-600">{music.artist}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Hidden Audio Element */}
      <audio id="music-player" crossOrigin="anonymous" />
    </div>
  )
}
