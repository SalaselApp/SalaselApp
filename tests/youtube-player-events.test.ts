import assert from 'node:assert/strict'
import test from 'node:test'

import {
  YOUTUBE_NOCOOKIE_ORIGIN,
  initializeYoutubePlayerEvents,
  subscribeToYoutubePlayingEvents,
} from '../app/activity/youtube-player-events.ts'

class FakeMessageTarget {
  private listener: ((event: MessageEvent<unknown>) => void) | undefined

  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void) {
    assert.equal(type, 'message')
    this.listener = listener
  }

  removeEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void) {
    assert.equal(type, 'message')
    if (this.listener === listener) this.listener = undefined
  }

  dispatch(event: MessageEvent<unknown>) {
    this.listener?.(event)
  }
}

class FakeYoutubeIframe {
  private listening = false
  private subscribed = false

  postMessage(message: string, origin: string) {
    if (origin !== YOUTUBE_NOCOOKIE_ORIGIN) return
    const payload = JSON.parse(message) as { event?: string; channel?: string; func?: string; args?: string[] }
    if (payload.event === 'listening' && payload.channel === 'widget') this.listening = true
    if (
      this.listening &&
      payload.event === 'command' &&
      payload.func === 'addEventListener' &&
      payload.args?.[0] === 'onStateChange'
    ) {
      this.subscribed = true
    }
  }

  emitPlaying(events: FakeMessageTarget) {
    if (!this.subscribed) return
    events.dispatch({
      origin: YOUTUBE_NOCOOKIE_ORIGIN,
      source: this as unknown as Window,
      data: JSON.stringify({ event: 'onStateChange', info: 1 }),
    } as MessageEvent)
  }
}

test('starts only after loaded iframe completes listening handshake and sends a trusted playing event', () => {
  const events = new FakeMessageTarget()
  const player = new FakeYoutubeIframe()
  const playerWindow = player as unknown as Window
  let starts = 0
  const unsubscribe = subscribeToYoutubePlayingEvents(events, playerWindow, () => {
    starts += 1
  })

  player.emitPlaying(events)
  assert.equal(starts, 0)

  initializeYoutubePlayerEvents(player)
  player.emitPlaying(events)
  assert.equal(starts, 1)

  events.dispatch({
    origin: 'https://evil.example',
    source: playerWindow,
    data: JSON.stringify({ event: 'onStateChange', info: 1 }),
  } as MessageEvent)
  events.dispatch({
    origin: YOUTUBE_NOCOOKIE_ORIGIN,
    source: {} as Window,
    data: JSON.stringify({ event: 'onStateChange', info: 1 }),
  } as MessageEvent)
  events.dispatch({
    origin: YOUTUBE_NOCOOKIE_ORIGIN,
    source: playerWindow,
    data: JSON.stringify({ event: 'onStateChange', info: 0 }),
  } as MessageEvent)
  events.dispatch({
    origin: YOUTUBE_NOCOOKIE_ORIGIN,
    source: playerWindow,
    data: { event: 'onStateChange', info: 1 },
  } as MessageEvent)
  assert.equal(starts, 1)

  unsubscribe()
  player.emitPlaying(events)
  assert.equal(starts, 1)
})

test('trusted ready/error events update player UI without inventing playback', () => {
  const events = new FakeMessageTarget()
  const player = new FakeYoutubeIframe()
  const source = player as unknown as Window
  let starts = 0
  let ready = 0
  const errors: number[] = []
  const unsubscribe = subscribeToYoutubePlayingEvents(
    events,
    source,
    () => {
      starts++
    },
    {
      onReady: () => {
        ready++
      },
      onError: (code: number) => errors.push(code),
    },
  )
  const emit = (event: string, info?: unknown, origin = YOUTUBE_NOCOOKIE_ORIGIN, sender = source) =>
    events.dispatch({ origin, source: sender, data: JSON.stringify({ event, info }) } as MessageEvent)
  emit('onReady', undefined, 'https://evil.example')
  emit('onError', 153, YOUTUBE_NOCOOKIE_ORIGIN, {} as Window)
  assert.equal(ready, 0)
  assert.deepEqual(errors, [])
  emit('initialDelivery', { playerState: -1 })
  emit('onReady')
  assert.equal(ready, 1)
  assert.equal(starts, 0)
  emit('onError', 153)
  emit('onError', 'not-a-code')
  assert.deepEqual(errors, [153])
  emit('onStateChange', 1)
  emit('onStateChange', 1)
  assert.equal(starts, 1)
  unsubscribe()
  emit('onError', 100)
  assert.deepEqual(errors, [153])
})
