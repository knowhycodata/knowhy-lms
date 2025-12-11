// YouTube IFrame API Type Definitions
declare namespace YT {
    interface Player {
        playVideo(): void
        pauseVideo(): void
        stopVideo(): void
        getCurrentTime(): number
        getDuration(): number
        getPlayerState(): number
        getVideoUrl(): string
        getVideoData(): { video_id: string; title: string }
        seekTo(seconds: number, allowSeekAhead?: boolean): void
        setVolume(volume: number): void
        getVolume(): number
        mute(): void
        unMute(): void
        isMuted(): boolean
        setPlaybackRate(rate: number): void
        getPlaybackRate(): number
        destroy(): void
        addEventListener(event: string, listener: (event: any) => void): void
    }

    interface PlayerOptions {
        videoId?: string
        width?: number | string
        height?: number | string
        playerVars?: {
            autoplay?: number
            controls?: number
            disablekb?: number
            enablejsapi?: number
            end?: number
            fs?: number
            iv_load_policy?: number
            loop?: number
            modestbranding?: number
            origin?: string
            playsinline?: number
            rel?: number
            showinfo?: number
            start?: number
            mute?: number
        }
        events?: {
            onReady?: (event: PlayerEvent) => void
            onStateChange?: (event: OnStateChangeEvent) => void
            onError?: (event: OnErrorEvent) => void
            onPlaybackQualityChange?: (event: any) => void
            onPlaybackRateChange?: (event: any) => void
        }
    }

    interface PlayerEvent {
        target: Player
    }

    interface OnStateChangeEvent {
        data: number
        target: Player
    }

    interface OnErrorEvent {
        data: number
        target: Player
    }

    const PlayerState: {
        UNSTARTED: number
        ENDED: number
        PLAYING: number
        PAUSED: number
        BUFFERING: number
        CUED: number
    }

    class Player {
        constructor(elementId: string | HTMLElement, options: PlayerOptions)
    }
}

interface Window {
    YT: typeof YT
    onYouTubeIframeAPIReady: () => void
}
