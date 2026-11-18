'use client'

import type { Translations } from '@/app/types'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { initializeYoutubePlayerEvents, subscribeToYoutubePlayingEvents } from '@/app/activity/youtube-player-events'
import { fallbackThumbnailUrl, videoThumbnailUrl, youtubeEmbedUrl, youtubeWatchUrl } from '@/app/utils'

export interface WatchPlayerProps {
  videoId: string
  playlistId?: string
  title: string
  t: Translations
  onPlaybackStarted?: () => void
}

const subscribe = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

export default function WatchPlayer(props: WatchPlayerProps) {
  const [attempt, setAttempt] = useState(0)
  return (
    <PlayerAttempt
      key={`${props.videoId}:${props.playlistId ?? ''}:${attempt}`}
      {...props}
      retry={() => setAttempt((value) => value + 1)}
    />
  )
}

function PlayerAttempt({
  videoId,
  playlistId,
  title,
  t,
  onPlaybackStarted,
  retry,
}: WatchPlayerProps & { retry: () => void }) {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [poster, setPoster] = useState(videoThumbnailUrl(videoId))
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const callbackRef = useRef(onPlaybackStarted)
  const failedRef = useRef(false)
  const readyRef = useRef(false)
  const initialize = useCallback(() => {
    const playerWindow = iframeRef.current?.contentWindow
    if (playerWindow) initializeYoutubePlayerEvents(playerWindow)
  }, [])

  useEffect(() => {
    callbackRef.current = onPlaybackStarted
  }, [onPlaybackStarted])
  useEffect(() => {
    const playerWindow = iframeRef.current?.contentWindow
    if (!hydrated || !playerWindow) return
    const timers: { handshake?: ReturnType<typeof setInterval>; timeout?: ReturnType<typeof setTimeout> } = {}
    const stopWaiting = () => {
      clearInterval(timers.handshake)
      clearTimeout(timers.timeout)
    }
    const fail = () => {
      if (!failedRef.current) {
        failedRef.current = true
        stopWaiting()
        setStatus('error')
      }
    }
    const unsubscribe = subscribeToYoutubePlayingEvents(
      window,
      playerWindow,
      () => {
        if (!failedRef.current) callbackRef.current?.()
      },
      {
        onReady: () => {
          if (!failedRef.current) {
            readyRef.current = true
            stopWaiting()
            setStatus('ready')
          }
        },
        onError: fail,
      },
    )
    // Retry the handshake while the embedded API is starting. Frame load alone
    // cannot tell whether its native controls are ready or an embed error occurred.
    timers.handshake = setInterval(() => {
      if (!readyRef.current && !failedRef.current) initialize()
      else clearInterval(timers.handshake)
    }, 500)
    timers.timeout = setTimeout(() => {
      if (!readyRef.current) fail()
    }, 15000)
    return () => {
      unsubscribe()
      clearInterval(timers.handshake)
      clearTimeout(timers.timeout)
    }
  }, [hydrated, initialize])

  const watchUrl = youtubeWatchUrl(videoId, playlistId)
  return (
    <div
      className="relative aspect-video min-h-[200px] w-full overflow-hidden rounded-xl bg-slate-950 shadow-lg"
      aria-busy={status === 'loading'}
    >
      {status !== 'error' && hydrated && (
        <iframe
          ref={iframeRef}
          className="absolute inset-0 h-full w-full border-0"
          src={youtubeEmbedUrl(videoId, playlistId, window.location.origin)}
          title={title}
          loading="eager"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          onLoad={initialize}
          onError={() => {
            failedRef.current = true
            setStatus('error')
          }}
        />
      )}
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center" role="status">
          <Image
            src={poster}
            alt=""
            fill
            sizes="(min-width: 1024px) 66vw, 100vw"
            className="object-cover opacity-35"
            onError={() => setPoster(fallbackThumbnailUrl(videoId))}
          />
          <span className="relative flex items-center gap-3 rounded-lg bg-slate-950/90 px-4 py-3 text-sm text-white">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 motion-safe:animate-spin" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity=".3" />
              <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {t.playerLoadingLabel}
          </span>
        </div>
      )}
      {status === 'error' && (
        <div
          role="alert"
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4 text-center text-slate-300"
        >
          <p className="max-w-sm text-sm">{t.videoUnavailableLabel}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={retry}
              className="min-h-11 cursor-pointer rounded-full border border-slate-600 px-4 py-2 text-sm text-white transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t.playerRetryLabel}
            </button>
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-full bg-primary-hover px-4 py-2 text-sm text-white hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t.watchOnYoutubeLabel}
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
