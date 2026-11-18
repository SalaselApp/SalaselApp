import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ACTIVITY_STORAGE_VERSION,
  isActivityRecord,
  mergeActivity,
  migrateProgressState,
  type ActivityRecord,
} from '../app/activity/contract.ts'

const playlistActivity: ActivityRecord = {
  version: ACTIVITY_STORAGE_VERSION,
  kind: 'playlist-video',
  contentId: 'M7lc1UVf-VE',
  mediaId: 'M7lc1UVf-VE',
  playlistId: 'PL123',
  title: 'Episode',
  thumbnailId: 'M7lc1UVf-VE',
  destination: '/ar/playlist/PL123/M7lc1UVf-VE',
  playedAt: 1_000,
}

test('activity keeps first record for equal timestamps and rejects stale or future observations', () => {
  const podcast: ActivityRecord = {
    version: ACTIVITY_STORAGE_VERSION,
    kind: 'podcast',
    contentId: 'pod_123',
    mediaId: 'dQw4w9WgXcQ',
    title: 'Podcast',
    thumbnailId: 'dQw4w9WgXcQ',
    destination: '/ar/podcast/pod_123',
    playedAt: 1_000,
  }

  assert.equal(mergeActivity(playlistActivity, podcast, 1_000)!.contentId, playlistActivity.contentId)
  assert.equal(
    mergeActivity(playlistActivity, { ...podcast, playedAt: 999 }, 1_000)!.contentId,
    playlistActivity.contentId,
  )
  assert.equal(mergeActivity(null, { ...podcast, playedAt: 1_000 + 5 * 60_000 + 1 }, 1_000), null)
  assert.equal(
    mergeActivity({ ...playlistActivity, playedAt: 1_000 + 5 * 60_000 + 1 }, podcast, 1_000)!.contentId,
    podcast.contentId,
  )
})

test('activity rejects non-canonical or unsafe destinations before persistence', () => {
  const podcast: ActivityRecord = {
    version: ACTIVITY_STORAGE_VERSION,
    kind: 'podcast',
    contentId: 'pod_123',
    mediaId: 'M7lc1UVf-VE',
    title: 'Podcast',
    destination: '/ar/podcast/pod_123',
    playedAt: 1_000,
  }

  assert.equal(isActivityRecord(podcast), true)
  for (const destination of [
    '//evil.example/podcast/pod_123',
    '/ar/podcast/pod_123?redirect=https://evil.example',
    '/ar/podcast/pod_123#fragment',
    '/ar/podcast/pod_123\\\\escape',
    '/ar/video/M7lc1UVf-VE',
  ])
    assert.equal(isActivityRecord({ ...podcast, destination }), false)
})

test('legacy playlist lastWatched migrates an exact identity even when old display metadata is absent', () => {
  const migrated = migrateProgressState({
    lastWatched: { playlistId: 'PL123', videoId: 'M7lc1UVf-VE', updatedAt: 1_000 },
  })

  assert.equal(migrated.latestActivity?.destination, '/ar/playlist/PL123/M7lc1UVf-VE')
  assert.equal(migrated.latestActivity?.title, 'Salasel playlist')
})

test('legacy playlist lastWatched migrates without losing video destination, completion, notes, or playlist ordering', () => {
  const migrated = migrateProgressState({
    completedVideos: { PL123: ['M7lc1UVf-VE'] },
    recentPlaylists: ['PL123', 'PL456'],
    lastWatched: {
      playlistId: 'PL123',
      videoId: 'M7lc1UVf-VE',
      playlistName: 'Series',
      thumbnailId: 'M7lc1UVf-VE',
      updatedAt: 1_000,
    },
  })

  assert.deepEqual(migrated.completedVideos?.PL123, ['M7lc1UVf-VE'])
  assert.deepEqual(migrated.recentPlaylists, ['PL123', 'PL456'])
  assert.equal(migrated.latestActivity?.destination, '/ar/playlist/PL123/M7lc1UVf-VE')
})

test('legacy migration rejects non-exact IDs and invalid timestamps without changing preserved state', () => {
  const base = {
    completedVideos: { PL123: [playlistActivity.mediaId] },
    recentPlaylists: ['PL123'],
    notes: { [playlistActivity.mediaId]: 'keep' },
  }

  for (const lastWatched of [
    { playlistId: 'PL123', videoId: 'short', updatedAt: 1_000 },
    { playlistId: '../PL123', videoId: playlistActivity.mediaId, updatedAt: 1_000 },
    { playlistId: 'PL123', videoId: playlistActivity.mediaId, thumbnailId: 'not-an-id', updatedAt: 1_000 },
    { playlistId: 'PL123', videoId: playlistActivity.mediaId, updatedAt: 1_000 + 5 * 60_000 + 1 },
  ]) {
    const migrated = migrateProgressState({ ...base, lastWatched }, 1_000)
    assert.equal(migrated.latestActivity, null)
    assert.deepEqual(migrated.completedVideos, base.completedVideos)
    assert.deepEqual(migrated.recentPlaylists, base.recentPlaylists)
    assert.deepEqual(migrated.notes, base.notes)
  }
})

test('an explicit unknown or future v1 activity is rejected rather than falling back to legacy data', () => {
  const legacy = { playlistId: 'PL123', videoId: playlistActivity.mediaId, updatedAt: 900 }
  for (const latestActivity of [
    { version: 2, ...legacy },
    { ...playlistActivity, playedAt: 1_000 + 5 * 60_000 + 1 },
  ]) {
    const migrated = migrateProgressState(
      { latestActivity, lastWatched: legacy, preferences: { notesSide: 'start' } },
      1_000,
    )
    assert.equal(migrated.latestActivity, null)
    assert.deepEqual(migrated.preferences, { notesSide: 'start' })
  }
})

test('activity accepts new podcast playback routes and old saved detail destinations without allowing path suffixes', () => {
  const base = {
    version: 1,
    kind: 'podcast',
    contentId: 'pod_123',
    mediaId: 'M7lc1UVf-VE',
    title: 'Episode',
    playedAt: 1000,
  }
  assert.equal(isActivityRecord({ ...base, destination: '/ar/podcast/pod_123/watch' }), true)
  assert.equal(isActivityRecord({ ...base, destination: '/ar/podcast/pod_123' }), true)
  for (const destination of [
    '/ar/podcast/pod_wrong/watch',
    '/ar/podcast/pod_123/watch?x=1',
    '/ar/podcast/pod_123/watch/extra',
    '/ar/podcast/pod_123/watch#fragment',
  ]) {
    assert.equal(isActivityRecord({ ...base, destination }), false)
  }
})
