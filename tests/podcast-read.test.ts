import assert from 'node:assert/strict'
import test from 'node:test'

import { createPodcastReader } from '../app/podcasts/read.ts'
const publishedRow = {
  id: 'pod_123',
  title: 'Episode',
  description: 'Description',
  thumbnail_id: 'dQw4w9WgXcQ',
  youtube_video_id: 'M7lc1UVf-VE',
  language: 'ar',
  categories: [0],
  duration: 10,
  uploaded_at: 1,
  published_at: '2026-01-01T00:00:00.000Z',
}

test('catalog read distinguishes a public database failure from an empty catalog', async () => {
  const reader = createPodcastReader({
    listPublished: async () => ({ data: null, error: new Error('database unavailable') }),
    getPublished: async () => ({ data: null, error: null }),
  })

  assert.deepEqual(await reader.list(), { ok: false, error: 'database unavailable' })
})

test('public reader never returns a withdrawn episode from stale cached metadata', async () => {
  const reader = createPodcastReader({
    listPublished: async () => ({ data: [publishedRow], error: null }),
    getPublished: async () => ({ data: null, error: null }),
  })

  assert.deepEqual(await reader.get('pod_123'), { ok: true, podcast: null })
})

test('published podcast metadata retains curator participants and playlist classifications', async () => {
  const row = {
    ...publishedRow,
    description: 'Our own summary',
    participants: ['Host', 'Guest'],
    type: 1,
    style: 2,
    classes: [0, 3],
  }
  const reader = createPodcastReader({
    listPublished: async () => ({ data: [row], error: null }),
    getPublished: async () => ({ data: row, error: null }),
  })
  const result = await reader.get(row.id)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.podcast?.participants, row.participants)
  assert.equal(result.podcast?.description, row.description)
  assert.equal(result.podcast?.type, 1)
  assert.equal(result.podcast?.style, 2)
  assert.deepEqual(result.podcast?.classes, row.classes)
})

test('legacy episodes keep unknown classifications and no invented participants', async () => {
  const reader = createPodcastReader({
    listPublished: async () => ({ data: [publishedRow], error: null }),
    getPublished: async () => ({ data: publishedRow, error: null }),
  })
  const result = await reader.get(publishedRow.id)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.podcast?.participants, [])
  assert.equal(result.podcast?.type, null)
  assert.equal(result.podcast?.style, null)
  assert.deepEqual(result.podcast?.classes, [])
})
