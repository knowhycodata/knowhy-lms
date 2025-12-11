import { useEffect, useRef, useCallback, useState } from 'react'
import { progressApi, videosApi } from '../lib/api'
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Loader2 } from 'lucide-react'

interface VideoPlayerProps {
  lessonId: string
  videoType: 'VIDEO_LOCAL' | 'VIDEO_YOUTUBE'
  videoUrl: string
  initialProgress?: number
  onProgressUpdate?: (seconds: number) => void
  onTimeClick?: (seconds: number) => void
}

// Debounce hook
function useDebounce(
  callback: (seconds: number) => void,
  delay: number
): (seconds: number) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  return useCallback(
    (seconds: number) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        callback(seconds)
      }, delay)
    },
    [callback, delay]
  )
}

// Zaman formatla
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

export default function VideoPlayer({
  lessonId,
  videoType,
  videoUrl,
  initialProgress = 0,
  onProgressUpdate,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [lastSavedSecond, setLastSavedSecond] = useState(0)
  const playerRef = useRef<YT.Player | null>(null)

  // Player state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showControls, setShowControls] = useState(true)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [videoToken, setVideoToken] = useState<string | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)

  // Video token al (LOCAL video için)
  useEffect(() => {
    if (videoType !== 'VIDEO_LOCAL') return

    // Reset state
    setVideoToken(null)
    setVideoError(null)
    setIsLoading(true)

    const getToken = async () => {
      try {
        const res = await videosApi.getVideoToken(lessonId)
        setVideoToken(res.data.data.token)
        setVideoError(null)
      } catch (err: any) {
        console.error('Video token alınamadı:', err)
        setVideoError(err.response?.data?.error || 'Video yüklenemedi')
        setIsLoading(false)
      }
    }
    getToken()
  }, [lessonId, videoType])

  // Progress kaydetme fonksiyonu
  const saveProgress = useCallback(
    async (currentSecond: number) => {
      try {
        const watchedDiff = Math.max(0, currentSecond - lastSavedSecond)
        // Sadece anlamlı ilerlemeler veya duraklatma/bitirme anında kaydet
        if (watchedDiff > 0 || !isPlaying) {
          await progressApi.update(lessonId, {
            lastWatchedSecond: Math.floor(currentSecond),
            totalWatchedSeconds: watchedDiff,
          })
          setLastSavedSecond(currentSecond)
          onProgressUpdate?.(currentSecond)
        }
      } catch (error) {
        console.error('Progress kaydetme hatası:', error)
      }
    },
    [lessonId, lastSavedSecond, onProgressUpdate, isPlaying]
  )

  const debouncedSaveProgress = useDebounce(saveProgress, 5000)

  // Kontrolleri otomatik gizle
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }, [isPlaying])

  // Lokal video için event handlers
  useEffect(() => {
    if (videoType !== 'VIDEO_LOCAL' || !videoRef.current || !videoToken) return

    const video = videoRef.current

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      setIsLoading(false)
      if (initialProgress > 0) {
        video.currentTime = initialProgress
      }
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      debouncedSaveProgress(video.currentTime)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => {
      setIsPlaying(false)
      saveProgress(video.currentTime)
    }
    const handleEnded = () => {
      setIsPlaying(false)
      saveProgress(video.duration)
    }
    const handleWaiting = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)
    const handleError = () => {
      // Backend token hatası verirse, videoError state'ini güncelle
      setVideoError('Video yüklenirken hata oluştu. Lütfen sayfayı yenileyin.')
      setIsLoading(false)
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('error', handleError)

    const handleBeforeUnload = () => saveProgress(video.currentTime)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('error', handleError)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      saveProgress(video.currentTime)
    }
  }, [videoType, videoToken, initialProgress, debouncedSaveProgress, saveProgress])

  // Video kontrol fonksiyonları
  const togglePlay = () => {
    if (videoType === 'VIDEO_LOCAL' && videoRef.current) {
      if (isPlaying) videoRef.current.pause()
      else videoRef.current.play()
    } else if (videoType === 'VIDEO_YOUTUBE' && playerRef.current) {
      if (isPlaying) playerRef.current.pauseVideo()
      else playerRef.current.playVideo()
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    setCurrentTime(newTime)

    if (videoType === 'VIDEO_LOCAL' && videoRef.current) {
      videoRef.current.currentTime = newTime
    } else if (videoType === 'VIDEO_YOUTUBE' && playerRef.current) {
      playerRef.current.seekTo(newTime)
    }
  }

  const skip = (seconds: number) => {
    let newTime = currentTime + seconds
    newTime = Math.max(0, Math.min(newTime, duration))
    setCurrentTime(newTime)

    if (videoType === 'VIDEO_LOCAL' && videoRef.current) {
      videoRef.current.currentTime = newTime
    } else if (videoType === 'VIDEO_YOUTUBE' && playerRef.current) {
      playerRef.current.seekTo(newTime)
    }
  }

  const toggleMute = () => {
    const newMuted = !isMuted
    setIsMuted(newMuted)

    if (videoType === 'VIDEO_LOCAL' && videoRef.current) {
      videoRef.current.muted = newMuted
      if (!newMuted && volume === 0) {
        setVolume(1)
        videoRef.current.volume = 1
      }
    } else if (videoType === 'VIDEO_YOUTUBE' && playerRef.current) {
      if (newMuted) playerRef.current.mute()
      else playerRef.current.unMute()
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    setIsMuted(newVolume === 0)

    if (videoType === 'VIDEO_LOCAL' && videoRef.current) {
      videoRef.current.volume = newVolume
      videoRef.current.muted = newVolume === 0
    } else if (videoType === 'VIDEO_YOUTUBE' && playerRef.current) {
      playerRef.current.setVolume(newVolume * 100)
    }
  }

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed)
    setShowSpeedMenu(false)

    if (videoType === 'VIDEO_LOCAL' && videoRef.current) {
      videoRef.current.playbackRate = speed
    } else if (videoType === 'VIDEO_YOUTUBE' && playerRef.current) {
      playerRef.current.setPlaybackRate(speed)
    }
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      containerRef.current.requestFullscreen()
    }
  }

  // YouTube player
  useEffect(() => {
    if (videoType !== 'VIDEO_YOUTUBE') return
    if (!videoUrl) return

    let intervalId: ReturnType<typeof setInterval> | null = null
    let playerReady = false

    const initPlayer = () => {
      try {
        playerRef.current = new YT.Player('youtube-player', {
          videoId: videoUrl,
          playerVars: {
            start: Math.floor(initialProgress),
            autoplay: 0,
            modestbranding: 1,
            rel: 0,
            controls: 0, // Kendi kontrollerimizi kullanacağız
            disablekb: 1,
          },
          events: {
            onStateChange: (event: YT.OnStateChangeEvent) => {
              setIsPlaying(event.data === YT.PlayerState.PLAYING)

              if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                const time = playerRef.current?.getCurrentTime?.() || 0
                saveProgress(time)
              }
            },
            onReady: (event) => {
              playerReady = true
              setDuration(event.target.getDuration())
              setIsLoading(false)
              event.target.setPlaybackRate(playbackSpeed)

              intervalId = setInterval(() => {
                if (playerReady && playerRef.current && playerRef.current.getPlayerState) {
                  try {
                    const state = playerRef.current.getPlayerState()
                    if (state === YT.PlayerState.PLAYING) {
                      const time = playerRef.current.getCurrentTime()
                      setCurrentTime(time)
                      debouncedSaveProgress(time)
                    }
                  } catch (e) {
                    // Ignore errors
                  }
                }
              }, 1000)
            },
          },
        })
      } catch (e) {
        console.error('YouTube player oluşturulamadı:', e)
        setVideoError('YouTube player yüklenemedi')
        setIsLoading(false)
      }
    }

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer()
    } else {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
        ; (window as any).onYouTubeIframeAPIReady = initPlayer
    }

    const handleBeforeUnload = () => {
      if (playerReady && playerRef.current) {
        try {
          saveProgress(playerRef.current.getCurrentTime?.() || 0)
        } catch (e) { }
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      if (intervalId) clearInterval(intervalId)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // destroy çağırmıyoruz çünkü iframe kaybolabilir
      playerReady = false
    }
  }, [videoType, videoUrl, initialProgress, debouncedSaveProgress, saveProgress])

  // Video URL boşsa hata göster
  if (!videoUrl) {
    return (
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-lg font-medium mb-2">Video Bulunamadı</p>
          <p className="text-sm text-gray-400">Bu ders için video henüz yüklenmemiş</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-lg overflow-hidden group select-none"
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* LOCAL VIDEO */}
      {videoType === 'VIDEO_LOCAL' && videoToken && (
        <video
          ref={videoRef}
          className="w-full h-full"
          preload="metadata"
          playsInline
          controlsList="nodownload nofullscreen noremoteplayback"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          onClick={togglePlay}
        >
          <source src={videosApi.getStreamUrl(lessonId, videoToken)} type="video/mp4" />
        </video>
      )}

      {/* YOUTUBE VIDEO */}
      {videoType === 'VIDEO_YOUTUBE' && (
        <div id="youtube-player" className="w-full h-full pointer-events-none" />
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      )}

      {/* Error Overlay */}
      {videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-30">
          <div className="text-center text-white p-6">
            <p className="text-lg font-medium mb-2">Video Yüklenemedi</p>
            <p className="text-sm text-gray-400 mb-4">{videoError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      )}

      {/* Big Play Button Overlay */}
      {!isPlaying && !isLoading && !videoError && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/10 hover:bg-black/20 z-10"
          onClick={togglePlay}
        >
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors shadow-lg">
            <Play className="w-10 h-10 text-white ml-2" fill="white" />
          </div>
        </div>
      )}

      {/* Controls Bar */}
      {(!videoError && (videoToken || videoType === 'VIDEO_YOUTUBE')) && (
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 transition-opacity duration-300 z-20 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
          {/* Progress Bar */}
          <div className="mb-4 relative group/progress">
            <div className="absolute w-full h-1 bg-white/30 rounded-full bottom-0"></div>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="absolute w-full h-full opacity-0 cursor-pointer z-20"
            />
            <div
              className="absolute h-1 bg-blue-500 rounded-full bottom-0 z-10 pointer-events-none"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover/progress:scale-100 transition-transform shadow"></div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            {/* Left Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white"
                title={isPlaying ? 'Duraklat' : 'Oynat'}
              >
                {isPlaying ? <Pause className="w-5 h-5" fill="white" /> : <Play className="w-5 h-5" fill="white" />}
              </button>

              <button
                onClick={() => skip(-10)}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white"
                title="10sn Geri"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                onClick={() => skip(10)}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white"
                title="10sn İleri"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 group/volume relative">
                <button
                  onClick={toggleMute}
                  className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <div className="w-0 overflow-hidden group-hover/volume:w-24 transition-all duration-300">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1 bg-white/30 rounded-full accent-white cursor-pointer ml-2"
                  />
                </div>
              </div>

              <span className="text-white text-sm font-medium ml-2">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white flex items-center gap-1 text-sm font-medium w-12 justify-center"
                >
                  {playbackSpeed}x
                </button>

                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg p-1 min-w-[100px] backdrop-blur-sm border border-white/10">
                    {PLAYBACK_SPEEDS.map(speed => (
                      <button
                        key={speed}
                        onClick={() => changeSpeed(speed)}
                        className={`w-full text-left px-3 py-1.5 text-sm rounded hover:bg-white/20 transition-colors ${speed === playbackSpeed ? 'text-blue-400 font-bold' : 'text-white'}`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={toggleFullscreen}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white"
                title="Tam Ekran"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
