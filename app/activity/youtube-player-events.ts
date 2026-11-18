export const YOUTUBE_NOCOOKIE_ORIGIN = 'https://www.youtube-nocookie.com'

export interface YoutubeMessageTarget {
  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void
  removeEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void
}

export interface YoutubePlayerWindow {
  postMessage(message: string, targetOrigin: string): void
}

/** Starts the documented iframe postMessage protocol after the frame loads. */
export function initializeYoutubePlayerEvents(playerWindow: YoutubePlayerWindow): void {
  playerWindow.postMessage(JSON.stringify({ event: 'listening', channel: 'widget' }), YOUTUBE_NOCOOKIE_ORIGIN)
  for (const event of ['onStateChange', 'onReady', 'onError'])
    playerWindow.postMessage(
      JSON.stringify({ event: 'command', func: 'addEventListener', args: [event] }),
      YOUTUBE_NOCOOKIE_ORIGIN,
    )
}

/** Subscribes to one trusted embedded player's first actual playing transition. */
export function subscribeToYoutubePlayingEvents(
  messageTarget: YoutubeMessageTarget,
  playerWindow: Window,
  onPlaybackStarted: () => void,
  callbacks: { onReady?: () => void; onError?: (code: number) => void } = {},
): () => void {
  let didStart = false
  let didReady = false
  const onMessage = (event: MessageEvent<unknown>) => {
    if (event.origin !== YOUTUBE_NOCOOKIE_ORIGIN || event.source !== playerWindow || typeof event.data !== 'string')
      return

    let payload: { event?: unknown; info?: unknown }
    try {
      payload = JSON.parse(event.data) as { event?: unknown; info?: unknown }
    } catch {
      return
    }

    const info = payload.info as { playerState?: unknown } | undefined
    const hasPlayerState = info && typeof info === 'object' && typeof info.playerState === 'number'
    if (
      !didReady &&
      (payload.event === 'onReady' ||
        ((payload.event === 'initialDelivery' || payload.event === 'infoDelivery') && hasPlayerState) ||
        (payload.event === 'onStateChange' && typeof payload.info === 'number'))
    ) {
      didReady = true
      callbacks.onReady?.()
    }
    if (payload.event === 'onError' && typeof payload.info === 'number' && Number.isFinite(payload.info))
      callbacks.onError?.(payload.info)

    if (payload.event === 'onStateChange' && payload.info === 1 && !didStart) {
      didStart = true
      onPlaybackStarted()
    }
  }

  messageTarget.addEventListener('message', onMessage)
  return () => messageTarget.removeEventListener('message', onMessage)
}
