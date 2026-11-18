import assert from 'node:assert/strict'
import test from 'node:test'
import * as history from '../app/activity/contract.ts'
import type { ActivityRecord } from '../app/activity/contract.ts'
const podcast: ActivityRecord = {
  version: 1,
  kind: 'podcast',
  contentId: 'pod_123',
  mediaId: 'zsZ6eqtoKxc',
  title: 'Podcast',
  destination: '/ar/podcast/pod_123/watch',
  playedAt: 1000,
}
const playlist: ActivityRecord = {
  version: 1,
  kind: 'playlist-video',
  contentId: 'M7lc1UVf-VE',
  mediaId: 'M7lc1UVf-VE',
  playlistId: 'PL123',
  playlistName: 'Series',
  title: 'Episode',
  destination: '/ar/playlist/PL123/M7lc1UVf-VE',
  playedAt: 900,
}
test('recent history keeps podcasts and series together, newest first, with one entry per series', () => {
  assert.equal(typeof history.mergeRecentActivity, 'function')
  const result = history.mergeRecentActivity(
    [playlist, podcast],
    {
      ...playlist,
      mediaId: 'dQw4w9WgXcQ',
      contentId: 'dQw4w9WgXcQ',
      destination: '/en/playlist/PL123/dQw4w9WgXcQ',
      playedAt: 1100,
    },
    1200,
  )
  assert.deepEqual(
    result.map((x) => [x.kind, x.playedAt]),
    [
      ['playlist-video', 1100],
      ['podcast', 1000],
    ],
  )
})
test('recent history rejects malformed or future data, keeps newer records, and stays bounded', () => {
  assert.equal(typeof history.mergeRecentActivity, 'function')
  assert.deepEqual(
    history.mergeRecentActivity(
      [podcast, null, { ...playlist, destination: '//evil.example' }],
      { ...podcast, playedAt: 999 },
      1200,
    ),
    [podcast],
  )
  assert.deepEqual(history.mergeRecentActivity([], { ...podcast, playedAt: 999999 }, 1200), [])
  const many = Array.from({ length: 15 }, (_, i) => ({
    ...podcast,
    contentId: `pod_${i}`,
    destination: `/ar/podcast/pod_${i}/watch`,
    playedAt: 1000 + i,
  }))
  const result = history.mergeRecentActivity(many, null, 1200)
  assert.equal(result.length, 10)
  assert.equal(result[0].contentId, 'pod_14')
})
